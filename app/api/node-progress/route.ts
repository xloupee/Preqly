import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isMissingNodeProgressSchema } from "@/lib/node-progress";

function isValidId(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to save node progress." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { mapKey?: unknown; nodeId?: unknown }
    | null;

  if (!body || !isValidId(body.mapKey) || !isValidId(body.nodeId)) {
    return NextResponse.json({ error: "Provide a valid map key and node id." }, { status: 400 });
  }

  const { error } = await supabase.from("node_progress").upsert(
    {
      user_id: user.id,
      map_key: body.mapKey,
      node_id: body.nodeId,
      done_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,map_key,node_id",
    },
  );

  if (error) {
    if (isMissingNodeProgressSchema(error.message)) {
      return NextResponse.json(
        { error: "Run the latest Supabase migration to enable node progress." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "We could not save node progress." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to update node progress." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { mapKey?: unknown; nodeId?: unknown }
    | null;

  if (!body || !isValidId(body.mapKey) || !isValidId(body.nodeId)) {
    return NextResponse.json({ error: "Provide a valid map key and node id." }, { status: 400 });
  }

  const { error } = await supabase
    .from("node_progress")
    .delete()
    .eq("map_key", body.mapKey)
    .eq("node_id", body.nodeId);

  if (error) {
    if (isMissingNodeProgressSchema(error.message)) {
      return NextResponse.json(
        { error: "Run the latest Supabase migration to enable node progress." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "We could not update node progress." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
