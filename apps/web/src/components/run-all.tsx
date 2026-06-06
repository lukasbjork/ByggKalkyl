"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Rocket, Loader2, CheckCircle2, AlertTriangle, ListTree } from "lucide-react";

import { formatSEK, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface RunAllDoc {
  id: string;
  filnamn: string;
  typ: "IFC" | "PDF" | "EXCEL" | "OTHER";
  status: string;
}

interface FinalizeResult {
  grandTotal?: number;
  totalArbetstimmar?: number;
  totalDagar?: number;
  priser?: { matched: number; total: number };
  tider?: { matched: number; total: number };
  autoGranskade?: number;
  aiOgranskade?: number;
  needsReview?: boolean;
  message?: string;
}

export function RunAll({
  projectId,
  documents,
}: {
  projectId: string;
  documents: RunAllDoc[];
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [includeAi, setIncludeAi] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<FinalizeResult | null>(null);

  const mangdbara = documents.filter((d) => d.typ !== "OTHER");

  function addLog(s: string) {
    setLog((prev) => [...prev, s]);
  }

  async function run() {
    setRunning(true);
    setLog([]);
    setResult(null);
    try {
      // 1) Mängda dokument som inte redan är klara.
      const toParse = mangdbara.filter((d) => d.status !== "PARSED");
      for (const d of toParse) {
        addLog(`Mängdar ${d.filnamn}…`);
        try {
          const res = await fetch(
            `/api/projects/${projectId}/documents/${d.id}/takeoff`,
            { method: "POST" },
          );
          const data = await res.json().catch(() => ({}));
          addLog(res.ok ? `  ✓ ${data.created} poster` : `  ⚠ ${data.error ?? "fel"}`);
        } catch {
          addLog(`  ⚠ nätverksfel`);
        }
      }

      // 2) Matcha pris + tid, godkänn pålitliga källor, beräkna.
      addLog("Matchar priser + tidsnormer och beräknar…");
      const fin = await fetch(`/api/projects/${projectId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeAi }),
      });
      const f: FinalizeResult = await fin.json();
      setResult(f);
      if (f.needsReview) addLog(`⚠ ${f.message}`);
      else addLog(`✓ Klart: ${formatSEK(f.grandTotal ?? 0)} (exkl. moms)`);
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Rocket className="h-4 w-4" />
          Kör hela kalkylen automatiskt
        </CardTitle>
        <CardDescription>
          Mängdar alla underlag, matchar priser + tidsnormer, godkänner pålitliga källor
          (IFC/Excel/manuellt) och beräknar — i ett klick. AI-förslag (PDF) kräver granskning
          om du inte kryssar i nedan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={running || mangdbara.length === 0}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Kör hela kalkylen
          </Button>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={includeAi}
              onChange={(e) => setIncludeAi(e.target.checked)}
              disabled={running}
            />
            Inkludera AI-förslag (PDF) utan granskning
          </label>
        </div>

        {log.length > 0 && (
          <div className="rounded-md border bg-background p-3 font-mono text-xs">
            {log.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        )}

        {result && !result.needsReview && (
          <div className="flex flex-wrap items-center gap-4 rounded-md border bg-background p-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="text-lg font-semibold">{formatSEK(result.grandTotal ?? 0)}</div>
              <div className="text-xs text-muted-foreground">
                {formatNumber(result.totalArbetstimmar ?? 0, 1)} h ·{" "}
                priser {result.priser?.matched}/{result.priser?.total} · tider{" "}
                {result.tider?.matched}/{result.tider?.total}
                {result.aiOgranskade ? ` · ${result.aiOgranskade} AI-förslag ej granskade` : ""}
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="ml-auto">
              <Link href={`/projects/${projectId}/resultat`}>
                <ListTree className="h-4 w-4" />
                Resultat &amp; export
              </Link>
            </Button>
          </div>
        )}

        {result?.needsReview && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{result.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
