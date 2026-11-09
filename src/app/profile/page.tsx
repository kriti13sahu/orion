import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/role";
import { redirect } from "next/navigation";
import AvailabilitySection from "./availability-section";
import ProfileCard from "./profile-card";

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

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      {/* ── Profile card (read mode + inline edit) ──────────────────────── */}
      <ProfileCard initialProfile={profile} role={role} />

      {/* ── Availability section ───────────────────────────────────────── */}
      <AvailabilitySection
        userId={user.id}
        role={role}
        initialRows={availabilityRows ?? []}
      />
    </main>
  );
}
