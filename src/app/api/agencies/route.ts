import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceAgencies } from "@/lib/schema";
import { ilike, eq, and, isNotNull, isNull, or, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const search = searchParams.get("search") || "";
  const city = searchParams.get("city") || "";
  const licenseType = searchParams.get("licenseType") || "";
  const state = searchParams.get("state") || "";
  const enrichmentStatus = searchParams.get("enrichment") || "";
  const offset = (page - 1) * limit;

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(insuranceAgencies.agencyName, `%${search}%`),
        ilike(insuranceAgencies.ownerPrincipal, `%${search}%`),
        ilike(insuranceAgencies.city, `%${search}%`),
        ilike(insuranceAgencies.licenseNumber, `%${search}%`)
      )
    );
  }

  if (city) {
    conditions.push(ilike(insuranceAgencies.city, city));
  }

  if (licenseType) {
    conditions.push(eq(insuranceAgencies.licenseType, licenseType));
  }

  if (state) {
    conditions.push(eq(insuranceAgencies.state, state));
  }

  if (enrichmentStatus === "enriched") {
    conditions.push(isNotNull(insuranceAgencies.enrichedAt));
  } else if (enrichmentStatus === "not_enriched") {
    conditions.push(isNull(insuranceAgencies.enrichedAt));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [agencies, totalResult] = await Promise.all([
    db
      .select()
      .from(insuranceAgencies)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(insuranceAgencies.id),
    db
      .select({ count: count() })
      .from(insuranceAgencies)
      .where(whereClause),
  ]);

  const total = totalResult[0]?.count || 0;

  return NextResponse.json({
    agencies,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(Number(total) / limit),
    },
  });
}
