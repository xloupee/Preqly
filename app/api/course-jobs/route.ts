import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const PDF_MIME_TYPE = "application/pdf";

function isMissingStorageOrSchema(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("could not find the table") ||
    normalized.includes('relation "public.course_jobs" does not exist') ||
    normalized.includes("schema cache") ||
    normalized.includes("bucket not found")
  );
}

function sanitizeFileName(fileName: string) {
  const sanitized = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized || "syllabus.pdf";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to generate a course." }, { status: 401 });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const syllabus = formData.get("file");

  if (!title) {
    return NextResponse.json({ error: "Enter a course title." }, { status: 400 });
  }

  if (!(syllabus instanceof File)) {
    return NextResponse.json({ error: "Upload a syllabus PDF." }, { status: 400 });
  }

  const fileName = syllabus.name.trim();
  const safeFileName = sanitizeFileName(fileName || "syllabus.pdf");
  const hasPdfExtension = safeFileName.endsWith(".pdf");
  const mimeType = syllabus.type || PDF_MIME_TYPE;

  if (!hasPdfExtension && mimeType !== PDF_MIME_TYPE) {
    return NextResponse.json({ error: "Only PDF files are supported right now." }, { status: 400 });
  }

  if (syllabus.size > MAX_PDF_SIZE_BYTES) {
    return NextResponse.json({ error: "PDFs must be 10 MB or smaller." }, { status: 400 });
  }

  const jobId = randomUUID();
  const storagePath = `${user.id}/course-jobs/${jobId}-${hasPdfExtension ? safeFileName : `${safeFileName}.pdf`}`;
  const syllabusBytes = await syllabus.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from("syllabi").upload(storagePath, syllabusBytes, {
    contentType: PDF_MIME_TYPE,
    upsert: false,
  });

  if (uploadError) {
    if (isMissingStorageOrSchema(uploadError.message)) {
      return NextResponse.json(
        { error: "Run the latest Supabase migration to create course job storage before uploading." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "We could not store the syllabus PDF." }, { status: 500 });
  }

  const { data, error: insertError } = await supabase
    .from("course_jobs")
    .insert({
      id: jobId,
      user_id: user.id,
      title,
      syllabus_path: storagePath,
      syllabus_filename: fileName || "syllabus.pdf",
      status: "queued",
    })
    .select(
      "id, user_id, title, syllabus_path, syllabus_filename, status, error_message, course_slug, created_at, updated_at, completed_at",
    )
    .single();

  if (insertError) {
    await supabase.storage.from("syllabi").remove([storagePath]);

    if (isMissingStorageOrSchema(insertError.message)) {
      return NextResponse.json(
        { error: "Run the latest Supabase migration to create the course_jobs table before uploading." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "We could not create the course generation job." }, { status: 500 });
  }

  try {
    const { error: invokeError } = await supabase.functions.invoke(
      "generate-course-map",
      {
        body: {
          jobId,
        },
      },
    );

    if (invokeError) {
      const details =
        typeof invokeError.message === "string" && invokeError.message.trim()
          ? invokeError.message
          : "Could not start the course generation worker.";
      await supabase
        .from("course_jobs")
        .update({
          status: "error",
          error_message: details,
        })
        .eq("id", jobId);

      return NextResponse.json(
        {
          job: {
            ...data,
            status: "error",
            error_message: details,
          },
          jobStarted: false,
          warning: details,
        },
      );
    }
  } catch {
    await supabase
      .from("course_jobs")
      .update({
        status: "error",
        error_message: "Could not reach the Supabase Edge Function for course generation.",
      })
      .eq("id", jobId);

    return NextResponse.json(
      {
        job: {
          ...data,
          status: "error",
          error_message: "Could not reach the Supabase Edge Function for course generation.",
        },
        jobStarted: false,
        warning: "Could not reach the Supabase Edge Function for course generation.",
      },
    );
  }

  return NextResponse.json({ job: data, jobStarted: true, warning: null });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to remove a course job." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const jobId =
    typeof (body as { jobId?: unknown })?.jobId === "string"
      ? (body as { jobId: string }).jobId.trim()
      : "";

  if (!jobId) {
    return NextResponse.json({ error: "Provide a course job to remove." }, { status: 400 });
  }

  const { data: job, error: selectError } = await supabase
    .from("course_jobs")
    .select("id, user_id, syllabus_path")
    .eq("id", jobId)
    .maybeSingle();

  if (selectError) {
    if (isMissingStorageOrSchema(selectError.message)) {
      return NextResponse.json(
        { error: "Run the latest Supabase migration to enable generated course jobs." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "We could not find that course job." }, { status: 404 });
  }

  if (!job) {
    return NextResponse.json({ error: "We could not find that course job." }, { status: 404 });
  }

  if (job.user_id !== user.id) {
    return NextResponse.json({ error: "You do not have access to this course job." }, { status: 403 });
  }

  const { error: deleteError } = await supabase.from("course_jobs").delete().eq("id", jobId);

  if (deleteError) {
    if (isMissingStorageOrSchema(deleteError.message)) {
      return NextResponse.json(
        { error: "Run the latest Supabase migration to enable generated course jobs." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "We could not remove this course job." }, { status: 500 });
  }

  if (job.syllabus_path) {
    await supabase.storage.from("syllabi").remove([job.syllabus_path]);
  }

  return NextResponse.json({ ok: true, jobId });
}
