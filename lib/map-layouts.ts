import type { ClassRecord } from "@/lib/class-record";
import { DEMO_CLASS_RECORD } from "@/lib/class-record";
import { createClient } from "@/lib/supabase/server";

export type NodePosition = {
  x: number;
  y: number;
};

export type MapLayoutPositions = Record<string, NodePosition>;

type MapLayoutRow = {
  user_id: string;
  map_key: string;
  positions: unknown;
  created_at: string;
  updated_at: string;
};

export function getMapKeyForClass(activeClass: ClassRecord | null) {
  if (!activeClass) {
    return null;
  }

  if (activeClass.id === DEMO_CLASS_RECORD.id) {
    return "demo:cs50";
  }

  return `class:${activeClass.id}`;
}

export function isMissingLayoutSchema(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("could not find the table") ||
    normalized.includes('relation "public.map_layouts" does not exist') ||
    normalized.includes("schema cache")
  );
}

export function normalizeLayoutPositions(positions: unknown): MapLayoutPositions {
  if (!positions || typeof positions !== "object" || Array.isArray(positions)) {
    return {};
  }

  const normalizedEntries = Object.entries(positions).flatMap(([nodeId, value]) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return [];
    }

    const x = Number((value as { x?: unknown }).x);
    const y = Number((value as { y?: unknown }).y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return [];
    }

    return [[nodeId, { x, y }] as const];
  });

  return Object.fromEntries(normalizedEntries);
}

export async function loadMapLayoutForCurrentUser(mapKey: string | null) {
  if (!mapKey) {
    return {
      positions: {} as MapLayoutPositions,
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
      positions: {} as MapLayoutPositions,
      schemaReady: true,
      schemaMessage: null,
    };
  }

  const { data, error } = await supabase
    .from("map_layouts")
    .select("user_id, map_key, positions, created_at, updated_at")
    .eq("map_key", mapKey)
    .maybeSingle();

  if (error) {
    if (isMissingLayoutSchema(error.message)) {
      return {
        positions: {} as MapLayoutPositions,
        schemaReady: false,
        schemaMessage: "Run the latest Supabase migration to enable saved layouts.",
      };
    }

    throw new Error(error.message);
  }

  return {
    positions: data ? normalizeLayoutPositions((data as MapLayoutRow).positions) : ({} as MapLayoutPositions),
    schemaReady: true,
    schemaMessage: null,
  };
}
