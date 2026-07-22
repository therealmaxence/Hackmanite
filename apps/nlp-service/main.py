import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
import uvicorn

from db import kuzu_db
from routers import extract, graph as graph_router, tesseract as tesseract_router

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger()

app = FastAPI(title="DataLake NLP Service", description="Entity extraction pipeline for Hackmanite", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://web:3000"],
    allow_methods=["POST", "GET", "DELETE"],
    allow_headers=["*"],
)
app.include_router(extract.router)
app.include_router(graph_router.router)
app.include_router(tesseract_router.router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "nlp-service"}

@app.on_event("startup")
async def startup_event():
    logger.info("NLP service starting up")
    kuzu_db.init_schema()
    logger.info("KuzuDB ready")

if __name__ == "__main__":
    port = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 8000
    host = sys.argv[sys.argv.index("--host") + 1] if "--host" in sys.argv else "127.0.0.1"
    uvicorn.run(app, host=host, port=port)
