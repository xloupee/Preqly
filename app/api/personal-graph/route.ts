import { NextResponse } from "next/server";

import { isMissingLayoutSchema, normalizeLayoutPositions } from "@/lib/map-layouts";
import { isMissingNodeProgressSchema } from "@/lib/node-progress";
import {
  isMissingPersonalGraphSchema,
  normalizePersonalGraphSnapshot,
} from "@/lib/personal-graphs";
import {
  isMissingPersonalGraphVersionsSchema,
  type PersonalGraphEditType,
} from "@/lib/personal-graph-versions";
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

function isValidEditType(value: unknown): value is PersonalGraphEditType {
  return (
    value === "insert_node" ||
    value === "delete_node" ||
    value === "create_bridge" ||
    value === "remove_bridge" ||
    value === "restore_version"
  );
}

function normalizeSummary(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, 200) : null;
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
      return {
        schemaReady: false,
        message: "Run the latest Supabase migration to enable graph history.",
      };
    }

    throw new Error(staleVersionsError.message);
  }

  const staleVersionIds = (staleVersions ?? [])
    .map((row) => (row as { id?: string }).id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (staleVersionIds.length === 0) {
    return {
      schemaReady: true,
      message: null,
    };
  }

  const { error: deleteError } = await supabase
    .from("personal_graph_versions")
    .delete()
    .in("id", staleVersionIds);

  if (deleteError) {
    if (isMissingPersonalGraphVersionsSchema(deleteError.message)) {
      return {
        schemaReady: false,
        message: "Run the latest Supabase migration to enable graph history.",
      };
    }

    throw new Error(deleteError.message);
  }

  return {
    schemaReady: true,
    message: null,
  };
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
    | {
        mapKey?: unknown;
        graph?: unknown;
        removedNodeIds?: unknown;
        editType?: unknown;
        summary?: unknown;
        restoredFromVersionId?: unknown;
      }
    | null;

  if (!body || !isValidMapKey(body.mapKey)) {
    return NextResponse.json({ error: "Provide a valid map key." }, { status: 400 });
  }

  const snapshot = normalizePersonalGraphSnapshot(body.graph);
  if (!snapshot) {
    return NextResponse.json({ error: "Provide a valid personalized graph snapshot." }, { status: 400 });
  }

  const removedNodeIds = normalizeRemovedNodeIds(body.removedNodeIds);
  const editType = isValidEditType(body.editType) ? body.editType : null;
  const summary = normalizeSummary(body.summary);
  const restoredFromVersionId =
    typeof body.restoredFromVersionId === "string" && body.restoredFromVersionId.trim().length > 0
      ? body.restoredFromVersionId.trim()
      : null;

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

  if (editType && summary) {
    const { error: versionError } = await supabase.from("personal_graph_versions").insert({
      user_id: user.id,
      map_key: body.mapKey,
      edit_type: editType,
      summary,
      snapshot,
      restored_from_version_id: restoredFromVersionId,
    });

    if (versionError) {
      if (isMissingPersonalGraphVersionsSchema(versionError.message)) {
        return NextResponse.json({
          ok: true,
          historySchemaReady: false,
          historyMessage: "Run the latest Supabase migration to enable graph history.",
        });
      }

      return NextResponse.json({ error: "We could not record graph history." }, { status: 500 });
    }

    try {
      const pruneState = await pruneOldVersions(supabase, body.mapKey);
      return NextResponse.json({
        ok: true,
        historySchemaReady: pruneState.schemaReady,
        historyMessage: pruneState.message,
      });
    } catch (error) {
      return NextResponse.json(
        {
          ok: true,
          historySchemaReady: true,
          historyMessage: error instanceof Error ? error.message : "We could not prune old graph versions.",
        },
      );
    }
  }

  return NextResponse.json({ ok: true, historySchemaReady: true, historyMessage: null });
}
