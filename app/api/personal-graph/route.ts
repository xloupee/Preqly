import { NextResponse } from "next/server";

import { isMissingLayoutSchema, normalizeLayoutPositions } from "@/lib/map-layouts";
import { isMissingNodeProgressSchema } from "@/lib/node-progress";
import {
  isMissingPersonalGraphSchema,
  normalizePersonalGraphSnapshot,
} from "@/lib/personal-graphs";
import { createClient } from "@/lib/supabase/server";

function isValidMapKey(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}

function normalizeRemovedNodeIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0))];
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to edit your canvas." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { mapKey?: unknown; graph?: unknown; removedNodeIds?: unknown }
    | null;

  if (!body || !isValidMapKey(body.mapKey)) {
    return NextResponse.json({ error: "Provide a valid map key." }, { status: 400 });
  }

  const snapshot = normalizePersonalGraphSnapshot(body.graph);
  if (!snapshot) {
    return NextResponse.json({ error: "Provide a valid personalized graph snapshot." }, { status: 400 });
  }

  const removedNodeIds = normalizeRemovedNodeIds(body.removedNodeIds);

  const { error: saveError } = await supabase.from("personal_graphs").upsert(
    {
      user_id: user.id,
      map_key: body.mapKey,
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      lessons: snapshot.lessons,
    },
    {
      onConflict: "user_id,map_key",
    },
  );

  if (saveError) {
    if (isMissingPersonalGraphSchema(saveError.message)) {
      return NextResponse.json(
        { error: "Run the latest Supabase migration to enable personal node editing." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "We could not save your personalized graph." }, { status: 500 });
  }

  if (removedNodeIds.length > 0) {
    const progressDelete = await supabase
      .from("node_progress")
      .delete()
      .eq("map_key", body.mapKey)
      .in("node_id", removedNodeIds);

    if (progressDelete.error && !isMissingNodeProgressSchema(progressDelete.error.message)) {
      return NextResponse.json({ error: "We could not clean up deleted node progress." }, { status: 500 });
    }

    const { data: layoutRow, error: layoutReadError } = await supabase
      .from("map_layouts")
      .select("positions")
      .eq("map_key", body.mapKey)
      .maybeSingle();

    if (layoutReadError) {
      if (isMissingLayoutSchema(layoutReadError.message)) {
        return NextResponse.json(
          { error: "Run the latest Supabase migration to enable saved layouts." },
          { status: 503 },
        );
      }

      return NextResponse.json({ error: "We could not update your saved layout." }, { status: 500 });
    }

    if (layoutRow) {
      const positions = normalizeLayoutPositions((layoutRow as { positions?: unknown }).positions);
      for (const nodeId of removedNodeIds) {
        delete positions[nodeId];
      }

      const { error: layoutWriteError } = await supabase.from("map_layouts").upsert(
        {
          user_id: user.id,
          map_key: body.mapKey,
          positions,
        },
        {
          onConflict: "user_id,map_key",
        },
      );

      if (layoutWriteError) {
        if (isMissingLayoutSchema(layoutWriteError.message)) {
          return NextResponse.json(
            { error: "Run the latest Supabase migration to enable saved layouts." },
            { status: 503 },
          );
        }

        return NextResponse.json({ error: "We could not prune removed nodes from your layout." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
