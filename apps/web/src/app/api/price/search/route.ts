import { NextRequest, NextResponse } from "next/server";

import { getPriceProvider } from "@/lib/price";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Slå upp pris mot prislagret. ?benamning=&artikelnr=&leverantor= */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const benamning = sp.get("benamning") ?? "";
  const artikelnr = sp.get("artikelnr") ?? undefined;
  const leverantor = sp.get("leverantor") ?? undefined;

  if (!benamning && !artikelnr) {
    return NextResponse.json([]);
  }

  try {
    const provider = getPriceProvider();
    const results = await provider.lookup({ benamning, artikelnr, leverantor });
    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Prisuppslag misslyckades";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
