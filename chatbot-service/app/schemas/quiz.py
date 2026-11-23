from pydantic import BaseModel


class QuizQuestion(BaseModel):
    id: int
    question: str
    options: list[str]
    correct_option_index: int
    explanation: str
    key_formula: str = ""


class QuizGenerateRequest(BaseModel):
    subject: str
    topic: str
    difficulty: str = "intermediate"  # beginner, intermediate, advanced
    conversation_id: str | None = None


class QuizGenerateResponse(BaseModel):
    subject: str
    topic: str
    difficulty: str
    questions: list[QuizQuestion]


class StudentAnswer(BaseModel):
    question_id: int
    selected_option_index: int


class QuizEvaluateRequest(BaseModel):
    subject: str
    topic: str
    conversation_id: str | None = None
    questions: list[QuizQuestion]
    student_answers: list[StudentAnswer]


class QuizEvaluateResponse(BaseModel):
    subject: str
    topic: str
    score: int
    total: int
    percentage: int
    new_mastery_percentage: int
    feedback_summary: str
    details: list[dict] = []
