from pydantic import BaseModel


class RoadmapStep(BaseModel):
    step: int
    title: str
    description: str
    key_concepts: list[str] = []
    estimated_hours: float = 2.0
    practice_problem: str = ""


class RoadmapRequest(BaseModel):
    subject: str
    topic: str
    conversation_id: str | None = None


class RoadmapResponse(BaseModel):
    subject: str
    topic: str
    roadmap: list[RoadmapStep]
    learning_outcome: str = ""
