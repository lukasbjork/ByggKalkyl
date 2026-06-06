import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";

import { prisma } from "@/lib/db";
import { applyDiscount, findDiscountPercent } from "@/lib/price";
import { DEFAULT_SETTINGS } from "@/lib/calc/engine";
import { formatBytes, formatDateTime } from "@/lib/utils";
import {
  documentStatusLabel,
  documentTypeLabel,
  projectStatusLabel,
} from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentUploader } from "@/components/document-uploader";
import {
  DeleteDocumentButton,
  DeleteProjectButton,
} from "@/components/delete-buttons";
import { TakeoffSection } from "@/components/takeoff-section";
import { KalkylSection } from "@/components/kalkyl-section";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const [project, rules, settingsRow, latestResult] = await Promise.all([
    prisma.project.findUnique({
      where: { id: params.id },
      include: {
        dokument: { orderBy: { createdAt: "desc" } },
        takeoffItems: {
          orderBy: { createdAt: "asc" },
          include: {
            kopplatResource: true,
            kopplatTimeNorm: { include: { trade: true } },
          },
        },
      },
    }),
    prisma.discountRule.findMany(),
    prisma.calculationSettings.findUnique({ where: { projectId: params.id } }),
    prisma.calculationResult.findFirst({
      where: { projectId: params.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!project) notFound();

  const settings = settingsRow
    ? {
        omkostnadProcent: Number(settingsRow.omkostnadProcent),
        materialPaslagProcent: Number(settingsRow.materialPaslagProcent),
        riskProcent: Number(settingsRow.riskProcent),
        arbetsdagTimmar: Number(settingsRow.arbetsdagTimmar),
      }
    : DEFAULT_SETTINGS;

  const latest = latestResult
    ? {
        totalMaterial: Number(latestResult.totalMaterial),
        totalArbete: Number(latestResult.totalArbete),
        totalOmkostnad: Number(latestResult.totalOmkostnad),
        totalRisk: Number(latestResult.totalRisk),
        grandTotal: Number(latestResult.grandTotal),
        totalArbetstimmar: Number(latestResult.totalArbetstimmar),
        totalDagar:
          Number(latestResult.arbetsdagTimmar) > 0
            ? Number(latestResult.totalArbetstimmar) / Number(latestResult.arbetsdagTimmar)
            : 0,
        arbetsdagTimmar: Number(latestResult.arbetsdagTimmar),
        tidPerYrke: (latestResult.tidPerYrke as {
          yrke: string;
          timmar: number;
          kostnad: number;
        }[]) ?? [],
        antalPoster: 0,
        antalSaknarPris: 0,
        antalSaknarTidsnorm: 0,
        createdAt: latestResult.createdAt.toISOString(),
      }
    : null;

  const takeoffDocs = project.dokument.map((d) => ({
    id: d.id,
    filnamn: d.filnamn,
    typ: d.typ,
    status: d.status,
  }));
  const takeoffItems = project.takeoffItems.map((t) => {
    let pris: {
      leverantor: string;
      benamning: string;
      brutto: number;
      netto: number;
      rabatt: number;
    } | null = null;
    if (t.kopplatResource) {
      const brutto = Number(t.kopplatResource.bruttopris);
      const rabatt = findDiscountPercent(
        t.kopplatResource.leverantor,
        t.kopplatResource.varugrupp,
        rules,
      );
      pris = {
        leverantor: t.kopplatResource.leverantor,
        benamning: t.kopplatResource.benamning,
        brutto,
        rabatt,
        netto: applyDiscount(brutto, rabatt),
      };
    }
    const tid = t.kopplatTimeNorm
      ? {
          yrke: t.kopplatTimeNorm.trade.namn,
          timmarPerEnhet: Number(t.kopplatTimeNorm.timmarPerEnhet),
          timpris: Number(t.kopplatTimeNorm.trade.timpris),
        }
      : null;
    return {
      id: t.id,
      kod: t.kod,
      benamning: t.benamning,
      mangd: t.mangd.toString(),
      enhet: t.enhet,
      lageskod: t.lageskod,
      kalla: t.kalla,
      konfidens: t.konfidens ? t.konfidens.toString() : null,
      antagande: t.antagande,
      granskad: t.granskad,
      kopplatResourceId: t.kopplatResourceId,
      pris,
      kopplatTimeNormId: t.kopplatTimeNormId,
      tid,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Alla projekt
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{project.namn}</h1>
              <Badge variant="secondary">{projectStatusLabel[project.status]}</Badge>
            </div>
            {project.kund && (
              <p className="text-sm text-muted-foreground">Kund: {project.kund}</p>
            )}
          </div>
          <DeleteProjectButton projectId={project.id} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ladda upp underlag</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentUploader projectId={project.id} />
          <p className="mt-3 text-xs text-muted-foreground">
            IFC ger automatiska mängder, PDF ger AI-förslag och Excel/rumslista
            tolkas till poster (mängdning byggs i Steg 2).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Dokument ({project.dokument.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {project.dokument.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <FileText className="h-8 w-8" />
              <p className="text-sm">Inga uppladdade filer ännu.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filnamn</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Storlek</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uppladdad</TableHead>
                  <TableHead className="text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.dokument.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.filnamn}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{documentTypeLabel[doc.typ]}</Badge>
                    </TableCell>
                    <TableCell>
                      {doc.storlekBytes != null ? formatBytes(doc.storlekBytes) : "–"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {documentStatusLabel[doc.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(doc.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/api/documents/${doc.id}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
                          aria-label="Ladda ner"
                        >
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </Link>
                        <DeleteDocumentButton documentId={doc.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TakeoffSection
        projectId={project.id}
        documents={takeoffDocs}
        items={takeoffItems}
      />

      <KalkylSection projectId={project.id} settings={settings} latest={latest} />
    </div>
  );
}
