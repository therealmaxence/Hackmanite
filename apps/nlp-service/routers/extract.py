import asyncio
import structlog
import subprocess
import sys
import urllib.request
import tarfile
import shutil
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, Body
from fastapi.responses import JSONResponse
from models.schemas import ExtractionRequest, ExtractionResult
from services.dispatcher import dispatch
from services.ocr import tesseract_found, _tcmd
from services.spacy_registry import (
    SUPPORTED_MODELS, MODELS_DIR,
    is_installed, evict,
)

logger = structlog.get_logger()
router = APIRouter()

MODELS_DIR.mkdir(parents=True, exist_ok=True)
DOWNLOAD_STATUS: dict[str, str] = {}


def _run_download(model_name: str) -> None:
    try:
        DOWNLOAD_STATUS[model_name] = "downloading"
        url = f"https://github.com/explosion/spacy-models/releases/download/{model_name}-3.7.0/{model_name}-3.7.0.tar.gz"
        dest_tar = MODELS_DIR / f"{model_name}.tar.gz"
        MODELS_DIR.mkdir(exist_ok=True)
        urllib.request.urlretrieve(url, dest_tar)
        with tarfile.open(dest_tar, "r:gz") as tar:
            tar.extractall(path=MODELS_DIR)
        dest_tar.unlink()
        DOWNLOAD_STATUS[model_name] = "installed"
    except Exception as e:
        DOWNLOAD_STATUS[model_name] = f"error: {e}"


def _sanitize(val):
    if isinstance(val, str):
        try:
            return val.encode("utf-16", "surrogatepass").decode("utf-16", "ignore")
        except Exception:
            return val
    if isinstance(val, list):
        return [_sanitize(x) for x in val]
    if isinstance(val, dict):
        return {k: _sanitize(v) for k, v in val.items()}
    if hasattr(val, "__dict__"):
        for k, v in list(val.__dict__.items()):
            setattr(val, k, _sanitize(v))
    return val


@router.post("/extract", response_model=ExtractionResult)
async def extract(req: ExtractionRequest) -> ExtractionResult:
    logger.info("Starting extraction", file_id=req.file_id, mime=req.mime_type, window_size=req.window_size)
    return _sanitize(await asyncio.to_thread(dispatch, req.file_id, req.storage_path, req.mime_type, req.window_size))


@router.get("/spacy-models")
async def list_models():
    return {
        "models": [
            {"id": m_id, "name": m_info["name"], "lang": m_info["lang"],
             "status": DOWNLOAD_STATUS.get(m_id) or ("installed" if is_installed(m_id) else "not_installed")}
            for m_id, m_info in SUPPORTED_MODELS.items()
        ],
        "selected": "auto",
    }


@router.post("/spacy-models/download")
async def download_model(background_tasks: BackgroundTasks, payload: dict = Body(...)):
    model_name = payload.get("model")
    if not model_name or model_name not in SUPPORTED_MODELS:
        return {"error": "Invalid model name"}
    if DOWNLOAD_STATUS.get(model_name) == "downloading":
        return {"status": "already_downloading"}
    DOWNLOAD_STATUS[model_name] = "downloading"
    background_tasks.add_task(_run_download, model_name)
    return {"status": "started"}


@router.post("/spacy-models/delete")
async def delete_model(payload: dict = Body(...)):
    model_name = payload.get("model")
    if not model_name or model_name not in SUPPORTED_MODELS:
        return {"error": "Invalid model name"}

    deleted_any = False
    if MODELS_DIR.exists():
        for p in MODELS_DIR.glob(f"**/{model_name}*"):
            if (p / "config.cfg").exists():
                target = p.parent if p.parent != MODELS_DIR else p
                try:
                    shutil.rmtree(target)
                    deleted_any = True
                except Exception as e:
                    logger.error("failed_to_delete_local_model", model=model_name, path=str(target), error=str(e))

    DOWNLOAD_STATUS.pop(model_name, None)
    evict(model_name)

    return {"status": "ok", "deleted": deleted_any} | (
        {} if deleted_any else {"message": "Model was not found in local models directory"}
    )

TESSERACT_INSTALL_STATUS: dict = {"state": "idle", "log": ""}


def _run_tesseract_install() -> None:
    TESSERACT_INSTALL_STATUS["state"] = "installing"
    try:
        if sys.platform == "darwin":
            result = subprocess.run(
                ["brew", "install", "tesseract"],
                capture_output=True, text=True, timeout=300,
            )
            TESSERACT_INSTALL_STATUS["log"] = result.stdout + result.stderr
            TESSERACT_INSTALL_STATUS["state"] = "done" if result.returncode == 0 else "error"
        elif sys.platform.startswith("linux"):
            _linux_install_tesseract()
        else:
            TESSERACT_INSTALL_STATUS["state"] = "windows"
            TESSERACT_INSTALL_STATUS["log"] = "Windows requires manual installation."
    except Exception as e:
        TESSERACT_INSTALL_STATUS["state"] = "error"
        TESSERACT_INSTALL_STATUS["log"] = str(e)


def _linux_install_tesseract() -> None:
    import os
    is_root = os.geteuid() == 0
    log_parts: list[str] = []

    for pkg_manager, pkg_name in [
        (["apt-get", "install", "-y"], "tesseract-ocr"),
        (["dnf", "install", "-y"], "tesseract"),
        (["yum", "install", "-y"], "tesseract"),
    ]:
        cmd = ([] if is_root else ["sudo"]) + pkg_manager + [pkg_name]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            log_parts.append(f"$ {' '.join(cmd)}\n{result.stdout}{result.stderr}")
            if result.returncode == 0:
                TESSERACT_INSTALL_STATUS["log"] = "\n".join(log_parts)
                TESSERACT_INSTALL_STATUS["state"] = "done"
                return
        except FileNotFoundError:
            log_parts.append(f"{cmd[0]} not found, trying next.")
            continue
        except Exception as e:
            log_parts.append(str(e))
            break

    TESSERACT_INSTALL_STATUS["log"] = "\n".join(log_parts)
    TESSERACT_INSTALL_STATUS["state"] = "error"


@router.get("/tesseract/status")
async def tesseract_status():
    return {
        "found": tesseract_found,
        "path": _tcmd,
        "platform": sys.platform,
        "install_state": TESSERACT_INSTALL_STATUS["state"],
        "install_log": TESSERACT_INSTALL_STATUS["log"],
    }


@router.post("/tesseract/install")
async def tesseract_install(background_tasks: BackgroundTasks):
    if sys.platform == "win32":
        return JSONResponse({"state": "windows", "url": "https://github.com/UB-Mannheim/tesseract/wiki"})
    if TESSERACT_INSTALL_STATUS["state"] == "installing":
        return {"state": "already_installing"}
    TESSERACT_INSTALL_STATUS["state"] = "installing"
    TESSERACT_INSTALL_STATUS["log"] = ""
    background_tasks.add_task(_run_tesseract_install)
    return {"state": "started"}
