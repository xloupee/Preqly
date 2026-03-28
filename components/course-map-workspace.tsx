"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowUpRight,
  BookOpenText,
  ChevronLeft,
  Database,
  FolderKanban,
  Minus,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import ReactFlow, {
  ConnectionLineType,
  Handle,
  MarkerType,
  Position,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";

import "reactflow/dist/style.css";

import { courseMapEdges, courseMapNodes, type CourseMapNode } from "@/lib/course-map-data";

type GraphNodeData = CourseMapNode & {
  active: boolean;
  connected: boolean;
  dimmed: boolean;
  matched: boolean;
  relation: "selected" | "prerequisite" | "unlocks" | "connected" | "default";
};

const sidebarItems = [
  { label: "Courses", icon: BookOpenText, active: true },
  { label: "Dashboard", icon: FolderKanban, active: false },
  { label: "Settings", icon: Settings, active: false },
];

const courseSections = ["Summary", "Versions", "Notes"];

type HandleId =
  | "top-source"
  | "top-target"
  | "right-source"
  | "right-target"
  | "bottom-source"
  | "bottom-target"
  | "left-source"
  | "left-target";

function collectConnectedNodeIds(selectedId: string | null) {
  if (!selectedId) {
    return new Set<string>();
  }

  const connected = new Set<string>([selectedId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const edge of courseMapEdges) {
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

function CourseNode({ data }: NodeProps<GraphNodeData>) {
  return (
    <article
      className={[
        "course-node",
        data.active ? "is-active" : "",
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
      <p className="course-node-track">{data.track}</p>
      <h3>{data.label}</h3>
    </article>
  );
}

const nodeTypes = {
  course: CourseNode,
};

function collectAdjacentNodeIds(selectedId: string | null) {
  const upstream = new Set<string>();
  const downstream = new Set<string>();

  if (!selectedId) {
    return { upstream, downstream };
  }

  for (const edge of courseMapEdges) {
    if (edge.target === selectedId) {
      upstream.add(edge.source);
    }
    if (edge.source === selectedId) {
      downstream.add(edge.target);
    }
  }

  return { upstream, downstream };
}

const initialNodes: Node<GraphNodeData>[] = courseMapNodes.map((node) => ({
  id: node.id,
  type: "course",
  draggable: true,
  selectable: true,
  position: node.position,
  data: {
    ...node,
    active: node.id === "foundation",
    connected: false,
    dimmed: false,
    matched: false,
    relation: "default",
  },
}));

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

  return { sourceHandle: "left-source", targetHandle: "right-target" };
}

function MapCanvas() {
  const graphApi = useReactFlow<GraphNodeData>();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string>("foundation");
  const [query, setQuery] = useState("");
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNodeData>(initialNodes);
  const deferredQuery = useDeferredValue(query);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const connectedIds = useMemo(() => collectConnectedNodeIds(selectedId), [selectedId]);
  const adjacentIds = useMemo(() => collectAdjacentNodeIds(selectedId), [selectedId]);

  const matchedIds = useMemo(() => {
    if (!normalizedQuery) {
      return new Set<string>();
    }

    return new Set(
      courseMapNodes
        .filter((node) => {
          const haystack = [node.label, node.summary, node.track].join(" ").toLowerCase();
          return haystack.includes(normalizedQuery);
        })
        .map((node) => node.id),
    );
  }, [normalizedQuery]);

  useEffect(() => {
    if (!normalizedQuery || matchedIds.size === 0) {
      return;
    }

    const firstMatch = courseMapNodes.find((node) => matchedIds.has(node.id));
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
  }, [graphApi, matchedIds, nodes, normalizedQuery]);

  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const source = courseMapNodes.find((courseNode) => courseNode.id === node.id);
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
            connected,
            matched,
            relation,
            dimmed: hasMatches ? !matched : selectedId ? !connected : false,
          },
        };
      }),
    );
  }, [adjacentIds.downstream, adjacentIds.upstream, connectedIds, matchedIds, selectedId, setNodes]);

  const nodeLookup = useMemo(
    () => Object.fromEntries(nodes.map((node) => [node.id, node])),
    [nodes],
  );

  const edges = useMemo<Edge[]>(() => {
    return courseMapEdges.map((edge) => {
      const sourceNode = nodeLookup[edge.source];
      const targetNode = nodeLookup[edge.target];
      const active = selectedId
        ? connectedIds.has(edge.source) && connectedIds.has(edge.target)
        : false;
      const emphasizedBySearch = matchedIds.size > 0 && matchedIds.has(edge.source) && matchedIds.has(edge.target);
      const directlyUpstream = edge.target === selectedId;
      const directlyDownstream = edge.source === selectedId;
      const directlyConnected = directlyUpstream || directlyDownstream;
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
        type: "smoothstep",
        sourceHandle,
        targetHandle,
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        style: {
          stroke:
            directlyConnected || emphasizedBySearch
              ? "rgba(122, 103, 71, 0.84)"
              : active
                ? "rgba(122, 103, 71, 0.66)"
                : "rgba(122, 103, 71, 0.44)",
          strokeWidth: directlyConnected ? 3.2 : active || emphasizedBySearch ? 2.4 : 2,
          strokeDasharray: directlyConnected ? undefined : active || emphasizedBySearch ? "5 9" : "4 8",
        },
        className: [
          "course-edge",
          "is-visible",
          active || emphasizedBySearch ? "is-active" : "",
          directlyUpstream ? "is-upstream" : "",
          directlyDownstream ? "is-downstream" : "",
        ]
          .filter(Boolean)
          .join(" "),
        labelStyle: {
          fill: "rgba(122, 103, 71, 0.65)",
          fontSize: 11,
          fontFamily: "Georgia, serif",
        },
      };
    });
  }, [connectedIds, matchedIds, nodeLookup, selectedId]);

  const selectedNode = courseMapNodes.find((node) => node.id === selectedId) ?? courseMapNodes[0];

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

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Sparkles aria-hidden="true" />
          </div>
          <div>
            <p className="sidebar-overline">Preqly</p>
            <h1>Prereq Studio</h1>
          </div>
          <button className="sidebar-collapse" type="button" aria-label="Collapse navigation">
            <ChevronLeft aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              className={item.active ? "sidebar-link is-active" : "sidebar-link"}
              type="button"
            >
              <item.icon aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <section className="sidebar-course-card" aria-label="Selected course">
          <p className="sidebar-course-label">Current course</p>
          <h2>CS50 Intro</h2>
          <div className="sidebar-course-sections">
            {courseSections.map((section) => (
              <button key={section} type="button" className="sidebar-section-link">
                {section}
              </button>
            ))}
          </div>
        </section>

        <div className="sidebar-footer">
          <button className="sidebar-link" type="button">
            <Settings aria-hidden="true" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <section className="workspace-canvas-panel" aria-label="Interactive prerequisite map">
        <div
          ref={canvasRef}
          className={`workspace-canvas${isPointerInside ? " is-pointer-active" : ""}`}
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
          </div>

          <ReactFlow
            fitView
            fitViewOptions={{ padding: 0.2, minZoom: 0.72 }}
            minZoom={0.62}
            maxZoom={1.5}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
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
            </div>
            <div className="node-outcomes">
              {selectedNode.outcomes.map((outcome) => (
                <div key={outcome} className="node-outcome-item">
                  <ArrowUpRight aria-hidden="true" />
                  <span>{outcome}</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="canvas-caption">
            <Database aria-hidden="true" />
            <span>Prerequisite map synced to the current course shell</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CourseMapWorkspace() {
  return (
    <ReactFlowProvider>
      <MapCanvas />
    </ReactFlowProvider>
  );
}
