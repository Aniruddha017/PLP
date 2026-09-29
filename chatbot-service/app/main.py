from fastapi import FastAPI

from app.api.routes.chat import router as chat_router


app = FastAPI(
    title="AI Personalized Learning - Chatbot Service",
    version="0.1.0",
)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "chatbot-service",
    }


app.include_router(
    chat_router,
    prefix="/api/v1",
)
