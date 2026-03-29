import "server-only";

import { getCourseJobsForCurrentUser } from "@/lib/course-jobs";
import type { CourseJobRecord } from "@/lib/course-job-types";
import {
  courseMapEdges,
  courseMapLessons,
  courseMapNodes,
} from "@/lib/course-map-data";
import type { CourseRecord } from "@/lib/course-types";
import { createClient } from "@/lib/supabase/server";

const seedCourse: CourseRecord = {
  slug: "cs50-intro",
  title: "CS50 Intro",
  summary:
    "A seeded course map used as the starter experience for prerequisite exploration.",
  source: "seed",
  createdAt: "2026-03-28T00:00:00.000Z",
  nodes: courseMapNodes,
  edges: courseMapEdges,
  lessons: courseMapLessons,
};

type CourseRow = {
  slug: string;
  title: string;
  summary: string;
  source: string;
  syllabus_filename: string | null;
  nodes: CourseRecord["nodes"];
  edges: CourseRecord["edges"];
  lessons: CourseRecord["lessons"];
  created_at: string;
};

function mapRow(row: CourseRow): CourseRecord {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    source: row.source as CourseRecord["source"],
    syllabusFileName: row.syllabus_filename ?? undefined,
    nodes: row.nodes,
    edges: row.edges,
    lessons: row.lessons,
    createdAt: row.created_at,
  };
}

function filterVisibleCourseJobs(courses: CourseRecord[], jobs: CourseJobRecord[]) {
  const knownSlugs = new Set(courses.map((course) => course.slug));

  return jobs.filter((job) => {
    if (job.status !== "ready") {
      return true;
    }

    if (!job.courseSlug) {
      return true;
    }

    return !knownSlugs.has(job.courseSlug);
  });
}

async function readCoursesFromSupabase(): Promise<CourseRecord[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("courses")
      .select(
        "slug, title, summary, source, syllabus_filename, nodes, edges, lessons, created_at",
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to read courses from Supabase:", error.message);
      return [];
    }

    return (data as CourseRow[]).map(mapRow);
  } catch (error) {
    console.error("Supabase courses query failed:", error);
    return [];
  }
}

export async function getAllCourses() {
  const dbCourses = await readCoursesFromSupabase();
  const dedupedCourses = dbCourses.filter(
    (course) => course.slug !== seedCourse.slug,
  );

  return [seedCourse, ...dedupedCourses];
}

export async function getCourseLibraryState() {
  const [courses, courseJobsState] = await Promise.all([
    getAllCourses(),
    getCourseJobsForCurrentUser(),
  ]);

  return {
    courses,
    courseJobs: filterVisibleCourseJobs(courses, courseJobsState.jobs),
    jobsEnabled: courseJobsState.schemaReady,
    jobsMessage: courseJobsState.schemaMessage,
  };
}

export async function getCourseBySlug(slug: string) {
  if (slug === seedCourse.slug) {
    return seedCourse;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("courses")
      .select(
        "slug, title, summary, source, syllabus_filename, nodes, edges, lessons, created_at",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      return undefined;
    }

    return mapRow(data as CourseRow);
  } catch {
    return undefined;
  }
}
