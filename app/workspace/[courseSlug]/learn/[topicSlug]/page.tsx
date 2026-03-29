import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { PracticeFlashcards } from "@/components/learn/practice-flashcards";
import { Button } from "@/components/ui/button";
import { CourseMapMinimap } from "@/components/course-map-minimap";
import { getCourseLessonBySlug } from "@/lib/course-map-data";
import { getCourseBySlug, getCourseLibraryState } from "@/lib/course-library";
import { WorkspaceShell } from "@/components/workspace-shell";
import { createClient } from "@/lib/supabase/server";

type LearnPageProps = {
  params: Promise<{ courseSlug: string; topicSlug: string }>;
};

export default async function LearnTopicPage({ params }: LearnPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { courseSlug, topicSlug } = await params;
  const [course, courseLibrary] = await Promise.all([
    getCourseBySlug(courseSlug),
    getCourseLibraryState(),
  ]);

  if (!course) {
    notFound();
  }

  const { courses, courseJobs, jobsEnabled, jobsMessage } = courseLibrary;

  const lesson = course.lessons.find((entry) => entry.slug === topicSlug);
  const node = course.nodes.find((entry) => entry.slug === topicSlug);
  const seededLesson = getCourseLessonBySlug(topicSlug);
  const placeholderPracticeLesson = getCourseLessonBySlug("algorithms");

  if (!lesson || !node) {
    notFound();
  }

  const lessonWithPractice = {
    ...lesson,
    practiceDeck:
      lesson.practiceDeck ??
      seededLesson?.practiceDeck ??
      placeholderPracticeLesson?.practiceDeck,
    practiceTest:
      lesson.practiceTest ??
      seededLesson?.practiceTest ??
      placeholderPracticeLesson?.practiceTest,
  };

  return (
    <main className="workspace-route">
      <section className="course-hero">
        <WorkspaceShell
          currentCourse={course}
          courses={courses}
          courseJobs={courseJobs}
          courseJobsEnabled={jobsEnabled}
          courseJobsMessage={jobsMessage}
          userEmail={user.email ?? null}
          sidebarBottom={
            <CourseMapMinimap
              courseSlug={course.slug}
              nodes={course.nodes}
              edges={course.edges}
              activeSlug={topicSlug}
            />
          }
        >
          <section
            className="workspace-canvas-panel learn-panel"
            aria-label={`Learn more about ${node.label}`}
          >
            <div className="learn-page">
              <div className="learn-page-actions">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/workspace/${course.slug}`}>
                    <ArrowLeft aria-hidden="true" />
                    Back to map
                  </Link>
                </Button>
                <div className="learn-page-breadcrumb">
                  <Compass aria-hidden="true" />
                  <span>{node.track}</span>
                </div>
              </div>

              <header className="learn-page-header">
                <p className="learn-page-kicker">{node.duration}</p>
                <h1>{node.label}</h1>
              </header>

              <div className="learn-page-grid">
                <PracticeFlashcards lesson={lessonWithPractice} />
              </div>
            </div>
          </section>
        </WorkspaceShell>
      </section>
    </main>
  );
}
