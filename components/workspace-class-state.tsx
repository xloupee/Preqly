import { Clock3, FileText, Sparkles } from "lucide-react";

import { getClassStatusLabel, type ClassRecord } from "@/lib/class-record";

type WorkspaceClassStateProps = {
  activeClass: ClassRecord | null;
  schemaReady?: boolean;
  schemaMessage?: string | null;
};

export function WorkspaceClassState({
  activeClass,
  schemaReady = true,
  schemaMessage = null,
}: WorkspaceClassStateProps) {
  if (!activeClass) {
    return (
      <section className="workspace-canvas-panel" aria-label="No classes yet">
        <div className="workspace-canvas workspace-canvas-empty">
          <div className="workspace-state-card">
            <div className="workspace-state-icon">
              <Sparkles aria-hidden="true" />
            </div>
            <p className="workspace-state-kicker">Start here</p>
            <h2>Add your first class</h2>
            <p>
              {schemaReady
                ? "Upload a syllabus PDF from the sidebar to create the first course shell for this account."
                : schemaMessage ?? "Run the latest Supabase migration to enable class storage."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-canvas-panel" aria-label={`Class shell for ${activeClass.title}`}>
      <div className="workspace-canvas workspace-canvas-empty">
        <div className="workspace-state-card">
          <div className="workspace-state-icon">
            <FileText aria-hidden="true" />
          </div>
          <p className="workspace-state-kicker">{getClassStatusLabel(activeClass.status)}</p>
          <h2>{activeClass.title}</h2>
          <p className="workspace-state-body">
            Your syllabus has been uploaded and the class shell is ready. Topic extraction and the interactive
            map can plug into this state next.
          </p>

          <div className="workspace-state-meta">
            <div className="workspace-state-chip">
              <Clock3 aria-hidden="true" />
              <span>{getClassStatusLabel(activeClass.status)}</span>
            </div>
            <div className="workspace-state-chip workspace-state-chip-muted">
              <span>{activeClass.syllabusFilename}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
