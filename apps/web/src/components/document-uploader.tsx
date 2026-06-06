"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Loader2, FileUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { ACCEPTED_UPLOAD_EXTENSIONS } from "@/lib/documents";

export function DocumentUploader({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0) return;
      setError(null);
      setUploading(true);
      try {
        const form = new FormData();
        for (const file of accepted) form.append("files", file);
        const res = await fetch(`/api/projects/${projectId}/documents`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Uppladdningen misslyckades");
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Något gick fel");
      } finally {
        setUploading(false);
      }
    },
    [projectId, router],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/octet-stream": [".ifc"],
      "model/ifc": [".ifc"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    disabled: uploading,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragActive
            ? "border-primary bg-accent"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : isDragActive ? (
          <FileUp className="h-8 w-8 text-primary" />
        ) : (
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
        )}
        <p className="text-sm font-medium">
          {uploading
            ? "Laddar upp…"
            : "Dra och släpp filer här, eller klicka för att välja"}
        </p>
        <p className="text-xs text-muted-foreground">
          Tillåtna format: {ACCEPTED_UPLOAD_EXTENSIONS.join(", ")}
        </p>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
