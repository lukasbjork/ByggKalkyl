import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { parseIfc, renderPdf, IfcServiceUnavailableError } from "@/lib/ifc-client";
import { parseExcel } from "@/lib/excel";
import { getLLMProvider, AINotConfiguredError } from "@/lib/ai";
import { createTakeoffItems } from "@/lib/takeoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Max antal ritningssidor som skickas till AI per körning (skydd mot stora payloads). */
const MAX_PDF_PAGES_TO_AI = 10;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; docId: string } },
) {
  const doc = await prisma.projectDocument.findUnique({
    where: { id: params.docId },
  });
  if (!doc || doc.projectId !== params.id) {
    return NextResponse.json({ error: "Dokumentet hittades inte" }, { status: 404 });
  }

  const storage = getStorage();
  let buffer: Buffer;
  try {
    buffer = await storage.read(doc.lagringssokvag);
  } catch {
    return NextResponse.json({ error: "Filen saknas i lagringen" }, { status: 404 });
  }

  await prisma.projectDocument.update({
    where: { id: doc.id },
    data: { status: "PARSING", felmeddelande: null },
  });

  try {
    let created = 0;
    let info = "";

    if (doc.typ === "IFC") {
      const result = await parseIfc(buffer, doc.filnamn);
      created = await createTakeoffItems(doc.projectId, doc.id, "IFC", result.items);
      info = `IFC (${result.schema}): ${result.antal_typer} typer.`;
    } else if (doc.typ === "EXCEL") {
      const rows = await parseExcel(buffer);
      created = await createTakeoffItems(doc.projectId, doc.id, "EXCEL", rows);
      info = `Excel: ${rows.length} rader tolkade.`;
    } else if (doc.typ === "PDF") {
      const llm = getLLMProvider();
      if (!llm.available()) {
        await prisma.projectDocument.update({
          where: { id: doc.id },
          data: { status: "UPLOADED" },
        });
        return NextResponse.json(
          {
            error:
              "AI är inte konfigurerad. Lägg till en gratis GEMINI_API_KEY (aistudio.google.com/apikey) eller mata in poster manuellt.",
            code: "AI_NOT_CONFIGURED",
          },
          { status: 400 },
        );
      }
      const rendered = await renderPdf(buffer, doc.filnamn);
      const pages = rendered.pages.slice(0, MAX_PDF_PAGES_TO_AI);
      const context = pages
        .map((p) => p.text)
        .join("\n")
        .slice(0, 2000);
      const suggestion = await llm.takeoffFromImages(
        pages.map((p) => ({ base64: p.image_base64, mimeType: "image/png" })),
        context,
      );
      created = await createTakeoffItems(doc.projectId, doc.id, "AI_PDF", suggestion.items);
      info = `PDF (${llm.name}): ${suggestion.items.length} förslag från ${pages.length}/${rendered.total_pages} sidor.`;
      if (suggestion.osakerheter.length) {
        info += ` Osäkerheter: ${suggestion.osakerheter.join("; ")}`;
      }
    } else {
      await prisma.projectDocument.update({
        where: { id: doc.id },
        data: { status: "UPLOADED" },
      });
      return NextResponse.json(
        { error: "Den här filtypen kan inte mängdas automatiskt. Mata in poster manuellt." },
        { status: 400 },
      );
    }

    await prisma.projectDocument.update({
      where: { id: doc.id },
      data: { status: "PARSED" },
    });
    // Flytta projektet till mängdningsfas.
    await prisma.project.updateMany({
      where: { id: doc.projectId, status: "DRAFT" },
      data: { status: "TAKEOFF" },
    });

    return NextResponse.json({ created, info }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof IfcServiceUnavailableError ||
      err instanceof AINotConfiguredError ||
      err instanceof Error
        ? err.message
        : "Mängdningen misslyckades";
    await prisma.projectDocument.update({
      where: { id: doc.id },
      data: { status: "FAILED", felmeddelande: message.slice(0, 500) },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
