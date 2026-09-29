from fastapi import APIRouter

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import chat_service

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    response = chat_service.generate_response(
        request.message
    )
    # TODO: Retrieve student context
    # TODO: Save conversation history

    return ChatResponse(
            message=response
    )
