import { createClient } from "jsr:@supabase/supabase-js@2";
import * as pdfjs from "npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs";

type CourseNodeStatus = "foundation" | "ready" | "locked" | "project";
type CourseJobStatus = "queued" | "processing" | "ready" | "error";

type CourseMapNode = {
  id: string;
  slug: string;
  label: string;
  summary: string;
  status: CourseNodeStatus;
  position: { x: number; y: number };
  duration: string;
  track: string;
  outcomes: string[];
};

type CourseMapLesson = {
  slug: string;
  headline: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
  takeaways: string[];
  relatedSlugs: string[];
};

type CourseMapEdge = {
  id: string;
  source: string;
  target: string;
  label?: string | null;
};

type CourseRecord = {
  slug: string;
  title: string;
  summary: string;
  source: "uploaded";
  syllabusFileName?: string;
  createdAt: string;
  nodes: CourseMapNode[];
  edges: CourseMapEdge[];
  lessons: CourseMapLesson[];
};

type CourseJobRow = {
  id: string;
  user_id: string;
  title: string;
  syllabus_path: string;
  syllabus_filename: string;
  status: CourseJobStatus;
};

type TopicPayload = {
  slug: string;
  label: string;
  summary: string;
  duration: string;
  track: string;
  status: CourseNodeStatus;
  outcomes: string[];
};

type PrerequisitePayload = {
  source: string;
  target: string;
  label?: string;
};

type LessonPayload = {
  slug: string;
  headline: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
  takeaways: string[];
  relatedSlugs: string[];
};

type StructuredCoursePayload = {
  title: string;
  summary: string;
  topics: TopicPayload[];
  prerequisites: PrerequisitePayload[];
  lessons: LessonPayload[];
};

const GEMINI_API_URL_TEMPLATE =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "course";
}

async function extractPdfText(fileBytes: Uint8Array) {
  const document = await pdfjs.getDocument({
    data: fileBytes,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  const pages: string[] = [];
  for (let pageIndex = 1; pageIndex <= document.numPages; pageIndex += 1) {
    const page = await document.getPage(pageIndex);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();

    if (pageText) {
      pages.push(pageText);
    }
  }

  const text = pages.join("\n\n").trim();
  if (!text) {
    throw new Error("The uploaded PDF did not contain extractable text.");
  }

  return text;
}

function buildCourseGraphSchema() {
  return {
    type: "object",
    properties: {
      title: { type: "string" },
      summary: { type: "string" },
      topics: {
        type: "array",
        minItems: 6,
        maxItems: 14,
        items: {
          type: "object",
          properties: {
            slug: { type: "string" },
            label: { type: "string" },
            summary: { type: "string" },
            duration: { type: "string" },
            track: { type: "string" },
            status: {
              type: "string",
              enum: ["foundation", "ready", "locked", "project"],
            },
            outcomes: {
              type: "array",
              minItems: 2,
              maxItems: 4,
              items: { type: "string" },
            },
          },
          required: [
            "slug",
            "label",
            "summary",
            "duration",
            "track",
            "status",
            "outcomes",
          ],
        },
      },
      prerequisites: {
        type: "array",
        items: {
          type: "object",
          properties: {
            source: { type: "string" },
            target: { type: "string" },
            label: { type: "string" },
          },
          required: ["source", "target"],
        },
      },
      lessons: {
        type: "array",
        items: {
          type: "object",
          properties: {
            slug: { type: "string" },
            headline: { type: "string" },
            intro: { type: "string" },
            sections: {
              type: "array",
              minItems: 2,
              maxItems: 3,
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  body: { type: "string" },
                },
                required: ["title", "body"],
              },
            },
            takeaways: {
              type: "array",
              minItems: 3,
              maxItems: 4,
              items: { type: "string" },
            },
            relatedSlugs: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["slug", "headline", "intro", "sections", "takeaways", "relatedSlugs"],
        },
      },
    },
    required: ["title", "summary", "topics", "prerequisites", "lessons"],
  };
}

function buildSyllabusPrompt(syllabusText: string) {
  const trimmedText = syllabusText.slice(0, 50000);

  return (
    "You are designing a course knowledge graph from a syllabus PDF.\n" +
    "Read the syllabus text and produce a clean prerequisite map for students.\n" +
    "Requirements:\n" +
    "- Infer the real course title and a concise course summary.\n" +
    "- Produce 6 to 14 topic nodes in a sensible learning order.\n" +
    "- The graph must be directional and acyclic.\n" +
    "- There must be exactly one root topic with no prerequisites. This is the single place a student should start.\n" +
    "- Every other topic must be reachable from that root through prerequisite edges.\n" +
    "- Favor a branching roadmap, not a single week-by-week chain.\n" +
    "- After the first foundation topic, create multiple children when the syllabus supports parallel strands.\n" +
    "- Use prerequisite edges only where they are truly necessary. Keep the graph simple and readable.\n" +
    "- Prefer one strong parent over many weak parents unless multiple prerequisites are clearly required.\n" +
    "- Prefer broad conceptual units over tiny lecture-by-lecture nodes.\n" +
    "- Keep topic labels short: usually 2 to 4 words, and avoid long labels or week-number prefixes unless essential.\n" +
    "- Reserve 'project' status for the capstone or final deliverable if one exists.\n" +
    "- Lesson copy should be specific to the syllabus, not generic filler.\n" +
    "- Keep relation labels minimal. If you include them, use simple wording like 'builds on' or 'applies'.\n" +
    "- relatedSlugs must reference other generated topic slugs.\n" +
    "- Return JSON only.\n\n" +
    `Syllabus text:\n${trimmedText}`
  );
}

function extractResponseText(payload: Record<string, unknown>) {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const firstCandidate = candidates[0] as Record<string, unknown> | undefined;
  const content = firstCandidate?.content as Record<string, unknown> | undefined;
  const parts = Array.isArray(content?.parts) ? (content?.parts as Array<Record<string, unknown>>) : [];

  for (const part of parts) {
    if (typeof part.text === "string" && part.text.trim()) {
      return part.text;
    }
  }

  throw new Error("Gemini returned no text in the response.");
}

async function requestStructuredCoursePayload(syllabusText: string): Promise<StructuredCoursePayload> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing from the Supabase function secrets.");
  }

  const model = Deno.env.get("GEMINI_MODEL") ?? DEFAULT_GEMINI_MODEL;
  const url = GEMINI_API_URL_TEMPLATE.replace("{model}", model);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildSyllabusPrompt(syllabusText) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: buildCourseGraphSchema(),
        temperature: 0.25,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API request failed with status ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const text = extractResponseText(payload);

  try {
    return JSON.parse(text) as StructuredCoursePayload;
  } catch {
    throw new Error("Gemini returned non-JSON content for syllabus extraction.");
  }
}

function buildPositions(topics: TopicPayload[], prerequisites: PrerequisitePayload[]) {
  const topicIds = topics.map((topic) => slugify(topic.slug));
  const indegree = new Map(topicIds.map((topicId) => [topicId, 0]));
  const adjacency = new Map(topicIds.map((topicId) => [topicId, [] as string[]]));
  const parents = new Map(topicIds.map((topicId) => [topicId, [] as string[]]));

  for (const edge of prerequisites) {
    const source = slugify(edge.source);
    const target = slugify(edge.target);
    if (!adjacency.has(source) || !indegree.has(target)) {
      continue;
    }

    adjacency.get(source)?.push(target);
    indegree.set(target, (indegree.get(target) ?? 0) + 1);
    parents.get(target)?.push(source);
  }

  const levels = new Map(topicIds.map((topicId) => [topicId, 0]));
  const queue = topicIds.filter((topicId) => (indegree.get(topicId) ?? 0) === 0);
  const rootOrder = new Map(queue.map((topicId, index) => [topicId, index]));

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of adjacency.get(current) ?? []) {
      levels.set(neighbor, Math.max(levels.get(neighbor) ?? 0, (levels.get(current) ?? 0) + 1));
      indegree.set(neighbor, (indegree.get(neighbor) ?? 0) - 1);
      if ((indegree.get(neighbor) ?? 0) === 0) {
        queue.push(neighbor);
      }
    }
  }

  const grouped = new Map<number, string[]>();
  for (const topicId of topicIds) {
    const level = levels.get(topicId) ?? 0;
    grouped.set(level, [...(grouped.get(level) ?? []), topicId]);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const horizontalGap = 220;
  const verticalGap = 180;
  const centerX = 470;

  for (const level of [...grouped.keys()].sort((left, right) => left - right)) {
    const ids = [...(grouped.get(level) ?? [])];
    if (level === 0) {
      ids.sort((left, right) => (rootOrder.get(left) ?? 0) - (rootOrder.get(right) ?? 0));
    } else {
      ids.sort((left, right) => {
        const leftParents = parents.get(left) ?? [];
        const rightParents = parents.get(right) ?? [];
        const leftAverage =
          leftParents.reduce((sum, parent) => sum + (positions.get(parent)?.x ?? centerX), 0) /
          Math.max(leftParents.length, 1);
        const rightAverage =
          rightParents.reduce((sum, parent) => sum + (positions.get(parent)?.x ?? centerX), 0) /
          Math.max(rightParents.length, 1);

        return leftAverage - rightAverage || left.localeCompare(right);
      });
    }

    const count = ids.length;
    ids.forEach((topicId, index) => {
      positions.set(topicId, {
        x: Math.round(centerX + (index - (count - 1) / 2) * horizontalGap),
        y: Math.round(90 + level * verticalGap),
      });
    });
  }

  return topicIds.map((topicId) => positions.get(topicId) ?? { x: centerX, y: 90 });
}

function normalizeLessons(
  nodes: CourseMapNode[],
  lessons: LessonPayload[],
  validSlugs: Set<string>,
): CourseMapLesson[] {
  const lessonLookup = new Map(lessons.map((lesson) => [slugify(lesson.slug), lesson]));

  return nodes.map((node) => {
    const lesson = lessonLookup.get(node.slug);
    const fallback: LessonPayload = {
      slug: node.slug,
      headline: `Learn the core ideas behind ${node.label}.`,
      intro: node.summary,
      sections: [
        {
          title: "Why it matters",
          body: node.summary,
        },
        {
          title: "What to focus on",
          body: "Use the syllabus context and related topics to reinforce this unit.",
        },
      ],
      takeaways: node.outcomes.slice(0, 3),
      relatedSlugs: [],
    };
    const sourceLesson = lesson ?? fallback;

    return {
      slug: node.slug,
      headline: sourceLesson.headline.trim(),
      intro: sourceLesson.intro.trim(),
      sections: sourceLesson.sections.slice(0, 3).map((section) => ({
        title: section.title.trim(),
        body: section.body.trim(),
      })),
      takeaways: sourceLesson.takeaways.slice(0, 4).map((item) => item.trim()),
      relatedSlugs: sourceLesson.relatedSlugs
        .map((item) => slugify(item))
        .filter((slug) => validSlugs.has(slug) && slug !== node.slug),
    };
  });
}

async function generateCourseFromSyllabus(
  fileBytes: Uint8Array,
  fileName: string | null,
  titleOverride?: string,
): Promise<CourseRecord> {
  const syllabusText = await extractPdfText(fileBytes);
  const payload = await requestStructuredCoursePayload(syllabusText);
  const topics = payload.topics ?? [];
  const prerequisites = payload.prerequisites ?? [];
  const lessons = payload.lessons ?? [];

  if (topics.length === 0) {
    throw new Error("Gemini did not return any topics for this syllabus.");
  }

  const positions = buildPositions(topics, prerequisites);
  const canonicalSlugs = topics.map((topic) => slugify(topic.slug));
  const validSlugs = new Set(canonicalSlugs);

  const nodes: CourseMapNode[] = topics.map((topic, index) => ({
    id: `topic-${index + 1}`,
    slug: canonicalSlugs[index],
    label: topic.label.trim(),
    summary: topic.summary.trim(),
    status: topic.status,
    position: positions[index],
    duration: topic.duration.trim(),
    track: topic.track.trim(),
    outcomes: topic.outcomes.map((item) => item.trim()),
  }));

  const slugToId = new Map(nodes.map((node) => [node.slug, node.id]));
  const seenEdges = new Set<string>();
  const edges: CourseMapEdge[] = [];

  prerequisites.forEach((edge, index) => {
    const source = slugify(edge.source);
    const target = slugify(edge.target);
    if (!slugToId.has(source) || !slugToId.has(target) || source === target) {
      return;
    }

    const key = `${source}->${target}`;
    if (seenEdges.has(key)) {
      return;
    }
    seenEdges.add(key);

    edges.push({
      id: `edge-${index + 1}`,
      source: slugToId.get(source)!,
      target: slugToId.get(target)!,
      label: null,
    });
  });

  return {
    slug: slugify(titleOverride || payload.title),
    title: (titleOverride || payload.title).trim(),
    summary: payload.summary.trim(),
    source: "uploaded",
    syllabusFileName: fileName ?? undefined,
    createdAt: new Date().toISOString(),
    nodes,
    edges,
    lessons: normalizeLessons(nodes, lessons, validSlugs),
  };
}

async function resolveUniqueCourseSlug(userId: string, baseSlug: string) {
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase
      .from("courses")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function updateJob(jobId: string, values: Record<string, unknown>) {
  const { error } = await supabase.from("course_jobs").update(values).eq("id", jobId);
  if (error) {
    throw new Error(error.message);
  }
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Course generation failed unexpectedly.";
}

async function processCourseJob(jobId: string, skipInitialStatusUpdate = false) {
  try {
    const { data, error } = await supabase
      .from("course_jobs")
      .select("id, user_id, title, syllabus_path, syllabus_filename, status")
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const job = data as CourseJobRow | null;
    if (!job) {
      throw new Error("Course job was not found.");
    }

    if (job.status === "ready") {
      return;
    }

    if (!skipInitialStatusUpdate) {
      await updateJob(jobId, {
        status: "processing",
        error_message: null,
      });
    }

    const { data: file, error: downloadError } = await supabase.storage.from("syllabi").download(job.syllabus_path);
    if (downloadError) {
      throw new Error(downloadError.message);
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const course = await generateCourseFromSyllabus(fileBytes, job.syllabus_filename, job.title);
    const slug = await resolveUniqueCourseSlug(job.user_id, course.slug);

    const { error: insertError } = await supabase.from("courses").insert({
      user_id: job.user_id,
      slug,
      title: course.title,
      summary: course.summary,
      source: course.source,
      syllabus_filename: course.syllabusFileName ?? job.syllabus_filename,
      nodes: course.nodes,
      edges: course.edges,
      lessons: course.lessons,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    await updateJob(jobId, {
      status: "ready",
      course_slug: slug,
      error_message: null,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("generate-course-map failed", error);

    try {
      await updateJob(jobId, {
        status: "error",
        error_message: toErrorMessage(error),
      });
    } catch (updateError) {
      console.error("generate-course-map could not persist error state", updateError);
    }
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  let payload: { jobId?: string } | null = null;
  try {
    payload = (await request.json()) as { jobId?: string };
  } catch {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  if (!payload?.jobId) {
    return jsonResponse({ error: "jobId is required." }, 400);
  }

  try {
    await updateJob(payload.jobId, {
      status: "processing",
      error_message: null,
    });
  } catch (error) {
    return jsonResponse({ error: toErrorMessage(error) }, 500);
  }

  EdgeRuntime.waitUntil(processCourseJob(payload.jobId, true));
  return jsonResponse({ accepted: true, jobId: payload.jobId }, 202);
});
