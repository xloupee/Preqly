import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="landing-page">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <div className="grain" />

      <section className="hero">
        <div className="hero-copy">
          <h1 className="wordmark">preqly</h1>
          <p className="tagline">Real-time knowledge graphs for every lecture</p>
          <p className="supporting-copy">
            Turn spoken explanations into connected concepts, prerequisite maps,
            and session summaries while class is still in motion.
          </p>
          <div className="hero-actions">
            <Button asChild size="lg">
              <a href="/auth">
                Get Started
                <ArrowRight aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>

        <div className="hero-visualization" aria-hidden="true">
          <div className="viz-core">
            <div className="viz-core-inner">
              <BrandLogo size={34} priority className="viz-logo" />
            </div>
            <div className="viz-pulse" />
            <div className="viz-pulse delay-1" />
          </div>

          <div className="viz-orbit">
            <div className="viz-node viz-node-1">
              <div className="viz-node-frame">
                <span className="node-label">Lecture stream</span>
              </div>
            </div>
            <div className="viz-node viz-node-2">
              <div className="viz-node-frame">
                <span className="node-label">Concept graph</span>
              </div>
            </div>
            <div className="viz-node viz-node-3">
              <div className="viz-node-frame">
                <span className="node-label">Preqly gaps</span>
              </div>
            </div>
            <div className="viz-node viz-node-4">
              <div className="viz-node-frame">
                <span className="node-label">Follow-up prompts</span>
              </div>
            </div>
          </div>

          <svg className="viz-connections" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="200" cy="200" r="120" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 8" className="viz-ring-svg" />
            <circle cx="200" cy="200" r="180" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 8" className="viz-ring-svg" />
          </svg>
        </div>
      </section>

    </main>
  );
}
