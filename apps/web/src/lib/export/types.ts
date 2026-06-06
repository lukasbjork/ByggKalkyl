/** Gemensam datastruktur för export (xlsx + PDF). */

export interface ExportLine {
  byggdel: string | null;
  benamning: string;
  kod: string | null;
  mangd: number;
  enhet: string;
  leverantor: string | null;
  nettoApris: number | null;
  materialkostnad: number;
  yrke: string | null;
  arbetstimmar: number;
  timpris: number | null;
  arbetskostnad: number;
  radtotal: number;
  saknarPris: boolean;
  saknarTidsnorm: boolean;
}

export interface ExportData {
  projektNamn: string;
  kund: string | null;
  datum: string;
  prislage: string | null;
  provider: string;
  lines: ExportLine[];
  totals: {
    totalMaterial: number;
    totalArbete: number;
    totalOmkostnad: number;
    totalRisk: number;
    grandTotal: number;
    totalArbetstimmar: number;
    totalDagar: number;
    arbetsdagTimmar: number;
  };
  tidPerYrke: { yrke: string; timmar: number; kostnad: number }[];
}
