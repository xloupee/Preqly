from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Optional

import httpx
from fastapi import HTTPException
from pypdf import PdfReader

from app.models import CourseRecord
from app.services.course_store import slugify

GEMINI_API_URL_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"


def extract_pdf_text(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))
    pages = [(page.extract_text() or "").strip() for page in reader.pages]
    text = "\n\n".join(page for page in pages if page)

    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="The uploaded PDF did not contain extractable text.",
        )

    return text


def build_course_graph_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "summary": {"type": "string"},
            "topics": {
                "type": "array",
                "minItems": 6,
                "maxItems": 14,
                "items": {
                    "type": "object",
                    "properties": {
                        "slug": {"type": "string"},
                        "label": {"type": "string"},
                        "summary": {"type": "string"},
                        "duration": {"type": "string"},
                        "track": {"type": "string"},
                        "status": {
                            "type": "string",
                            "enum": ["foundation", "ready", "locked", "project"],
                        },
                        "outcomes": {
                            "type": "array",
                            "minItems": 2,
                            "maxItems": 4,
                            "items": {"type": "string"},
                        },
                    },
                    "required": [
                        "slug",
                        "label",
                        "summary",
                        "duration",
                        "track",
                        "status",
                        "outcomes",
                    ],
                },
            },
            "prerequisites": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "source": {"type": "string"},
                        "target": {"type": "string"},
                        "label": {"type": "string"},
                    },
                    "required": ["source", "target"],
                },
            },
            "lessons": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "slug": {"type": "string"},
                        "headline": {"type": "string"},
                        "intro": {"type": "string"},
                        "sections": {
                            "type": "array",
                            "minItems": 2,
                            "maxItems": 3,
                            "items": {
                                "type": "object",
                                "properties": {
                                    "title": {"type": "string"},
                                    "body": {"type": "string"},
                                },
                                "required": ["title", "body"],
                            },
                        },
                        "takeaways": {
                            "type": "array",
                            "minItems": 3,
                            "maxItems": 4,
                            "items": {"type": "string"},
                        },
                        "relatedSlugs": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                    },
                    "required": [
                        "slug",
                        "headline",
                        "intro",
                        "sections",
                        "takeaways",
                        "relatedSlugs",
                    ],
                },
            },
        },
        "required": ["title", "summary", "topics", "prerequisites", "lessons"],
    }


def build_syllabus_prompt(syllabus_text: str) -> str:
    trimmed_text = syllabus_text[:50000]
    return (
        "You are designing a course knowledge graph from a syllabus PDF.\n"
        "Read the syllabus text and produce a clean prerequisite map for students.\n"
        "Requirements:\n"
        "- Infer the real course title and a concise course summary.\n"
        "- Produce 6 to 14 topic nodes in a sensible learning order.\n"
        "- The graph must be directional and acyclic.\n"
        "- There must be exactly one root topic with no prerequisites. This is the single place a student should start.\n"
        "- Every other topic must be reachable from that root through prerequisite edges.\n"
        "- Favor a branching roadmap, not a single week-by-week chain.\n"
        "- After the first foundation topic, create multiple children when the syllabus supports parallel strands.\n"
        "- Use prerequisite edges only where they are truly necessary. Keep the graph simple and readable.\n"
        "- Prefer one strong parent over many weak parents unless multiple prerequisites are clearly required.\n"
        "- Prefer broad conceptual units over tiny lecture-by-lecture nodes.\n"
        "- Keep topic labels short: usually 2 to 4 words, and avoid long labels or week-number prefixes unless essential.\n"
        "- Reserve 'project' status for the capstone or final deliverable if one exists.\n"
        "- Lesson copy should be specific to the syllabus, not generic filler.\n"
        "- Keep relation labels minimal. If you include them, use simple wording like 'builds on' or 'applies'.\n"
        "- relatedSlugs must reference other generated topic slugs.\n"
        "- Return JSON only.\n\n"
        f"Syllabus text:\n{trimmed_text}"
    )


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


async def request_structured_course_payload(syllabus_text: str) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is missing. Add it to the backend environment.",
        )

    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    url = GEMINI_API_URL_TEMPLATE.format(model=model)
    body = {
        "contents": [{"parts": [{"text": build_syllabus_prompt(syllabus_text)}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseJsonSchema": build_course_graph_schema(),
            "temperature": 0.25,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
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
            detail="Gemini returned non-JSON content for syllabus extraction.",
        ) from exc


def build_positions(
    topics: list[dict[str, Any]],
    prerequisites: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    topic_ids = [slugify(topic["slug"]) for topic in topics]
    indegree = {topic_id: 0 for topic_id in topic_ids}
    adjacency = {topic_id: [] for topic_id in topic_ids}
    parents = {topic_id: [] for topic_id in topic_ids}

    for edge in prerequisites:
        source = slugify(edge["source"])
        target = slugify(edge["target"])
        if source in adjacency and target in indegree:
            adjacency[source].append(target)
            indegree[target] += 1
            parents[target].append(source)

    levels = {topic_id: 0 for topic_id in topic_ids}
    queue = [topic_id for topic_id, count in indegree.items() if count == 0]
    root_order = {topic_id: index for index, topic_id in enumerate(queue)}

    while queue:
        current = queue.pop(0)
        for neighbor in adjacency[current]:
            levels[neighbor] = max(levels[neighbor], levels[current] + 1)
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)

    grouped: dict[int, list[str]] = {}
    for topic_id in topic_ids:
        grouped.setdefault(levels[topic_id], []).append(topic_id)

    positions: dict[str, dict[str, int]] = {}
    horizontal_gap = 220
    vertical_gap = 180
    center_x = 470

    for level in sorted(grouped):
        ids = grouped[level]
        if level == 0:
            ids.sort(key=lambda item: root_order.get(item, 0))
        else:
            ids.sort(
                key=lambda item: (
                    sum(positions[parent]["x"] for parent in parents[item])
                    / max(len(parents[item]), 1),
                    item,
                )
            )

        count = len(ids)
        for index, topic_id in enumerate(ids):
            positions[topic_id] = {
                "x": round(center_x + (index - (count - 1) / 2) * horizontal_gap),
                "y": round(90 + level * vertical_gap),
            }

    return [positions[topic_id] for topic_id in topic_ids]


async def generate_course_from_syllabus(
    file_bytes: bytes, file_name: Optional[str], title_override: Optional[str] = None
) -> CourseRecord:
    syllabus_text = extract_pdf_text(file_bytes)
    payload = await request_structured_course_payload(syllabus_text)
    topics = payload.get("topics", [])
    prerequisites = payload.get("prerequisites", [])
    lessons = payload.get("lessons", [])

    if not topics:
        raise HTTPException(
            status_code=502,
            detail="Gemini did not return any topics for this syllabus.",
        )

    positions = build_positions(topics, prerequisites)
    canonical_slugs = [slugify(topic["slug"]) for topic in topics]
    valid_slugs = set(canonical_slugs)

    nodes = []
    for index, topic in enumerate(topics):
        slug = canonical_slugs[index]
        nodes.append(
            {
                "id": f"topic-{index + 1}",
                "slug": slug,
                "label": topic["label"].strip(),
                "summary": topic["summary"].strip(),
                "status": topic["status"],
                "position": positions[index],
                "duration": topic["duration"].strip(),
                "track": topic["track"].strip(),
                "outcomes": [item.strip() for item in topic["outcomes"]],
            }
        )

    slug_to_id = {node["slug"]: node["id"] for node in nodes}
    edges = []
    for index, edge in enumerate(prerequisites):
        source = slugify(edge["source"])
        target = slugify(edge["target"])
        if source not in slug_to_id or target not in slug_to_id or source == target:
            continue

        edges.append(
            {
                "id": f"edge-{index + 1}",
                "source": slug_to_id[source],
                "target": slug_to_id[target],
                "label": None,
            }
        )

    lesson_lookup = {slugify(lesson["slug"]): lesson for lesson in lessons}
    normalized_lessons = []
    for node in nodes:
        lesson = lesson_lookup.get(node["slug"])
        if lesson is None:
            lesson = {
                "slug": node["slug"],
                "headline": f"Learn the core ideas behind {node['label']}.",
                "intro": node["summary"],
                "sections": [
                    {
                        "title": "Why it matters",
                        "body": node["summary"],
                    },
                    {
                        "title": "What to focus on",
                        "body": "Use the syllabus context and related topics to reinforce this unit.",
                    },
                ],
                "takeaways": node["outcomes"][:3],
                "relatedSlugs": [],
            }

        normalized_lessons.append(
            {
                "slug": node["slug"],
                "headline": lesson["headline"].strip(),
                "intro": lesson["intro"].strip(),
                "sections": [
                    {
                        "title": section["title"].strip(),
                        "body": section["body"].strip(),
                    }
                    for section in lesson["sections"][:3]
                ],
                "takeaways": [item.strip() for item in lesson["takeaways"][:4]],
                "relatedSlugs": [
                    slug
                    for slug in [slugify(item) for item in lesson["relatedSlugs"]]
                    if slug in valid_slugs and slug != node["slug"]
                ],
            }
        )

    course = CourseRecord.model_validate(
        {
            "slug": slugify(title_override or payload["title"]),
            "title": (title_override or payload["title"]).strip(),
            "summary": payload["summary"].strip(),
            "source": "uploaded",
            "syllabusFileName": file_name,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "nodes": nodes,
            "edges": edges,
            "lessons": normalized_lessons,
        }
    )

    return course
