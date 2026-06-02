import asyncio
import structlog
from fastapi import APIRouter
from models.schemas import ExtractionRequest, ExtractionResult
from services.dispatcher import dispatch

logger = structlog.get_logger()
router = APIRouter()


@router.post("/extract", response_model=ExtractionResult)
async def extract(req: ExtractionRequest) -> ExtractionResult:
    logger.info("Starting extraction", file_id=req.file_id, mime=req.mime_type, window_size=req.window_size)
    return await asyncio.to_thread(dispatch, req.file_id, req.storage_path, req.mime_type, req.window_size)

