from pydantic import BaseModel


class ChatRequest(BaseModel):
    conversation_id: str | None = None
    message: str


class ChatResponse(BaseModel):
    message: str
