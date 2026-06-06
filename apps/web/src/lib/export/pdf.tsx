import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";

import { formatSEK, formatNumber } from "@/lib/utils";
import type { ExportData, ExportLine } from "./types";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  meta: { fontSize: 9, color: "#555", marginBottom: 2 },
  disclaimer: { fontSize: 8, color: "#999", marginTop: 4, marginBottom: 10 },
  byggdel: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 2 },
  row: { flexDirection: "row", borderBottom: "0.5pt solid #e5e5e5", paddingVertical: 2 },
  headRow: { flexDirection: "row", borderBottom: "1pt solid #333", paddingVertical: 3 },
  cName: { width: "34%" },
  cQty: { width: "14%", textAlign: "right" },
  cMat: { width: "17%", textAlign: "right" },
  cLab: { width: "17%", textAlign: "right" },
  cTot: { width: "18%", textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  flag: { color: "#b45309", fontSize: 7 },
  summaryBox: { marginTop: 16, borderTop: "1pt solid #333", paddingTop: 6 },
  sRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1, width: "55%", marginLeft: "45%" },
  sTotal: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  yrkeHead: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 2 },
});

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

function CalculationDocument({ data }: { data: ExportData }) {
  const groups = groupByByggdel(data.lines);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Kalkyl – {data.projektNamn}</Text>
        {data.kund ? <Text style={styles.meta}>Kund: {data.kund}</Text> : null}
        <Text style={styles.meta}>Datum: {data.datum}</Text>
        <Text style={styles.meta}>
          Prisläge: {data.prislage ?? "–"} · Källa: {data.provider}
        </Text>
        <Text style={styles.disclaimer}>
          Belopp exkl. moms. Priser/tidsnormer kan vara EXEMPELDATA – kontrollera mot egna
          inköpspriser och normtider.
        </Text>

        {/* Tabellhuvud */}
        <View style={styles.headRow}>
          <Text style={[styles.cName, styles.bold]}>Benämning</Text>
          <Text style={[styles.cQty, styles.bold]}>Mängd</Text>
          <Text style={[styles.cMat, styles.bold]}>Material</Text>
          <Text style={[styles.cLab, styles.bold]}>Arbete</Text>
          <Text style={[styles.cTot, styles.bold]}>Radtotal</Text>
        </View>

        {groups.map(([byggdel, lines]) => (
          <View key={byggdel} wrap={false}>
            <Text style={styles.byggdel}>{byggdel}</Text>
            {lines.map((l, i) => (
              <View key={i} style={styles.row}>
                <View style={styles.cName}>
                  <Text>{l.benamning}</Text>
                  {(l.saknarPris || l.saknarTidsnorm) && (
                    <Text style={styles.flag}>
                      {l.saknarPris ? "saknar pris " : ""}
                      {l.saknarTidsnorm ? "saknar tidsnorm" : ""}
                    </Text>
                  )}
                </View>
                <Text style={styles.cQty}>
                  {formatNumber(l.mangd, 2)} {l.enhet}
                </Text>
                <Text style={styles.cMat}>{formatSEK(l.materialkostnad)}</Text>
                <Text style={styles.cLab}>{formatSEK(l.arbetskostnad)}</Text>
                <Text style={styles.cTot}>{formatSEK(l.radtotal)}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Summering */}
        <View style={styles.summaryBox}>
          <SummaryRow label="Material" value={formatSEK(data.totals.totalMaterial)} />
          <SummaryRow label="Arbete" value={formatSEK(data.totals.totalArbete)} />
          <SummaryRow label="Omkostnad/påslag" value={formatSEK(data.totals.totalOmkostnad)} />
          <SummaryRow label="Risk" value={formatSEK(data.totals.totalRisk)} />
          <View style={styles.sRow}>
            <Text style={styles.sTotal}>Total (exkl. moms)</Text>
            <Text style={styles.sTotal}>{formatSEK(data.totals.grandTotal)}</Text>
          </View>
          <SummaryRow
            label="Total arbetstid"
            value={`${formatNumber(data.totals.totalArbetstimmar, 1)} h (${formatNumber(data.totals.totalDagar, 1)} dagar)`}
          />
        </View>

        {data.tidPerYrke.length > 0 && (
          <View>
            <Text style={styles.yrkeHead}>Genomförandetid per yrke</Text>
            {data.tidPerYrke.map((t) => (
              <View key={t.yrke} style={styles.row}>
                <Text style={styles.cName}>{t.yrke}</Text>
                <Text style={styles.cQty}>{formatNumber(t.timmar, 1)} h</Text>
                <Text style={styles.cMat}></Text>
                <Text style={styles.cLab}></Text>
                <Text style={styles.cTot}>{formatSEK(t.kostnad)}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sRow}>
      <Text>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

/** Rendera kalkyl-PDF till en Buffer (serversida). */
export async function buildCalculationPdf(data: ExportData): Promise<Buffer> {
  return renderToBuffer(<CalculationDocument data={data} />);
}
