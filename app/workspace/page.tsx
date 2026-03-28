import { redirect } from "next/navigation";

import { CourseMapWorkspace } from "@/components/course-map-workspace";
import { WorkspaceClassState } from "@/components/workspace-class-state";
import { getAllCourses } from "@/lib/course-library";
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

  return (
    <main className="workspace-route">
      <section className="course-hero">
        {activeCourse ? (
          <CourseMapWorkspace
            course={activeCourse}
            courses={courses}
            userEmail={user.email ?? null}
          />
        ) : (
          <WorkspaceClassState activeClass={null} schemaReady />
        )}
      </section>
    </main>
  );
}
