export function mapCourseUploadError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "We could not queue the syllabus for course generation.";
}
