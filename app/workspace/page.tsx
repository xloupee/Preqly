import { redirect } from "next/navigation";

import { CourseMapWorkspace } from "@/components/course-map-workspace";
import { WorkspaceClassState } from "@/components/workspace-class-state";
import { WorkspaceShell } from "@/components/workspace-shell";
import { DEMO_CLASS_RECORD } from "@/lib/class-record";
import { listClassesForCurrentUser } from "@/lib/classes";

type WorkspacePageProps = {
  searchParams?: Promise<{
    class?: string;
  }>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const params = await searchParams;
  const requestedClassId = params?.class ?? null;
  const { user, classes, schemaReady, schemaMessage } = await listClassesForCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  const effectiveClasses = classes.length > 0 ? classes : [DEMO_CLASS_RECORD];
  const activeClass =
    effectiveClasses.find((course) => course.id === requestedClassId) ??
    effectiveClasses[0] ??
    null;

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
          {activeClass?.status === "ready" ? (
            <CourseMapWorkspace />
          ) : (
            <WorkspaceClassState activeClass={activeClass} schemaReady={schemaReady} schemaMessage={schemaMessage} />
          )}
        </WorkspaceShell>
      </section>
    </main>
  );
}
