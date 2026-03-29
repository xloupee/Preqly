"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BrainCircuit, Check, Gauge, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CourseMapLesson } from "@/lib/course-types";

type PracticeFlashcardsProps = {
  lesson: CourseMapLesson;
};

type StudyMode = "flashcards" | "learn" | "test" | "ai-video";
type LearnRating = "again" | "good" | "easy";
type CardTransitionDirection = "forward" | "backward";
type LearnCardState = {
  dueAt: number;
  intervalMs: number;
  reviews: number;
  lapses: number;
};

const MINUTE = 60_000;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

function createInitialLearnState(): LearnCardState {
  return {
    dueAt: 0,
    intervalMs: 0,
    reviews: 0,
    lapses: 0,
  };
}

function getNextInterval(state: LearnCardState, rating: LearnRating) {
  if (rating === "again") {
    return 2 * MINUTE;
  }

  if (rating === "good") {
    if (state.reviews === 0) {
      return 10 * MINUTE;
    }

    if (state.intervalMs < DAY) {
      return DAY;
    }

    return Math.round(state.intervalMs * 2.2);
  }

  if (state.reviews === 0 || state.intervalMs < DAY) {
    return 2 * DAY;
  }

  return Math.round(state.intervalMs * 3);
}

function formatIntervalLabel(intervalMs: number) {
  if (intervalMs <= 2 * MINUTE) {
    return "<2m";
  }

  if (intervalMs < HOUR) {
    return `${Math.round(intervalMs / MINUTE)}m`;
  }

  if (intervalMs < DAY) {
    return `${Math.round(intervalMs / HOUR)}h`;
  }

  return `${Math.round(intervalMs / DAY)}d`;
}

function formatTimeUntil(targetTime: number, now: number) {
  const remaining = Math.max(targetTime - now, 0);

  if (remaining < HOUR) {
    return `${Math.max(1, Math.ceil(remaining / MINUTE))} min`;
  }

  if (remaining < DAY) {
    return `${Math.ceil(remaining / HOUR)} hr`;
  }

  return `${Math.ceil(remaining / DAY)} day`;
}

export function PracticeFlashcards({ lesson }: PracticeFlashcardsProps) {
  const deck = lesson.practiceDeck;
  const practiceTest = lesson.practiceTest;
  const deckCards = deck?.cards ?? [];
  const testQuestions = practiceTest?.questions ?? [];
  const [mode, setMode] = useState<StudyMode>("flashcards");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardMotionKey, setCardMotionKey] = useState(0);
  const [cardTransitionDirection, setCardTransitionDirection] =
    useState<CardTransitionDirection>("forward");
  const [now, setNow] = useState(() => Date.now());
  const [testAnswers, setTestAnswers] = useState<Record<string, number>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [learnStates, setLearnStates] = useState<Record<string, LearnCardState>>(() =>
    Object.fromEntries(deckCards.map((card) => [card.id, createInitialLearnState()])),
  );

  const modeItems: Array<{
    id: StudyMode;
    label: string;
    disabled?: boolean;
  }> = [
    { id: "flashcards", label: "Flashcards" },
    { id: "learn", label: "Learn" },
    { id: "test", label: "Test", disabled: !practiceTest },
    { id: "ai-video", label: "AI Video" },
  ];

  const flashcard = deckCards[currentIndex];
  const dueCards = deckCards
    .filter((card) => (learnStates[card.id]?.dueAt ?? 0) <= now)
    .sort((left, right) => (learnStates[left.id]?.dueAt ?? 0) - (learnStates[right.id]?.dueAt ?? 0));
  const nextQueuedCard = deckCards
    .filter((card) => (learnStates[card.id]?.dueAt ?? 0) > now)
    .sort((left, right) => (learnStates[left.id]?.dueAt ?? 0) - (learnStates[right.id]?.dueAt ?? 0))[0];
  const nextQueuedDelayMs = nextQueuedCard ? learnStates[nextQueuedCard.id].dueAt - now : null;
  const shouldShowDoneState =
    mode === "learn" && dueCards.length === 0 && nextQueuedDelayMs !== null && nextQueuedDelayMs >= DAY;
  const activeLearnCard = dueCards[0] ?? (shouldShowDoneState ? null : nextQueuedCard ?? null);
  const activeCard = mode === "learn" ? activeLearnCard : flashcard;
  const activeLearnState = activeLearnCard ? learnStates[activeLearnCard.id] : null;
  const isQueuedFallbackCard =
    mode === "learn" && dueCards.length === 0 && Boolean(activeLearnCard && nextQueuedCard);
  const learnReviewedCount = Object.values(learnStates).filter((card) => card.reviews > 0).length;
  const answeredCount = Object.keys(testAnswers).length;
  const testScore = testQuestions.reduce((total, question) => {
    return total + (testAnswers[question.id] === question.correctChoice ? 1 : 0);
  }, 0);

  const progress =
    mode === "learn"
      ? (learnReviewedCount / Math.max(deckCards.length, 1)) * 100
      : mode === "test"
        ? (answeredCount / Math.max(testQuestions.length, 1)) * 100
        : ((currentIndex + 1) / Math.max(deckCards.length, 1)) * 100;
  const reviewedCount = mode === "learn" ? learnReviewedCount : revealedIds.length;

  const toggleCard = useCallback(() => {
    if (!activeCard) {
      return;
    }

    if (mode === "flashcards" && !isFlipped) {
      setRevealedIds((current) => (current.includes(activeCard.id) ? current : [...current, activeCard.id]));
    }

    setIsFlipped((current) => !current);
  }, [activeCard, isFlipped, mode]);

  const triggerCardTransition = useCallback((direction: CardTransitionDirection) => {
    setCardTransitionDirection(direction);
    setCardMotionKey((current) => current + 1);
  }, []);

  const goToCard = (nextIndex: number) => {
    triggerCardTransition(nextIndex >= currentIndex ? "forward" : "backward");
    setCurrentIndex(nextIndex);
    setIsFlipped(false);
  };

  const setTestAnswer = (questionId: string, choiceIndex: number) => {
    setTestAnswers((current) => ({
      ...current,
      [questionId]: choiceIndex,
    }));
  };

  const handleSubmitTest = () => {
    setTestSubmitted(true);
    triggerCardTransition("forward");
  };

  const resetTest = () => {
    setTestAnswers({});
    setTestSubmitted(false);
    triggerCardTransition("backward");
  };

  const applyLearnRating = useCallback(
    (rating: LearnRating) => {
      if (!activeLearnCard || !activeLearnState) {
        return;
      }

      const reviewedAt = Date.now();
      const nextInterval = getNextInterval(activeLearnState, rating);

      setLearnStates((current) => ({
        ...current,
        [activeLearnCard.id]: {
          dueAt: reviewedAt + nextInterval,
          intervalMs: nextInterval,
          reviews: current[activeLearnCard.id].reviews + 1,
          lapses:
            rating === "again"
              ? current[activeLearnCard.id].lapses + 1
              : current[activeLearnCard.id].lapses,
        },
      }));
      setNow(reviewedAt);
      setIsFlipped(false);
      triggerCardTransition("forward");
    },
    [activeLearnCard, activeLearnState, triggerCardTransition],
  );

  useEffect(() => {
    if (mode !== "learn") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [mode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      if (mode !== "learn" || !activeLearnCard) {
        return;
      }

      if ((event.key === " " || event.key === "Enter") && !isFlipped) {
        event.preventDefault();
        toggleCard();
        return;
      }

      if (!isFlipped) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        applyLearnRating("again");
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        applyLearnRating("good");
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        applyLearnRating("easy");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLearnCard, applyLearnRating, isFlipped, mode, toggleCard]);

  if (!deck) {
    return null;
  }

  const ratingOptions = activeLearnState
    ? [
        {
          id: "again" as const,
          label: "Again",
          shortcut: "\u2190",
          icon: X,
          interval: formatIntervalLabel(getNextInterval(activeLearnState, "again")),
        },
        {
          id: "good" as const,
          label: "Good",
          shortcut: "\u2193",
          icon: Check,
          interval: formatIntervalLabel(getNextInterval(activeLearnState, "good")),
        },
        {
          id: "easy" as const,
          label: "Easy",
          shortcut: "\u2192",
          icon: Sparkles,
          interval: formatIntervalLabel(getNextInterval(activeLearnState, "easy")),
        },
      ]
    : [];

  return (
    <article className="learn-content-card practice-deck-card" aria-label={deck.title}>
      <div className="practice-deck-header">
        <div>
          <p className="learn-sidebar-label">Practice deck</p>
          <h2>{deck.title}</h2>
        </div>
        <div className="practice-deck-stats" aria-label="Study deck metadata">
          <span>
            <Gauge aria-hidden="true" />
            {deck.estimatedMinutes}
          </span>
          <span>
            <BrainCircuit aria-hidden="true" />
            {deck.focus}
          </span>
          <span>
            <Sparkles aria-hidden="true" />
            {deck.cards.length} cards
          </span>
        </div>
      </div>

      <div className="practice-mode-row" aria-label="Study modes">
        {modeItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={[
              "practice-mode-pill",
              mode === item.id ? "is-active" : "",
              item.disabled ? "is-disabled" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={mode === item.id}
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) {
                return;
              }

              setMode(item.id);
              setIsFlipped(false);
              if (item.id !== "test") {
                setTestSubmitted(false);
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="practice-card-shell" aria-live="polite">
        <div className="practice-card-toolbar">
          <span className="practice-card-tag">
            {mode === "test"
              ? practiceTest?.title ?? "Quiz"
              : mode === "ai-video"
                ? "AI lesson video"
                : activeCard?.tag ?? "Review complete"}
          </span>
          <span className="practice-card-step">
            {mode === "test"
              ? testSubmitted
                ? `Score ${testScore}/${testQuestions.length}`
                : `${answeredCount}/${testQuestions.length} answered`
              : mode === "ai-video"
                ? "Video coming soon"
              : mode === "learn"
                ? shouldShowDoneState
                  ? "Done for now"
                  : isQueuedFallbackCard
                    ? `Next up in ${formatTimeUntil(learnStates[activeLearnCard!.id].dueAt, now)}`
                    : `${dueCards.length} due now`
                : `Card ${currentIndex + 1} / ${deck.cards.length}`}
          </span>
        </div>

        {mode === "test" && practiceTest ? (
          <div key={`test-${cardMotionKey}`} className={`practice-card-stage is-${cardTransitionDirection}`}>
            <div className="practice-test-panel">
              <div className="practice-test-header">
                <h3>{practiceTest.title}</h3>
              </div>

              {testSubmitted ? (
                <div className="practice-test-scorecard">
                  <p className="practice-test-score-kicker">Submitted</p>
                  <h4>
                    You scored {testScore} out of {testQuestions.length}
                  </h4>
                  <p>
                    {testScore === testQuestions.length
                      ? "Strong work. You answered every question correctly."
                      : "Review the marked answers below to see what to revisit."}
                  </p>
                </div>
              ) : null}

              <div className="practice-test-list">
                {testQuestions.map((question, questionIndex) => {
                  const selectedChoice = testAnswers[question.id];
                  const isCorrect = selectedChoice === question.correctChoice;

                  return (
                    <section key={question.id} className="practice-test-question">
                      <div className="practice-test-question-header">
                        <span>Question {questionIndex + 1}</span>
                        {testSubmitted ? (
                          <span
                            className={isCorrect ? "practice-test-status is-correct" : "practice-test-status is-incorrect"}
                          >
                            {isCorrect ? "Correct" : "Incorrect"}
                          </span>
                        ) : null}
                      </div>
                      <h4>{question.prompt}</h4>

                      <div className="practice-test-options">
                        {question.choices.map((choice, choiceIndex) => {
                          const isSelected = selectedChoice === choiceIndex;
                          const isCorrectChoice = question.correctChoice === choiceIndex;

                          return (
                            <button
                              key={choice}
                              type="button"
                              className={[
                                "practice-test-option",
                                isSelected ? "is-selected" : "",
                                testSubmitted && isCorrectChoice ? "is-correct" : "",
                                testSubmitted && isSelected && !isCorrectChoice ? "is-incorrect" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() => setTestAnswer(question.id, choiceIndex)}
                              disabled={testSubmitted}
                              aria-pressed={isSelected}
                            >
                              <span>{choice}</span>
                            </button>
                          );
                        })}
                      </div>

                      {testSubmitted ? (
                        <p className="practice-test-explanation">{question.explanation}</p>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        ) : mode === "ai-video" ? (
          <div key={`ai-video-${cardMotionKey}`} className={`practice-card-stage is-${cardTransitionDirection}`}>
            {lesson.aiVideoUrl ? (
              <div className="practice-video-shell">
                <video
                  className="practice-video-player"
                  controls
                  preload="metadata"
                  playsInline
                  src={lesson.aiVideoUrl}
                >
                  Your browser does not support embedded video playback.
                </video>
              </div>
            ) : (
              <div className="practice-empty-state practice-video-placeholder">
                <p className="practice-empty-title">AI video placeholder</p>
                <p className="practice-empty-copy">
                  A generated walkthrough video for this topic will appear here.
                </p>
              </div>
            )}
          </div>
        ) : activeCard ? (
          <div
            key={`${mode}-${activeCard.id}-${cardMotionKey}`}
            className={`practice-card-stage is-${cardTransitionDirection}`}
          >
            <button
              type="button"
              className={`practice-flip-card${isFlipped ? " is-flipped" : ""}`}
              onClick={toggleCard}
              aria-pressed={isFlipped}
              aria-label={isFlipped ? "Flip card back to question" : "Flip card to reveal answer"}
            >
              <div className="practice-flip-card-inner">
                <div className="practice-card-face practice-card-face-front">
                  <p className="practice-card-prompt">{activeCard.prompt}</p>
                </div>

                <div className="practice-card-face practice-card-face-back">
                  <p className="practice-answer-label">Answer</p>
                  <p className="practice-card-response">{activeCard.answer}</p>
                  <p className="practice-answer-note">{activeCard.note}</p>
                </div>
              </div>
            </button>
          </div>
        ) : shouldShowDoneState ? (
          <div key={`${mode}-done-${cardMotionKey}`} className={`practice-card-stage is-${cardTransitionDirection}`}>
            <div className="practice-empty-state">
              <p className="practice-empty-title">Done for now.</p>
              <p className="practice-empty-copy">
                {nextQueuedCard
                  ? `Your next review is in ${formatTimeUntil(learnStates[nextQueuedCard.id].dueAt, now)}.`
                  : "Every card in this session has been scheduled."}
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setMode("flashcards");
                  triggerCardTransition("backward");
                }}
              >
                Browse flashcards
              </Button>
            </div>
          </div>
        ) : null}

        <div className="practice-card-actions">
          {mode === "test" ? (
            <div className="practice-test-actions">
              {testSubmitted ? (
                <Button type="button" size="sm" variant="secondary" onClick={resetTest}>
                  Retake test
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmitTest}
                  disabled={answeredCount !== testQuestions.length}
                >
                  Submit answers
                </Button>
              )}
            </div>
          ) : mode === "ai-video" ? null : mode === "learn" ? (
            <div className="practice-rating-row" aria-label="Review ratings">
              {ratingOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className="practice-rating-button"
                    data-rating={option.id}
                    onClick={() => applyLearnRating(option.id)}
                    disabled={!isFlipped || !activeLearnCard}
                    aria-keyshortcuts={option.shortcut}
                  >
                    <span className="practice-rating-interval">{option.interval}</span>
                    <span className="practice-rating-label">
                      <Icon aria-hidden="true" />
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="practice-card-nav">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => goToCard(Math.max(currentIndex - 1, 0))}
                disabled={currentIndex === 0}
              >
                <ArrowLeft aria-hidden="true" />
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => goToCard(Math.min(currentIndex + 1, deck.cards.length - 1))}
                disabled={currentIndex === deck.cards.length - 1}
              >
                Next
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className="practice-progress">
        <div className="practice-progress-copy">
          <span>
            {mode === "test"
              ? `${answeredCount} answered`
              : mode === "ai-video"
                ? "Video placeholder"
                : `${reviewedCount} reviewed`}
          </span>
          <span>
            {mode === "test"
              ? testSubmitted
                ? `Final score: ${testScore}/${testQuestions.length}`
                : `${testQuestions.length - answeredCount} unanswered`
              : mode === "ai-video"
                ? "No video generated yet"
              : mode === "learn"
                ? shouldShowDoneState
                  ? "Done until the next day-based review"
                  : isQueuedFallbackCard
                    ? "Reviewing the next scheduled card"
                    : `${dueCards.length} due now`
                : `${deck.cards.length - reviewedCount} to go`}
          </span>
        </div>
        <div className="practice-progress-track" aria-hidden="true">
          <div className="practice-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </article>
  );
}
