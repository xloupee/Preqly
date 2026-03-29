import "server-only";

import {
  getCourseJobStatusLabel,
  type CourseJobRecord,
  type CourseJobStatus,
} from "@/lib/course-job-types";
import { createClient } from "@/lib/supabase/server";

type CourseJobRow = {
  id: string;
  user_id: string;
  title: string;
  syllabus_path: string;
  syllabus_filename: string;
  status: CourseJobStatus;
  error_message: string | null;
  course_slug: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export function isMissingCourseJobsSchema(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("could not find the table") ||
    normalized.includes('relation "public.course_jobs" does not exist') ||
    normalized.includes("schema cache")
  );
}

function mapJobRow(row: CourseJobRow): CourseJobRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    syllabusPath: row.syllabus_path,
    syllabusFileName: row.syllabus_filename,
    status: row.status,
    errorMessage: row.error_message,
    courseSlug: row.course_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export async function getCourseJobsForCurrentUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        jobs: [] as CourseJobRecord[],
        schemaReady: true,
        schemaMessage: null,
      };
    }

    const { data, error } = await supabase
      .from("course_jobs")
      .select(
        "id, user_id, title, syllabus_path, syllabus_filename, status, error_message, course_slug, created_at, updated_at, completed_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingCourseJobsSchema(error.message)) {
        return {
          jobs: [] as CourseJobRecord[],
          schemaReady: false,
          schemaMessage: "Run the latest Supabase migration to enable generated course jobs.",
        };
      }

      throw new Error(error.message);
    }

    return {
      jobs: (data ?? []).map((row) => mapJobRow(row as CourseJobRow)),
      schemaReady: true,
      schemaMessage: null,
    };
  } catch (error) {
    console.error("Supabase course jobs query failed:", error);
    return {
      jobs: [] as CourseJobRecord[],
      schemaReady: false,
      schemaMessage: "We could not load generated course jobs.",
    };
  }
}
export { getCourseJobStatusLabel };
