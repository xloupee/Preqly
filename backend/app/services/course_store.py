from __future__ import annotations

import json
import re
from pathlib import Path

from app.models import CourseRecord

CURRENT_FILE = Path(__file__).resolve()
REPO_ROOT = CURRENT_FILE.parents[3]
DATA_DIR = REPO_ROOT / "data"
COURSE_STORE_PATH = DATA_DIR / "course-library.generated.json"


def slugify(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return normalized or "course"


def load_generated_courses() -> list[CourseRecord]:
    if not COURSE_STORE_PATH.exists():
        return []

    raw = json.loads(COURSE_STORE_PATH.read_text(encoding="utf-8"))
    return [CourseRecord.model_validate(item) for item in raw]


def save_generated_courses(courses: list[CourseRecord]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    COURSE_STORE_PATH.write_text(
        json.dumps(
            [course.model_dump(mode="json") for course in courses],
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def ensure_unique_slug(base_slug: str, existing_slugs: set[str]) -> str:
    if base_slug not in existing_slugs:
        return base_slug

    suffix = 2
    while f"{base_slug}-{suffix}" in existing_slugs:
        suffix += 1

    return f"{base_slug}-{suffix}"


def upsert_generated_course(course: CourseRecord) -> CourseRecord:
    courses = load_generated_courses()
    existing_slugs = {item.slug for item in courses}
    course.slug = ensure_unique_slug(course.slug, existing_slugs)
    courses.append(course)
    save_generated_courses(courses)
    return course
