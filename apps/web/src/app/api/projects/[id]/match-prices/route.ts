import { NextRequest, NextResponse } from "next/server";

import { autoMatchPrices } from "@/lib/match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Auto-matcha priser (Resource) mot poster som saknar koppling. */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const result = await autoMatchPrices(params.id);
  return NextResponse.json(result);
}
