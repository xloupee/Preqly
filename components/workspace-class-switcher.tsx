"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { FolderPlus, LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type ClassRecord } from "@/lib/class-record";

type WorkspaceClassSwitcherProps = {
  classes: ClassRecord[];
  activeClassId: string | null;
  classesEnabled?: boolean;
  classesMessage?: string | null;
};

type FormStatus = "idle" | "submitting" | "error";

function formatUploadTime(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return "Recently added";
  }

  const now = new Date();
  const isSameDay =
    timestamp.getFullYear() === now.getFullYear() &&
    timestamp.getMonth() === now.getMonth() &&
    timestamp.getDate() === now.getDate();

  return isSameDay
    ? timestamp.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : timestamp.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

export function WorkspaceClassSwitcher({
  classes,
  activeClassId,
  classesEnabled = true,
  classesMessage = null,
}: WorkspaceClassSwitcherProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState(
    classesEnabled
      ? classes.length === 0
        ? "Upload the first syllabus to create a class shell."
        : ""
      : classesMessage ?? "Run the latest Supabase migration to enable class storage.",
  );
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [isFormOpen, setIsFormOpen] = useState(classes.length === 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!classesEnabled) {
      setFormStatus("error");
      setMessage(classesMessage ?? "Run the latest Supabase migration to enable class storage.");
      return;
    }

    if (!title.trim()) {
      setFormStatus("error");
      setMessage("Enter a class title.");
      return;
    }

    if (!selectedFile) {
      setFormStatus("error");
      setMessage("Upload a syllabus PDF.");
      return;
    }

    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("syllabus", selectedFile);

    setFormStatus("submitting");
    setMessage("Creating class shell...");

    const response = await fetch("/api/classes", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; class?: { id: string } }
      | null;

    if (!response.ok || !payload?.class?.id) {
      setFormStatus("error");
      setMessage(payload?.error ?? "We could not add this class.");
      return;
    }

    setFormStatus("idle");
    setMessage("Class created. Opening workspace...");
    setTitle("");
    setSelectedFile(null);
    setIsFormOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    router.push(`/workspace?class=${payload.class.id}`);
    router.refresh();
  }

  return (
    <section className="sidebar-class-group" aria-label="Your classes">
      <div className="sidebar-class-header">
        <div>
          <p className="sidebar-course-label">My classes</p>
          <p className="sidebar-class-subtitle">Switch between uploaded course shells.</p>
        </div>
        <button
          type="button"
          className="sidebar-inline-action"
          onClick={() => setIsFormOpen((current) => !current)}
          aria-expanded={isFormOpen}
        >
          <Plus aria-hidden="true" />
          <span>{isFormOpen ? "Close" : "Add"}</span>
        </button>
      </div>

      <div className="sidebar-class-list">
        {classes.length > 0 ? (
          classes.map((course) => {
            const isActive = course.id === activeClassId;

            return (
              <Link
                key={course.id}
                href={`/workspace?class=${course.id}`}
                className={`sidebar-class-item${isActive ? " is-active" : ""}`}
              >
                <div className="sidebar-class-copy">
                  <span className="sidebar-class-title">{course.title}</span>
                  <span className="sidebar-class-file">{course.syllabusFilename}</span>
                </div>
                <span className="sidebar-class-status">
                  {formatUploadTime(course.createdAt)}
                </span>
              </Link>
            );
          })
        ) : (
          <div className="sidebar-class-empty">
            <FolderPlus aria-hidden="true" />
            <span>No classes yet.</span>
          </div>
        )}
      </div>

      {isFormOpen ? (
        <form className="sidebar-add-class-form" onSubmit={handleSubmit} noValidate>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Class title"
            aria-label="Class title"
          />

          <label className="sidebar-file-input" htmlFor="class-syllabus-upload">
            <span>{selectedFile ? selectedFile.name : "Choose syllabus PDF"}</span>
            <input
              ref={fileInputRef}
              id="class-syllabus-upload"
              type="file"
              accept="application/pdf"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <Button type="submit" size="sm" disabled={formStatus === "submitting"}>
            {formStatus === "submitting" ? (
              <>
                <LoaderCircle aria-hidden="true" className="animate-spin" />
                Uploading
              </>
            ) : (
              "Add class"
            )}
          </Button>

          {message ? (
            <p
              className={`sidebar-form-message${
                formStatus === "error" ? " is-error" : formStatus === "submitting" ? " is-pending" : ""
              }`}
              role="status"
            >
              {message}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
