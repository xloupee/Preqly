export type CourseJobStatus = "queued" | "processing" | "ready" | "error";

export const STUCK_COURSE_JOB_THRESHOLD_MS = 15_000;

export type CourseJobRecord = {
  id: string;
  userId: string;
  title: string;
  syllabusPath: string;
  syllabusFileName: string;
  status: CourseJobStatus;
  errorMessage: string | null;
  courseSlug: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export function isCourseJobStuck(job: Pick<CourseJobRecord, "status" | "createdAt" | "updatedAt">, now = Date.now()) {
  if (job.status !== "queued") {
    return false;
  }

  const timestamp = Date.parse(job.updatedAt || job.createdAt);

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return now - timestamp >= STUCK_COURSE_JOB_THRESHOLD_MS;
}

export function getCourseJobStatusLabel(status: CourseJobStatus, isStuck = false) {
  if (status === "queued" && isStuck) {
    return "Stuck";
  }

  switch (status) {
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "ready":
      return "Ready";
    case "error":
      return "Needs attention";
    default:
      return "Pending";
  }
}
