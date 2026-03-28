"use client";

import { ChangeEvent, useId, useState } from "react";
import { FileUp, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SyllabusUpload() {
  const inputId = useId();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file ? file.name : null);
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={handleFileChange}
      />
      <Button asChild size="lg" variant="secondary">
        <label htmlFor={inputId} className="cursor-pointer">
          <FileUp aria-hidden="true" />
          Upload syllabus PDF
        </label>
      </Button>
      <p className="flex min-h-6 items-center gap-2 text-sm text-[var(--foreground-soft)]">
        <FileText aria-hidden="true" className="size-4" />
        {selectedFile ?? "Choose a class syllabus to set up the first workflow."}
      </p>
    </div>
  );
}
