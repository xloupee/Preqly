import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Compass } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { PracticeFlashcards } from "@/components/learn/practice-flashcards";
import { Button } from "@/components/ui/button";
import { CourseMapMinimap } from "@/components/course-map-minimap";
import { getCourseLessonBySlug } from "@/lib/course-map-data";
import { getAllCourses, getCourseBySlug } from "@/lib/course-library";
import { loadMapLayoutForCurrentUser } from "@/lib/map-layouts";
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
  const [course, courses] = await Promise.all([
    getCourseBySlug(courseSlug),
    getAllCourses(),
  ]);

  if (!course) {
    notFound();
  }

  const lesson = course.lessons.find((entry) => entry.slug === topicSlug);
  const node = course.nodes.find((entry) => entry.slug === topicSlug);
  const seededLesson = getCourseLessonBySlug(topicSlug);
  const placeholderPracticeLesson = getCourseLessonBySlug("algorithms");

  if (!lesson || !node) {
    notFound();
  }

  const mapKey = `course:${course.slug}`;
  const { positions: initialLayoutPositions } =
    await loadMapLayoutForCurrentUser(mapKey);
  const minimapNodes = course.nodes.map((courseNode) => ({
    ...courseNode,
    position: initialLayoutPositions[courseNode.id] ?? courseNode.position,
  }));

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

  const relatedTopics = lessonWithPractice.relatedSlugs
    .map((relatedSlug) =>
      course.nodes.find((courseNode) => courseNode.slug === relatedSlug),
    )
    .filter((topic): topic is NonNullable<typeof topic> => Boolean(topic));

  return (
    <main className="workspace-route">
      <section className="course-hero">
        <WorkspaceShell
          currentCourse={course}
          courses={courses}
          userEmail={user.email ?? null}
          sidebarBottom={
            <CourseMapMinimap
              courseSlug={course.slug}
              nodes={minimapNodes}
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
                <p className="learn-page-headline">{lessonWithPractice.headline}</p>
                <p className="learn-page-intro">{lessonWithPractice.intro}</p>
              </header>

              <div className="learn-page-grid">
                <PracticeFlashcards lesson={lessonWithPractice} />

                <aside className="learn-sidebar-card">
                  <div>
                    <p className="learn-sidebar-label">Key takeaways</p>
                    <div className="learn-takeaways">
                      {lessonWithPractice.takeaways.map((takeaway) => (
                        <div key={takeaway} className="learn-takeaway">
                          <ArrowUpRight aria-hidden="true" />
                          <span>{takeaway}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="learn-sidebar-label">Related topics</p>
                    <div className="learn-related-links">
                      {relatedTopics.map((topic) => (
                        <Link
                          key={topic.slug}
                          href={`/workspace/${course.slug}/learn/${topic.slug}`}
                          className="learn-related-link"
                        >
                          <span>{topic.label}</span>
                          <ArrowUpRight aria-hidden="true" />
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="learn-sidebar-footer">
                    <p>Continue exploring the map after reviewing this topic.</p>
                    <Button asChild size="sm">
                      <Link href={`/workspace/${course.slug}`}>Return to workspace</Link>
                    </Button>
                  </div>
                </aside>
              </div>
            </div>
          </section>
        </WorkspaceShell>
      </section>
    </main>
  );
}
