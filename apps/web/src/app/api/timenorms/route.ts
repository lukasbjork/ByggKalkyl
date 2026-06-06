import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lista tidsnormer (med yrke/timpris) för koppling. */
export async function GET() {
  const norms = await prisma.timeNorm.findMany({
    include: { trade: true },
    orderBy: { aktivitet: "asc" },
  });
  return NextResponse.json(
    norms.map((n) => ({
      id: n.id,
      aktivitet: n.aktivitet,
      enhet: n.enhet,
      timmarPerEnhet: Number(n.timmarPerEnhet),
      kod: n.kod,
      exempel: n.exempel,
      yrke: n.trade.namn,
      timpris: Number(n.trade.timpris),
    })),
  );
}
