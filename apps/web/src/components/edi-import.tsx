"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EdiImport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(file: File) {
    setLoading(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/price/import-edi", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? (data.errors ? data.errors.join("; ") : "Import misslyckades"));
      }
      setMsg({
        ok: true,
        text: `Importerat: ${data.imported} nya, ${data.updated} uppdaterade, ${data.skipped} överhoppade.`,
      });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Fel" });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Importera EDI-katalog (CSV)
      </Button>
      {msg && (
        <span className={msg.ok ? "text-sm text-emerald-700" : "text-sm text-destructive"}>
          {msg.text}
        </span>
      )}
    </div>
  );
}
