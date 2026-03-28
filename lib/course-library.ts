import "server-only";

import { promises as fs } from "fs";
import path from "path";

import {
  courseMapEdges,
  courseMapLessons,
  courseMapNodes,
} from "@/lib/course-map-data";
import type { CourseRecord } from "@/lib/course-types";

const generatedCoursesPath = path.join(
  process.cwd(),
  "data",
  "course-library.generated.json",
);

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

async function readGeneratedCourses(): Promise<CourseRecord[]> {
  try {
    const raw = await fs.readFile(generatedCoursesPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function getAllCourses() {
  const generatedCourses = await readGeneratedCourses();
  const dedupedGeneratedCourses = generatedCourses.filter(
    (course) => course.slug !== seedCourse.slug,
  );

  return [seedCourse, ...dedupedGeneratedCourses];
}

export async function getCourseBySlug(slug: string) {
  const courses = await getAllCourses();
  return courses.find((course) => course.slug === slug);
}
