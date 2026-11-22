from fastapi import APIRouter, Depends
from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizEvaluateRequest,
    QuizEvaluateResponse,
)
from app.services.quiz_service import quiz_service
from app.api.routes.chat import get_current_user_optional

router = APIRouter(
    prefix="/quiz",
    tags=["Quiz"],
)


@router.post("/generate", response_model=QuizGenerateResponse)
async def generate_quiz(
    request: QuizGenerateRequest,
    current_user=Depends(get_current_user_optional),
):
    user_id = current_user.id if current_user else None

    questions = quiz_service.generate_quiz(
        subject=request.subject,
        topic=request.topic,
        difficulty=request.difficulty,
        user_id=user_id,
    )

    return QuizGenerateResponse(
        subject=request.subject,
        topic=request.topic,
        difficulty=request.difficulty,
        questions=questions,
    )


@router.post("/evaluate", response_model=QuizEvaluateResponse)
async def evaluate_quiz(
    request: QuizEvaluateRequest,
    current_user=Depends(get_current_user_optional),
):
    user_id = current_user.id if current_user else None

    result = quiz_service.evaluate_quiz(
        subject=request.subject,
        topic=request.topic,
        questions=[q.model_dump() for q in request.questions],
        student_answers=[a.model_dump() for a in request.student_answers],
        user_id=user_id,
        conversation_id=request.conversation_id,
    )

    return QuizEvaluateResponse(**result)
