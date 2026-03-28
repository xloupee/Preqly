import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { mapClassRow, type ClassRow, type ClassRecord, type ClassStatus } from "@/lib/class-record";
import { createClient } from "@/lib/supabase/server";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const PDF_MIME_TYPE = "application/pdf";

function isMissingStorageOrSchema(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("could not find the table") ||
    normalized.includes("relation \"public.classes\" does not exist") ||
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
    return NextResponse.json({ error: "Sign in to add a class." }, { status: 401 });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const syllabus = formData.get("syllabus");

  if (!title) {
    return NextResponse.json({ error: "Enter a class title." }, { status: 400 });
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

  const storagePath = `${user.id}/${randomUUID()}-${hasPdfExtension ? safeFileName : `${safeFileName}.pdf`}`;
  const syllabusBytes = await syllabus.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from("syllabi").upload(storagePath, syllabusBytes, {
    contentType: PDF_MIME_TYPE,
    upsert: false,
  });

  if (uploadError) {
    if (isMissingStorageOrSchema(uploadError.message)) {
      return NextResponse.json(
        { error: "Run the latest Supabase migration to create class storage before uploading." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "We could not store the syllabus PDF." }, { status: 500 });
  }

  const { data, error: insertError } = await supabase
    .from("classes")
    .insert({
      user_id: user.id,
      title,
      syllabus_path: storagePath,
      syllabus_filename: fileName || "syllabus.pdf",
      status: "uploaded",
    })
    .select("id, user_id, title, syllabus_path, syllabus_filename, status, created_at, updated_at")
    .single();

  if (insertError) {
    await supabase.storage.from("syllabi").remove([storagePath]);

    if (isMissingStorageOrSchema(insertError.message)) {
      return NextResponse.json(
        { error: "Run the latest Supabase migration to create the classes table before uploading." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "We could not create the class record." }, { status: 500 });
  }

  return NextResponse.json({
    class: mapClassRow(data as ClassRow) satisfies ClassRecord,
  });
}
