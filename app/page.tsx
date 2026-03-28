import { ArrowDownRight, Compass, Sparkles } from "lucide-react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { SyllabusUpload } from "@/components/syllabus-upload";

const partners = ["Zoom", "Canvas", "AI", "Stanford", "Berkeley", "Cal"];

type HomeProps = {
  searchParams?: Promise<{
    auth?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const authStatus = params?.auth ?? null;
  let userEmail: string | null = null;

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    userEmail = user?.email ?? null;
  }

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
          <h2>Create your Preqly account and keep the workspace within reach.</h2>
          <p>
            Sign up or log in from the landing page, then move into the workspace
            when you want to explore the course map and syllabus upload flow.
          </p>
        </div>
        <AuthPanel authStatus={authStatus} userEmail={userEmail} />
      </section>
    </main>
  );
}
