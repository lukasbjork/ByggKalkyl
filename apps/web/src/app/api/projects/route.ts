import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createProjectSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lista alla projekt (senaste först). */
export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { dokument: true, takeoffItems: true } },
    },
  });
  return NextResponse.json(projects);
}

/** Skapa ett nytt projekt. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig indata", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { namn, kund } = parsed.data;
  const project = await prisma.project.create({
    data: { namn, kund: kund?.length ? kund : null },
  });
  return NextResponse.json(project, { status: 201 });
}
