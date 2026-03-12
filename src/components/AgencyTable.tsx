"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  getAgencyName,
  formatPhone,
  formatZip,
  getDigitalPresenceColor,
  getEnrichmentStatus,
} from "@/lib/taxonomy";
import { type Agency } from "@/lib/schema";

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface StatsData {
  topCities: { city: string; count: number }[];
  licenseTypes: { licenseType: string; count: number }[];
  states: { state: string; count: number }[];
}

interface ApiResponse {
  agencies: Agency[];
  pagination: PaginationData;
}

export default function AgencyTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const city = searchParams.get("city") || "";
  const licenseType = searchParams.get("licenseType") || "";
  const state = searchParams.get("state") || "";
  const enrichment = searchParams.get("enrichment") || "";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      if (!updates.page) params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  // Fetch stats for dynamic filter dropdowns
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/agencies/stats");
        const json = await res.json();
        setStats(json);
      } catch (e) {
        console.error("Failed to fetch stats", e);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "50");
      if (search) params.set("search", search);
      if (city) params.set("city", city);
      if (licenseType) params.set("licenseType", licenseType);
      if (state) params.set("state", state);
      if (enrichment) params.set("enrichment", enrichment);

      try {
        const res = await fetch(`/api/agencies?${params.toString()}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Failed to fetch agencies", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page, search, city, licenseType, state, enrichment]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ search: value, page: "1" });
    }, 350);
  };

  const totalCount = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 0;

  // Build dynamic filter options from stats
  const cityOptions = (stats?.topCities || [])
    .filter((c) => c.city)
    .map((c) => ({
      label: c.city.charAt(0) + c.city.slice(1).toLowerCase(),
      value: c.city,
    }));

  const licenseTypeOptions = (stats?.licenseTypes || [])
    .filter((lt) => lt.licenseType)
    .map((lt) => ({
      label: lt.licenseType,
      value: lt.licenseType,
    }));

  const stateOptions = (stats?.states || [])
    .filter((s) => s.state)
    .map((s) => ({
      label: s.state,
      value: s.state,
    }));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Agencies</h1>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {totalCount.toLocaleString()} total
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 border-b border-gray-200">
          {[
            { label: "All", value: "" },
            { label: "Enriched", value: "enriched" },
            { label: "Not Enriched", value: "not_enriched" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => updateParams({ enrichment: tab.value })}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                enrichment === tab.value
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by agency name, city, or license..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-gray-900 placeholder-gray-400"
            />
          </div>

          <FilterSelect
            value={state}
            onChange={(v) => updateParams({ state: v })}
            placeholder="All States"
            options={stateOptions}
          />

          <FilterSelect
            value={city}
            onChange={(v) => updateParams({ city: v })}
            placeholder="All Cities"
            options={cityOptions}
          />

          <FilterSelect
            value={licenseType}
            onChange={(v) => updateParams({ licenseType: v })}
            placeholder="All License Types"
            options={licenseTypeOptions}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Agency</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">License Type</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Enrichment</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Signals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="py-3.5 px-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.agencies.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <p className="text-sm font-medium">No agencies found</p>
                    <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              data?.agencies.map((agency) => {
                const es = getEnrichmentStatus(agency.enrichedAt);
                return (
                  <tr
                    key={agency.id}
                    onClick={() => router.push(`/agencies/${agency.id}`)}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-blue-600">
                            {(getAgencyName(agency))[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[240px]">
                            {getAgencyName(agency)}
                          </div>
                          <div className="text-xs text-gray-500">{agency.licenseType || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-sm text-gray-600">
                        {agency.city ? `${agency.city}, ${agency.state || ""} ${formatZip(agency.zip)}` : "—"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-sm text-gray-600 tabular-nums">{formatPhone(agency.phone)}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-sm text-gray-600">{agency.licenseType || "—"}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        agency.status === "Active" || agency.status === "VALID"
                          ? "bg-emerald-50 text-emerald-700"
                          : agency.status === "Inactive" || agency.status === "EXPIRED"
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-50 text-gray-500"
                      }`}>
                        {agency.status || "—"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${es.bg} ${es.text}`}>
                        {es.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex gap-1 flex-wrap">
                        {agency.gtmSignals && agency.gtmSignals.length > 0 ? (
                          agency.gtmSignals.slice(0, 2).map((signal, i) => (
                            <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-600">
                              {signal}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && data && totalPages > 1 && (
        <div className="border-t border-gray-200 px-8 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, totalCount)} of {totalCount.toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateParams({ page: Math.max(1, page - 1).toString() })}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-2 text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => updateParams({ page: p.toString() })}
                    className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                      p === page
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => updateParams({ page: Math.min(totalPages, page + 1).toString() })}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { label: string; value: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 appearance-none cursor-pointer pr-8"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: "right 0.5rem center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "1.25em 1.25em",
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | string)[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
