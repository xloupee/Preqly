"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  Check,
  Database,
  LoaderCircle,
  Minus,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import ReactFlow, {
  ConnectionLineType,
  getSmoothStepPath,
  Handle,
  Position,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "reactflow";

import "reactflow/dist/style.css";

import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import type { CourseJobRecord } from "@/lib/course-job-types";
import type { MapLayoutPositions } from "@/lib/map-layouts";
import type { CourseMapEdge, CourseMapNode, CourseRecord } from "@/lib/course-types";

type GraphNodeData = CourseMapNode & {
  active: boolean;
  completed: boolean;
  connected: boolean;
  dimmed: boolean;
  matched: boolean;
  relation: "selected" | "prerequisite" | "unlocks" | "connected" | "default";
};

type GraphEdgeData = {
  className: string;
  flowVariant: "none" | "dotted" | "solid";
};

type HandleId =
  | "top-source"
  | "top-target"
  | "right-source"
  | "right-target"
  | "bottom-source"
  | "bottom-target"
  | "left-source"
  | "left-target";

type CourseMapWorkspaceProps = {
  course: CourseRecord;
  courses: CourseRecord[];
  courseJobs?: CourseJobRecord[];
  courseJobsEnabled?: boolean;
  courseJobsMessage?: string | null;
  userEmail?: string | null;
  mapKey: string | null;
  initialSelectedSlug?: string | null;
  animateFromMinimap?: boolean;
  initialLayoutPositions?: MapLayoutPositions;
  initialCompletedNodeIds?: string[];
  layoutPersistenceEnabled?: boolean;
  layoutMessage?: string | null;
  progressPersistenceEnabled?: boolean;
  progressMessage?: string | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function getNodeSearchScore(node: CourseMapNode, normalizedQuery: string) {
  if (!normalizedQuery) {
    return -1;
  }

  const label = node.label.toLowerCase();
  const slug = node.slug.toLowerCase();
  const summary = node.summary.toLowerCase();
  const track = node.track.toLowerCase();

  let score = -1;

  if (label === normalizedQuery) {
    score = Math.max(score, 120);
  } else if (label.startsWith(normalizedQuery)) {
    score = Math.max(score, 100);
  } else if (label.includes(normalizedQuery)) {
    score = Math.max(score, 80);
  }

  if (slug === normalizedQuery) {
    score = Math.max(score, 76);
  } else if (slug.startsWith(normalizedQuery)) {
    score = Math.max(score, 68);
  } else if (slug.includes(normalizedQuery)) {
    score = Math.max(score, 60);
  }

  if (track === normalizedQuery) {
    score = Math.max(score, 34);
  } else if (track.includes(normalizedQuery)) {
    score = Math.max(score, 24);
  }

  if (summary.includes(normalizedQuery)) {
    score = Math.max(score, 18);
  }

  return score;
}

function collectConnectedNodeIds(selectedId: string | null, edges: CourseMapEdge[]) {
  if (!selectedId) {
    return new Set<string>();
  }

  const connected = new Set<string>([selectedId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (connected.has(edge.source) && !connected.has(edge.target)) {
        connected.add(edge.target);
        changed = true;
      }
      if (connected.has(edge.target) && !connected.has(edge.source)) {
        connected.add(edge.source);
        changed = true;
      }
    }
  }

  return connected;
}

function collectAdjacentNodeIds(selectedId: string | null, edges: CourseMapEdge[]) {
  const upstream = new Set<string>();
  const downstream = new Set<string>();

  if (!selectedId) {
    return { upstream, downstream };
  }

  for (const edge of edges) {
    if (edge.target === selectedId) {
      upstream.add(edge.source);
    }
    if (edge.source === selectedId) {
      downstream.add(edge.target);
    }
  }

  return { upstream, downstream };
}

function CourseNode({ data }: NodeProps<GraphNodeData>) {
  return (
    <article
      className={[
        "course-node",
        data.active ? "is-active" : "",
        data.completed ? "is-completed" : "",
        data.connected ? "is-connected" : "",
        data.dimmed ? "is-dimmed" : "",
        data.matched ? "is-matched" : "",
        `relation-${data.relation}`,
        `status-${data.status}`,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Handle className="course-node-handle" id="top-source" type="source" position={Position.Top} />
      <Handle className="course-node-handle" id="top-target" type="target" position={Position.Top} />
      <Handle className="course-node-handle" id="right-source" type="source" position={Position.Right} />
      <Handle className="course-node-handle" id="right-target" type="target" position={Position.Right} />
      <Handle className="course-node-handle" id="bottom-source" type="source" position={Position.Bottom} />
      <Handle className="course-node-handle" id="bottom-target" type="target" position={Position.Bottom} />
      <Handle className="course-node-handle" id="left-source" type="source" position={Position.Left} />
      <Handle className="course-node-handle" id="left-target" type="target" position={Position.Left} />
      {data.completed ? (
        <span className="course-node-complete-mark" aria-label="Completed topic">
          <Check aria-hidden="true" />
        </span>
      ) : null}
      <p className="course-node-track">{data.track}</p>
      <h3>{data.label}</h3>
    </article>
  );
}

function AnimatedCourseEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps<GraphEdgeData>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 18,
  });

  return (
    <g className={data?.className}>
      <path
        id={id}
        d={edgePath}
        fill="none"
        className={
          data?.flowVariant === "dotted"
            ? "course-edge-path-base is-flowing-dotted"
            : "course-edge-path-base"
        }
        markerEnd={markerEnd}
        style={style}
      />
      {data?.flowVariant === "solid" ? (
        <path
          d={edgePath}
          fill="none"
          pathLength={100}
          className="course-edge-path-flow is-flowing-solid"
        />
      ) : null}
    </g>
  );
}

const nodeTypes = {
  course: CourseNode,
};

const edgeTypes = {
  course: AnimatedCourseEdge,
};

function getDefaultSelectedId(course: CourseRecord, initialSelectedSlug?: string | null) {
  if (initialSelectedSlug) {
    const focusedNode = course.nodes.find((node) => node.slug === initialSelectedSlug);
    if (focusedNode) {
      return focusedNode.id;
    }
  }

  return course.nodes.find((node) => node.status === "foundation")?.id ?? course.nodes[0]?.id ?? "";
}

function buildInitialNodes(
  course: CourseRecord,
  initialLayoutPositions: MapLayoutPositions = {},
  selectedId = getDefaultSelectedId(course),
): Node<GraphNodeData>[] {
  return course.nodes.map((node) => ({
    id: node.id,
    type: "course",
    draggable: true,
    selectable: true,
    position: initialLayoutPositions[node.id] ?? node.position,
    data: {
      ...node,
      active: node.id === selectedId,
      completed: false,
      connected: false,
      dimmed: false,
      matched: false,
      relation: "default",
    },
  }));
}

function pickHandles(source: { x: number; y: number }, target: { x: number; y: number }) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;

  if (Math.abs(dy) >= Math.abs(dx) * 0.6) {
    return dy >= 0
      ? { sourceHandle: "bottom-source" as HandleId, targetHandle: "top-target" as HandleId }
      : { sourceHandle: "top-source" as HandleId, targetHandle: "bottom-target" as HandleId };
  }

  if (dx >= 0) {
    return { sourceHandle: "right-source" as HandleId, targetHandle: "left-target" as HandleId };
  }

  return { sourceHandle: "left-source" as HandleId, targetHandle: "right-target" as HandleId };
}

function buildPositionSnapshot(nodes: Node<GraphNodeData>[]) {
  return JSON.stringify(
    nodes
      .map((node) => ({
        id: node.id,
        x: Number(node.position.x.toFixed(2)),
        y: Number(node.position.y.toFixed(2)),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  );
}

function buildPositionsRecord(nodes: Node<GraphNodeData>[]): MapLayoutPositions {
  return Object.fromEntries(nodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }]));
}

function getDefaultPositions(course: CourseRecord): MapLayoutPositions {
  return Object.fromEntries(course.nodes.map((node) => [node.id, { ...node.position }]));
}

function buildLayoutSignature(positions: MapLayoutPositions = {}) {
  return JSON.stringify(
    Object.entries(positions)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([id, position]) => ({
        id,
        x: Number(position.x.toFixed(2)),
        y: Number(position.y.toFixed(2)),
      })),
  );
}

function MapCanvas({
  course,
  courses,
  courseJobs,
  courseJobsEnabled = true,
  courseJobsMessage = null,
  userEmail,
  mapKey,
  initialSelectedSlug = null,
  animateFromMinimap = false,
  initialLayoutPositions = {},
  initialCompletedNodeIds = [],
  layoutPersistenceEnabled = true,
  layoutMessage = null,
  progressPersistenceEnabled = true,
  progressMessage = null,
}: CourseMapWorkspaceProps) {
  const graphApi = useReactFlow<GraphNodeData>();
  const canvasRef = useRef<HTMLDivElement>(null);
  const defaultSelectedId = useMemo(
    () => getDefaultSelectedId(course, initialSelectedSlug),
    [course, initialSelectedSlug],
  );
  const [selectedId, setSelectedId] = useState<string>(defaultSelectedId);
  const [pendingMinimapArrival, setPendingMinimapArrival] = useState(animateFromMinimap);
  const [isEnteringFromMinimap, setIsEnteringFromMinimap] = useState(animateFromMinimap);
  const [query, setQuery] = useState("");
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(layoutPersistenceEnabled ? null : layoutMessage);
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>(initialCompletedNodeIds);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [progressErrorMessage, setProgressErrorMessage] = useState<string | null>(
    progressPersistenceEnabled ? null : progressMessage,
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNodeData>(
    buildInitialNodes(course, initialLayoutPositions, defaultSelectedId),
  );
  const deferredQuery = useDeferredValue(query);
  const layoutSignature = useMemo(() => buildLayoutSignature(initialLayoutPositions), [initialLayoutPositions]);
  const hasHydratedRef = useRef(false);
  const selectedIdRef = useRef(selectedId);
  const hydratedMapKeyRef = useRef<string | null>(null);
  const hydratedLayoutSignatureRef = useRef("");
  const lastPersistedSnapshotRef = useRef("");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const connectedIds = useMemo(
    () => collectConnectedNodeIds(selectedId, course.edges),
    [course.edges, selectedId],
  );
  const adjacentIds = useMemo(
    () => collectAdjacentNodeIds(selectedId, course.edges),
    [course.edges, selectedId],
  );
  const positionSnapshot = useMemo(() => buildPositionSnapshot(nodes), [nodes]);
  const completedNodeIdSet = useMemo(() => new Set(completedNodeIds), [completedNodeIds]);
  const completedCount = completedNodeIds.length;

  useEffect(() => {
    const isSameMap = hydratedMapKeyRef.current === mapKey;
    const hasLayoutChanged = hydratedLayoutSignatureRef.current !== layoutSignature;
    const shouldRehydrate = !isSameMap || hasLayoutChanged || hydratedMapKeyRef.current === null;

    if (!shouldRehydrate) {
      setSaveMessage(layoutPersistenceEnabled ? null : layoutMessage);
      return;
    }

    const currentSelection = selectedIdRef.current;
    const nextSelectedId =
      isSameMap && currentSelection && course.nodes.some((node) => node.id === currentSelection)
        ? currentSelection
        : getDefaultSelectedId(course, initialSelectedSlug);
    const nextNodes = buildInitialNodes(course, initialLayoutPositions, nextSelectedId);
    const nextSnapshot = buildPositionSnapshot(nextNodes);

    setNodes(nextNodes);
    setSelectedId(nextSelectedId);
    if (!isSameMap) {
      setQuery("");
    }
    lastPersistedSnapshotRef.current = nextSnapshot;
    hasHydratedRef.current = true;
    hydratedMapKeyRef.current = mapKey;
    hydratedLayoutSignatureRef.current = layoutSignature;
    setSaveState("idle");
    setSaveMessage(layoutPersistenceEnabled ? null : layoutMessage);
  }, [
    course,
    initialLayoutPositions,
    initialSelectedSlug,
    layoutMessage,
    layoutPersistenceEnabled,
    layoutSignature,
    mapKey,
    setNodes,
  ]);

  useEffect(() => {
    setPendingMinimapArrival(animateFromMinimap);
    setIsEnteringFromMinimap(animateFromMinimap);
  }, [animateFromMinimap, initialSelectedSlug, mapKey]);

  useEffect(() => {
    if (!pendingMinimapArrival) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsEnteringFromMinimap(false);
      setPendingMinimapArrival(false);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [pendingMinimapArrival]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    setCompletedNodeIds(initialCompletedNodeIds);
    setIsSavingProgress(false);
    setProgressErrorMessage(progressPersistenceEnabled ? null : progressMessage);
  }, [initialCompletedNodeIds, mapKey, progressMessage, progressPersistenceEnabled]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const rankedMatches = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return course.nodes
      .map((node, index) => ({
        id: node.id,
        index,
        score: getNodeSearchScore(node, normalizedQuery),
      }))
      .filter((match) => match.score >= 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.index - right.index;
      });
  }, [course.nodes, normalizedQuery]);

  const matchedIds = useMemo(
    () => new Set(rankedMatches.map((match) => match.id)),
    [rankedMatches],
  );

  useEffect(() => {
    if (!hasHydratedRef.current) {
      lastPersistedSnapshotRef.current = positionSnapshot;
      hasHydratedRef.current = true;
      return;
    }

    if (!layoutPersistenceEnabled || !mapKey) {
      return;
    }

    if (positionSnapshot === lastPersistedSnapshotRef.current) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    setSaveState("saving");
    setSaveMessage(null);

    saveTimeoutRef.current = setTimeout(async () => {
      const currentNodes = nodes;

      try {
        const response = await fetch("/api/layouts", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mapKey,
            positions: buildPositionsRecord(currentNodes),
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "We could not save your layout.");
        }

        lastPersistedSnapshotRef.current = buildPositionSnapshot(currentNodes);
        setSaveState("saved");
        setSaveMessage(null);
        resetTimeoutRef.current = setTimeout(() => {
          setSaveState("idle");
        }, 1400);
      } catch (error) {
        setSaveState("error");
        setSaveMessage(error instanceof Error ? error.message : "We could not save your layout.");
      }
    }, 520);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [layoutPersistenceEnabled, mapKey, nodes, positionSnapshot]);

  useEffect(() => {
    if (!normalizedQuery || rankedMatches.length === 0) {
      return;
    }

    const firstMatch = course.nodes.find((node) => node.id === rankedMatches[0]?.id);
    if (!firstMatch) {
      return;
    }

    const currentNode = nodes.find((node) => node.id === firstMatch.id);
    const position = currentNode?.position ?? firstMatch.position;

    graphApi.setCenter(position.x + 82, position.y + 48, {
      duration: 500,
      zoom: 0.92,
    });
    setSelectedId(firstMatch.id);
  }, [course.nodes, graphApi, nodes, normalizedQuery, rankedMatches]);

  useEffect(() => {
    if (!selectedId || normalizedQuery) {
      return;
    }

    const selectedNode = nodes.find((node) => node.id === selectedId);
    if (!selectedNode) {
      return;
    }

    if (pendingMinimapArrival) {
      const startOffsetX = 600;
      const startOffsetY = 600;

      graphApi.setCenter(selectedNode.position.x + startOffsetX, selectedNode.position.y + startOffsetY, {
        duration: 0,
        zoom: 0.86,
      });

      const timer = window.setTimeout(() => {
        graphApi.setCenter(selectedNode.position.x + 82, selectedNode.position.y + 48, {
          duration: 1200,
          zoom: 0.9,
        });
      }, 70);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      graphApi.setCenter(selectedNode.position.x + 82, selectedNode.position.y + 48, {
        duration: 420,
        zoom: 0.84,
      });
    }, 70);

    return () => window.clearTimeout(timer);
  }, [graphApi, nodes, normalizedQuery, pendingMinimapArrival, selectedId]);

  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const source = course.nodes.find((courseNode) => courseNode.id === node.id);
        if (!source) {
          return node;
        }

        const active = node.id === selectedId;
        const connected = connectedIds.has(node.id);
        const hasMatches = matchedIds.size > 0;
        const matched = matchedIds.has(node.id);
        const relation = active
          ? "selected"
          : adjacentIds.upstream.has(node.id)
            ? "prerequisite"
            : adjacentIds.downstream.has(node.id)
              ? "unlocks"
              : connected
                ? "connected"
                : "default";

        return {
          ...node,
          data: {
            ...source,
            active,
            completed: completedNodeIdSet.has(node.id),
            connected,
            matched,
            relation,
            dimmed: hasMatches ? !matched : selectedId ? !connected : false,
          },
        };
      }),
    );
  }, [
    adjacentIds.downstream,
    adjacentIds.upstream,
    completedNodeIdSet,
    connectedIds,
    course.nodes,
    matchedIds,
    selectedId,
    setNodes,
  ]);

  const nodeLookup = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])), [nodes]);

  const edges = useMemo<Edge<GraphEdgeData>[]>(() => {
    return course.edges.map((edge) => {
      const sourceNode = nodeLookup[edge.source];
      const targetNode = nodeLookup[edge.target];
      const active = selectedId ? connectedIds.has(edge.source) && connectedIds.has(edge.target) : false;
      const emphasizedBySearch = matchedIds.size > 0 && matchedIds.has(edge.source) && matchedIds.has(edge.target);
      const directlyUpstream = edge.target === selectedId;
      const directlyDownstream = edge.source === selectedId;
      const { sourceHandle, targetHandle } =
        sourceNode && targetNode
          ? pickHandles(sourceNode.position, targetNode.position)
          : {
              sourceHandle: "bottom-source" as HandleId,
              targetHandle: "top-target" as HandleId,
            };

      return {
        ...edge,
        animated: false,
        type: "course",
        sourceHandle,
        targetHandle,
        data: {
          className: [
            "course-edge",
            "is-visible",
            active || emphasizedBySearch ? "is-active" : "",
            directlyUpstream ? "is-upstream" : "",
            directlyDownstream ? "is-downstream" : "",
          ]
            .filter(Boolean)
            .join(" "),
          flowVariant: directlyDownstream ? "solid" : directlyUpstream ? "dotted" : "none",
        },
        style: {
          stroke:
            directlyUpstream || directlyDownstream || emphasizedBySearch
              ? "rgba(122, 103, 71, 0.84)"
              : active
                ? "rgba(122, 103, 71, 0.66)"
                : "rgba(122, 103, 71, 0.44)",
          strokeWidth:
            directlyDownstream ? 3.35 : directlyUpstream ? 3.05 : active || emphasizedBySearch ? 2.4 : 2,
          strokeDasharray:
            directlyDownstream
              ? undefined
              : directlyUpstream
                ? "7 11"
                : active || emphasizedBySearch
                  ? "5 9"
                  : "4 8",
        },
        labelStyle: {
          fill: "rgba(122, 103, 71, 0.65)",
          fontSize: 11,
          fontFamily: "Georgia, serif",
        },
      };
    });
  }, [connectedIds, course.edges, matchedIds, nodeLookup, selectedId]);

  const selectedNode = course.nodes.find((node) => node.id === selectedId) ?? course.nodes[0];

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();
    canvas.style.setProperty("--cursor-x", `${event.clientX - bounds.left}px`);
    canvas.style.setProperty("--cursor-y", `${event.clientY - bounds.top}px`);

    if (!isPointerInside) {
      setIsPointerInside(true);
    }
  };

  const handleCanvasPointerLeave = () => {
    setIsPointerInside(false);
  };

  const handleResetLayout = async () => {
    const defaultPositions = getDefaultPositions(course);
    const resetNodes = buildInitialNodes(course, defaultPositions, selectedId);
    const resetSnapshot = buildPositionSnapshot(resetNodes);

    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        position: defaultPositions[node.id] ?? node.position,
      })),
    );
    lastPersistedSnapshotRef.current = resetSnapshot;

    if (!layoutPersistenceEnabled || !mapKey) {
      setSaveState("idle");
      setSaveMessage(layoutMessage);
      return;
    }

    try {
      setSaveState("saving");
      setSaveMessage(null);

      const response = await fetch(`/api/layouts?mapKey=${encodeURIComponent(mapKey)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "We could not reset your layout.");
      }

      setSaveState("saved");
      resetTimeoutRef.current = setTimeout(() => {
        setSaveState("idle");
      }, 1400);
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "We could not reset your layout.");
    }
  };

  const handleToggleNodeDone = async () => {
    if (!selectedNode) {
      return;
    }

    if (!mapKey || !progressPersistenceEnabled) {
      setProgressErrorMessage(progressMessage ?? "Node progress is not available yet.");
      return;
    }

    const nodeId = selectedNode.id;
    const wasCompleted = completedNodeIdSet.has(nodeId);
    const nextCompletedNodeIds = wasCompleted
      ? completedNodeIds.filter((id) => id !== nodeId)
      : [...completedNodeIds, nodeId];

    setCompletedNodeIds(nextCompletedNodeIds);
    setIsSavingProgress(true);
    setProgressErrorMessage(null);

    try {
      const response = await fetch("/api/node-progress", {
        method: wasCompleted ? "DELETE" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mapKey,
          nodeId,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "We could not update node progress.");
      }
    } catch (error) {
      setCompletedNodeIds(completedNodeIds);
      setProgressErrorMessage(error instanceof Error ? error.message : "We could not update node progress.");
    } finally {
      setIsSavingProgress(false);
    }
  };

  if (!selectedNode) {
    return (
      <WorkspaceShell
        currentCourse={course}
        courses={courses}
        courseJobs={courseJobs}
        courseJobsEnabled={courseJobsEnabled}
        courseJobsMessage={courseJobsMessage}
        userEmail={userEmail ?? null}
      >
        <section className="workspace-canvas-panel" aria-label="Interactive prerequisite map">
          <div className="workspace-canvas workspace-canvas-empty">
            <div className="workspace-state-card">
              <p className="workspace-state-kicker">No topics yet</p>
              <h2>{course.title}</h2>
              <p>This course does not have any generated topics yet.</p>
            </div>
          </div>
        </section>
      </WorkspaceShell>
    );
  }

  const isSelectedNodeCompleted = completedNodeIdSet.has(selectedNode.id);

  return (
    <WorkspaceShell
      currentCourse={course}
      courses={courses}
      courseJobs={courseJobs}
      courseJobsEnabled={courseJobsEnabled}
      courseJobsMessage={courseJobsMessage}
      userEmail={userEmail ?? null}
    >
      <section className="workspace-canvas-panel" aria-label="Interactive prerequisite map">
        <div
          ref={canvasRef}
          className={[
            "workspace-canvas",
            isPointerInside ? "is-pointer-active" : "",
            isEnteringFromMinimap ? "is-entering-from-minimap" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ viewTransitionName: "course-map-surface" }}
          onPointerMove={handleCanvasPointerMove}
          onPointerLeave={handleCanvasPointerLeave}
        >
          <div className="graph-controls-panel">
            <button
              type="button"
              className="graph-control-button"
              aria-label="Zoom in"
              onClick={() => graphApi.zoomIn({ duration: 250 })}
            >
              <Plus aria-hidden="true" />
            </button>
            <button
              type="button"
              className="graph-control-button"
              aria-label="Zoom out"
              onClick={() => graphApi.zoomOut({ duration: 250 })}
            >
              <Minus aria-hidden="true" />
            </button>
            <label className="graph-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search topics"
                aria-label="Search map nodes"
              />
            </label>
            <button
              type="button"
              className="graph-control-button graph-control-reset"
              onClick={handleResetLayout}
              aria-label="Reset layout"
            >
              <RotateCcw aria-hidden="true" />
              <span>Reset layout</span>
            </button>
          </div>

          <ReactFlow
            fitView
            fitViewOptions={{ padding: 0.28, minZoom: 0.34 }}
            minZoom={0.22}
            maxZoom={1.5}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesConnectable={false}
            proOptions={{ hideAttribution: true }}
            connectionLineType={ConnectionLineType.SmoothStep}
            onNodesChange={onNodesChange}
            defaultEdgeOptions={{
              type: "smoothstep",
              style: { strokeLinecap: "round" },
            }}
            onNodeClick={(_, node) => setSelectedId(node.id)}
          />

          <aside className="node-detail-card" aria-live="polite">
            <p className="node-detail-kicker">{selectedNode.track}</p>
            <div className="node-detail-heading">
              <h2>{selectedNode.label}</h2>
              <span>{selectedNode.duration}</span>
            </div>
            <p className="node-detail-summary">{selectedNode.summary}</p>
            <div className="node-detail-meta">
              <span className={`node-status-chip status-${selectedNode.status}`}>
                {selectedNode.status === "project" ? "Capstone" : selectedNode.status}
              </span>
              <span className="node-status-chip node-status-chip-muted">
                {connectedIds.size} linked topics
              </span>
              <span
                className={`node-status-chip ${
                  isSelectedNodeCompleted ? "node-status-chip-complete" : "node-status-chip-muted"
                }`}
              >
                {completedCount} / {course.nodes.length} done
              </span>
            </div>
            <div className="node-outcomes">
              {selectedNode.outcomes.map((outcome) => (
                <div key={outcome} className="node-outcome-item">
                  <span className="node-outcome-dot" aria-hidden="true" />
                  <span>{outcome}</span>
                </div>
              ))}
            </div>
            <div className="node-detail-actions">
              <Button asChild size="sm" className="node-detail-action-button">
                <Link href={`/workspace/${course.slug}/learn/${selectedNode.slug}`}>Learn</Link>
              </Button>
              <Button
                type="button"
                size="sm"
                className="node-detail-action-button"
                variant={isSelectedNodeCompleted ? "secondary" : "default"}
                onClick={handleToggleNodeDone}
                disabled={!progressPersistenceEnabled || isSavingProgress}
              >
                {isSavingProgress ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="canvas-caption-spinner" />
                    Saving
                  </>
                ) : isSelectedNodeCompleted ? (
                  <>
                    <Check aria-hidden="true" />
                    Marked done
                  </>
                ) : (
                  "Mark done"
                )}
              </Button>
            </div>
            {progressErrorMessage ? <p className="node-detail-feedback">{progressErrorMessage}</p> : null}
          </aside>

          <div className="canvas-caption">
            <Database aria-hidden="true" />
            <span>
              {saveState === "saving" ? (
                <>
                  <LoaderCircle aria-hidden="true" className="canvas-caption-spinner" />
                  Saving layout
                </>
              ) : saveState === "saved" ? (
                "Layout saved"
              ) : saveState === "error" ? (
                saveMessage ?? "Layout save failed"
              ) : layoutPersistenceEnabled ? (
                "Drag nodes to shape your map"
              ) : (
                layoutMessage ?? "Saved layouts are not available yet"
              )}
            </span>
          </div>
        </div>
      </section>
    </WorkspaceShell>
  );
}

export function CourseMapWorkspace(props: CourseMapWorkspaceProps) {
  return (
    <ReactFlowProvider>
      <MapCanvas {...props} />
    </ReactFlowProvider>
  );
}
