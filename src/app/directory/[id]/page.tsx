import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/role";
import { notFound } from "next/navigation";
import type { AvailabilityType } from "@/types/database";
import ChatRequestButton from "./chat-request-button";

// ── Shared display config (mirrors directory/page.tsx) ────────────────────────

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

type AvailabilityRow = {
  type: AvailabilityType;
  is_active: boolean;
  expires_at: string | null;
};

function isActiveStatus(row: AvailabilityRow): boolean {
  return row.is_active && (!row.expires_at || new Date(row.expires_at) > new Date());
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProfileDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  // Run profile + viewer queries concurrently
  const [
    { data: profile },
    { data: { user: currentUser } },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, graduation_year, program, current_role, current_company, industry, location, linkedin_url, bio, availability_status(type, is_active, expires_at)"
      )
      .eq("id", params.id)
      .single(),
    supabase.auth.getUser(),
  ]);

  if (!profile) notFound();

  const role = profile.graduation_year ? getRole(profile.graduation_year) : "alumni";

  const activeStatuses = (
    (profile.availability_status as AvailabilityRow[] | null) ?? []
  ).filter(isActiveStatus);

  const hasCoffeeChats = activeStatuses.some((s) => s.type === "coffee_chats");
  const isOwnProfile = currentUser?.id === profile.id;

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .slice(0, 2)
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-uva-navy text-white text-xl font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + role pill */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{profile.full_name}</h1>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  role === "student"
                    ? "bg-uva-orange/10 text-uva-orange"
                    : "bg-uva-navy/10 text-uva-navy"
                }`}
              >
                {role === "student" ? "Student" : "Alumni"}
              </span>
            </div>

            {/* Role · Company — alumni only */}
            {role === "alumni" && (profile.current_role || profile.current_company) && (
              <p className="text-sm text-gray-600 mt-0.5">
                {[profile.current_role, profile.current_company].filter(Boolean).join(" · ")}
              </p>
            )}

            {/* Program · Year · Location · Industry (alumni) */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
              {(profile.program || profile.graduation_year) && (
                <span className="text-xs text-gray-400">
                  {[profile.program, profile.graduation_year].filter(Boolean).join(" · ")}
                </span>
              )}
              {profile.location && (
                <span className="text-xs text-gray-400">{profile.location}</span>
              )}
              {role === "alumni" && profile.industry && (
                <span className="text-xs text-gray-400">{profile.industry}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Bio ─────────────────────────────────────────────────────── */}
        {profile.bio && (
          <p className="mt-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-5">
            {profile.bio}
          </p>
        )}

        {/* ── LinkedIn ────────────────────────────────────────────────── */}
        {profile.linkedin_url && (
          <a
            href={profile.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-uva-navy hover:underline"
          >
            LinkedIn profile
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}

        {/* ── Active availability badges ───────────────────────────────── */}
        {activeStatuses.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2.5">
              Open to
            </p>
            <div className="flex flex-wrap gap-2">
              {activeStatuses.map((s) => (
                <span
                  key={s.type}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${BADGE_COLORS[s.type]}`}
                >
                  {AVAILABILITY_LABELS[s.type]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Request a chat ──────────────────────────────────────────── */}
        {hasCoffeeChats && !isOwnProfile && currentUser && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <ChatRequestButton
              fromUserId={currentUser.id}
              toUserId={profile.id}
              toName={profile.full_name}
            />
          </div>
        )}
      </div>
    </main>
  );
}
