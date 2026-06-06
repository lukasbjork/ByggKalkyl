/** Klient mot Python-mikrotjänsten (services/ifc) för IFC-mängder och PDF-rasterisering. */

const IFC_SERVICE_URL = process.env.IFC_SERVICE_URL ?? "http://localhost:8000";

export interface IfcQuantityItem {
  benamning: string;
  kod: string | null;
  mangd: number;
  enhet: string;
  lage: string | null;
  konfidens: number;
  antagande: string | null;
}

export interface IfcQuantitiesResult {
  schema: string;
  antal_typer: number;
  items: IfcQuantityItem[];
}

export interface PdfPage {
  page: number;
  width: number;
  height: number;
  image_base64: string;
  text: string;
}

export interface PdfRenderResult {
  total_pages: number;
  rendered_pages: number;
  truncated: boolean;
  pages: PdfPage[];
}

/** Kastas när IFC/PDF-tjänsten inte går att nå (t.ex. inte startad). */
export class IfcServiceUnavailableError extends Error {
  constructor(message = "IFC/PDF-tjänsten är inte tillgänglig") {
    super(message);
    this.name = "IfcServiceUnavailableError";
  }
}

async function postFile(
  endpoint: string,
  buffer: Buffer,
  filename: string,
): Promise<Response> {
  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(buffer)]), filename);
  try {
    return await fetch(`${IFC_SERVICE_URL}${endpoint}`, {
      method: "POST",
      body: fd,
    });
  } catch {
    throw new IfcServiceUnavailableError(
      `Kunde inte nå IFC/PDF-tjänsten på ${IFC_SERVICE_URL}. Är den startad (uvicorn)?`,
    );
  }
}

async function failBody(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  return data?.detail ?? `HTTP ${res.status}`;
}

export async function parseIfc(
  buffer: Buffer,
  filename: string,
): Promise<IfcQuantitiesResult> {
  const res = await postFile("/ifc/quantities", buffer, filename);
  if (!res.ok) throw new Error(await failBody(res));
  return res.json();
}

export async function renderPdf(
  buffer: Buffer,
  filename: string,
): Promise<PdfRenderResult> {
  const res = await postFile("/pdf/render", buffer, filename);
  if (!res.ok) throw new Error(await failBody(res));
  return res.json();
}
