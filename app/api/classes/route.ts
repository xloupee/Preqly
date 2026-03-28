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

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to remove a class." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { classId?: unknown } | null;
  const classId = typeof body?.classId === "string" ? body.classId.trim() : "";

  if (!classId) {
    return NextResponse.json({ error: "Provide a class to remove." }, { status: 400 });
  }

  const { data: existingClass, error: selectError } = await supabase
    .from("classes")
    .select("id, user_id, title, syllabus_path, syllabus_filename, status, created_at, updated_at")
    .eq("id", classId)
    .single();

  if (selectError) {
    if (isMissingStorageOrSchema(selectError.message)) {
      return NextResponse.json(
        { error: "Run the latest Supabase migration to enable class storage." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "We could not find that class." }, { status: 404 });
  }

  const classRecord = existingClass as ClassRow;

  if (classRecord.user_id !== user.id) {
    return NextResponse.json({ error: "You do not have access to this class." }, { status: 403 });
  }

  const mapKey = `class:${classRecord.id}`;

  const { error: deleteError } = await supabase.from("classes").delete().eq("id", classRecord.id);

  if (deleteError) {
    if (isMissingStorageOrSchema(deleteError.message)) {
      return NextResponse.json(
        { error: "Run the latest Supabase migration to enable class storage." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "We could not remove this class." }, { status: 500 });
  }

  if (classRecord.syllabus_path) {
    await supabase.storage.from("syllabi").remove([classRecord.syllabus_path]);
  }

  await supabase.from("map_layouts").delete().eq("map_key", mapKey);
  await supabase.from("node_progress").delete().eq("map_key", mapKey);

  return NextResponse.json({ ok: true, classId: classRecord.id });
}
