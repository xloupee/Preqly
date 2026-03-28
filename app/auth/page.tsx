import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/auth/auth-panel";
import { createClient } from "@/lib/supabase/server";

type AuthPageProps = {
  searchParams?: Promise<{
    auth?: string;
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
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

  if (userEmail) {
    redirect("/workspace");
  }

  return (
    <main className="auth-route">
      <div className="auth-route-orb auth-route-orb-left" />
      <div className="auth-route-orb auth-route-orb-right" />

      <section className="auth-route-shell">
        <div className="auth-route-panel">
          <AuthPanel
            authStatus={authStatus}
            userEmail={userEmail}
            initialMode="signup"
            redirectTo="/workspace"
          />
        </div>
      </section>
    </main>
  );
}
