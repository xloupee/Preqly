import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Compass, FileClock, Layers3 } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { DEMO_CLASS_RECORD, getClassStatusLabel, getVisibleClasses } from "@/lib/class-record";
import { listClassesForCurrentUser } from "@/lib/classes";
import { WorkspaceShell } from "@/components/workspace-shell";

type DashboardPageProps = {
  searchParams?: Promise<{
    class?: string;
  }>;
};

function formatDashboardTime(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return "Recently";
  }

  return timestamp.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getNextStep(status: string) {
  switch (status) {
    case "ready":
      return "Open the map and continue exploring connected topics.";
    case "processing":
      return "Check back once parsing finishes and the map is generated.";
    case "uploaded":
      return "The shell exists. Parsing and topic extraction are the next product step.";
    case "error":
      return "This class needs attention before it can become explorable.";
    default:
      return "Open the class workspace to continue.";
  }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const requestedClassId = params?.class ?? null;
  const { user, classes, schemaReady, schemaMessage } = await listClassesForCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  const effectiveClasses = getVisibleClasses(classes);
  const focusClass =
    effectiveClasses.find((course) => course.id === requestedClassId) ??
    effectiveClasses[0] ??
    DEMO_CLASS_RECORD;

  const readyCount = effectiveClasses.filter((course) => course.status === "ready").length;
  const setupCount = effectiveClasses.length - readyCount;
  const recentClasses = [...effectiveClasses].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <main className="workspace-route">
      <section className="course-hero">
        <WorkspaceShell
          classes={effectiveClasses}
          activeClass={focusClass}
          classesEnabled={schemaReady}
          classesMessage={schemaMessage}
          userEmail={user.email}
        >
          <section className="workspace-canvas-panel dashboard-panel" aria-label="Dashboard overview">
            <div className="dashboard-page">
              <div className="dashboard-actions">
                <div className="dashboard-kicker">
                  <Compass aria-hidden="true" />
                  <span>Learning dashboard</span>
                </div>
                <Button asChild size="sm">
                  <Link href="/workspace">
                    <BrandLogo size={16} className="inline-brand-logo" />
                    Add class
                  </Link>
                </Button>
              </div>

              <header className="dashboard-header">
              </header>

              {!schemaReady ? (
                <div className="dashboard-notice" role="status">
                  <FileClock aria-hidden="true" />
                  <span>{schemaMessage ?? "Class storage is not fully enabled yet. Showing the built-in demo."}</span>
                </div>
              ) : null}

              <section className="dashboard-overview" aria-label="Dashboard summary">
                <article className="dashboard-stat-card">
                  <p className="dashboard-stat-label">Total classes</p>
                  <strong>{effectiveClasses.length}</strong>
                  <span>All class shells currently visible in your account.</span>
                </article>
                <article className="dashboard-stat-card">
                  <p className="dashboard-stat-label">Ready to explore</p>
                  <strong>{readyCount}</strong>
                  <span>Classes that can open directly into a complete map view.</span>
                </article>
                <article className="dashboard-stat-card">
                  <p className="dashboard-stat-label">Needs setup</p>
                  <strong>{setupCount}</strong>
                  <span>Classes that still need parsing, enrichment, or follow-up work.</span>
                </article>
              </section>

              <div className="dashboard-grid">
                <section className="dashboard-main-card">
                  <div className="dashboard-section-heading">
                    <div>
                      <p className="dashboard-section-kicker">Continue learning</p>
                      <h2>{focusClass.title}</h2>
                    </div>
                    <span className="dashboard-status-chip">{getClassStatusLabel(focusClass.status)}</span>
                  </div>

                  <p className="dashboard-section-body">{getNextStep(focusClass.status)}</p>

                  <div className="dashboard-primary-actions">
                    <Button asChild>
                      <Link href={`/workspace?class=${focusClass.id}`}>
                        Open workspace
                        <ArrowUpRight aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                      <Link href="/workspace">Manage classes</Link>
                    </Button>
                  </div>
                </section>

                <aside className="dashboard-side-column">
                  <section className="dashboard-side-card">
                    <div className="dashboard-section-heading">
                      <div>
                        <p className="dashboard-section-kicker">Recent activity</p>
                        <h2>Most recent classes</h2>
                      </div>
                    </div>

                    <div className="dashboard-class-listing">
                      {recentClasses.map((course) => (
                        <Link
                          key={course.id}
                          href={`/workspace?class=${course.id}`}
                          className="dashboard-class-card"
                        >
                          <div className="dashboard-class-copy">
                            <span className="dashboard-class-title">{course.title}</span>
                            <span className="dashboard-class-file">{course.syllabusFilename}</span>
                          </div>
                          <div className="dashboard-class-meta">
                            <span className="dashboard-class-time">{formatDashboardTime(course.createdAt)}</span>
                            <span className="dashboard-class-link">
                              Open
                              <ArrowUpRight aria-hidden="true" />
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>

                  <section className="dashboard-side-card">
                    <div className="dashboard-section-heading">
                      <div>
                        <p className="dashboard-section-kicker">Next steps</p>
                        <h2>Keep momentum</h2>
                      </div>
                    </div>

                    <div className="dashboard-next-steps">
                      <div className="dashboard-next-step">
                        <Layers3 aria-hidden="true" />
                        <span>Open the active class map and continue where you left off.</span>
                      </div>
                      <div className="dashboard-next-step">
                        <FileClock aria-hidden="true" />
                        <span>Upload another syllabus to expand the cross-class view.</span>
                      </div>
                      <div className="dashboard-next-step">
                        <BrandLogo size={18} className="dashboard-step-logo" />
                        <span>Use the dashboard as the top-level view, then dive into a class workspace.</span>
                      </div>
                    </div>
                  </section>
                </aside>
              </div>
            </div>
          </section>
        </WorkspaceShell>
      </section>
    </main>
  );
}
