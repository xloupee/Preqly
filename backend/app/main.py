from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

CURRENT_FILE = Path(__file__).resolve()
BACKEND_DIR = CURRENT_FILE.parents[1]
REPO_ROOT = CURRENT_FILE.parents[2]

load_dotenv(BACKEND_DIR / ".env")
load_dotenv(REPO_ROOT / ".env")
load_dotenv(REPO_ROOT / ".env.local")

from app.models import (
    CourseUploadResponse,
    FlashcardAgentRequest,
    FlashcardAgentResponse,
    FlashcardReviewRequest,
    FlashcardReviewResult,
    TeachAgentRequest,
    TeachAgentResponse,
    TestAgentRequest,
    TestAgentResponse,
    update_schedule,
)
from app.services.gemini import generate_flashcards_with_gemini, generate_test_with_gemini
from app.services.syllabus import generate_course_from_syllabus
from app.services.youtube import search_youtube_videos


app = FastAPI(
    title="Preqly Backend",
    version="0.1.0",
    description="FastAPI backend for teach, flashcard, and test agents.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/teach-agent", response_model=TeachAgentResponse)
async def teach_agent(payload: TeachAgentRequest) -> TeachAgentResponse:
    videos = await search_youtube_videos(
        topic_name=payload.topic_name,
        max_results=payload.max_results,
    )
    return TeachAgentResponse(topic_name=payload.topic_name, videos=videos)


@app.post("/api/flashcard-agent", response_model=FlashcardAgentResponse)
async def flashcard_agent(payload: FlashcardAgentRequest) -> FlashcardAgentResponse:
    flashcards = await generate_flashcards_with_gemini(
        topic_name=payload.topic_name,
        videos=payload.videos,
        flashcard_count=payload.flashcard_count,
    )
    return FlashcardAgentResponse(
        topic_name=payload.topic_name,
        flashcards=flashcards,
        algorithm="Gemini generates the study content. Each card then starts in box 1 with a 1-day interval for review scheduling.",
    )


@app.post("/api/flashcard-agent/review", response_model=FlashcardReviewResult)
async def review_flashcard(payload: FlashcardReviewRequest) -> FlashcardReviewResult:
    return FlashcardReviewResult(
        updated_schedule=update_schedule(payload.schedule, payload.rating)
    )


@app.post("/api/test-agent", response_model=TestAgentResponse)
async def test_agent(payload: TestAgentRequest) -> TestAgentResponse:
    questions = await generate_test_with_gemini(
        topic_name=payload.topic_name,
        videos=payload.videos,
        question_count=payload.question_count,
    )
    return TestAgentResponse(
        topic_name=payload.topic_name,
        questions=questions,
    )


@app.post("/api/course-map/upload", response_model=CourseUploadResponse)
async def upload_course_syllabus(
    file: UploadFile = File(...),
    title: Optional[str] = Form(default=None),
) -> CourseUploadResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF syllabus.")

    file_bytes = await file.read()
    course = await generate_course_from_syllabus(file_bytes, file.filename, title)
    return CourseUploadResponse(course=course)
