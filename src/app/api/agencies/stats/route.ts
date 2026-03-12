import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceAgencies } from "@/lib/schema";
import { sql, count } from "drizzle-orm";

export async function GET() {
  const [totals] = await db
    .select({
      total: count(),
      enriched: count(insuranceAgencies.enrichedAt),
    })
    .from(insuranceAgencies);

  const topCities = await db
    .select({
      city: insuranceAgencies.city,
      count: count(),
    })
    .from(insuranceAgencies)
    .groupBy(insuranceAgencies.city)
    .orderBy(sql`count(*) desc`)
    .limit(30);

  const licenseTypes = await db
    .select({
      licenseType: insuranceAgencies.licenseType,
      count: count(),
    })
    .from(insuranceAgencies)
    .groupBy(insuranceAgencies.licenseType)
    .orderBy(sql`count(*) desc`)
    .limit(20);

  const states = await db
    .select({
      state: insuranceAgencies.state,
      count: count(),
    })
    .from(insuranceAgencies)
    .groupBy(insuranceAgencies.state)
    .orderBy(sql`count(*) desc`);

  return NextResponse.json({
    total: totals.total,
    enriched: totals.enriched,
    topCities,
    licenseTypes,
    states,
  });
}
