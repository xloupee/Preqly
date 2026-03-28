from __future__ import annotations

import re
from collections import Counter

from app.models import (
    Flashcard,
    MultipleChoiceQuestion,
    VideoResource,
    initialize_schedule,
)


STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "best",
    "by",
    "for",
    "from",
    "how",
    "in",
    "into",
    "is",
    "it",
    "learn",
    "lesson",
    "of",
    "on",
    "or",
    "part",
    "student",
    "study",
    "students",
    "the",
    "this",
    "to",
    "topic",
    "understand",
    "video",
    "with",
    "your",
}


def extract_concepts(topic_name: str, videos: list[VideoResource], limit: int = 18) -> list[str]:
    phrase_candidates: list[str] = []
    token_candidates: list[str] = []

    for item in videos:
        title_phrases = re.split(r"[:|,-]", item.title)
        for phrase in title_phrases:
            cleaned = normalize_phrase(phrase)
            if cleaned and cleaned.lower() != topic_name.lower():
                phrase_candidates.append(cleaned)

        for token in re.findall(r"[A-Za-z][A-Za-z0-9+-]{2,}", f"{item.title} {item.description}"):
            lowered = token.lower()
            if lowered not in STOPWORDS and not lowered.isdigit():
                token_candidates.append(lowered)

    concept_counts = Counter(phrase_candidates + token_candidates)
    concepts = [topic_name]

    for concept, _ in concept_counts.most_common(limit * 2):
        formatted = concept.title() if concept.islower() else concept
        if formatted.lower() not in {existing.lower() for existing in concepts}:
            concepts.append(formatted)
        if len(concepts) >= limit:
            break

    while len(concepts) < limit:
        concepts.append(f"{topic_name} concept {len(concepts)}")

    return concepts


def normalize_phrase(phrase: str) -> str:
    cleaned = re.sub(r"\s+", " ", phrase).strip(" -_")
    if len(cleaned) < 4:
        return ""
    return cleaned


def generate_flashcards(
    topic_name: str, videos: list[VideoResource], flashcard_count: int
) -> list[Flashcard]:
    concepts = extract_concepts(topic_name, videos, limit=max(18, flashcard_count // 3))
    cards: list[Flashcard] = []
    source_video_ids = [video.video_id for video in videos]

    for index in range(flashcard_count):
        concept = concepts[index % len(concepts)]
        video = videos[index % len(videos)]
        variant = index % 5

        if variant == 0:
            front = f"What is {concept} in the context of {topic_name}?"
            back = (
                f"{concept} is a core idea highlighted by {video.channel_title}. "
                f"Use the video '{video.title}' to anchor how it fits into {topic_name}."
            )
        elif variant == 1:
            front = f"Why does {concept} matter when learning {topic_name}?"
            back = (
                f"It matters because it appears repeatedly across the top study videos. "
                f"Treat it as a prerequisite or repeated pattern to revisit."
            )
        elif variant == 2:
            front = f"How would you explain {concept} after watching '{video.title}'?"
            back = (
                f"Summarize {concept} in your own words, then compare your explanation "
                f"with the examples and framing used in the video."
            )
        elif variant == 3:
            front = f"What should you pay attention to when {concept} appears?"
            back = (
                f"Notice the definition, the worked example, and how the instructor connects "
                f"{concept} back to the larger topic."
            )
        else:
            front = f"What is one concrete example of {concept}?"
            back = (
                f"Pull an example from '{video.title}' and restate it without looking. "
                f"If you cannot, review that section again."
            )

        cards.append(
            Flashcard(
                card_id=f"card-{index + 1}",
                front=front,
                back=back,
                concept=concept,
                source_video_ids=source_video_ids,
                schedule=initialize_schedule(),
            )
        )

    return cards


def generate_mc_questions(
    topic_name: str, videos: list[VideoResource], question_count: int
) -> list[MultipleChoiceQuestion]:
    concepts = extract_concepts(topic_name, videos, limit=max(12, question_count + 4))
    distractors = concepts[1:] if len(concepts) > 1 else [f"{topic_name} review"]
    questions: list[MultipleChoiceQuestion] = []
    source_video_ids = [video.video_id for video in videos]

    for index in range(question_count):
        concept = concepts[index % len(concepts)]
        other_choices = [
            distractors[(index + 1) % len(distractors)],
            distractors[(index + 2) % len(distractors)],
            distractors[(index + 3) % len(distractors)],
        ]

        prompt_variant = index % 3
        if prompt_variant == 0:
            prompt = f"Which concept should a student focus on when reviewing {topic_name}?"
            answer = concept
        elif prompt_variant == 1:
            prompt = f"Which topic is most clearly emphasized across the selected {topic_name} videos?"
            answer = concept
        else:
            prompt = f"Which idea best fits a core checkpoint in a {topic_name} study session?"
            answer = concept

        options = [answer, *other_choices]
        options = rotate_options(options, index)

        questions.append(
            MultipleChoiceQuestion(
                question_id=f"question-{index + 1}",
                prompt=prompt,
                options=options,
                answer=answer,
                explanation=(
                    f"The question is grounded in repeated concepts extracted from the top three "
                    f"YouTube videos for {topic_name}. Revisit the matching sections to verify it."
                ),
                source_video_ids=source_video_ids,
            )
        )

    return questions


def rotate_options(options: list[str], index: int) -> list[str]:
    shift = index % len(options)
    return options[shift:] + options[:shift]
