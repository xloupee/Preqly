export type ClassStatus = "uploaded" | "processing" | "ready" | "error";

export type ClassRow = {
  id: string;
  user_id: string;
  title: string;
  syllabus_path: string;
  syllabus_filename: string;
  status: ClassStatus;
  created_at: string;
  updated_at: string;
};

export type ClassRecord = {
  id: string;
  userId: string;
  title: string;
  syllabusPath: string;
  syllabusFilename: string;
  status: ClassStatus;
  createdAt: string;
  updatedAt: string;
};

const demoTimestamp = "2026-03-28T00:00:00.000Z";

export const DEMO_CLASS_RECORD: ClassRecord = {
  id: "demo-cs50",
  userId: "demo-user",
  title: "CS50",
  syllabusPath: "demo/cs50.pdf",
  syllabusFilename: "CS50 demo syllabus.pdf",
  status: "ready",
  createdAt: demoTimestamp,
  updatedAt: demoTimestamp,
};

export function mapClassRow(row: ClassRow): ClassRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    syllabusPath: row.syllabus_path,
    syllabusFilename: row.syllabus_filename,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getClassStatusLabel(status: ClassStatus) {
  switch (status) {
    case "uploaded":
      return "Uploaded";
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
