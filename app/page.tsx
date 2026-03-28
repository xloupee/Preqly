import { ArrowDownRight, Compass, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SyllabusUpload } from "@/components/syllabus-upload";

export default function Home() {
  return (
    <main className="landing-page">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <div className="grain" />

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <Sparkles aria-hidden="true" />
            Live lecture intelligence
          </p>
          <h1 className="wordmark">preqly</h1>
          <p className="tagline">Real-time knowledge graphs for every lecture</p>
          <p className="supporting-copy">
            Turn spoken explanations into connected concepts, prerequisite maps,
            and session summaries while class is still in motion.
          </p>
          <div className="hero-actions">
            <Button asChild size="lg">
              <a href="/workspace">
                Open Workspace
                <Compass aria-hidden="true" />
              </a>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a href="#waitlist">
                Join Beta
                <ArrowDownRight aria-hidden="true" />
              </a>
            </Button>
            <SyllabusUpload />
          </div>
        </div>

        <div className="orbital-card" aria-hidden="true">
          <div className="orbital-node orbital-node-primary">
            Lecture stream
          </div>
          <div className="orbital-node orbital-node-secondary">
            Concept graph
          </div>
          <div className="orbital-node orbital-node-tertiary">
            Preqly gaps
          </div>
          <div className="orbital-node orbital-node-quaternary">
            Follow-up prompts
          </div>
        </div>
      </section>
    </main>
  );
}
