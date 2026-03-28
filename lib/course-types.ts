export type CourseNodeStatus = "foundation" | "ready" | "locked" | "project";

export type CourseMapNode = {
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
  practiceDeck?: {
    title: string;
    summary: string;
    estimatedMinutes: string;
    focus: string;
    cards: Array<{
      id: string;
      prompt: string;
      answer: string;
      hint: string;
      note: string;
      tag: string;
    }>;
  };
  practiceTest?: {
    title: string;
    summary: string;
    questions: Array<{
      id: string;
      prompt: string;
      choices: string[];
      correctChoice: number;
      explanation: string;
    }>;
  };
};

export type CourseMapEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type CourseRecord = {
  slug: string;
  title: string;
  summary: string;
  source: "seed" | "uploaded";
  syllabusFileName?: string;
  createdAt: string;
  nodes: CourseMapNode[];
  edges: CourseMapEdge[];
  lessons: CourseMapLesson[];
};
