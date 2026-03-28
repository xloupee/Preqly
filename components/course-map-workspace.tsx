"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
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
  MarkerType,
  ReactFlowProvider,
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
};

const sidebarItems = [
  { label: "Courses", icon: BookOpenText, active: true },
  { label: "Dashboard", icon: FolderKanban, active: false },
  { label: "Settings", icon: Settings, active: false },
];

const courseSections = ["Summary", "Versions", "Notes"];

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
        `status-${data.status}`,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="course-node-track">{data.track}</p>
      <h3>{data.label}</h3>
    </article>
  );
}

const nodeTypes = {
  course: CourseNode,
};

function MapCanvas() {
  const graphApi = useReactFlow<GraphNodeData>();
  const [selectedId, setSelectedId] = useState<string>("foundation");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const connectedIds = useMemo(() => collectConnectedNodeIds(selectedId), [selectedId]);

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

    graphApi.setCenter(firstMatch.position.x + 82, firstMatch.position.y + 48, {
      duration: 500,
      zoom: 0.92,
    });
    setSelectedId(firstMatch.id);
  }, [graphApi, matchedIds, normalizedQuery]);

  const nodes = useMemo<Node<GraphNodeData>[]>(() => {
    return courseMapNodes.map((node) => {
      const active = node.id === selectedId;
      const connected = connectedIds.has(node.id);
      const hasMatches = matchedIds.size > 0;
      const matched = matchedIds.has(node.id);

      return {
        id: node.id,
        type: "course",
        draggable: false,
        selectable: false,
        position: node.position,
        data: {
          ...node,
          active,
          connected,
          matched,
          dimmed: hasMatches ? !matched : selectedId ? !connected : false,
        },
      };
    });
  }, [connectedIds, matchedIds, selectedId]);

  const edges = useMemo<Edge[]>(() => {
    return courseMapEdges.map((edge) => {
      const active = selectedId
        ? connectedIds.has(edge.source) && connectedIds.has(edge.target)
        : false;
      const emphasizedBySearch = matchedIds.size > 0 && matchedIds.has(edge.source) && matchedIds.has(edge.target);

      return {
        ...edge,
        animated: false,
        type: "default",
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        style: {
          stroke: active || emphasizedBySearch ? "rgba(228, 220, 197, 0.88)" : "rgba(113, 108, 98, 0.38)",
          strokeWidth: active || emphasizedBySearch ? 2.2 : 1.25,
        },
        className: active ? "course-edge is-active" : "course-edge",
        labelStyle: {
          fill: "rgba(231, 222, 203, 0.72)",
          fontSize: 11,
          fontFamily: "Georgia, serif",
        },
      };
    });
  }, [connectedIds, matchedIds, selectedId]);

  const selectedNode = courseMapNodes.find((node) => node.id === selectedId) ?? courseMapNodes[0];

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
        <div className="workspace-canvas">
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
