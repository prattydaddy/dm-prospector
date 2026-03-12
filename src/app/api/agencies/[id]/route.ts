import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceAgencies } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id);

  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const [agency] = await db
    .select()
    .from(insuranceAgencies)
    .where(eq(insuranceAgencies.id, numId))
    .limit(1);

  if (!agency) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 });
  }

  return NextResponse.json(agency);
}
