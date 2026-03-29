import "server-only";

const FUNCTION_NAME = "generate-course-map";

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }

  return value;
}

async function parseFunctionError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: unknown };

    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // Ignore JSON parsing failures and fall back to status text.
  }

  return response.statusText || `Function request failed with status ${response.status}.`;
}

export async function triggerCourseJobWorker(jobId: string) {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const invokeSecret = getRequiredEnv("COURSE_JOB_INVOKE_SECRET");

  const response = await fetch(`${supabaseUrl}/functions/v1/${FUNCTION_NAME}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: publishableKey,
      "x-course-job-secret": invokeSecret,
    },
    body: JSON.stringify({ jobId }),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await parseFunctionError(response);
    throw new Error(details);
  }
}
