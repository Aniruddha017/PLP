from pydantic import BaseModel


class ConceptCard(BaseModel):
    title: str
    description: str
    formula: str = ""


class ChatRequest(BaseModel):
    conversation_id: str | None = None
    message: str


class ChatResponse(BaseModel):
    message: str
    cards: list[ConceptCard] = []
    key_insight: str | None = None
