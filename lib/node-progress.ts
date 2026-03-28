import { createClient } from "@/lib/supabase/server";

type NodeProgressRow = {
  node_id: string;
};

export function isMissingNodeProgressSchema(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("could not find the table") ||
    normalized.includes('relation "public.node_progress" does not exist') ||
    normalized.includes("schema cache")
  );
}

export async function loadNodeProgressForCurrentUser(mapKey: string | null) {
  if (!mapKey) {
    return {
      completedNodeIds: [] as string[],
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
      completedNodeIds: [] as string[],
      schemaReady: true,
      schemaMessage: null,
    };
  }

  const { data, error } = await supabase
    .from("node_progress")
    .select("node_id")
    .eq("map_key", mapKey);

  if (error) {
    if (isMissingNodeProgressSchema(error.message)) {
      return {
        completedNodeIds: [] as string[],
        schemaReady: false,
        schemaMessage: "Run the latest Supabase migration to enable node progress.",
      };
    }

    throw new Error(error.message);
  }

  return {
    completedNodeIds: (data ?? []).map((row) => (row as NodeProgressRow).node_id),
    schemaReady: true,
    schemaMessage: null,
  };
}
