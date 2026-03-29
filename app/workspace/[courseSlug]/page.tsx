import { notFound, redirect } from "next/navigation";

import { CourseMapWorkspace } from "@/components/course-map-workspace";
import { getCourseBySlug, getCourseLibraryState } from "@/lib/course-library";
import { loadMapLayoutForCurrentUser } from "@/lib/map-layouts";
import { loadNodeProgressForCurrentUser } from "@/lib/node-progress";
import { loadPersonalGraphForCurrentUser } from "@/lib/personal-graphs";
import { createClient } from "@/lib/supabase/server";

type CourseWorkspacePageProps = {
  params: Promise<{ courseSlug: string }>;
  searchParams?: Promise<{
    focus?: string;
    fromMinimap?: string;
  }>;
};

export default async function CourseWorkspacePage({
  params,
  searchParams,
}: CourseWorkspacePageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { courseSlug } = await params;
  const [course, courseLibrary] = await Promise.all([
    getCourseBySlug(courseSlug),
    getCourseLibraryState(),
  ]);

  if (!course) {
    notFound();
  }
  const { courses, courseJobs, jobsEnabled, jobsMessage } = courseLibrary;

  const focusedSlug = resolvedSearchParams?.focus ?? null;
  const animateFromMinimap = resolvedSearchParams?.fromMinimap === "1";

  const mapKey = `course:${course.slug}`;
  const [
    { course: resolvedCourse, schemaReady: graphSchemaReady, schemaMessage: graphSchemaMessage },
    { positions: initialLayoutPositions, schemaReady: layoutSchemaReady, schemaMessage: layoutSchemaMessage },
    {
      completedNodeIds: initialCompletedNodeIds,
      schemaReady: progressSchemaReady,
      schemaMessage: progressSchemaMessage,
    },
  ] = await Promise.all([
    loadPersonalGraphForCurrentUser(course, mapKey),
    loadMapLayoutForCurrentUser(mapKey),
    loadNodeProgressForCurrentUser(mapKey),
  ]);

  return (
    <main className="workspace-route">
      <section className="course-hero">
        <CourseMapWorkspace
          course={resolvedCourse}
          courses={courses}
          courseJobs={courseJobs}
          courseJobsEnabled={jobsEnabled}
          courseJobsMessage={jobsMessage}
          graphPersistenceEnabled={graphSchemaReady}
          graphMessage={graphSchemaMessage}
          userEmail={user.email ?? null}
          mapKey={mapKey}
          initialSelectedSlug={focusedSlug}
          animateFromMinimap={animateFromMinimap}
          initialLayoutPositions={initialLayoutPositions}
          layoutPersistenceEnabled={layoutSchemaReady}
          layoutMessage={layoutSchemaMessage}
          initialCompletedNodeIds={initialCompletedNodeIds}
          progressPersistenceEnabled={progressSchemaReady}
          progressMessage={progressSchemaMessage}
        />
      </section>
    </main>
  );
}
