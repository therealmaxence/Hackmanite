import asyncio
import structlog
import json
import urllib.request
import tarfile
import spacy.util
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, Body
from models.schemas import ExtractionRequest, ExtractionResult
from services.dispatcher import dispatch

logger = structlog.get_logger()
router = APIRouter()

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
SETTINGS_FILE = MODELS_DIR / "settings.json"

SUPPORTED_MODELS = {
    "en_core_web_lg": {"name": "English (Large)", "lang": "en"},
    "en_core_web_md": {"name": "English (Medium)", "lang": "en"},
    "en_core_web_sm": {"name": "English (Small)", "lang": "en"},
    "fr_core_news_lg": {"name": "French (Large)", "lang": "fr"},
    "fr_core_news_md": {"name": "French (Medium)", "lang": "fr"},
    "fr_core_news_sm": {"name": "French (Small)", "lang": "fr"},
    "ru_core_news_lg": {"name": "Russian (Large)", "lang": "ru"},
    "ru_core_news_md": {"name": "Russian (Medium)", "lang": "ru"},
    "ru_core_news_sm": {"name": "Russian (Small)", "lang": "ru"},
    "es_core_news_lg": {"name": "Spanish (Large)", "lang": "es"},
    "es_core_news_md": {"name": "Spanish (Medium)", "lang": "es"},
    "es_core_news_sm": {"name": "Spanish (Small)", "lang": "es"},
    "de_core_news_lg": {"name": "German (Large)", "lang": "de"},
    "de_core_news_md": {"name": "German (Medium)", "lang": "de"},
    "de_core_news_sm": {"name": "German (Small)", "lang": "de"},
    "zh_core_web_lg": {"name": "Chinese (Large)", "lang": "zh"},
    "zh_core_web_md": {"name": "Chinese (Medium)", "lang": "zh"},
    "zh_core_web_sm": {"name": "Chinese (Small)", "lang": "zh"},
    "ja_core_news_lg": {"name": "Japanese (Large)", "lang": "ja"},
    "ja_core_news_md": {"name": "Japanese (Medium)", "lang": "ja"},
    "ja_core_news_sm": {"name": "Japanese (Small)", "lang": "ja"},
    "pt_core_news_lg": {"name": "Portuguese (Large)", "lang": "pt"},
    "pt_core_news_md": {"name": "Portuguese (Medium)", "lang": "pt"},
    "pt_core_news_sm": {"name": "Portuguese (Small)", "lang": "pt"},
    "it_core_news_lg": {"name": "Italian (Large)", "lang": "it"},
    "it_core_news_md": {"name": "Italian (Medium)", "lang": "it"},
    "it_core_news_sm": {"name": "Italian (Small)", "lang": "it"},
    "nl_core_news_lg": {"name": "Dutch (Large)", "lang": "nl"},
    "nl_core_news_md": {"name": "Dutch (Medium)", "lang": "nl"},
    "nl_core_news_sm": {"name": "Dutch (Small)", "lang": "nl"},
    "pl_core_news_lg": {"name": "Polish (Large)", "lang": "pl"},
    "pl_core_news_md": {"name": "Polish (Medium)", "lang": "pl"},
    "pl_core_news_sm": {"name": "Polish (Small)", "lang": "pl"},
    "el_core_news_lg": {"name": "Greek (Large)", "lang": "el"},
    "el_core_news_md": {"name": "Greek (Medium)", "lang": "el"},
    "el_core_news_sm": {"name": "Greek (Small)", "lang": "el"},
    "ro_core_news_lg": {"name": "Romanian (Large)", "lang": "ro"},
    "ro_core_news_md": {"name": "Romanian (Medium)", "lang": "ro"},
    "ro_core_news_sm": {"name": "Romanian (Small)", "lang": "ro"},
    "ca_core_news_lg": {"name": "Catalan (Large)", "lang": "ca"},
    "ca_core_news_md": {"name": "Catalan (Medium)", "lang": "ca"},
    "ca_core_news_sm": {"name": "Catalan (Small)", "lang": "ca"},
    "hr_core_news_lg": {"name": "Croatian (Large)", "lang": "hr"},
    "hr_core_news_md": {"name": "Croatian (Medium)", "lang": "hr"},
    "hr_core_news_sm": {"name": "Croatian (Small)", "lang": "hr"},
    "da_core_news_lg": {"name": "Danish (Large)", "lang": "da"},
    "da_core_news_md": {"name": "Danish (Medium)", "lang": "da"},
    "da_core_news_sm": {"name": "Danish (Small)", "lang": "da"},
    "fi_core_news_lg": {"name": "Finnish (Large)", "lang": "fi"},
    "fi_core_news_md": {"name": "Finnish (Medium)", "lang": "fi"},
    "fi_core_news_sm": {"name": "Finnish (Small)", "lang": "fi"},
    "ko_core_news_lg": {"name": "Korean (Large)", "lang": "ko"},
    "ko_core_news_md": {"name": "Korean (Medium)", "lang": "ko"},
    "ko_core_news_sm": {"name": "Korean (Small)", "lang": "ko"},
    "nb_core_news_lg": {"name": "Norwegian (Large)", "lang": "nb"},
    "nb_core_news_md": {"name": "Norwegian (Medium)", "lang": "nb"},
    "nb_core_news_sm": {"name": "Norwegian (Small)", "lang": "nb"},
    "sv_core_news_lg": {"name": "Swedish (Large)", "lang": "sv"},
    "sv_core_news_md": {"name": "Swedish (Medium)", "lang": "sv"},
    "sv_core_news_sm": {"name": "Swedish (Small)", "lang": "sv"},
    "uk_core_news_lg": {"name": "Ukrainian (Large)", "lang": "uk"},
    "uk_core_news_md": {"name": "Ukrainian (Medium)", "lang": "uk"},
    "uk_core_news_sm": {"name": "Ukrainian (Small)", "lang": "uk"},
}

DOWNLOAD_STATUS = {}

def get_selected_model() -> str:
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f).get("selected", "auto")
        except Exception:
            pass
    return "auto"

def is_model_installed(model_name: str) -> bool:
    try:
        if spacy.util.is_package(model_name):
            return True
    except Exception:
        pass
    if not MODELS_DIR.exists():
        return False
    for p in MODELS_DIR.glob(f"**/{model_name}*"):
        if (p / "config.cfg").exists():
            return True
    return False

def run_download(model_name: str):
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
        DOWNLOAD_STATUS[model_name] = f"error: {str(e)}"

def sanitize_surrogates(val):
    if isinstance(val, str):
        try:
            return val.encode("utf-16", "surrogatepass").decode("utf-16", "ignore")
        except Exception:
            return val
    elif isinstance(val, list):
        return [sanitize_surrogates(x) for x in val]
    elif isinstance(val, dict):
        return {k: sanitize_surrogates(v) for k, v in val.items()}
    elif hasattr(val, "__dict__"):
        for k, v in list(val.__dict__.items()):
            setattr(val, k, sanitize_surrogates(v))
    return val

@router.post("/extract", response_model=ExtractionResult)
async def extract(req: ExtractionRequest) -> ExtractionResult:
    logger.info("Starting extraction", file_id=req.file_id, mime=req.mime_type, window_size=req.window_size)
    res = await asyncio.to_thread(dispatch, req.file_id, req.storage_path, req.mime_type, req.window_size)
    return sanitize_surrogates(res)

@router.get("/spacy-models")
async def list_models():
    selected = get_selected_model()
    models_list = []
    for m_id, m_info in SUPPORTED_MODELS.items():
        status = DOWNLOAD_STATUS.get(m_id)
        if not status:
            status = "installed" if is_model_installed(m_id) else "not_installed"
        models_list.append({
            "id": m_id,
            "name": m_info["name"],
            "lang": m_info["lang"],
            "status": status
        })
    return {"models": models_list, "selected": selected}

@router.post("/spacy-models/select")
async def select_model(payload: dict = Body(...)):
    model_name = payload.get("model", "auto")
    MODELS_DIR.mkdir(exist_ok=True)
    with open(SETTINGS_FILE, "w") as f:
        json.dump({"selected": model_name}, f)
    return {"status": "ok", "selected": model_name}

@router.post("/spacy-models/download")
async def download_model(background_tasks: BackgroundTasks, payload: dict = Body(...)):
    model_name = payload.get("model")
    if not model_name or model_name not in SUPPORTED_MODELS:
        return {"error": "Invalid model name"}
    
    status = DOWNLOAD_STATUS.get(model_name)
    if status == "downloading":
        return {"status": "already_downloading"}
        
    DOWNLOAD_STATUS[model_name] = "downloading"
    background_tasks.add_task(run_download, model_name)
    return {"status": "started"}

