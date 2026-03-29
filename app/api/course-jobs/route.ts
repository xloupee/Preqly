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
  const {
    data: { session },
  } = await supabase.auth.getSession();

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
    const functionBaseUrl =
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!functionBaseUrl || !session?.access_token) {
      throw new Error("Missing Supabase function invocation credentials.");
    }

    const functionUrl = `${functionBaseUrl}/functions/v1/generate-course-map`;
    const invokeResponse = await fetch(functionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobId,
      }),
    });

    if (!invokeResponse.ok) {
      const details = await invokeResponse.text().catch(() => "");
      await supabase
        .from("course_jobs")
        .update({
          status: "error",
          error_message: details || "Could not start the course generation worker.",
        })
        .eq("id", jobId);

      return NextResponse.json(
        { error: "We could not start the background course generator." },
        { status: 502 },
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
      { error: "We could not reach the background course generator." },
      { status: 502 },
    );
  }

  return NextResponse.json({ job: data });
}
