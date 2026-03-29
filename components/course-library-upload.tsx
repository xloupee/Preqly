"use client";

import { useId, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { FileText, FileUp, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { mapCourseUploadError } from "@/lib/course-map-backend";

function deriveTitleFromFileName(fileName: string) {
  const normalized = fileName.replace(/\.pdf$/i, "").trim();
  return normalized || "Untitled course";
}

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
      formData.append("title", deriveTitleFromFileName(file.name));
      formData.append("file", file);
      setMessage("Uploading the syllabus and queueing the course generator...");

      try {
        const response = await fetch("/api/course-jobs", {
          method: "POST",
          body: formData,
        });

        const payload = (await response.json().catch(() => null)) as
          | { error?: string; job?: { id: string } }
          | null;

        if (!response.ok || !payload?.job?.id) {
          throw new Error(payload?.error ?? "Could not queue the course.");
        }

        setMessage("Course queued. Open the workspace to watch it move through processing.");
        router.push("/workspace");
        router.refresh();
      } catch (error) {
        setMessage(mapCourseUploadError(error));
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
          {isPending ? "Queueing..." : "Upload syllabus PDF"}
        </label>
      </Button>

      <p className="course-upload-file">
        <FileText aria-hidden="true" />
        {selectedFile ?? "No file selected yet"}
      </p>
    </div>
  );
}
