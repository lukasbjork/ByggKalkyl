import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { detectDocumentType, MAX_UPLOAD_BYTES } from "@/lib/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ladda upp en eller flera filer till ett projekt. */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const projectId = params.id;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Projektet hittades inte" }, { status: 404 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Förväntade multipart/form-data" }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Inga filer bifogade" }, { status: 400 });
  }

  const storage = getStorage();
  const created = [];

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Filen "${file.name}" är för stor (max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB)` },
        { status: 413 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
    const key = `projects/${projectId}/${crypto.randomUUID()}-${safeName}`;
    await storage.save(key, buf, file.type);

    const doc = await prisma.projectDocument.create({
      data: {
        projectId,
        filnamn: file.name,
        typ: detectDocumentType(file.name),
        lagringssokvag: key,
        storlekBytes: buf.byteLength,
        status: "UPLOADED",
      },
    });
    created.push(doc);
  }

  return NextResponse.json(created, { status: 201 });
}
