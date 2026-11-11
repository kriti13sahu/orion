"use client";

import { useMemo, useState } from "react";
import { getRole } from "@/lib/role";
import type { AvailabilityType } from "@/types/database";
import { filterDirectoryMembers, getActiveStatuses } from "./directory-filter";
import type { DirectoryProfile, RoleFilter } from "./directory-filter";

// ── Types & constants ─────────────────────────────────────────────────────────

const AVAILABILITY_LABELS: Record<AvailabilityType, string> = {
  coffee_chats: "Coffee chats",
  mentorship:   "Mentorship",
  hiring:       "Hiring",
  cofounder:    "Co-founder",
};

const BADGE_COLORS: Record<AvailabilityType, string> = {
  coffee_chats: "bg-blue-100 text-blue-700",
  mentorship:   "bg-purple-100 text-purple-700",
  hiring:       "bg-green-100 text-green-700",
  cofounder:    "bg-orange-100 text-orange-700",
};

const ROLE_OPTIONS: { id: RoleFilter; label: string }[] = [
  { id: "all",     label: "All" },
  { id: "student", label: "Students" },
  { id: "alumni",  label: "Alumni" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function DirectoryList({ profiles }: { profiles: DirectoryProfile[] }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [openTo, setOpenTo] = useState<AvailabilityType | "any">("any");

  // Derive role and live availability once per profile, not on every keystroke.
  const members = useMemo(
    () =>
      profiles.map((p) => ({
        profile: p,
        role: p.graduation_year ? getRole(p.graduation_year) : null,
        activeStatuses: getActiveStatuses(p.availability_status),
      })),
    [profiles]
  );

  const visible = filterDirectoryMembers(members, query, roleFilter, openTo);
  const isFiltered = query.trim().length > 0 || roleFilter !== "all" || openTo !== "any";

  function clearFilters() {
    setQuery("");
    setRoleFilter("all");
    setOpenTo("any");
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Member Directory</h1>
        <p className="text-sm text-gray-500 mt-1" aria-live="polite">
          {isFiltered
            ? `Showing ${visible.length} of ${profiles.length} members`
            : `${profiles.length} members in the Darden network`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <label htmlFor="directory-search" className="sr-only">
          Search members
        </label>
        <input
          id="directory-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, company, role, industry, or location"
          className="w-full sm:flex-1 px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-uva-navy focus:border-transparent placeholder:text-gray-400"
        />

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit" role="group" aria-label="Filter by role">
          {ROLE_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={roleFilter === o.id}
              onClick={() => setRoleFilter(o.id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                roleFilter === o.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <label htmlFor="directory-open-to" className="sr-only">
          Filter by availability
        </label>
        <select
          id="directory-open-to"
          value={openTo}
          onChange={(e) => setOpenTo(e.target.value as AvailabilityType | "any")}
          className="w-full sm:w-auto px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-uva-navy focus:border-transparent"
        >
          <option value="any">Open to: anything</option>
          {(Object.keys(AVAILABILITY_LABELS) as AvailabilityType[]).map((t) => (
            <option key={t} value={t}>
              Open to: {AVAILABILITY_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map(({ profile, role, activeStatuses }) => {
          const initials = profile.full_name
            ? profile.full_name
                .split(" ")
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase()
            : "?";

          return (
            <a
              key={profile.id}
              href={`/directory/${profile.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-uva-navy text-white text-sm font-semibold flex items-center justify-center shrink-0">
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">{profile.full_name}</p>
                    {role && (
                      <span
                        className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                          role === "student"
                            ? "bg-uva-orange/10 text-uva-orange"
                            : "bg-uva-navy/10 text-uva-navy"
                        }`}
                      >
                        {role === "student" ? "Student" : "Alumni"}
                      </span>
                    )}
                  </div>

                  {role === "alumni" && (profile.current_role || profile.current_company) && (
                    <p className="text-sm text-gray-500 truncate">
                      {[profile.current_role, profile.current_company].filter(Boolean).join(" · ")}
                    </p>
                  )}

                  {profile.location && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{profile.location}</p>
                  )}
                </div>
              </div>

              {/* Availability badges — live from availability_status only */}
              {activeStatuses.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {activeStatuses.map((s) => (
                    <span
                      key={s.type}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${BADGE_COLORS[s.type]}`}
                    >
                      {AVAILABILITY_LABELS[s.type]}
                    </span>
                  ))}
                </div>
              )}

              {/* Class year pill */}
              {(profile.graduation_year || profile.program) && (
                <p className="text-xs text-gray-400 mt-3">
                  {[profile.program, profile.graduation_year].filter(Boolean).join(" ")}
                </p>
              )}
            </a>
          );
        })}
      </div>

      {profiles.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No members yet.</p>
          <p className="text-sm mt-1">Be the first to join!</p>
        </div>
      ) : (
        visible.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No members match these filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-sm font-medium text-uva-navy hover:underline"
            >
              Clear filters
            </button>
          </div>
        )
      )}
    </>
  );
}
