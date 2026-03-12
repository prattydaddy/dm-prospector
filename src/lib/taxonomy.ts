export function getAgencyName(agency: {
  agencyName?: string | null;
  ownerPrincipal?: string | null;
}): string {
  if (agency.agencyName) return agency.agencyName;
  if (agency.ownerPrincipal) return agency.ownerPrincipal;
  return "Unknown Agency";
}

export function getLinesOfAuthority(loa: string | null | undefined): string {
  if (!loa) return "—";
  return loa;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function formatZip(zip: string | null | undefined): string {
  if (!zip) return "";
  if (zip.length > 5) return zip.slice(0, 5);
  return zip;
}

export function getDigitalPresenceColor(score: string | null | undefined): {
  bg: string;
  text: string;
  label: string;
} {
  switch (score?.toLowerCase()) {
    case "strong":
      return { bg: "bg-blue-50", text: "text-blue-700", label: "Strong" };
    case "moderate":
      return { bg: "bg-amber-50", text: "text-amber-700", label: "Moderate" };
    case "weak":
      return { bg: "bg-red-50", text: "text-red-700", label: "Weak" };
    default:
      return { bg: "bg-gray-50", text: "text-gray-500", label: "Unknown" };
  }
}

export function getEnrichmentStatus(enrichedAt: Date | null | undefined): {
  bg: string;
  text: string;
  label: string;
} {
  if (enrichedAt) {
    return { bg: "bg-blue-50", text: "text-blue-700", label: "Enriched" };
  }
  return { bg: "bg-gray-50", text: "text-gray-500", label: "Pending" };
}
