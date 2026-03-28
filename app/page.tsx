import { ArrowDownRight, Compass, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SyllabusUpload } from "@/components/syllabus-upload";
import { WaitlistForm } from "@/components/waitlist-form";

const partners = ["Zoom", "Canvas", "AI", "Stanford", "Berkeley", "Cal"];

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

      <section className="compatibility">
        <p className="compatibility-label">Works with</p>
        <div className="compatibility-strip">
          {partners.map((partner) => (
            <span className="partner-pill" key={partner}>
              {partner}
            </span>
          ))}
        </div>
      </section>

      <section className="waitlist-section" id="waitlist">
        <div className="waitlist-copy">
          <p className="section-kicker">Early access</p>
          <h2>Bring structure to lectures before students fall behind.</h2>
          <p>
            Start with a focused beta waitlist while the product surface is still
            lean. Use the landing page for onboarding, then move directly into the
            interactive workspace when you want to explore the course map.
          </p>
        </div>
        <WaitlistForm />
      </section>
    </main>
  );
}
