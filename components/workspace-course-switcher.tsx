"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { FolderPlus, LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CourseRecord } from "@/lib/course-types";

type WorkspaceCourseSwitcherProps = {
  courses: CourseRecord[];
  activeCourseSlug: string | null;
};

type FormStatus = "idle" | "submitting" | "error";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

function formatCreatedAt(value: string) {
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

export function WorkspaceCourseSwitcher({
  courses,
  activeCourseSlug,
}: WorkspaceCourseSwitcherProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState(
    "Upload a syllabus PDF to generate a new prerequisite map.",
  );
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [isFormOpen, setIsFormOpen] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setFormStatus("error");
      setMessage("Enter a course title.");
      return;
    }

    if (!selectedFile) {
      setFormStatus("error");
      setMessage("Upload a syllabus PDF.");
      return;
    }

    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("file", selectedFile);

    setFormStatus("submitting");
    setMessage("Reading the syllabus and generating the course map...");

    try {
      const generateResponse = await fetch(
        `${backendUrl}/api/course-map/upload`,
        { method: "POST", body: formData },
      );

      const generatePayload = (await generateResponse
        .json()
        .catch(() => null)) as
        | { detail?: string; course?: CourseRecord }
        | null;

      if (!generateResponse.ok || !generatePayload?.course) {
        throw new Error(
          generatePayload?.detail ?? "We could not generate this course.",
        );
      }

      setMessage("Saving course...");

      const saveResponse = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generatePayload.course),
      });

      const savePayload = (await saveResponse.json().catch(() => null)) as
        | { error?: string; course?: { slug: string } }
        | null;

      if (!saveResponse.ok || !savePayload?.course?.slug) {
        throw new Error(
          savePayload?.error ?? "We could not save this course.",
        );
      }

      setFormStatus("idle");
      setMessage("Course generated. Opening workspace...");
      setTitle("");
      setSelectedFile(null);
      setIsFormOpen(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      router.push(`/workspace/${savePayload.course.slug}`);
      router.refresh();
    } catch (error) {
      setFormStatus("error");
      setMessage(
        error instanceof Error ? error.message : "We could not add this course.",
      );
    }
  }

  return (
    <section className="sidebar-class-group" aria-label="Your courses">
      <div className="sidebar-class-header">
        <div>
          <p className="sidebar-course-label">My courses</p>
          <p className="sidebar-class-subtitle">Switch between generated course maps.</p>
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
        {courses.length > 0 ? (
          courses.map((course) => {
            const isActive = course.slug === activeCourseSlug;
            const sourceLabel =
              course.source === "seed"
                ? "Starter map"
                : course.syllabusFileName ?? "Generated from syllabus";

            return (
              <Link
                key={course.slug}
                href={`/workspace/${course.slug}`}
                className={`sidebar-class-item${isActive ? " is-active" : ""}`}
              >
                <div className="sidebar-class-copy">
                  <span className="sidebar-class-title">{course.title}</span>
                  <span className="sidebar-class-file">{sourceLabel}</span>
                </div>
                <span className="sidebar-class-status">
                  {formatCreatedAt(course.createdAt)}
                </span>
              </Link>
            );
          })
        ) : (
          <div className="sidebar-class-empty">
            <FolderPlus aria-hidden="true" />
            <span>No courses yet.</span>
          </div>
        )}
      </div>

      {isFormOpen ? (
        <form className="sidebar-add-class-form" onSubmit={handleSubmit} noValidate>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Course title"
            aria-label="Course title"
          />

          <label className="sidebar-file-input" htmlFor="course-syllabus-upload">
            <span>{selectedFile ? selectedFile.name : "Choose syllabus PDF"}</span>
            <input
              ref={fileInputRef}
              id="course-syllabus-upload"
              type="file"
              accept="application/pdf"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <Button type="submit" size="sm" disabled={formStatus === "submitting"}>
            {formStatus === "submitting" ? (
              <>
                <LoaderCircle aria-hidden="true" className="animate-spin" />
                Generating
              </>
            ) : (
              "Add course"
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
