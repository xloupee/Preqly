"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";
type FormStatus = "idle" | "invalid" | "submitting" | "success" | "error";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&^#()_\-+=]{8,72}$/;
const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function validatePassword(value: string) {
  return passwordPattern.test(value);
}

function mapAuthError(message: string, mode: AuthMode) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("user already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("already exists")
  ) {
    return "An account with this email already exists. Log in instead.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Confirm your email first, then try signing in again.";
  }

  if (
    normalized.includes("password") &&
    (normalized.includes("weak") ||
      normalized.includes("short") ||
      normalized.includes("characters") ||
      normalized.includes("uppercase") ||
      normalized.includes("lowercase"))
  ) {
    return "Use a stronger password that meets the project rules.";
  }

  if (normalized.includes("email address") && normalized.includes("invalid")) {
    return "Enter a valid email address.";
  }

  const cleanedMessage = message.trim();

  if (cleanedMessage) {
    return cleanedMessage;
  }

  return mode === "signup"
    ? "We could not create the account. Please try again."
    : "We could not sign you in. Please try again.";
}

export function AuthPanel({
  authStatus,
  userEmail,
  initialMode = "signup",
  redirectTo = "/workspace"
}: {
  authStatus: string | null;
  userEmail: string | null;
  initialMode?: AuthMode;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState(
    authStatus === "confirmed"
      ? "Email confirmed. You can sign in now."
      : authStatus === "error"
        ? "The confirmation link was invalid or expired. Try signing up again."
        : "Use your email and password to access Preqly."
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(email);

    if (!isConfigured) {
      setStatus("error");
      setMessage("Authentication is not configured yet.");
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      setStatus("invalid");
      setMessage("Enter a valid email address.");
      return;
    }

    if (!validatePassword(password)) {
      setStatus("invalid");
      setMessage(
        "Password must be 8+ characters and include an uppercase letter, a lowercase letter, and a number."
      );
      return;
    }

    setStatus("submitting");

    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/auth`
        }
      });

      if (error) {
        setStatus("error");
        setMessage(mapAuthError(error.message, mode));
        return;
      }

      setStatus("success");
      setMessage(
        data.session
          ? "Account created. You are now signed in."
          : "If this email can be registered, check your inbox for a confirmation link. If you already have an account, log in instead."
      );
      setPassword("");

      if (data.session) {
        router.push(redirectTo);
        return;
      }

      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (error) {
      setStatus("error");
      setMessage(mapAuthError(error.message, mode));
      return;
    }

    setStatus("success");
    setMessage("Signed in.");
    setPassword("");
    router.push(redirectTo);
  };

  const handleSignOut = async () => {
    if (!isConfigured) {
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  if (userEmail) {
    return (
      <div className="auth-shell">
        <p className="auth-badge">Signed in</p>
        <h3 className="auth-title">{userEmail}</h3>
        <p className="auth-message">
          Your Preqly session is active in this browser.
        </p>
        <Button className="auth-signout" onClick={handleSignOut} variant="secondary">
          Sign out
          <LogOut aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <form className="auth-shell" onSubmit={handleSubmit} noValidate>
      <div className="auth-toggle" role="tablist" aria-label="Authentication mode">
        <button
          className={`auth-toggle-button${mode === "signup" ? " is-active" : ""}`}
          onClick={() => setMode("signup")}
          role="tab"
          type="button"
          aria-selected={mode === "signup"}
        >
          Sign up
        </button>
        <button
          className={`auth-toggle-button${mode === "signin" ? " is-active" : ""}`}
          onClick={() => setMode("signin")}
          role="tab"
          type="button"
          aria-selected={mode === "signin"}
        >
          Log in
        </button>
      </div>

      <label className="waitlist-label" htmlFor="auth-email">
        {mode === "signup"
          ? "Create your Preqly account."
          : "Sign in with the email and password you already created."}
      </label>

      <div className="auth-fields">
        <Input
          id="auth-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@university.edu"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== "idle") {
              setStatus("idle");
            }
          }}
        />
        <Input
          id="auth-password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={
            mode === "signup"
              ? "8+ chars, upper/lowercase, number"
              : "Your password"
          }
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (status !== "idle") {
              setStatus("idle");
            }
          }}
        />
      </div>

      <div className="waitlist-controls">
        <Button size="lg" type="submit" disabled={status === "submitting"}>
          {mode === "signup" ? "Create account" : "Log in"}
          {status === "success" ? <CheckCircle2 /> : <ArrowRight />}
        </Button>
      </div>

      <p className="waitlist-message" role="status">
        {message}
      </p>
    </form>
  );
}
