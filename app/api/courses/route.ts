import { NextResponse } from "next/server";

import type { CourseRecord } from "@/lib/course-types";
import { createClient } from "@/lib/supabase/server";

function isMissingSchema(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("could not find the table") ||
    normalized.includes('relation "public.courses" does not exist') ||
    normalized.includes("schema cache")
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to save a course." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const course = body as Partial<CourseRecord>;

  if (!course.slug || !course.title) {
    return NextResponse.json(
      { error: "slug and title are required." },
      { status: 400 },
    );
  }

  const { data: existing } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", course.slug)
    .maybeSingle();

  let slug = course.slug;
  if (existing) {
    let suffix = 2;
    while (true) {
      const candidate = `${course.slug}-${suffix}`;
      const { data: dup } = await supabase
        .from("courses")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();
      if (!dup) {
        slug = candidate;
        break;
      }
      suffix++;
    }
  }

  const { data, error: insertError } = await supabase
    .from("courses")
    .insert({
      user_id: user.id,
      slug,
      title: course.title,
      summary: course.summary ?? "",
      source: course.source ?? "uploaded",
      syllabus_filename: course.syllabusFileName ?? null,
      nodes: course.nodes ?? [],
      edges: course.edges ?? [],
      lessons: course.lessons ?? [],
    })
    .select(
      "id, slug, title, summary, source, syllabus_filename, nodes, edges, lessons, created_at",
    )
    .single();

  if (insertError) {
    if (isMissingSchema(insertError.message)) {
      return NextResponse.json(
        {
          error:
            "Run the latest Supabase migration to create the courses table.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Could not save the course." },
      { status: 500 },
    );
  }

  const record: CourseRecord = {
    slug: data.slug,
    title: data.title,
    summary: data.summary,
    source: data.source,
    syllabusFileName: data.syllabus_filename,
    createdAt: data.created_at,
    nodes: data.nodes as CourseRecord["nodes"],
    edges: data.edges as CourseRecord["edges"],
    lessons: data.lessons as CourseRecord["lessons"],
  };

  return NextResponse.json({ course: record });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to remove a course." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const slug = typeof (body as { slug?: unknown })?.slug === "string"
    ? (body as { slug: string }).slug.trim()
    : "";

  if (!slug) {
    return NextResponse.json(
      { error: "Provide a course to remove." },
      { status: 400 },
    );
  }

  const { data, error: selectError } = await supabase
    .from("courses")
    .select("user_id, slug, source")
    .eq("slug", slug)
    .maybeSingle();

  if (selectError) {
    if (isMissingSchema(selectError.message)) {
      return NextResponse.json(
        {
          error:
            "Run the latest Supabase migration to create the courses table.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "We could not find that course." },
      { status: 404 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "We could not find that course." },
      { status: 404 },
    );
  }

  if (data.user_id !== user.id) {
    return NextResponse.json(
      { error: "You do not have access to this course." },
      { status: 403 },
    );
  }

  if (data.source === "seed") {
    return NextResponse.json(
      { error: "Starter courses cannot be removed." },
      { status: 400 },
    );
  }

  const { error: deleteError } = await supabase.from("courses").delete().eq("slug", slug);

  if (deleteError) {
    if (isMissingSchema(deleteError.message)) {
      return NextResponse.json(
        {
          error:
            "Run the latest Supabase migration to create the courses table.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "We could not remove this course." },
      { status: 500 },
    );
  }

  const mapKey = `course:${slug}`;

  await supabase.from("map_layouts").delete().eq("map_key", mapKey);
  await supabase.from("node_progress").delete().eq("map_key", mapKey);

  return NextResponse.json({ ok: true, slug });
}
