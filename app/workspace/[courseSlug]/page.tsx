import { notFound, redirect } from "next/navigation";

import { CourseMapWorkspace } from "@/components/course-map-workspace";
import { getAllCourses, getCourseBySlug } from "@/lib/course-library";
import { loadMapLayoutForCurrentUser } from "@/lib/map-layouts";
import { loadNodeProgressForCurrentUser } from "@/lib/node-progress";
import { createClient } from "@/lib/supabase/server";

type CourseWorkspacePageProps = {
  params: Promise<{ courseSlug: string }>;
};

export default async function CourseWorkspacePage({
  params,
}: CourseWorkspacePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { courseSlug } = await params;
  const [course, courses] = await Promise.all([
    getCourseBySlug(courseSlug),
    getAllCourses(),
  ]);

  if (!course) {
    notFound();
  }

  const mapKey = `course:${course.slug}`;
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
          course={course}
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
