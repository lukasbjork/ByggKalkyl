"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calculator,
  Loader2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  ListTree,
} from "lucide-react";

import { formatSEK, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface KalkylSettings {
  omkostnadProcent: number;
  materialPaslagProcent: number;
  riskProcent: number;
  arbetsdagTimmar: number;
}

export interface KalkylResult {
  totalMaterial: number;
  totalArbete: number;
  totalOmkostnad: number;
  totalRisk: number;
  grandTotal: number;
  totalArbetstimmar: number;
  totalDagar: number;
  arbetsdagTimmar: number;
  tidPerYrke: { yrke: string; timmar: number; kostnad: number }[];
  antalPoster: number;
  antalSaknarPris: number;
  antalSaknarTidsnorm: number;
  createdAt?: string;
}

export function KalkylSection({
  projectId,
  settings: initialSettings,
  latest,
}: {
  projectId: string;
  settings: KalkylSettings;
  latest: KalkylResult | null;
}) {
  const router = useRouter();
  const [s, setS] = useState(initialSettings);
  const [result, setResult] = useState<KalkylResult | null>(latest);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(key: keyof KalkylSettings, value: string) {
    setS({ ...s, [key]: value === "" ? 0 : Number(value) });
  }

  async function calculate() {
    setLoading(true);
    setError(null);
    try {
      // Spara inställningar först, kör sedan kalkyl.
      await fetch(`/api/projects/${projectId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const res = await fetch(`/api/projects/${projectId}/calculate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Beräkningen misslyckades");
      setResult(data);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kalkyl</CardTitle>
        <CardDescription>
          Omkostnad och risk räknas på (material + arbete). Materialpåslag räknas på material.
          Endast granskade poster ingår.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Omkostnad %" value={s.omkostnadProcent} onChange={(v) => setField("omkostnadProcent", v)} />
          <Field label="Materialpåslag %" value={s.materialPaslagProcent} onChange={(v) => setField("materialPaslagProcent", v)} />
          <Field label="Risk %" value={s.riskProcent} onChange={(v) => setField("riskProcent", v)} />
          <Field label="Arbetsdag (h)" value={s.arbetsdagTimmar} onChange={(v) => setField("arbetsdagTimmar", v)} />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={calculate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Beräkna kalkyl
          </Button>
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>

        {result && (
          <div className="space-y-4">
            {(result.antalSaknarPris > 0 || result.antalSaknarTidsnorm > 0) && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {result.antalSaknarPris} post(er) saknar pris och {result.antalSaknarTidsnorm}{" "}
                  saknar tidsnorm – de räknas som 0 tills du kopplar dem.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <Summary label="Material" value={formatSEK(result.totalMaterial)} />
              <Summary label="Arbete" value={formatSEK(result.totalArbete)} />
              <Summary label="Omkostnad" value={formatSEK(result.totalOmkostnad)} />
              <Summary label="Risk" value={formatSEK(result.totalRisk)} />
              <Summary label="Total (exkl. moms)" value={formatSEK(result.grandTotal)} highlight />
              <Summary
                label="Tid"
                value={`${formatNumber(result.totalArbetstimmar, 1)} h`}
                sub={`${formatNumber(result.totalDagar, 1)} dagar`}
              />
            </div>

            {result.tidPerYrke.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">Genomförandetid per yrke</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Yrke</TableHead>
                      <TableHead className="text-right">Timmar</TableHead>
                      <TableHead className="text-right">Dagar</TableHead>
                      <TableHead className="text-right">Arbetskostnad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.tidPerYrke.map((t) => (
                      <TableRow key={t.yrke}>
                        <TableCell className="font-medium">{t.yrke}</TableCell>
                        <TableCell className="text-right">{formatNumber(t.timmar, 1)}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(t.timmar / (result.arbetsdagTimmar || 8), 1)}
                        </TableCell>
                        <TableCell className="text-right">{formatSEK(t.kostnad)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Button asChild variant="outline" size="sm">
                <a href={`/api/projects/${projectId}/export/xlsx`}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportera Excel
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={`/api/projects/${projectId}/export/pdf`}>
                  <FileText className="h-4 w-4" />
                  Exportera PDF
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/projects/${projectId}/resultat`}>
                  <ListTree className="h-4 w-4" />
                  Detaljerad resultatvy
                </Link>
              </Button>
            </div>

            {result.createdAt && (
              <p className="text-xs text-muted-foreground">
                Senast beräknad: {new Date(result.createdAt).toLocaleString("sv-SE")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step="any"
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Summary({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "bg-primary text-primary-foreground" : ""}`}>
      <div className={`text-xs ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
      {sub && (
        <div className={`text-xs ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          {sub}
        </div>
      )}
    </div>
  );
}
