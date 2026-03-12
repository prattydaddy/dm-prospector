import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { insuranceAgencies } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  getAgencyName,
  formatPhone,
  formatZip,
  getDigitalPresenceColor,
} from "@/lib/taxonomy";
import Link from "next/link";

export default async function AgencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = parseInt(id);
  if (isNaN(numId)) notFound();

  const [agency] = await db
    .select()
    .from(insuranceAgencies)
    .where(eq(insuranceAgencies.id, numId))
    .limit(1);

  if (!agency) notFound();

  const name = getAgencyName(agency);
  const dp = getDigitalPresenceColor(agency.digitalPresenceScore);
  const isEnriched = !!agency.enrichedAt;
  const address = [
    agency.address,
    agency.city ? `${agency.city}, ${agency.state || ""} ${formatZip(agency.zip)}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="px-8 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back to agencies
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="px-8 py-8 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-blue-600">{name[0]?.toUpperCase() || "?"}</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {agency.licenseType || "Insurance Agency"} · License: {agency.licenseNumber || "N/A"}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  agency.status === "Active" || agency.status === "VALID"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}>
                  {agency.status || "Unknown"}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isEnriched ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {isEnriched ? "Enriched" : "Pending Enrichment"}
                </span>
                {agency.state && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {agency.state}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
        {/* Identity */}
        <Card title="Identity" icon="id">
          <Field label="Agency Name" value={name} />
          {agency.ownerPrincipal && <Field label="Owner / Principal" value={agency.ownerPrincipal} />}
          <Field label="Address" value={address} />
          {agency.county && <Field label="County" value={agency.county} />}
          <Field label="Phone" value={formatPhone(agency.phone)} />
          {agency.email && <Field label="Email" value={agency.email} />}
          {agency.websiteUrl && <Field label="Website" value={agency.websiteUrl} link />}
          {agency.linkedinCompanyUrl && <Field label="LinkedIn (Company)" value={agency.linkedinCompanyUrl} link />}
          {agency.linkedinPersonalUrl && <Field label="LinkedIn (Personal)" value={agency.linkedinPersonalUrl} link />}
        </Card>

        {/* License Info */}
        <Card title="License Information" icon="building">
          <Field label="License Number" value={agency.licenseNumber} mono />
          <Field label="NPN" value={agency.npn} mono />
          <Field label="License Type" value={agency.licenseType} />
          <Field label="Lines of Authority" value={agency.linesOfAuthority} />
          <Field label="Status" value={agency.status} />
          <Field label="Source State" value={agency.sourceState} />
          <Field label="Source" value={agency.source} />
        </Card>

        {/* Digital Presence */}
        <Card title="Digital Presence" icon="globe">
          <Field label="Overall Score" value={dp.label} badge={dp} />
          <div className="border-t border-gray-100 my-3" />
          <PresenceRow
            platform="Google Business"
            exists={agency.googleBusinessExists}
            rating={agency.googleRating}
            reviewCount={agency.googleReviewCount}
          />
          <PresenceRow
            platform="Facebook"
            exists={agency.facebookExists}
            url={agency.facebookUrl}
          />
          <PresenceRow
            platform="Instagram"
            exists={agency.instagramExists}
            url={agency.instagramUrl}
          />
          <PresenceRow
            platform="Yelp"
            exists={agency.yelpExists}
            rating={agency.yelpRating}
            reviewCount={agency.yelpReviewCount}
          />
          {agency.googleBusinessHours && (
            <>
              <div className="border-t border-gray-100 my-3" />
              <Field label="Business Hours" value={agency.googleBusinessHours} />
            </>
          )}
        </Card>

        {/* GTM Signals */}
        <Card title="GTM Signals" icon="signal">
          {agency.employeeCount && <Field label="Employee Count" value={agency.employeeCount.toString()} />}
          {agency.yearsInBusiness && <Field label="Years in Business" value={agency.yearsInBusiness.toString()} />}
          <div className="border-t border-gray-100 my-3" />
          {agency.gtmSignals && agency.gtmSignals.length > 0 ? (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">Signal Tags</div>
              <div className="flex flex-wrap gap-2">
                {agency.gtmSignals.map((signal, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <EmptyEnrichment message="No GTM signals available yet" />
          )}
        </Card>

        {/* Summary */}
        <div className="lg:col-span-2">
          <Card title="Agency Summary" icon="doc">
            {agency.agencySummary ? (
              <p className="text-sm text-gray-700 leading-relaxed">{agency.agencySummary}</p>
            ) : (
              <EmptyEnrichment message="Agency summary will appear after enrichment" />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  const icons: Record<string, React.ReactNode> = {
    id: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
      </svg>
    ),
    globe: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    building: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
    signal: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    doc: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <span className="text-gray-400">{icons[icon]}</span>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-5 py-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  link,
  badge,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  link?: boolean;
  badge?: { bg: string; text: string; label: string };
}) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-medium text-gray-500 min-w-[120px] pt-0.5">{label}</span>
      {badge ? (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      ) : link ? (
        <a
          href={value.startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-700 truncate max-w-[280px]"
        >
          {value}
        </a>
      ) : (
        <span className={`text-sm text-gray-900 text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
      )}
    </div>
  );
}

function EmptyEnrichment({ message }: { message: string }) {
  return (
    <div className="py-6 flex flex-col items-center gap-2 border border-dashed border-gray-200 rounded-lg">
      <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

function PresenceRow({
  platform,
  exists,
  url,
  rating,
  reviewCount,
}: {
  platform: string;
  exists: boolean | null | undefined;
  url?: string | null;
  rating?: string | null;
  reviewCount?: number | null;
}) {
  const hasPresence = exists === true;
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${hasPresence ? "bg-blue-400" : exists === false ? "bg-red-300" : "bg-gray-300"}`} />
        <span className="text-sm text-gray-700">{platform}</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {hasPresence ? (
          <>
            {rating && (
              <span className="text-gray-600">
                ⭐ {rating}
                {reviewCount !== null && reviewCount !== undefined && (
                  <span className="text-gray-400 ml-1">({reviewCount})</span>
                )}
              </span>
            )}
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-xs">
                View →
              </a>
            )}
            {!rating && !url && <span className="text-blue-600 text-xs font-medium">Found</span>}
          </>
        ) : exists === false ? (
          <span className="text-gray-400 text-xs">Not found</span>
        ) : (
          <span className="text-gray-400 text-xs italic">Not checked</span>
        )}
      </div>
    </div>
  );
}
