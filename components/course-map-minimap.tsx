"use client";

import { memo, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
    <div className={`sidebar-minimap-node${data.active ? " is-active" : ""}`}>
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
        },
      })),
    [courseNodes, activeSlug],
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

    const activeNode = courseNodes.find((node) => node.slug === activeSlug);
    if (!activeNode) {
      return;
    }

    const timer = window.setTimeout(() => {
      graphApi.setCenter(activeNode.position.x + 66, activeNode.position.y + 22, {
        zoom: 0.74,
        duration: 520,
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [activeSlug, courseNodes, graphApi, nodesInitialized]);

  return (
    <section className="sidebar-minimap-card" aria-label="Course minimap">
      <div className="sidebar-minimap-copy">
        <p className="sidebar-course-label">Course minimap</p>
        <p className="sidebar-minimap-note">
          Drag to move the map. Click a topic node to open that lesson.
        </p>
      </div>

      <div className="sidebar-minimap-shell">
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
