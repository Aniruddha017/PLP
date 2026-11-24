from fastapi import APIRouter, Depends, Header, HTTPException, status
from app.core.config import get_settings
from app.db.supabase import get_supabase_client
from app.schemas.timetable import (
    TimetableGenerateRequest,
    TimetableResponse,
    TimetableUpdateRequest,
)
from app.services.timetable_service import timetable_service

router = APIRouter(prefix="/timetable", tags=["timetable"])


# --- Helper: Authentication ---
async def get_current_user_id(authorization: str | None = Header(None)) -> str:
    """
    Extracts and validates authenticated user ID from Supabase JWT token.
    Rejects missing, invalid, or expired tokens with HTTP 401.
    """
    if not authorization:
        settings = get_settings()
        if bool(settings.debug):
            return "00000000-0000-0000-0000-000000000001"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme. Expected 'Bearer <token>'.",
        )

    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer authentication token.",
        )

    try:
        client = get_supabase_client()
        user_res = client.auth.get_user(token)
        if user_res and user_res.user:
            return user_res.user.id
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found for provided token.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {str(e)}",
        )


@router.post("/generate", response_model=TimetableResponse)
async def generate_timetable(
    payload: TimetableGenerateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Generates a personalized weekly study timetable using the student's
    academic profile, onboarding goals, mastery levels, and curriculum.
    """
    record = timetable_service.generate_timetable(
        user_id=user_id,
        title=payload.title,
        focus_subjects=payload.focus_subjects,
        target_exam_date=payload.target_exam_date,
    )
    return TimetableResponse(**record)


@router.get("/active", response_model=TimetableResponse | None)
async def get_active_timetable(
    user_id: str = Depends(get_current_user_id),
):
    """Retrieves the active weekly study timetable for the authenticated student."""
    record = timetable_service.get_active_timetable(user_id=user_id)
    if not record:
        return None
    return TimetableResponse(**record)


@router.get("/", response_model=list[dict])
async def list_timetables(
    user_id: str = Depends(get_current_user_id),
):
    """Lists all saved timetables for the authenticated student."""
    return timetable_service.list_timetables(user_id=user_id)


@router.put("/{timetable_id}", response_model=dict)
async def update_timetable(
    timetable_id: str,
    payload: TimetableUpdateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Updates slots or active flag on an existing timetable."""
    data = payload.model_dump(exclude_unset=True)
    updated = timetable_service.update_timetable(timetable_id=timetable_id, user_id=user_id, payload=data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timetable not found or not owned by user.",
        )
    return updated


@router.delete("/{timetable_id}", response_model=dict)
async def delete_timetable(
    timetable_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Deletes a student timetable."""
    success = timetable_service.delete_timetable(timetable_id=timetable_id, user_id=user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timetable not found or not owned by user.",
        )
    return {"success": True, "message": "Timetable deleted successfully."}
