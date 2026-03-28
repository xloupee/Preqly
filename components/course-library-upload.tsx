"use client";

import { useId, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { FileText, FileUp, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

export function CourseLibraryUpload() {
  const inputId = useId();
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [message, setMessage] = useState(
    "Upload a syllabus PDF and let Gemini extract a new course map.",
  );
  const [isPending, startTransition] = useTransition();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file ? file.name : null);

    if (!file) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      setMessage("Reading the syllabus and generating a course map...");

      try {
        const generateResponse = await fetch(
          `${backendUrl}/api/course-map/upload`,
          { method: "POST", body: formData },
        );

        const generatePayload = await generateResponse.json();

        if (!generateResponse.ok || !generatePayload.course) {
          throw new Error(
            generatePayload.detail ?? "Could not generate the course.",
          );
        }

        setMessage("Saving course...");

        const saveResponse = await fetch("/api/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(generatePayload.course),
        });

        const savePayload = await saveResponse.json().catch(() => null);

        if (!saveResponse.ok || !savePayload?.course?.slug) {
          throw new Error(
            savePayload?.error ?? "Could not save the course.",
          );
        }

        setMessage("Course generated. Opening the map...");
        router.push(`/workspace/${savePayload.course.slug}`);
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not generate a course from the syllabus.",
        );
      }
    });
  };

  return (
    <div className="course-upload-card">
      <div className="course-upload-copy">
        <p className="course-upload-kicker">Add new course</p>
        <h2>Upload a syllabus and turn it into a live map.</h2>
        <p>{message}</p>
      </div>

      <input
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={handleFileChange}
      />

      <Button asChild size="lg" variant="secondary" disabled={isPending}>
        <label htmlFor={inputId} className="cursor-pointer">
          {isPending ? <LoaderCircle className="animate-spin" /> : <FileUp aria-hidden="true" />}
          {isPending ? "Generating..." : "Upload syllabus PDF"}
        </label>
      </Button>

      <p className="course-upload-file">
        <FileText aria-hidden="true" />
        {selectedFile ?? "No file selected yet"}
      </p>
    </div>
  );
}
