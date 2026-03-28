export type CourseMapNode = {
  id: string;
  label: string;
  summary: string;
  status: "foundation" | "ready" | "locked" | "project";
  position: { x: number; y: number };
  duration: string;
  track: string;
  outcomes: string[];
};

export type CourseMapEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export const courseMapNodes: CourseMapNode[] = [
  {
    id: "week-0",
    label: "Week 0: Scratch",
    summary: "A visual warm-up that introduces logic, sequencing, and the feel of building programs.",
    status: "foundation",
    position: { x: 390, y: 12 },
    duration: "1 week",
    track: "On-ramp",
    outcomes: ["Follow control flow", "Translate ideas into steps", "Ship a first toy project"],
  },
  {
    id: "week-1",
    label: "Week 1: C",
    summary: "The first low-level systems unit, where syntax, compilation, and memory discipline begin.",
    status: "ready",
    position: { x: 390, y: 132 },
    duration: "1 week",
    track: "Core systems",
    outcomes: ["Compile and debug C", "Reason about data representation", "Read function-level control flow"],
  },
  {
    id: "week-2",
    label: "Week 2: Arrays",
    summary: "Indexed storage, iteration, and the first taste of machine-level structure.",
    status: "ready",
    position: { x: 290, y: 280 },
    duration: "1 week",
    track: "Core systems",
    outcomes: ["Traverse arrays safely", "Understand bounds", "Connect loops to memory layout"],
  },
  {
    id: "week-3",
    label: "Week 3: Algorithms",
    summary: "Problem decomposition, runtime instincts, and step-by-step reasoning under constraints.",
    status: "ready",
    position: { x: 290, y: 446 },
    duration: "1 week",
    track: "Core systems",
    outcomes: ["Compare algorithm tradeoffs", "Trace execution", "Choose data-flow patterns"],
  },
  {
    id: "week-4",
    label: "Week 4: Memory",
    summary: "Pointers, stack versus heap, and the mental model that unlocks later systems work.",
    status: "ready",
    position: { x: 503, y: 280 },
    duration: "1 week",
    track: "Core systems",
    outcomes: ["Read pointer-heavy code", "Diagnose memory mistakes", "Map variables to storage"],
  },
  {
    id: "week-5",
    label: "Week 5: Data Structures",
    summary: "Linked data, abstract organization, and the structures behind more expressive programs.",
    status: "ready",
    position: { x: 503, y: 446 },
    duration: "1 week",
    track: "Core systems",
    outcomes: ["Choose structures intentionally", "Understand references", "Model relationships cleanly"],
  },
  {
    id: "foundation",
    label: "Conceptual Foundation",
    summary: "A shared checkpoint: once the early systems units click, students can branch into applied tracks.",
    status: "foundation",
    position: { x: 348, y: 610 },
    duration: "Milestone",
    track: "Checkpoint",
    outcomes: ["Connect systems concepts", "Recognize transferable primitives", "Move between tracks confidently"],
  },
  {
    id: "week-6",
    label: "Week 6: Python",
    summary: "A higher-level language pass that turns prior systems intuition into faster iteration.",
    status: "ready",
    position: { x: 286, y: 726 },
    duration: "1 week",
    track: "Applied tools",
    outcomes: ["Write expressive scripts", "Read clean APIs", "Prototype quickly"],
  },
  {
    id: "week-8",
    label: "Week 8: HTML/CSS/JS",
    summary: "Interface basics, the browser model, and how programming ideas surface in user-facing systems.",
    status: "ready",
    position: { x: 503, y: 726 },
    duration: "1 week",
    track: "Applied tools",
    outcomes: ["Understand the browser stack", "Ship a small interactive UI", "Reason about client-side state"],
  },
  {
    id: "week-7",
    label: "Week 7: SQL",
    summary: "Structured data, relational thinking, and querying information with precision.",
    status: "ready",
    position: { x: 686, y: 748 },
    duration: "1 week",
    track: "Applied tools",
    outcomes: ["Write useful queries", "Join related data", "Model tabular relationships"],
  },
  {
    id: "week-10",
    label: "Week 10: AI",
    summary: "The systems-and-tools stack culminates in building with models and evaluating outputs critically.",
    status: "locked",
    position: { x: 329, y: 930 },
    duration: "1 week",
    track: "Capstone prep",
    outcomes: ["Prompt with intent", "Evaluate model behavior", "Connect AI to earlier fundamentals"],
  },
  {
    id: "week-9",
    label: "Week 9: Flask",
    summary: "Glue the web stack together with routing, state, and server-side structure.",
    status: "locked",
    position: { x: 514, y: 904 },
    duration: "1 week",
    track: "Capstone prep",
    outcomes: ["Build a small full-stack flow", "Organize server logic", "Move data between client and backend"],
  },
  {
    id: "final-project",
    label: "Final Project",
    summary: "A culminating build where concepts become a deployed, explainable, and presentation-ready product.",
    status: "project",
    position: { x: 410, y: 1088 },
    duration: "2 weeks",
    track: "Capstone",
    outcomes: ["Scope and ship a project", "Defend technical choices", "Demonstrate connected understanding"],
  },
];

export const courseMapEdges: CourseMapEdge[] = [
  { id: "e0-1", source: "week-0", target: "week-1" },
  { id: "e1-2", source: "week-1", target: "week-2" },
  { id: "e1-4", source: "week-1", target: "week-4" },
  { id: "e2-3", source: "week-2", target: "week-3" },
  { id: "e4-5", source: "week-4", target: "week-5" },
  { id: "e3-f", source: "week-3", target: "foundation", label: "systems click" },
  { id: "e5-f", source: "week-5", target: "foundation" },
  { id: "ef-6", source: "foundation", target: "week-6" },
  { id: "ef-8", source: "foundation", target: "week-8" },
  { id: "ef-7", source: "foundation", target: "week-7" },
  { id: "e6-10", source: "week-6", target: "week-10" },
  { id: "e6-9", source: "week-6", target: "week-9" },
  { id: "e8-9", source: "week-8", target: "week-9" },
  { id: "e7-9", source: "week-7", target: "week-9" },
  { id: "e10-p", source: "week-10", target: "final-project" },
  { id: "e9-p", source: "week-9", target: "final-project" },
];
