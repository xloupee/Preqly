import { NextResponse } from "next/server";

import { isMissingLayoutSchema, normalizeLayoutPositions } from "@/lib/map-layouts";
import { isMissingNodeProgressSchema } from "@/lib/node-progress";
import { normalizePersonalGraphSnapshot } from "@/lib/personal-graphs";
import { isMissingPersonalGraphVersionsSchema } from "@/lib/personal-graph-versions";
import { createClient } from "@/lib/supabase/server";

function isValidMapKey(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}

function isValidVersionId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}

async function pruneOldVersions(supabase: Awaited<ReturnType<typeof createClient>>, mapKey: string) {
  const { data: staleVersions, error: staleVersionsError } = await supabase
    .from("personal_graph_versions")
    .select("id")
    .eq("map_key", mapKey)
    .order("created_at", { ascending: false })
    .range(100, 999);

  if (staleVersionsError) {
    if (isMissingPersonalGraphVersionsSchema(staleVersionsError.message)) {
      return;
    }

    throw new Error(staleVersionsError.message);
  }

  const staleVersionIds = (staleVersions ?? [])
    .map((row) => (row as { id?: string }).id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (staleVersionIds.length === 0) {
    return;
  }

  const { error: deleteError } = await supabase
    .from("personal_graph_versions")
    .delete()
    .in("id", staleVersionIds);

  if (deleteError && !isMissingPersonalGraphVersionsSchema(deleteError.message)) {
    throw new Error(deleteError.message);
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to restore graph history." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { mapKey?: unknown; versionId?: unknown }
    | null;

  if (!body || !isValidMapKey(body.mapKey) || !isValidVersionId(body.versionId)) {
    return NextResponse.json({ error: "Provide a valid map key and version id." }, { status: 400 });
  }

  const { data: versionRow, error: versionError } = await supabase
    .from("personal_graph_versions")
    .select("id, summary, snapshot")
    .eq("map_key", body.mapKey)
    .eq("id", body.versionId)
    .maybeSingle();

  if (versionError) {
    if (isMissingPersonalGraphVersionsSchema(versionError.message)) {
      return NextResponse.json(
        { error: "Run the latest Supabase migration to enable graph history." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "We could not load that graph version." }, { status: 500 });
  }

  if (!versionRow) {
    return NextResponse.json({ error: "That graph version no longer exists." }, { status: 404 });
  }

  const snapshot = normalizePersonalGraphSnapshot((versionRow as { snapshot?: unknown }).snapshot);
  if (!snapshot) {
    return NextResponse.json({ error: "That graph version is invalid." }, { status: 400 });
  }

  const { data: currentGraphRow } = await supabase
    .from("personal_graphs")
    .select("nodes, edges, lessons")
    .eq("map_key", body.mapKey)
    .maybeSingle();

  const currentSnapshot = normalizePersonalGraphSnapshot(currentGraphRow ?? null);
  const restoredNodeIds = new Set(snapshot.nodes.map((node) => node.id));
  const removedNodeIds = currentSnapshot
    ? currentSnapshot.nodes
        .map((node) => node.id)
        .filter((nodeId) => !restoredNodeIds.has(nodeId))
    : [];

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
    return NextResponse.json({ error: "We could not restore this graph version." }, { status: 500 });
  }

  if (removedNodeIds.length > 0) {
    const progressDelete = await supabase
      .from("node_progress")
      .delete()
      .eq("map_key", body.mapKey)
      .in("node_id", removedNodeIds);

    if (progressDelete.error && !isMissingNodeProgressSchema(progressDelete.error.message)) {
      return NextResponse.json({ error: "We could not reconcile node progress on restore." }, { status: 500 });
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

      return NextResponse.json({ error: "We could not reconcile layout positions on restore." }, { status: 500 });
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
        return NextResponse.json({ error: "We could not reconcile layout positions on restore." }, { status: 500 });
      }
    }
  }

  const restoreSummary = `Restored to ${(versionRow as { summary: string }).summary}`;
  const { error: restoreHistoryError } = await supabase.from("personal_graph_versions").insert({
    user_id: user.id,
    map_key: body.mapKey,
    edit_type: "restore_version",
    summary: restoreSummary,
    snapshot,
    restored_from_version_id: body.versionId,
  });

  if (restoreHistoryError && !isMissingPersonalGraphVersionsSchema(restoreHistoryError.message)) {
    return NextResponse.json({ error: "We restored the graph but could not record the restore action." }, { status: 500 });
  }

  await pruneOldVersions(supabase, body.mapKey);

  return NextResponse.json({ ok: true });
}
