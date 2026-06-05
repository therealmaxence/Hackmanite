import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import extract, graph as graph_router
from db import kuzu_db

# Configure structlog
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)

logger = structlog.get_logger()

app = FastAPI(
    title="DataLake NLP Service",
    description="Entity extraction pipeline for Hackmanite",
    version="1.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://web:3000"],
    allow_methods=["POST", "GET", "DELETE"],
    allow_headers=["*"],
)

app.include_router(extract.router)
app.include_router(graph_router.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "nlp-service"}


@app.on_event("startup")
async def startup_event():
    logger.info("NLP service starting up")
    # Initialize KuzuDB schema (creates tables if they don't exist)
    kuzu_db.init_schema()
    logger.info("KuzuDB ready")


if __name__ == "__main__":
    import uvicorn
    import sys
    
    port = 8000
    host = "127.0.0.1"
    
    for i, arg in enumerate(sys.argv):
        if arg == "--port" and i + 1 < len(sys.argv):
            port = int(sys.argv[i + 1])
        if arg == "--host" and i + 1 < len(sys.argv):
            host = sys.argv[i + 1]
            
    uvicorn.run(app, host=host, port=port)
