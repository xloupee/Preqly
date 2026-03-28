import { redirect } from "next/navigation";

import { CourseMapWorkspace } from "@/components/course-map-workspace";
import { WorkspaceClassState } from "@/components/workspace-class-state";
import { getAllCourses } from "@/lib/course-library";
import { loadMapLayoutForCurrentUser } from "@/lib/map-layouts";
import { loadNodeProgressForCurrentUser } from "@/lib/node-progress";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const courses = await getAllCourses();
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
    { positions: initialLayoutPositions, schemaReady: layoutSchemaReady, schemaMessage: layoutSchemaMessage },
    {
      completedNodeIds: initialCompletedNodeIds,
      schemaReady: progressSchemaReady,
      schemaMessage: progressSchemaMessage,
    },
  ] = await Promise.all([
    loadMapLayoutForCurrentUser(mapKey),
    loadNodeProgressForCurrentUser(mapKey),
  ]);

  return (
    <main className="workspace-route">
      <section className="course-hero">
        <CourseMapWorkspace
          course={activeCourse}
          courses={courses}
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
