import asyncio
import structlog
import json
import urllib.request
import tarfile
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, Body
from models.schemas import ExtractionRequest, ExtractionResult
from services.dispatcher import dispatch

logger = structlog.get_logger()
router = APIRouter()

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
SETTINGS_FILE = MODELS_DIR / "settings.json"

SUPPORTED_MODELS = {
    "en_core_web_sm": {"name": "English (sm)", "lang": "en"},
    "fr_core_news_sm": {"name": "French (sm)", "lang": "fr"},
    "ru_core_news_sm": {"name": "Russian (sm)", "lang": "ru"},
    "es_core_news_sm": {"name": "Spanish (sm)", "lang": "es"},
    "de_core_news_sm": {"name": "German (sm)", "lang": "de"},
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
    if not MODELS_DIR.exists():
        return False
    for p in MODELS_DIR.glob(f"**/{model_name}*"):
        if (p / "config.cfg").exists():
            return True
    return False

def run_download(model_name: str):
    try:
        DOWNLOAD_STATUS[model_name] = "downloading"
        url = f"https://github.com/explosion/spacy-models/releases/download/{model_name}-3.7.5/{model_name}-3.7.5.tar.gz"
        dest_tar = MODELS_DIR / f"{model_name}.tar.gz"
        MODELS_DIR.mkdir(exist_ok=True)
        urllib.request.urlretrieve(url, dest_tar)
        with tarfile.open(dest_tar, "r:gz") as tar:
            tar.extractall(path=MODELS_DIR)
        dest_tar.unlink()
        DOWNLOAD_STATUS[model_name] = "installed"
    except Exception as e:
        DOWNLOAD_STATUS[model_name] = f"error: {str(e)}"

@router.post("/extract", response_model=ExtractionResult)
async def extract(req: ExtractionRequest) -> ExtractionResult:
    logger.info("Starting extraction", file_id=req.file_id, mime=req.mime_type, window_size=req.window_size)
    return await asyncio.to_thread(dispatch, req.file_id, req.storage_path, req.mime_type, req.window_size)

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

