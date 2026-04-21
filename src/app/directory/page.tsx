import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/role";
import type { AvailabilityType } from "@/types/database";

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

export default async function DirectoryPage() {
  const supabase = createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, full_name, current_role, current_company, industry, location, graduation_year, program, availability_status(type, is_active, expires_at)"
    )
    .order("full_name");

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Member Directory</h1>
        <p className="text-sm text-gray-500 mt-1">
          {profiles?.length ?? 0} members in the Darden network
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles?.map((profile) => {
          const initials = profile.full_name
            ? profile.full_name
                .split(" ")
                .slice(0, 2)
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
            : "?";

          const role = profile.graduation_year
            ? getRole(profile.graduation_year)
            : null;

          const activeStatuses = (
            (profile.availability_status as AvailabilityRow[] | null) ?? []
          ).filter(isActiveStatus);

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
                    <p className="font-semibold text-gray-900 truncate">
                      {profile.full_name}
                    </p>
                    {role && (
                      <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                        role === "student"
                          ? "bg-uva-orange/10 text-uva-orange"
                          : "bg-uva-navy/10 text-uva-navy"
                      }`}>
                        {role === "student" ? "Student" : "Alumni"}
                      </span>
                    )}
                  </div>

                  {(profile.current_role || profile.current_company) && (
                    <p className="text-sm text-gray-500 truncate">
                      {[profile.current_role, profile.current_company]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}

                  {profile.location && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {profile.location}
                    </p>
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
                  {[profile.program, profile.graduation_year]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              )}
            </a>
          );
        })}
      </div>

      {profiles?.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No members yet.</p>
          <p className="text-sm mt-1">Be the first to join!</p>
        </div>
      )}
    </main>
  );
}
