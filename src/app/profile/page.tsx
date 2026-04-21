import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/role";
import { redirect } from "next/navigation";
import AvailabilitySection from "./availability-section";

export default async function ProfilePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, graduation_year, program, current_role, current_company, industry, location, linkedin_url, bio"
    )
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  const { data: availabilityRows } = await supabase
    .from("availability_status")
    .select("type, is_active, expires_at, note")
    .eq("user_id", user.id);

  const role = profile.graduation_year ? getRole(profile.graduation_year) : "student";

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .slice(0, 2)
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      {/* ── Profile card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-uva-navy text-white text-xl font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + role badge */}
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

            {/* Role · Company */}
            {(profile.current_role || profile.current_company) && (
              <p className="text-sm text-gray-600 mt-0.5">
                {[profile.current_role, profile.current_company].filter(Boolean).join(" · ")}
              </p>
            )}

            {/* Program · Year · Location */}
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

        {/* Bio */}
        {profile.bio && (
          <p className="mt-4 text-sm text-gray-600 border-t border-gray-100 pt-4 leading-relaxed">
            {profile.bio}
          </p>
        )}

        {/* LinkedIn */}
        {profile.linkedin_url && (
          <a
            href={profile.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-uva-navy hover:underline"
          >
            LinkedIn profile
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* ── Availability section ───────────────────────────────────────── */}
      <AvailabilitySection
        userId={user.id}
        role={role}
        initialRows={availabilityRows ?? []}
      />
    </main>
  );
}
