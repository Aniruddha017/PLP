from typing import Any
from pydantic import BaseModel, Field


class TimetableSlot(BaseModel):
    id: str = Field(..., description="Unique ID for the slot")
    start_time: str = Field(..., description="Start time in HH:MM format (24h)")
    end_time: str = Field(..., description="End time in HH:MM format (24h)")
    subject: str = Field(..., description="Subject name or category")
    topic: str | None = Field(default=None, description="Specific topic to study or revise")
    type: str = Field(default="study", description="study | practice | review | quiz | break")
    priority: str = Field(default="medium", description="low | medium | high")
    notes: str | None = Field(default=None, description="Pedagogical hint or focus notes")


class DaySchedule(BaseModel):
    day: str = Field(..., description="Day of week (Monday - Saturday)")
    slots: list[TimetableSlot] = Field(default_factory=list)


class TimetableGenerateRequest(BaseModel):
    title: str | None = Field(default=None, description="Optional custom title for the timetable")
    focus_subjects: list[str] | None = Field(default=None, description="Optional overrides for focus subjects")
    target_exam_date: str | None = Field(default=None, description="Optional target exam date string")


class TimetableUpdateRequest(BaseModel):
    title: str | None = None
    schedule: list[dict[str, Any]] | None = None
    is_active: bool | None = None


class TimetableResponse(BaseModel):
    id: str
    user_id: str
    title: str
    schedule: list[dict[str, Any]]
    generation_context: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    created_at: str | None = None
    updated_at: str | None = None
