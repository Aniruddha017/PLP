from fastapi import APIRouter

from app.schemas.chat import ChatRequest, ChatResponse


router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # TODO: Connect to LLM service
    # TODO: Retrieve student context
    # TODO: Save conversation history

    return ChatResponse(
        message=f"Received: {request.message}",
    )
