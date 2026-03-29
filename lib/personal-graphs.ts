import type { CourseMapEdge, CourseMapLesson, CourseMapNode, CourseRecord } from "@/lib/course-types";
import { createClient } from "@/lib/supabase/server";

export type PersonalGraphSnapshot = {
  nodes: CourseMapNode[];
  edges: CourseMapEdge[];
  lessons: CourseMapLesson[];
};

type PersonalGraphRow = {
  nodes: unknown;
  edges: unknown;
  lessons: unknown;
};

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeNodeStatus(value: unknown): CourseMapNode["status"] {
  return value === "foundation" || value === "locked" || value === "project" ? value : "ready";
}

function normalizeNodePosition(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { x: 0, y: 0 };
  }

  const x = Number((value as { x?: unknown }).x);
  const y = Number((value as { y?: unknown }).y);

  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  };
}

function normalizeNodes(nodes: unknown): CourseMapNode[] {
  if (!Array.isArray(nodes)) {
    return [];
  }

  const seenIds = new Set<string>();

  return nodes.flatMap((node) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      return [];
    }

    const candidate = node as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const slug = typeof candidate.slug === "string" ? candidate.slug.trim() : "";
    const label = typeof candidate.label === "string" ? candidate.label.trim() : "";

    if (!id || !slug || !label || seenIds.has(id)) {
      return [];
    }

    seenIds.add(id);

    return [
      {
        id,
        slug,
        label,
        summary: typeof candidate.summary === "string" ? candidate.summary.trim() : "",
        status: normalizeNodeStatus(candidate.status),
        position: normalizeNodePosition(candidate.position),
        duration: typeof candidate.duration === "string" ? candidate.duration.trim() : "Custom",
        track: typeof candidate.track === "string" ? candidate.track.trim() : "Custom topic",
        outcomes: Array.isArray(candidate.outcomes)
          ? candidate.outcomes.filter(isNonEmptyString).map((item) => item.trim()).slice(0, 4)
          : [],
      },
    ] satisfies CourseMapNode[];
  });
}

function normalizeEdges(edges: unknown, validNodeIds: Set<string>): CourseMapEdge[] {
  if (!Array.isArray(edges)) {
    return [];
  }

  const seenIds = new Set<string>();

  return edges.flatMap((edge, index) => {
    if (!edge || typeof edge !== "object" || Array.isArray(edge)) {
      return [];
    }

    const candidate = edge as Record<string, unknown>;
    const source = typeof candidate.source === "string" ? candidate.source.trim() : "";
    const target = typeof candidate.target === "string" ? candidate.target.trim() : "";

    if (!source || !target || source === target || !validNodeIds.has(source) || !validNodeIds.has(target)) {
      return [];
    }

    const id = typeof candidate.id === "string" && candidate.id.trim() ? candidate.id.trim() : `edge-${index + 1}`;
    if (seenIds.has(id)) {
      return [];
    }
    seenIds.add(id);

    return [
      {
        id,
        source,
        target,
        label: typeof candidate.label === "string" && candidate.label.trim() ? candidate.label.trim() : undefined,
      },
    ] satisfies CourseMapEdge[];
  });
}

function normalizeLessons(lessons: unknown, validSlugs: Set<string>): CourseMapLesson[] {
  if (!Array.isArray(lessons)) {
    return [];
  }

  const seenSlugs = new Set<string>();

  return lessons.flatMap((lesson) => {
    if (!lesson || typeof lesson !== "object" || Array.isArray(lesson)) {
      return [];
    }

    const candidate = lesson as Record<string, unknown>;
    const slug = typeof candidate.slug === "string" ? candidate.slug.trim() : "";
    if (!slug || !validSlugs.has(slug) || seenSlugs.has(slug)) {
      return [];
    }

    seenSlugs.add(slug);

    return [
      {
        slug,
        headline: typeof candidate.headline === "string" ? candidate.headline.trim() : "",
        intro: typeof candidate.intro === "string" ? candidate.intro.trim() : "",
        sections: Array.isArray(candidate.sections)
          ? candidate.sections.flatMap((section) => {
              if (!section || typeof section !== "object" || Array.isArray(section)) {
                return [];
              }

              const sectionValue = section as Record<string, unknown>;
              const title = typeof sectionValue.title === "string" ? sectionValue.title.trim() : "";
              const body = typeof sectionValue.body === "string" ? sectionValue.body.trim() : "";

              if (!title || !body) {
                return [];
              }

              return [{ title, body }];
            })
          : [],
        takeaways: Array.isArray(candidate.takeaways)
          ? candidate.takeaways.filter(isNonEmptyString).map((item) => item.trim()).slice(0, 4)
          : [],
        relatedSlugs: Array.isArray(candidate.relatedSlugs)
          ? candidate.relatedSlugs
              .filter(isNonEmptyString)
              .map((item) => item.trim())
              .filter((relatedSlug) => validSlugs.has(relatedSlug) && relatedSlug !== slug)
          : [],
      },
    ] satisfies CourseMapLesson[];
  });
}

export function isMissingPersonalGraphSchema(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("could not find the table") ||
    normalized.includes('relation "public.personal_graphs" does not exist') ||
    normalized.includes("schema cache")
  );
}

export function normalizePersonalGraphSnapshot(value: unknown): PersonalGraphSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const nodes = normalizeNodes(candidate.nodes);
  const validNodeIds = new Set(nodes.map((node) => node.id));
  const validSlugs = new Set(nodes.map((node) => node.slug));

  return {
    nodes,
    edges: normalizeEdges(candidate.edges, validNodeIds),
    lessons: normalizeLessons(candidate.lessons, validSlugs),
  };
}

function applyPersonalGraphSnapshot(course: CourseRecord, snapshot: PersonalGraphSnapshot): CourseRecord {
  return {
    ...course,
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    lessons: snapshot.lessons,
  };
}

export async function loadPersonalGraphForCurrentUser(course: CourseRecord, mapKey: string | null) {
  if (!mapKey) {
    return {
      course,
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
      course,
      schemaReady: true,
      schemaMessage: null,
    };
  }

  const { data, error } = await supabase
    .from("personal_graphs")
    .select("nodes, edges, lessons")
    .eq("map_key", mapKey)
    .maybeSingle();

  if (error) {
    if (isMissingPersonalGraphSchema(error.message)) {
      return {
        course,
        schemaReady: false,
        schemaMessage: "Run the latest Supabase migration to enable personal node editing.",
      };
    }

    throw new Error(error.message);
  }

  if (!data) {
    return {
      course,
      schemaReady: true,
      schemaMessage: null,
    };
  }

  const snapshot = normalizePersonalGraphSnapshot(data as PersonalGraphRow);
  if (!snapshot) {
    return {
      course,
      schemaReady: true,
      schemaMessage: null,
    };
  }

  return {
    course: applyPersonalGraphSnapshot(course, snapshot),
    schemaReady: true,
    schemaMessage: null,
  };
}
