"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Layers,
  LoaderCircle,
  RotateCcw,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

type Video = {
  video_id: string;
  title: string;
  description: string;
  channel_title: string;
  published_at: string;
  thumbnail_url: string;
  url: string;
};

type FlashcardSchedule = {
  box: number;
  interval_days: number;
  ease_factor: number;
  due_at: string;
  last_reviewed_at: string | null;
};

type Flashcard = {
  card_id: string;
  front: string;
  back: string;
  concept: string;
  source_video_ids: string[];
  schedule: FlashcardSchedule;
};

type Rating = "again" | "hard" | "good" | "easy";

type StudyPhase = "idle" | "loading" | "studying" | "error" | "done";

type TopicFlashcardsProps = {
  topicName: string;
};

export function TopicFlashcards({ topicName }: TopicFlashcardsProps) {
  const [phase, setPhase] = useState<StudyPhase>("idle");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewed, setReviewed] = useState(0);

  async function handleGenerate() {
    setPhase("loading");
    setMessage("Finding study videos...");

    try {
      const teachResponse = await fetch(`${backendUrl}/api/teach-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic_name: topicName, max_results: 3 }),
      });

      const teachPayload = await teachResponse.json();

      if (!teachResponse.ok || !teachPayload.videos?.length) {
        throw new Error(
          teachPayload.detail ?? "Could not find study videos for this topic.",
        );
      }

      setMessage("Generating flashcards from videos...");

      const flashcardResponse = await fetch(
        `${backendUrl}/api/flashcard-agent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic_name: topicName,
            videos: teachPayload.videos.slice(0, 3),
            flashcard_count: 10,
          }),
        },
      );

      const flashcardPayload = await flashcardResponse.json();

      if (!flashcardResponse.ok || !flashcardPayload.flashcards?.length) {
        throw new Error(
          flashcardPayload.detail ?? "Could not generate flashcards.",
        );
      }

      setCards(flashcardPayload.flashcards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setReviewed(0);
      setPhase("studying");
    } catch (error) {
      setPhase("error");
      setMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    }
  }

  async function handleRate(rating: Rating) {
    const card = cards[currentIndex];
    if (!card) return;

    try {
      const response = await fetch(
        `${backendUrl}/api/flashcard-agent/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schedule: card.schedule, rating }),
        },
      );

      if (response.ok) {
        const payload = await response.json();
        const updated = [...cards];
        updated[currentIndex] = {
          ...card,
          schedule: payload.updated_schedule,
        };
        setCards(updated);
      }
    } catch {
      // Review scheduling is best-effort
    }

    const nextReviewed = reviewed + 1;
    setReviewed(nextReviewed);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      setPhase("done");
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setReviewed(0);
    setPhase("studying");
  }

  if (phase === "idle") {
    return (
      <section className="flashcard-section">
        <div className="flashcard-prompt">
          <Layers aria-hidden="true" />
          <div>
            <p className="flashcard-prompt-title">Study with flashcards</p>
            <p className="flashcard-prompt-description">
              Generate AI-powered flashcards from YouTube videos about this
              topic.
            </p>
          </div>
          <Button size="sm" onClick={handleGenerate}>
            Generate
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "loading") {
    return (
      <section className="flashcard-section">
        <div className="flashcard-loading">
          <LoaderCircle className="animate-spin" aria-hidden="true" />
          <p>{message}</p>
        </div>
      </section>
    );
  }

  if (phase === "error") {
    return (
      <section className="flashcard-section">
        <div className="flashcard-error">
          <p>{message}</p>
          <Button size="sm" variant="secondary" onClick={handleGenerate}>
            Try again
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "done") {
    return (
      <section className="flashcard-section">
        <div className="flashcard-done">
          <p className="flashcard-done-title">Session complete</p>
          <p>
            You reviewed all {cards.length} cards.
          </p>
          <div className="flashcard-done-actions">
            <Button size="sm" variant="secondary" onClick={handleRestart}>
              <RotateCcw aria-hidden="true" />
              Study again
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPhase("idle")}
            >
              <X aria-hidden="true" />
              Close
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const card = cards[currentIndex];

  return (
    <section className="flashcard-section">
      <div className="flashcard-header">
        <button
          type="button"
          className="flashcard-close"
          onClick={() => setPhase("idle")}
          aria-label="Close flashcards"
        >
          <ChevronLeft aria-hidden="true" />
          <span>Close</span>
        </button>
        <span className="flashcard-progress">
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      <div className="flashcard-stage">
        <button
          type="button"
          className={`flashcard-card${isFlipped ? " is-flipped" : ""}`}
          onClick={() => setIsFlipped((f) => !f)}
          aria-label={isFlipped ? "Show question" : "Show answer"}
        >
          <div className="flashcard-face flashcard-front">
            <p className="flashcard-concept">{card.concept}</p>
            <p className="flashcard-text">{card.front}</p>
            <p className="flashcard-hint">Tap to reveal</p>
          </div>
          <div className="flashcard-face flashcard-back">
            <p className="flashcard-concept">{card.concept}</p>
            <p className="flashcard-text">{card.back}</p>
          </div>
        </button>
      </div>

      {isFlipped ? (
        <div className="flashcard-ratings">
          <button
            type="button"
            className="flashcard-rating flashcard-rating-again"
            onClick={() => handleRate("again")}
          >
            Again
          </button>
          <button
            type="button"
            className="flashcard-rating flashcard-rating-hard"
            onClick={() => handleRate("hard")}
          >
            Hard
          </button>
          <button
            type="button"
            className="flashcard-rating flashcard-rating-good"
            onClick={() => handleRate("good")}
          >
            Good
          </button>
          <button
            type="button"
            className="flashcard-rating flashcard-rating-easy"
            onClick={() => handleRate("easy")}
          >
            Easy
          </button>
        </div>
      ) : (
        <div className="flashcard-nav">
          <button
            type="button"
            className="flashcard-nav-button"
            onClick={() => {
              setCurrentIndex(Math.max(0, currentIndex - 1));
              setIsFlipped(false);
            }}
            disabled={currentIndex === 0}
            aria-label="Previous card"
          >
            <ArrowLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="flashcard-nav-button"
            onClick={() => {
              setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1));
              setIsFlipped(false);
            }}
            disabled={currentIndex === cards.length - 1}
            aria-label="Next card"
          >
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
