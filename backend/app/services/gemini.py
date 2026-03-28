from __future__ import annotations

import json
import os
from typing import Any

import httpx
from fastapi import HTTPException

from app.models import (
    Flashcard,
    MultipleChoiceQuestion,
    VideoResource,
    initialize_schedule,
)


GEMINI_API_URL_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)
DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview"


async def generate_flashcards_with_gemini(
    topic_name: str, videos: list[VideoResource], flashcard_count: int
) -> list[Flashcard]:
    payload = await generate_structured_video_content(
        prompt=build_flashcard_prompt(topic_name, flashcard_count),
        videos=videos,
        schema=build_flashcard_schema(flashcard_count),
    )

    raw_flashcards = payload.get("flashcards", [])
    if len(raw_flashcards) != flashcard_count:
        raise HTTPException(
            status_code=502,
            detail=(
                f"Gemini returned {len(raw_flashcards)} flashcards instead of "
                f"the requested {flashcard_count}."
            ),
        )

    source_video_ids = [video.video_id for video in videos]
    flashcards: list[Flashcard] = []
    for index, item in enumerate(raw_flashcards, start=1):
        flashcards.append(
            Flashcard(
                card_id=f"card-{index}",
                front=item["front"].strip(),
                back=item["back"].strip(),
                concept=item["concept"].strip(),
                source_video_ids=source_video_ids,
                schedule=initialize_schedule(),
            )
        )
    return flashcards


async def generate_test_with_gemini(
    topic_name: str, videos: list[VideoResource], question_count: int
) -> list[MultipleChoiceQuestion]:
    payload = await generate_structured_video_content(
        prompt=build_test_prompt(topic_name, question_count),
        videos=videos,
        schema=build_test_schema(question_count),
    )

    raw_questions = payload.get("questions", [])
    if len(raw_questions) != question_count:
        raise HTTPException(
            status_code=502,
            detail=(
                f"Gemini returned {len(raw_questions)} questions instead of "
                f"the requested {question_count}."
            ),
        )

    source_video_ids = [video.video_id for video in videos]
    questions: list[MultipleChoiceQuestion] = []
    for index, item in enumerate(raw_questions, start=1):
        questions.append(
            MultipleChoiceQuestion(
                question_id=f"question-{index}",
                prompt=item["prompt"].strip(),
                options=[option.strip() for option in item["options"]],
                answer=item["answer"].strip(),
                explanation=item["explanation"].strip(),
                source_video_ids=source_video_ids,
            )
        )
    return questions


async def generate_structured_video_content(
    prompt: str, videos: list[VideoResource], schema: dict[str, Any]
) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is missing. Add it to the backend environment.",
        )

    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    url = GEMINI_API_URL_TEMPLATE.format(model=model)
    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    *[
                        {"file_data": {"file_uri": str(video.url)}}
                        for video in videos
                    ],
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseJsonSchema": schema,
            "temperature": 0.3,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                url,
                headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                json=body,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Failed to reach Gemini API.",
        ) from exc

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API request failed with status {response.status_code}: {response.text}",
        )

    payload = response.json()
    text = extract_response_text(payload)

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail="Gemini returned non-JSON content for a structured output request.",
        ) from exc


def extract_response_text(payload: dict[str, Any]) -> str:
    candidates = payload.get("candidates") or []
    if not candidates:
        raise HTTPException(status_code=502, detail="Gemini returned no candidates.")

    parts = candidates[0].get("content", {}).get("parts") or []
    for part in parts:
        text = part.get("text")
        if text:
            return text

    raise HTTPException(
        status_code=502,
        detail="Gemini returned no text in the response.",
    )


def build_flashcard_prompt(topic_name: str, flashcard_count: int) -> str:
    return (
        f"You are a study assistant. Analyze all provided YouTube videos about {topic_name} "
        f"and generate exactly {flashcard_count} high-quality flashcards for a student.\n"
        "Requirements:\n"
        "- Ground the cards in the actual video content, not generic filler.\n"
        "- Use clear, concrete concepts and avoid single-word junk concepts like 'You' or 'Much'.\n"
        "- Mix definitions, mechanisms, worked examples, comparisons, pitfalls, and applications.\n"
        "- Make the front concise and the back genuinely useful.\n"
        "- Avoid duplicates and near-duplicates.\n"
        "- Return JSON only."
    )


def build_test_prompt(topic_name: str, question_count: int) -> str:
    return (
        f"You are a study assistant. Analyze all provided YouTube videos about {topic_name} "
        f"and generate exactly {question_count} multiple-choice questions.\n"
        "Requirements:\n"
        "- Each question must test an important idea from the videos.\n"
        "- Provide exactly 4 options per question.\n"
        "- The correct answer must match one option verbatim.\n"
        "- Explanations should be short but specific.\n"
        "- Avoid trivial or duplicate questions.\n"
        "- Return JSON only."
    )


def build_flashcard_schema(flashcard_count: int) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "flashcards": {
                "type": "array",
                "minItems": flashcard_count,
                "maxItems": flashcard_count,
                "items": {
                    "type": "object",
                    "properties": {
                        "concept": {"type": "string"},
                        "front": {"type": "string"},
                        "back": {"type": "string"},
                    },
                    "required": ["concept", "front", "back"],
                },
            }
        },
        "required": ["flashcards"],
    }


def build_test_schema(question_count: int) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "minItems": question_count,
                "maxItems": question_count,
                "items": {
                    "type": "object",
                    "properties": {
                        "prompt": {"type": "string"},
                        "options": {
                            "type": "array",
                            "minItems": 4,
                            "maxItems": 4,
                            "items": {"type": "string"},
                        },
                        "answer": {"type": "string"},
                        "explanation": {"type": "string"},
                    },
                    "required": ["prompt", "options", "answer", "explanation"],
                },
            }
        },
        "required": ["questions"],
    }
