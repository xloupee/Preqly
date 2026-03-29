import type { PersonalGraphSnapshot } from "@/lib/personal-graphs";
import { createClient } from "@/lib/supabase/server";

export type PersonalGraphEditType =
  | "insert_node"
  | "delete_node"
  | "create_bridge"
  | "remove_bridge"
  | "restore_version";

export type PersonalGraphVersionRecord = {
  id: string;
  mapKey: string;
  editType: PersonalGraphEditType;
  summary: string;
  createdAt: string;
  restoredFromVersionId: string | null;
};

type PersonalGraphVersionRow = {
  id: string;
  map_key: string;
  edit_type: PersonalGraphEditType;
  summary: string;
  created_at: string;
  restored_from_version_id: string | null;
  snapshot?: PersonalGraphSnapshot;
};

export function isMissingPersonalGraphVersionsSchema(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("could not find the table") ||
    normalized.includes('relation "public.personal_graph_versions" does not exist') ||
    normalized.includes("schema cache")
  );
}

function mapVersionRow(row: PersonalGraphVersionRow): PersonalGraphVersionRecord {
  return {
    id: row.id,
    mapKey: row.map_key,
    editType: row.edit_type,
    summary: row.summary,
    createdAt: row.created_at,
    restoredFromVersionId: row.restored_from_version_id,
  };
}

export async function loadPersonalGraphVersionsForCurrentUser(mapKey: string | null) {
  if (!mapKey) {
    return {
      versions: [] as PersonalGraphVersionRecord[],
      schemaReady: true,
      schemaMessage: null,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      versions: [] as PersonalGraphVersionRecord[],
      schemaReady: true,
      schemaMessage: null,
    };
  }

  const { data, error } = await supabase
    .from("personal_graph_versions")
    .select("id, map_key, edit_type, summary, created_at, restored_from_version_id")
    .eq("map_key", mapKey)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (isMissingPersonalGraphVersionsSchema(error.message)) {
      return {
        versions: [] as PersonalGraphVersionRecord[],
        schemaReady: false,
        schemaMessage: "Run the latest Supabase migration to enable graph history.",
      };
    }

    throw new Error(error.message);
  }

  return {
    versions: (data ?? []).map((row) => mapVersionRow(row as PersonalGraphVersionRow)),
    schemaReady: true,
    schemaMessage: null,
  };
}
