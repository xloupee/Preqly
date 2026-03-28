from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field, HttpUrl


class VideoResource(BaseModel):
    video_id: str = Field(..., description="YouTube video identifier")
    title: str
    description: str = ""
    channel_title: str
    published_at: datetime
    thumbnail_url: HttpUrl
    url: HttpUrl


class TeachAgentRequest(BaseModel):
    topic_name: str = Field(..., min_length=2, description="Topic the student wants to study")
    max_results: int = Field(5, ge=3, le=10)


class TeachAgentResponse(BaseModel):
    topic_name: str
    videos: list[VideoResource]


class FlashcardAgentRequest(BaseModel):
    topic_name: str = Field(..., min_length=2)
    videos: list[VideoResource] = Field(..., min_length=3, max_length=3)
    flashcard_count: int = Field(50, ge=10, le=100)


class FlashcardSchedule(BaseModel):
    box: int = Field(1, ge=1, le=5)
    interval_days: int = Field(1, ge=1)
    ease_factor: float = Field(2.5, ge=1.3, le=3.0)
    due_at: datetime
    last_reviewed_at: Optional[datetime] = None


class Flashcard(BaseModel):
    card_id: str
    front: str
    back: str
    concept: str
    source_video_ids: list[str]
    schedule: FlashcardSchedule


class FlashcardReviewRequest(BaseModel):
    schedule: FlashcardSchedule
    rating: Literal["again", "hard", "good", "easy"]


class FlashcardReviewResult(BaseModel):
    updated_schedule: FlashcardSchedule


class FlashcardAgentResponse(BaseModel):
    topic_name: str
    flashcards: list[Flashcard]
    algorithm: str
    generation_source: str = "gemini"


class MultipleChoiceQuestion(BaseModel):
    question_id: str
    prompt: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    answer: str
    explanation: str
    source_video_ids: list[str]


class TestAgentRequest(BaseModel):
    topic_name: str = Field(..., min_length=2)
    videos: list[VideoResource] = Field(..., min_length=3, max_length=3)
    question_count: int = Field(10, ge=5, le=20)


class TestAgentResponse(BaseModel):
    topic_name: str
    questions: list[MultipleChoiceQuestion]
    generation_source: str = "gemini"


class CourseMapPosition(BaseModel):
    x: int
    y: int


class CourseMapNode(BaseModel):
    id: str
    slug: str
    label: str
    summary: str
    status: Literal["foundation", "ready", "locked", "project"]
    position: CourseMapPosition
    duration: str
    track: str
    outcomes: list[str]


class CourseMapLessonSection(BaseModel):
    title: str
    body: str


class CourseMapLesson(BaseModel):
    slug: str
    headline: str
    intro: str
    sections: list[CourseMapLessonSection]
    takeaways: list[str]
    relatedSlugs: list[str]


class CourseMapEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None


class CourseRecord(BaseModel):
    slug: str
    title: str
    summary: str
    source: Literal["seed", "uploaded"] = "uploaded"
    syllabusFileName: Optional[str] = None
    createdAt: str
    nodes: list[CourseMapNode]
    edges: list[CourseMapEdge]
    lessons: list[CourseMapLesson]


class CourseUploadResponse(BaseModel):
    course: CourseRecord


def initialize_schedule(now: Optional[datetime] = None) -> FlashcardSchedule:
    current_time = now or datetime.now(timezone.utc)
    return FlashcardSchedule(
        due_at=current_time + timedelta(days=1),
        last_reviewed_at=None,
    )


def update_schedule(
    schedule: FlashcardSchedule, rating: Literal["again", "hard", "good", "easy"]
) -> FlashcardSchedule:
    now = datetime.now(timezone.utc)
    box = schedule.box
    ease_factor = schedule.ease_factor
    interval_days = schedule.interval_days

    if rating == "again":
        box = 1
        interval_days = 1
        ease_factor = max(1.3, ease_factor - 0.2)
    elif rating == "hard":
        box = min(5, box + 1)
        interval_days = max(2, int(interval_days * 1.2))
        ease_factor = max(1.3, ease_factor - 0.15)
    elif rating == "good":
        box = min(5, box + 1)
        interval_days = max(2, int(interval_days * ease_factor))
    else:
        box = min(5, box + 1)
        ease_factor = min(3.0, ease_factor + 0.15)
        interval_days = max(3, int(interval_days * (ease_factor + 0.3)))

    return FlashcardSchedule(
        box=box,
        interval_days=interval_days,
        ease_factor=round(ease_factor, 2),
        due_at=now + timedelta(days=interval_days),
        last_reviewed_at=now,
    )
