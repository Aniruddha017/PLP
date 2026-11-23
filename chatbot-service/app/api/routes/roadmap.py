from fastapi import APIRouter, Depends, Header, HTTPException, status
from app.schemas.roadmap import RoadmapRequest, RoadmapResponse
from app.services.roadmap_service import roadmap_service
from app.api.routes.chat import get_current_user_optional

router = APIRouter(
    prefix="/roadmap",
    tags=["Roadmap"],
)


@router.post("/", response_model=RoadmapResponse)
async def get_or_create_roadmap(
    request: RoadmapRequest,
    current_user=Depends(get_current_user_optional),
):
    user_id = current_user.id if current_user else None

    roadmap_data = roadmap_service.generate_roadmap(
        subject=request.subject,
        topic=request.topic,
        user_id=user_id,
        conversation_id=request.conversation_id,
    )

    return RoadmapResponse(
        subject=roadmap_data.get("subject") or request.subject,
        topic=roadmap_data.get("topic") or request.topic,
        roadmap=roadmap_data.get("roadmap") or [],
        learning_outcome=roadmap_data.get("learning_outcome") or "",
    )
