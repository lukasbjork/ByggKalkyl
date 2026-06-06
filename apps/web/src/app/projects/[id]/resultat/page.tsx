import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileSpreadsheet, FileText, AlertTriangle } from "lucide-react";

import { loadExportData } from "@/lib/export/load";
import type { ExportLine } from "@/lib/export/types";
import { formatSEK, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function groupByByggdel(lines: ExportLine[]): [string, ExportLine[]][] {
  const map = new Map<string, ExportLine[]>();
  for (const l of lines) {
    const key = l.byggdel ?? "Övrigt";
    const arr = map.get(key) ?? [];
    arr.push(l);
    map.set(key, arr);
  }
  return [...map.entries()];
}

export default async function ResultatPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await loadExportData(params.id);
  if (!data) notFound();

  const groups = groupByByggdel(data.lines);
  const flaggade = data.lines.filter((l) => l.saknarPris || l.saknarTidsnorm);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${params.id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till projektet
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Kalkyl – {data.projektNamn}
            </h1>
            <p className="text-sm text-muted-foreground">
              {data.kund ? `${data.kund} · ` : ""}
              {data.datum} · Prisläge: {data.prislage ?? "–"} · Källa: {data.provider}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/projects/${params.id}/export/xlsx`}>
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/projects/${params.id}/export/pdf`}>
                <FileText className="h-4 w-4" />
                PDF
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Summering */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Material" value={formatSEK(data.totals.totalMaterial)} />
        <SummaryCard label="Arbete" value={formatSEK(data.totals.totalArbete)} />
        <SummaryCard label="Omkostnad" value={formatSEK(data.totals.totalOmkostnad)} />
        <SummaryCard label="Risk" value={formatSEK(data.totals.totalRisk)} />
        <SummaryCard label="Total (exkl. moms)" value={formatSEK(data.totals.grandTotal)} highlight />
        <SummaryCard
          label="Tid"
          value={`${formatNumber(data.totals.totalArbetstimmar, 1)} h`}
          sub={`${formatNumber(data.totals.totalDagar, 1)} dagar`}
        />
      </div>

      {flaggade.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {flaggade.length} post(er) saknar pris eller tidsnorm och har räknats som 0 i de
            delarna. Markerade med <Badge variant="warning">flagga</Badge> nedan.
          </span>
        </div>
      )}

      {/* Per byggdel */}
      {groups.map(([byggdel, lines]) => {
        const subMaterial = lines.reduce((a, l) => a + l.materialkostnad, 0);
        const subArbete = lines.reduce((a, l) => a + l.arbetskostnad, 0);
        const subTotal = lines.reduce((a, l) => a + l.radtotal, 0);
        return (
          <Card key={byggdel}>
            <CardHeader>
              <CardTitle className="text-base">{byggdel}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benämning</TableHead>
                    <TableHead className="text-right">Mängd</TableHead>
                    <TableHead>Leverantör</TableHead>
                    <TableHead className="text-right">Netto-à</TableHead>
                    <TableHead className="text-right">Material</TableHead>
                    <TableHead>Yrke</TableHead>
                    <TableHead className="text-right">Timmar</TableHead>
                    <TableHead className="text-right">Arbete</TableHead>
                    <TableHead className="text-right">Radtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l, i) => (
                    <TableRow key={i} className={l.saknarPris || l.saknarTidsnorm ? "bg-amber-50/50" : undefined}>
                      <TableCell className="font-medium">
                        {l.benamning}
                        {(l.saknarPris || l.saknarTidsnorm) && (
                          <span className="ml-2 inline-flex gap-1">
                            {l.saknarPris && <Badge variant="warning">pris</Badge>}
                            {l.saknarTidsnorm && <Badge variant="warning">tid</Badge>}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(l.mangd, 2)} {l.enhet}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{l.leverantor ?? "–"}</TableCell>
                      <TableCell className="text-right">
                        {l.nettoApris != null ? formatSEK(l.nettoApris) : "–"}
                      </TableCell>
                      <TableCell className="text-right">{formatSEK(l.materialkostnad)}</TableCell>
                      <TableCell className="text-muted-foreground">{l.yrke ?? "–"}</TableCell>
                      <TableCell className="text-right">{formatNumber(l.arbetstimmar, 2)}</TableCell>
                      <TableCell className="text-right">{formatSEK(l.arbetskostnad)}</TableCell>
                      <TableCell className="text-right font-medium">{formatSEK(l.radtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4}>Delsumma {byggdel}</TableCell>
                    <TableCell className="text-right">{formatSEK(subMaterial)}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                    <TableCell className="text-right">{formatSEK(subArbete)}</TableCell>
                    <TableCell className="text-right">{formatSEK(subTotal)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {/* Tid per yrke */}
      {data.tidPerYrke.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Genomförandetid per yrke</CardTitle>
          </CardHeader>
          <CardContent>
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
                {data.tidPerYrke.map((t) => (
                  <TableRow key={t.yrke}>
                    <TableCell className="font-medium">{t.yrke}</TableCell>
                    <TableCell className="text-right">{formatNumber(t.timmar, 1)}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(
                        data.totals.arbetsdagTimmar ? t.timmar / data.totals.arbetsdagTimmar : 0,
                        1,
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatSEK(t.kostnad)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
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
