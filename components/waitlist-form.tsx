"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FormStatus = "idle" | "invalid" | "submitting" | "success";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!emailPattern.test(email.trim())) {
      setStatus("invalid");
      return;
    }

    setStatus("submitting");

    window.setTimeout(() => {
      setStatus("success");
      setEmail("");
    }, 500);
  };

  return (
    <form className="waitlist-shell" onSubmit={handleSubmit} noValidate>
      <label className="waitlist-label" htmlFor="waitlist-email">
        Join the first cohort of students and instructors using preqly.
      </label>
      <div className="waitlist-controls">
        <Input
          id="waitlist-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@university.edu"
          value={email}
          aria-invalid={status === "invalid"}
          aria-describedby="waitlist-message"
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== "idle") {
              setStatus("idle");
            }
          }}
        />
        <Button size="lg" type="submit" disabled={status === "submitting"}>
          {status === "success" ? "You’re in" : "Get Started"}
          {status === "success" ? <CheckCircle2 /> : <ArrowRight />}
        </Button>
      </div>
      <p className="waitlist-message" id="waitlist-message" role="status">
        {status === "invalid" && "Enter a valid email address to join the list."}
        {status === "submitting" && "Saving your place..."}
        {status === "success" &&
          "Thanks. We’ll reach out when the first lecture-ready graphs are live."}
        {status === "idle" &&
          "No spam. Early access updates only, with a short onboarding note when the beta opens."}
      </p>
    </form>
  );
}
