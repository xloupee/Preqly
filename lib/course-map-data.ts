export type CourseMapNode = {
  id: string;
  slug: string;
  label: string;
  summary: string;
  status: "foundation" | "ready" | "locked" | "project";
  position: { x: number; y: number };
  duration: string;
  track: string;
  outcomes: string[];
};

export type CourseMapLesson = {
  slug: string;
  headline: string;
  intro: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
  takeaways: string[];
  relatedSlugs: string[];
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
    slug: "scratch",
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
    slug: "c",
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
    slug: "arrays",
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
    slug: "algorithms",
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
    slug: "memory",
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
    slug: "data-structures",
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
    slug: "conceptual-foundation",
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
    slug: "python",
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
    slug: "html-css-js",
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
    slug: "sql",
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
    slug: "ai",
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
    slug: "flask",
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
    slug: "final-project",
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

export const courseMapLessons: CourseMapLesson[] = [
  {
    slug: "scratch",
    headline: "Learn how logic feels before syntax gets in the way.",
    intro:
      "Scratch is the course on-ramp. It teaches sequencing, conditions, and debugging through visual blocks so students can build confidence before they have to memorize syntax.",
    sections: [
      {
        title: "What this topic unlocks",
        body:
          "Scratch gives students a mental model for how programs execute. That model carries directly into C, where the same ideas appear with stricter rules and more explicit structure.",
      },
      {
        title: "What to watch for",
        body:
          "Students often focus on making something move on screen without articulating the logic underneath. The learning goal is not the animation itself; it is understanding how state changes step by step.",
      },
    ],
    takeaways: [
      "Programs are ordered instructions.",
      "Conditions and loops are reusable thinking tools.",
      "Debugging starts by tracing what happened, not guessing.",
    ],
    relatedSlugs: ["c", "algorithms"],
  },
  {
    slug: "c",
    headline: "Move from visual logic to explicit systems thinking.",
    intro:
      "C introduces syntax, compilation, and the discipline of writing code that does exactly what you tell it to do. It is where students start seeing the machine more clearly.",
    sections: [
      {
        title: "Why C matters",
        body:
          "C forces precision. Variables, functions, and control flow are no longer abstract blocks; they become concrete structures that need to compile, run, and behave predictably.",
      },
      {
        title: "How to build fluency",
        body:
          "The fastest path is reading small programs, tracing them line by line, and learning to connect compiler errors back to intent. Precision grows through repetition.",
      },
    ],
    takeaways: [
      "Compilation is part of the feedback loop.",
      "Small syntax mistakes often reflect larger mental-model gaps.",
      "Reading code carefully is as important as writing it.",
    ],
    relatedSlugs: ["arrays", "memory"],
  },
  {
    slug: "arrays",
    headline: "Learn how contiguous storage changes the way you think.",
    intro:
      "Arrays look simple, but they are the first time students see data laid out in a predictable structure. That makes them a gateway topic for memory and performance.",
    sections: [
      {
        title: "Core idea",
        body:
          "Arrays store related values at predictable positions. Once that clicks, iteration, indexing, and bounds checking stop feeling arbitrary and start feeling mechanical.",
      },
      {
        title: "Common mistakes",
        body:
          "Off-by-one errors and invalid indexes happen when students treat an array as a vague list rather than a fixed region with exact valid positions.",
      },
    ],
    takeaways: [
      "Indexing is a contract with memory layout.",
      "Loops and arrays should be reasoned about together.",
      "Bounds safety is a conceptual skill, not just a syntax rule.",
    ],
    relatedSlugs: ["algorithms", "memory"],
  },
  {
    slug: "algorithms",
    headline: "Turn raw programming into structured problem-solving.",
    intro:
      "Algorithms teach students to compare approaches, reason about tradeoffs, and express solutions as processes rather than isolated lines of code.",
    sections: [
      {
        title: "How to think algorithmically",
        body:
          "Start from the goal, identify the repeated work, and ask what data must be remembered between steps. Good algorithms are usually clear before they are fast.",
      },
      {
        title: "How to improve",
        body:
          "Students improve by tracing examples, naming invariants, and comparing two possible approaches instead of assuming the first solution is the best one.",
      },
    ],
    takeaways: [
      "An algorithm is a repeatable strategy, not just code.",
      "Tracing examples exposes hidden assumptions.",
      "Tradeoffs matter as much as correctness.",
    ],
    relatedSlugs: ["arrays", "conceptual-foundation"],
  },
  {
    slug: "memory",
    headline: "Build the machine model that explains why code behaves the way it does.",
    intro:
      "Memory is where C stops being a syntax exercise and starts becoming a systems course. Pointers, addresses, and storage duration give students a deeper model of execution.",
    sections: [
      {
        title: "Why this topic is hard",
        body:
          "Students must think about values and locations at the same time. The confusion usually comes from not distinguishing the data itself from the place where that data lives.",
      },
      {
        title: "What mastery looks like",
        body:
          "A student with a good memory model can explain pointer behavior, reason about stack versus heap, and predict what happens when data is shared or copied.",
      },
    ],
    takeaways: [
      "A pointer is meaningful only because it references a location.",
      "Stack and heap are different lifetimes, not just different words.",
      "Memory models make debugging far easier.",
    ],
    relatedSlugs: ["data-structures", "conceptual-foundation"],
  },
  {
    slug: "data-structures",
    headline: "Organize information so programs stay understandable as they grow.",
    intro:
      "Data structures give students a vocabulary for organizing relationships in code. They transform raw values into systems that are easier to query, update, and reason about.",
    sections: [
      {
        title: "Why structure matters",
        body:
          "Without intentional structures, programs become a pile of disconnected values. With structure, the code starts reflecting the shape of the problem itself.",
      },
      {
        title: "Choosing well",
        body:
          "Students do not need every structure immediately. They need to learn how operations, access patterns, and update costs guide the right choice.",
      },
    ],
    takeaways: [
      "Structure should match the problem’s relationships.",
      "References and ownership affect design choices.",
      "Readable organization is a performance feature for humans.",
    ],
    relatedSlugs: ["memory", "conceptual-foundation"],
  },
  {
    slug: "conceptual-foundation",
    headline: "Connect the early systems topics into one usable mental model.",
    intro:
      "This checkpoint is where syntax, memory, and algorithmic thinking stop feeling like isolated lessons. Students begin to see the course as a coherent stack of ideas.",
    sections: [
      {
        title: "What changes here",
        body:
          "Earlier topics become transferable. Students can now move between languages and tools because they understand the concepts beneath the surface conventions.",
      },
      {
        title: "Why it matters for later units",
        body:
          "Python, SQL, and web development feel easier when students already understand flow, data, and abstraction. The foundation reduces later cognitive overload.",
      },
    ],
    takeaways: [
      "Concepts outlast syntax.",
      "Foundational understanding makes later tools feel lighter.",
      "This milestone is what turns isolated lessons into fluency.",
    ],
    relatedSlugs: ["python", "html-css-js", "sql"],
  },
  {
    slug: "python",
    headline: "Use a higher-level language to move faster without losing rigor.",
    intro:
      "Python gives students leverage. After the systems-heavy early units, it lets them write clearly, iterate quickly, and focus on expressiveness and tooling.",
    sections: [
      {
        title: "Why Python lands well here",
        body:
          "Students already have a deeper mental model from C, so Python does not become magic. It becomes a faster interface to ideas they already understand.",
      },
      {
        title: "Best learning move",
        body:
          "Encourage small scripts, data transformations, and quick experiments. Python is valuable because it reduces friction between thought and implementation.",
      },
    ],
    takeaways: [
      "Abstraction can accelerate learning when fundamentals are solid.",
      "Readable code is part of the language’s strength.",
      "Python is ideal for prototyping and exploration.",
    ],
    relatedSlugs: ["ai", "flask"],
  },
  {
    slug: "html-css-js",
    headline: "See how programming ideas show up in interfaces people actually use.",
    intro:
      "The web stack teaches students how structure, styling, and interaction fit together. It brings abstract programming concepts into a visible, user-facing environment.",
    sections: [
      {
        title: "What students learn here",
        body:
          "HTML models structure, CSS shapes presentation, and JavaScript controls interaction. The topic works best when students understand these as separate responsibilities.",
      },
      {
        title: "Why it matters later",
        body:
          "This unit prepares students to reason about full-stack applications and user-facing systems rather than only scripts and console programs.",
      },
    ],
    takeaways: [
      "Structure, style, and behavior are distinct layers.",
      "Interfaces are systems too, not just decoration.",
      "The browser is a real runtime with its own rules.",
    ],
    relatedSlugs: ["sql", "flask"],
  },
  {
    slug: "sql",
    headline: "Learn to think about information as relationships, not just files.",
    intro:
      "SQL gives students a language for asking precise questions of structured data. It shifts focus from writing loops manually to describing the information they need.",
    sections: [
      {
        title: "The mindset shift",
        body:
          "Instead of iterating through data procedurally, students describe the desired result set. That declarative style is the core conceptual leap.",
      },
      {
        title: "How to practice well",
        body:
          "The most effective exercises focus on joins, filtering, and understanding how tables model real relationships, not on memorizing syntax in isolation.",
      },
    ],
    takeaways: [
      "Queries express intent over procedure.",
      "Data models shape what questions are easy to ask.",
      "Relationships are the heart of SQL.",
    ],
    relatedSlugs: ["html-css-js", "flask"],
  },
  {
    slug: "ai",
    headline: "Use the full stack of earlier concepts to work with modern models intelligently.",
    intro:
      "AI becomes more meaningful when students can connect model behavior back to data, abstractions, tradeoffs, and product constraints. This topic is about applied judgment, not hype.",
    sections: [
      {
        title: "What students should focus on",
        body:
          "Prompting is only one layer. The real skill is learning how to evaluate outputs, frame problems well, and understand where model assistance helps or breaks down.",
      },
      {
        title: "How this connects to the course",
        body:
          "By this point, students can reason across systems, interfaces, and data. AI is valuable here because it sits on top of all of those foundations.",
      },
    ],
    takeaways: [
      "Model output still requires human evaluation.",
      "Good framing produces better results than vague prompting.",
      "AI is strongest when grounded in product and systems thinking.",
    ],
    relatedSlugs: ["python", "final-project"],
  },
  {
    slug: "flask",
    headline: "Bring routes, state, and interfaces together into one coherent application.",
    intro:
      "Flask is where students feel the full stack connect. It turns isolated frontend, backend, and data concepts into a small but real application architecture.",
    sections: [
      {
        title: "Why this unit matters",
        body:
          "Students stop thinking in disconnected layers and start reasoning about how a request travels through a system, how data is stored, and how interfaces are rendered back to users.",
      },
      {
        title: "Where students get stuck",
        body:
          "Confusion usually comes from mixing concerns. The right lesson is not just how to code Flask routes, but how to separate responsibilities cleanly across the stack.",
      },
    ],
    takeaways: [
      "Routing connects user actions to application logic.",
      "Full-stack work is mostly about clear boundaries.",
      "Small end-to-end apps teach architecture better than isolated snippets.",
    ],
    relatedSlugs: ["html-css-js", "sql", "final-project"],
  },
  {
    slug: "final-project",
    headline: "Use the course map as a blueprint for building something real.",
    intro:
      "The final project is where students synthesize the course. It is less about novelty and more about showing that they can connect concepts into a coherent product.",
    sections: [
      {
        title: "What a strong project shows",
        body:
          "A strong capstone demonstrates deliberate scope, defensible technical choices, and an ability to explain why the system works the way it does.",
      },
      {
        title: "How to coach success",
        body:
          "Students benefit most when they keep the problem narrow, ship an end-to-end slice early, and use the project as evidence of connected understanding rather than maximal complexity.",
      },
    ],
    takeaways: [
      "Scope discipline is a core engineering skill.",
      "A coherent explanation is part of the deliverable.",
      "The project should reveal how the earlier topics connect.",
    ],
    relatedSlugs: ["ai", "flask"],
  },
];

export function getCourseNodeBySlug(slug: string) {
  return courseMapNodes.find((node) => node.slug === slug);
}

export function getCourseNodeById(id: string) {
  return courseMapNodes.find((node) => node.id === id);
}

export function getCourseLessonBySlug(slug: string) {
  return courseMapLessons.find((lesson) => lesson.slug === slug);
}
