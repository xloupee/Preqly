"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, FolderPlus, LoaderCircle, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCourseJobStatusLabel, type CourseJobRecord } from "@/lib/course-job-types";
import { mapCourseUploadError } from "@/lib/course-map-backend";
import type { CourseRecord } from "@/lib/course-types";

type WorkspaceCourseSwitcherProps = {
  courses: CourseRecord[];
  courseJobs?: CourseJobRecord[];
  courseJobsEnabled?: boolean;
  courseJobsMessage?: string | null;
  activeCourseSlug: string | null;
};

type FormStatus = "idle" | "submitting" | "error";
type JobDeleteState = string | null;

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
  courseJobs = [],
  courseJobsEnabled = true,
  courseJobsMessage = null,
  activeCourseSlug,
}: WorkspaceCourseSwitcherProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("Upload a syllabus PDF to queue a new generated course map.");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<JobDeleteState>(null);
  const hasPendingJobs = courseJobs.some((job) => job.status === "queued" || job.status === "processing");

  useEffect(() => {
    if (!hasPendingJobs) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasPendingJobs, router]);

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
    setMessage("Uploading the syllabus and queueing the background course generator...");

    try {
      const response = await fetch("/api/course-jobs", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; warning?: string | null; jobStarted?: boolean; job?: { id: string } }
        | null;

      if (!response.ok || !payload?.job?.id) {
        throw new Error(payload?.error ?? "We could not queue this course.");
      }

      setFormStatus("idle");
      setMessage(
        payload.jobStarted === false
          ? payload.warning ?? "Course added, but the background generator needs attention. Check the sidebar job."
          : "Course queued. This list will update as the map moves through processing.",
      );
      setTitle("");
      setSelectedFile(null);
      setIsFormOpen(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      router.refresh();
    } catch (error) {
      setFormStatus("error");
      setMessage(mapCourseUploadError(error));
    }
  }

  async function handleDeleteJob(jobId: string) {
    setDeletingJobId(jobId);
    setMessage("");

    try {
      const response = await fetch("/api/course-jobs", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; jobId?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "We could not remove this course job.");
      }

      setMessage("Course job removed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not remove this course job.");
    } finally {
      setDeletingJobId(null);
    }
  }

  return (
    <section className="sidebar-class-group" aria-label="Your courses">
      <div className="sidebar-class-header">
        <div>
          <p className="sidebar-course-label">My courses</p>
          <p className="sidebar-class-subtitle">Switch between ready maps and queued syllabus jobs.</p>
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
              course.source === "seed" ? "Starter map" : course.syllabusFileName ?? "Generated from syllabus";

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
                <span className="sidebar-class-status">{formatCreatedAt(course.createdAt)}</span>
              </Link>
            );
          })
        ) : (
          <div className="sidebar-class-empty">
            <FolderPlus aria-hidden="true" />
            <span>No courses yet.</span>
          </div>
        )}

        {courseJobs.map((job) => {
          const isDeleting = deletingJobId === job.id;
          const content = (
            <>
              <div className="sidebar-class-copy">
                <span className="sidebar-class-title">{job.title}</span>
                <span className="sidebar-class-file">
                  {job.errorMessage ?? job.syllabusFileName}
                </span>
              </div>
              <span className={`sidebar-class-status sidebar-job-status is-${job.status}`}>
                {job.status === "processing" ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : job.status === "queued" ? (
                  <Sparkles aria-hidden="true" />
                ) : job.status === "error" ? (
                  <AlertCircle aria-hidden="true" />
                ) : null}
                {getCourseJobStatusLabel(job.status)}
              </span>
            </>
          );

          if (job.status === "ready" && job.courseSlug) {
            return (
              <Link
                key={job.id}
                href={`/workspace/${job.courseSlug}`}
                className="sidebar-class-item is-job is-ready"
              >
                {content}
              </Link>
            );
          }

          return (
            <div
              key={job.id}
              className={`sidebar-class-item is-job is-${job.status}`}
              aria-live={job.status === "processing" ? "polite" : undefined}
            >
              {content}
              <button
                type="button"
                className="sidebar-class-delete"
                aria-label={`Remove ${job.title}`}
                onClick={() => void handleDeleteJob(job.id)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : (
                  <Trash2 aria-hidden="true" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {!courseJobsEnabled && courseJobsMessage ? (
        <p className="sidebar-form-message is-error" role="status">
          {courseJobsMessage}
        </p>
      ) : null}

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

          <Button type="submit" size="sm" disabled={formStatus === "submitting" || !courseJobsEnabled}>
            {formStatus === "submitting" ? (
              <>
                <LoaderCircle aria-hidden="true" className="animate-spin" />
                Queueing
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
