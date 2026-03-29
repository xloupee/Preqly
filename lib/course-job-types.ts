export type CourseJobStatus = "queued" | "processing" | "ready" | "error";

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

export function getCourseJobStatusLabel(status: CourseJobStatus) {
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
