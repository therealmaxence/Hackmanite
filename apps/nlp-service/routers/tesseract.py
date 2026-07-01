import subprocess
import sys
from fastapi import APIRouter, BackgroundTasks, Body
from fastapi.responses import JSONResponse
from services.ocr import get_tesseract_info

router = APIRouter()
TESSERACT_INSTALL_STATUS = {"state": "idle", "log": ""}


def _run_tesseract_install(password: str | None = None) -> None:
    TESSERACT_INSTALL_STATUS["state"] = "installing"
    try:
        if sys.platform == "darwin":
            res = subprocess.run(["brew", "install", "tesseract"], capture_output=True, text=True, timeout=300)
            TESSERACT_INSTALL_STATUS["log"] = res.stdout + res.stderr
        elif sys.platform.startswith("linux"):
            _linux_install_tesseract(password)
        else:
            TESSERACT_INSTALL_STATUS["log"] = "Windows requires manual installation."
    except Exception as e:
        TESSERACT_INSTALL_STATUS["log"] = str(e)
    found, _ = get_tesseract_info()
    TESSERACT_INSTALL_STATUS["state"] = "done" if found else "error"


def _linux_install_tesseract(password: str | None = None) -> None:
    import os
    is_root = os.geteuid() == 0
    log_parts = []
    for pm, pkg in [
        (["apt-get", "install", "-y"], "tesseract-ocr"),
        (["dnf", "install", "-y"], "tesseract"),
        (["yum", "install", "-y"], "tesseract"),
    ]:
        cmd = pm + [pkg] if is_root else (["sudo", "-S"] + pm + [pkg] if password else ["sudo"] + pm + [pkg])
        try:
            res = subprocess.run(
                cmd,
                input=f"{password}\n" if (not is_root and password) else None,
                capture_output=True,
                text=True,
                timeout=300
            )
            log_parts.append(f"$ {' '.join(cmd)}\n{res.stdout}{res.stderr}")
            if res.returncode == 0 or get_tesseract_info()[0]:
                break
        except FileNotFoundError:
            log_parts.append(f"{cmd[0]} not found.")
        except Exception as e:
            log_parts.append(str(e))
            break
    TESSERACT_INSTALL_STATUS["log"] = "\n".join(log_parts)


@router.get("/tesseract/status")
async def tesseract_status():
    found, path = get_tesseract_info()
    return {
        "found": found,
        "path": path,
        "platform": sys.platform,
        "install_state": TESSERACT_INSTALL_STATUS["state"],
        "install_log": TESSERACT_INSTALL_STATUS["log"],
    }


@router.post("/tesseract/install")
async def tesseract_install(background_tasks: BackgroundTasks, payload: dict = Body({})):
    if sys.platform == "win32":
        return JSONResponse({"state": "windows", "url": "https://github.com/UB-Mannheim/tesseract/wiki"})
    if TESSERACT_INSTALL_STATUS["state"] == "installing":
        return {"state": "already_installing"}
    TESSERACT_INSTALL_STATUS.update({"state": "installing", "log": ""})
    background_tasks.add_task(_run_tesseract_install, payload.get("password"))
    return {"state": "started"}
