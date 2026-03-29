import { redirect } from "next/navigation";

import { CourseMapWorkspace } from "@/components/course-map-workspace";
import { WorkspaceClassState } from "@/components/workspace-class-state";
import { getCourseLibraryState } from "@/lib/course-library";
import { loadMapLayoutForCurrentUser } from "@/lib/map-layouts";
import { loadNodeProgressForCurrentUser } from "@/lib/node-progress";
import { loadPersonalGraphForCurrentUser } from "@/lib/personal-graphs";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { courses, courseJobs, jobsEnabled, jobsMessage } = await getCourseLibraryState();
  const activeCourse = courses[0] ?? null;

  if (!activeCourse) {
    return (
      <main className="workspace-route">
        <section className="course-hero">
          <WorkspaceClassState activeClass={null} schemaReady />
        </section>
      </main>
    );
  }

  const mapKey = `course:${activeCourse.slug}`;
  const [
    { course: resolvedCourse, schemaReady: graphSchemaReady, schemaMessage: graphSchemaMessage },
    { positions: initialLayoutPositions, schemaReady: layoutSchemaReady, schemaMessage: layoutSchemaMessage },
    {
      completedNodeIds: initialCompletedNodeIds,
      schemaReady: progressSchemaReady,
      schemaMessage: progressSchemaMessage,
    },
  ] = await Promise.all([
    loadPersonalGraphForCurrentUser(activeCourse, mapKey),
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
