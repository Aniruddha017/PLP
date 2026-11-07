from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.chat import router as chat_router


app = FastAPI(
    title="AI Personalized Learning - Chatbot Service",
    description="Microservice for Socratic educational chat completions powered by Groq and Supabase",
    version="0.1.0",
)

# Enable CORS for frontend clients (React dev server, preview, production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
