import { redirect } from "next/navigation";

import { CourseMapWorkspace } from "@/components/course-map-workspace";
import { WorkspaceClassState } from "@/components/workspace-class-state";
import { WorkspaceShell } from "@/components/workspace-shell";
import { DEMO_CLASS_RECORD, getVisibleClasses } from "@/lib/class-record";
import { listClassesForCurrentUser } from "@/lib/classes";
import { getMapKeyForClass, loadMapLayoutForCurrentUser } from "@/lib/map-layouts";
import { loadNodeProgressForCurrentUser } from "@/lib/node-progress";

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

  const effectiveClasses = getVisibleClasses(classes);
  const activeClass =
    effectiveClasses.find((course) => course.id === requestedClassId) ??
    effectiveClasses[0] ??
    null;
  const mapKey = getMapKeyForClass(activeClass);
  const {
    positions: initialLayoutPositions,
    schemaReady: layoutSchemaReady,
    schemaMessage: layoutSchemaMessage,
  } = await loadMapLayoutForCurrentUser(mapKey);
  const {
    completedNodeIds: initialCompletedNodeIds,
    schemaReady: progressSchemaReady,
    schemaMessage: progressSchemaMessage,
  } = await loadNodeProgressForCurrentUser(mapKey);

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
            <CourseMapWorkspace
              mapKey={mapKey}
              initialLayoutPositions={initialLayoutPositions}
              layoutPersistenceEnabled={layoutSchemaReady}
              layoutMessage={layoutSchemaMessage}
              initialCompletedNodeIds={initialCompletedNodeIds}
              progressPersistenceEnabled={progressSchemaReady}
              progressMessage={progressSchemaMessage}
            />
          ) : (
            <WorkspaceClassState activeClass={activeClass} schemaReady={schemaReady} schemaMessage={schemaMessage} />
          )}
        </WorkspaceShell>
      </section>
    </main>
  );
}
