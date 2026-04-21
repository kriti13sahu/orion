"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getRole } from "@/lib/role";
import type { OpportunityType } from "@/types/database";
import type { Role } from "@/lib/role";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PosterProfile = {
  id: string;
  full_name: string;
  graduation_year: number | null;
};

export type OpportunityWithPoster = {
  id: string;
  type: OpportunityType;
  title: string;
  company: string;
  description: string;
  created_at: string;
  posted_by: string;
  poster: PosterProfile | null;
};

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<OpportunityType, string> = {
  job:        "Job",
  cofounder:  "Co-founder",
  internship: "Internship",
  contract:   "Contract",
};

const TYPE_BADGE: Record<OpportunityType, string> = {
  job:        "bg-green-100 text-green-700",
  cofounder:  "bg-orange-100 text-orange-700",
  internship: "bg-blue-100 text-blue-700",
  contract:   "bg-purple-100 text-purple-700",
};

type TabId = "all" | "job" | "cofounder" | "internship";

const TABS: { id: TabId; label: string }[] = [
  { id: "all",        label: "All" },
  { id: "job",        label: "Jobs" },
  { id: "cofounder",  label: "Co-founder" },
  { id: "internship", label: "Internship" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function OpportunitiesBoard({
  opportunities,
  initialAppliedIds,
  currentUserId,
  currentUserRole,
}: {
  opportunities: OpportunityWithPoster[];
  initialAppliedIds: string[];
  currentUserId: string;
  currentUserRole: Role;
}) {
  const supabase = createClient();

  const [tab, setTab] = useState<TabId>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set(initialAppliedIds));
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Filter ───────────────────────────────────────────────────────────────

  const filtered =
    tab === "all" ? opportunities : opportunities.filter((o) => o.type === tab);

  // ── Actions ──────────────────────────────────────────────────────────────

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleApply(opportunityId: string) {
    setApplyingId(opportunityId);
    setErrors((prev) => ({ ...prev, [opportunityId]: "" }));

    const { error } = await supabase.from("opportunity_applications").insert({
      opportunity_id: opportunityId,
      applicant_id: currentUserId,
      note: null,
    });

    if (!error || error.code === "23505") {
      // 23505 = unique_violation — already applied, treat as success
      setAppliedIds((prev) => new Set([...prev, opportunityId]));
    } else {
      setErrors((prev) => ({
        ...prev,
        [opportunityId]: "Failed to submit. Please try again.",
      }));
    }

    setApplyingId(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
          <p className="text-sm text-gray-500 mt-1">
            Jobs, co-founder searches, and more from the Darden network.
          </p>
        </div>
        <Link
          href="/opportunities/new"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 bg-uva-navy text-white text-sm font-medium rounded-lg hover:bg-uva-blue transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Post opportunity
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map((t) => {
          const count =
            t.id === "all"
              ? opportunities.length
              : opportunities.filter((o) => o.type === t.id).length;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              <span
                className={`ml-1.5 text-xs ${
                  tab === t.id ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No opportunities yet.</p>
          <p className="text-sm mt-1">Be the first to post one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((opp) => {
            const isExpanded = expandedId === opp.id;
            const isOwn = opp.posted_by === currentUserId;
            const hasApplied = appliedIds.has(opp.id);
            const isApplying = applyingId === opp.id;
            const posterRole = opp.poster?.graduation_year
              ? getRole(opp.poster.graduation_year)
              : null;

            return (
              <div
                key={opp.id}
                className={`bg-white rounded-xl border transition-all ${
                  isExpanded
                    ? "border-uva-navy/30 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                {/* Card header — always visible, clickable to expand */}
                <button
                  type="button"
                  onClick={() => toggleExpand(opp.id)}
                  className="w-full text-left px-5 py-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`shrink-0 mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[opp.type]}`}
                    >
                      {TYPE_LABELS[opp.type]}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900 leading-snug">
                            {opp.title}
                          </p>
                          <p className="text-sm text-gray-500 mt-0.5">{opp.company}</p>
                        </div>
                        <svg
                          className={`shrink-0 w-4 h-4 text-gray-400 mt-1 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {/* Posted by */}
                      {opp.poster && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-xs text-gray-400">Posted by</span>
                          <span className="text-xs font-medium text-gray-600">
                            {opp.poster.full_name}
                          </span>
                          {posterRole && (
                            <span
                              className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                posterRole === "student"
                                  ? "bg-uva-orange/10 text-uva-orange"
                                  : "bg-uva-navy/10 text-uva-navy"
                              }`}
                            >
                              {posterRole === "student" ? "Student" : "Alumni"}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Description preview — collapsed only */}
                      {!isExpanded && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                          {opp.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {opp.description}
                    </p>

                    <div className="mt-4 flex items-center gap-3">
                      {isOwn ? (
                        <span className="text-xs text-gray-400 italic">
                          This is your post.
                        </span>
                      ) : hasApplied ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3.5 py-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Interest expressed
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isApplying}
                          onClick={() => handleApply(opp.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-uva-navy text-white text-sm font-medium rounded-lg hover:bg-uva-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isApplying ? "Submitting…" : "Express interest"}
                        </button>
                      )}

                      {errors[opp.id] && (
                        <p className="text-xs text-red-600">{errors[opp.id]}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
