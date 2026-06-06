import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/db";
import { applyDiscount, findDiscountPercent } from "@/lib/price";
import { formatSEK } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EdiImport } from "@/components/edi-import";

export const dynamic = "force-dynamic";

export default async function PrislistaPage() {
  const [resources, rules] = await Promise.all([
    prisma.resource.findMany({ orderBy: [{ leverantor: "asc" }, { benamning: "asc" }] }),
    prisma.discountRule.findMany({ orderBy: { leverantor: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Prislista</h1>
        <p className="text-sm text-muted-foreground">
          Intern, seedbar prislista (<strong>EXEMPELDATA</strong>). Nettopris beräknas efter
          rabattbrev. Importera en leverantörs e-katalog för att lägga till/uppdatera artiklar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">EDI-import</CardTitle>
          <CardDescription>
            CSV med kolumner: leverantor, artikelnr, benamning, enhet, bruttopris, varugrupp. Se{" "}
            <code>samples/edi-katalog-exempel.csv</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EdiImport />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Artiklar ({resources.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benämning</TableHead>
                <TableHead>Leverantör</TableHead>
                <TableHead>Art.nr</TableHead>
                <TableHead>Varugrupp</TableHead>
                <TableHead>Enhet</TableHead>
                <TableHead className="text-right">Brutto</TableHead>
                <TableHead className="text-right">Rabatt</TableHead>
                <TableHead className="text-right">Netto</TableHead>
                <TableHead>Källa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((r) => {
                const brutto = Number(r.bruttopris);
                const rabatt = findDiscountPercent(r.leverantor, r.varugrupp, rules);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.benamning}</TableCell>
                    <TableCell>{r.leverantor}</TableCell>
                    <TableCell className="text-muted-foreground">{r.artikelnr ?? "–"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.varugrupp ?? "–"}</TableCell>
                    <TableCell>{r.enhet}</TableCell>
                    <TableCell className="text-right">{formatSEK(brutto)}</TableCell>
                    <TableCell className="text-right">{rabatt > 0 ? `−${rabatt}%` : "–"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatSEK(applyDiscount(brutto, rabatt))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.prisProvider}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rabattbrev ({rules.length})</CardTitle>
          <CardDescription>
            Mer specifik regel (varugrupp) vinner över generell (alla varugrupper).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leverantör</TableHead>
                <TableHead>Varugrupp</TableHead>
                <TableHead className="text-right">Rabatt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.leverantor}</TableCell>
                  <TableCell>{d.varugrupp ?? "alla"}</TableCell>
                  <TableCell className="text-right">{Number(d.rabattProcent)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
