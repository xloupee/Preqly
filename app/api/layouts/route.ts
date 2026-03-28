import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  isMissingLayoutSchema,
  normalizeLayoutPositions,
  type MapLayoutPositions,
} from "@/lib/map-layouts";

function isValidMapKey(mapKey: unknown): mapKey is string {
  return typeof mapKey === "string" && mapKey.trim().length > 0 && mapKey.length <= 200;
}

function isValidPositions(positions: unknown): positions is MapLayoutPositions {
  if (!positions || typeof positions !== "object" || Array.isArray(positions)) {
    return false;
  }

  return Object.values(positions).every((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }

    const x = Number((value as { x?: unknown }).x);
    const y = Number((value as { y?: unknown }).y);

    return Number.isFinite(x) && Number.isFinite(y);
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to save your layout." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { mapKey?: unknown; positions?: unknown }
    | null;

  if (!body || !isValidMapKey(body.mapKey) || !isValidPositions(body.positions)) {
    return NextResponse.json({ error: "Provide a valid map key and node positions." }, { status: 400 });
  }

  const { error } = await supabase.from("map_layouts").upsert(
    {
      user_id: user.id,
      map_key: body.mapKey,
      positions: normalizeLayoutPositions(body.positions),
    },
    {
      onConflict: "user_id,map_key",
    },
  );

  if (error) {
    if (isMissingLayoutSchema(error.message)) {
      return NextResponse.json(
        { error: "Run the latest Supabase migration to enable saved layouts." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "We could not save this layout." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to reset your layout." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mapKey = searchParams.get("mapKey");

  if (!isValidMapKey(mapKey)) {
    return NextResponse.json({ error: "Provide a valid map key." }, { status: 400 });
  }

  const { error } = await supabase.from("map_layouts").delete().eq("map_key", mapKey);

  if (error) {
    if (isMissingLayoutSchema(error.message)) {
      return NextResponse.json(
        { error: "Run the latest Supabase migration to enable saved layouts." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "We could not reset this layout." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
