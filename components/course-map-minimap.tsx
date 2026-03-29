"use client";

import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import ReactFlow, {
  ConnectionLineType,
  Handle,
  MarkerType,
  Position,
  ReactFlowProvider,
  useReactFlow,
  useNodesInitialized,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";

import "reactflow/dist/style.css";

import type { CourseMapNode, CourseMapEdge } from "@/lib/course-types";

type CourseMapMinimapProps = {
  courseSlug: string;
  nodes: CourseMapNode[];
  edges: CourseMapEdge[];
  activeSlug?: string;
};

type MinimapNodeData = {
  label: string;
  active: boolean;
  matched: boolean;
  dimmed: boolean;
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

function MinimapNode({ data }: NodeProps<MinimapNodeData>) {
  return (
    <div
      className={[
        "sidebar-minimap-node",
        data.active ? "is-active" : "",
        data.matched ? "is-matched" : "",
        data.dimmed ? "is-dimmed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Handle className="sidebar-minimap-handle" id="top-source" type="source" position={Position.Top} />
      <Handle className="sidebar-minimap-handle" id="top-target" type="target" position={Position.Top} />
      <Handle className="sidebar-minimap-handle" id="right-source" type="source" position={Position.Right} />
      <Handle className="sidebar-minimap-handle" id="right-target" type="target" position={Position.Right} />
      <Handle className="sidebar-minimap-handle" id="bottom-source" type="source" position={Position.Bottom} />
      <Handle className="sidebar-minimap-handle" id="bottom-target" type="target" position={Position.Bottom} />
      <Handle className="sidebar-minimap-handle" id="left-source" type="source" position={Position.Left} />
      <Handle className="sidebar-minimap-handle" id="left-target" type="target" position={Position.Left} />
      <span className={`sidebar-minimap-label${data.active ? " is-active" : ""}`}>
        {data.label}
      </span>
    </div>
  );
}

const nodeTypes = {
  minimap: memo(MinimapNode),
};

function getMinimapSearchScore(node: CourseMapNode, normalizedQuery: string) {
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

function CourseMapMinimapCanvas({
  courseSlug,
  nodes: courseNodes,
  edges: courseEdges,
  activeSlug,
}: CourseMapMinimapProps) {
  const router = useRouter();
  const graphApi = useReactFlow<MinimapNodeData>();
  const nodesInitialized = useNodesInitialized();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const rankedMatches = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return courseNodes
      .map((node, index) => ({
        id: node.id,
        index,
        score: getMinimapSearchScore(node, normalizedQuery),
      }))
      .filter((match) => match.score >= 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.index - right.index;
      });
  }, [courseNodes, normalizedQuery]);

  const matchedIds = useMemo(
    () => new Set(rankedMatches.map((match) => match.id)),
    [rankedMatches],
  );
  const hasMatches = matchedIds.size > 0;

  const nodes = useMemo<Node<MinimapNodeData>[]>(
    () =>
      courseNodes.map((node) => ({
        id: node.id,
        type: "minimap",
        draggable: false,
        selectable: true,
        position: node.position,
        data: {
          label: node.label,
          active: node.slug === activeSlug,
          matched: matchedIds.has(node.id),
          dimmed: Boolean(normalizedQuery) && hasMatches && !matchedIds.has(node.id),
        },
      })),
    [activeSlug, courseNodes, hasMatches, matchedIds, normalizedQuery],
  );

  const edges = useMemo<Edge[]>(() => {
    const nodeLookup = Object.fromEntries(
      courseNodes.map((node) => [node.id, node]),
    );

    return courseEdges.map((edge) => {
      const sourceNode = nodeLookup[edge.source];
      const targetNode = nodeLookup[edge.target];
      const { sourceHandle, targetHandle } =
        sourceNode && targetNode
          ? pickHandles(sourceNode.position, targetNode.position)
          : {
              sourceHandle: "bottom-source" as HandleId,
              targetHandle: "top-target" as HandleId,
            };

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        sourceHandle,
        targetHandle,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: "rgba(105, 87, 56, 1)",
        },
        style: {
          stroke: "rgba(105, 87, 56, 0.72)",
          strokeWidth: 2.2,
          strokeLinecap: "round",
          strokeDasharray: "5 8",
        },
      };
    });
  }, [courseNodes, courseEdges]);

  useEffect(() => {
    if (!nodesInitialized) {
      return;
    }

    const searchTargetNode =
      normalizedQuery && rankedMatches.length > 0
        ? courseNodes.find((node) => node.id === rankedMatches[0]?.id)
        : null;
    const activeNode = courseNodes.find((node) => node.slug === activeSlug);
    const focusNode = searchTargetNode ?? activeNode;

    if (!focusNode) {
      return;
    }

    const timer = window.setTimeout(() => {
      graphApi.setCenter(focusNode.position.x + 66, focusNode.position.y + 22, {
        zoom: normalizedQuery ? 0.82 : 0.74,
        duration: 520,
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [activeSlug, courseNodes, graphApi, nodesInitialized, normalizedQuery, rankedMatches]);

  return (
    <section className="sidebar-minimap-card" aria-label="Course minimap">
      <div className="sidebar-minimap-copy">
      </div>

      <div className="sidebar-minimap-shell">
        <label className="sidebar-minimap-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search topics"
            aria-label="Search minimap topics"
          />
        </label>
        <div className="sidebar-minimap-flow">
          <ReactFlow
            fitView
            fitViewOptions={{ padding: 0.18, minZoom: 0.32 }}
            minZoom={0.22}
            maxZoom={1.35}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            nodesConnectable={false}
            nodesDraggable={false}
            panOnDrag
            zoomOnScroll
            zoomOnPinch
            zoomOnDoubleClick={false}
            proOptions={{ hideAttribution: true }}
            connectionLineType={ConnectionLineType.SmoothStep}
            defaultEdgeOptions={{
              type: "smoothstep",
              style: { strokeLinecap: "round" },
            }}
            onNodeClick={(_, node) => {
              const clicked = courseNodes.find((courseNode) => courseNode.id === node.id);
              if (clicked) {
                router.push(`/workspace/${courseSlug}/learn/${clicked.slug}`);
              }
            }}
          />
        </div>
      </div>
    </section>
  );
}

export function CourseMapMinimap(props: CourseMapMinimapProps) {
  return (
    <ReactFlowProvider>
      <CourseMapMinimapCanvas {...props} />
    </ReactFlowProvider>
  );
}
