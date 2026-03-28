import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Compass } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { WorkspaceShell } from "@/components/workspace-shell";
import { DEMO_CLASS_RECORD } from "@/lib/class-record";
import { listClassesForCurrentUser } from "@/lib/classes";
import {
  courseMapLessons,
  getCourseLessonBySlug,
  getCourseNodeBySlug,
} from "@/lib/course-map-data";

type LearnPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return courseMapLessons.map((lesson) => ({
    slug: lesson.slug,
  }));
}

export default async function LearnTopicPage({ params }: LearnPageProps) {
  const { slug } = await params;
  const lesson = getCourseLessonBySlug(slug);
  const node = getCourseNodeBySlug(slug);
  const { user, classes, schemaReady, schemaMessage } = await listClassesForCurrentUser();

  if (!lesson || !node) {
    notFound();
  }

  if (!user) {
    redirect("/auth");
  }

  const effectiveClasses = classes.length > 0 ? classes : [DEMO_CLASS_RECORD];
  const activeClass = effectiveClasses[0] ?? DEMO_CLASS_RECORD;

  const relatedTopics = lesson.relatedSlugs
    .map((relatedSlug) => getCourseNodeBySlug(relatedSlug))
    .filter((topic) => topic !== undefined);

  return (
    <main className="workspace-route">
      <section className="course-hero">
        <WorkspaceShell
          classes={effectiveClasses}
          activeClass={activeClass}
          classesEnabled={schemaReady}
          classesMessage={schemaMessage}
          userEmail={user.email}
        >
          <section className="workspace-canvas-panel learn-panel" aria-label={`Learn more about ${node.label}`}>
            <div className="learn-page">
              <div className="learn-page-actions">
                <Button asChild size="sm" variant="secondary">
                  <Link href="/workspace">
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
                <p className="learn-page-headline">{lesson.headline}</p>
                <p className="learn-page-intro">{lesson.intro}</p>
              </header>

              <div className="learn-page-grid">
                <article className="learn-content-card">
                  {lesson.sections.map((section) => (
                    <section key={section.title} className="learn-section">
                      <h2>{section.title}</h2>
                      <p>{section.body}</p>
                    </section>
                  ))}
                </article>

                <aside className="learn-sidebar-card">
                  <div>
                    <p className="learn-sidebar-label">Key takeaways</p>
                    <div className="learn-takeaways">
                      {lesson.takeaways.map((takeaway) => (
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
                          href={`/workspace/learn/${topic.slug}`}
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
                      <Link href="/workspace">Return to workspace</Link>
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
