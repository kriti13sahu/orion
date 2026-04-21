import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/role";
import { redirect } from "next/navigation";
import OpportunitiesBoard from "./opportunities-board";
import type { OpportunityType } from "@/types/database";
import type { PosterProfile, OpportunityWithPoster } from "./opportunities-board";

export default async function OpportunitiesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Fetch all three in parallel — opps, user profile, user's existing applications
  const [
    { data: rawOpps },
    { data: userProfile },
    { data: applications },
  ] = await Promise.all([
    supabase
      .from("opportunities")
      .select(
        "id, type, title, company, description, created_at, posted_by, profiles!posted_by(id, full_name, graduation_year)"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("graduation_year")
      .eq("id", user.id)
      .single(),
    supabase
      .from("opportunity_applications")
      .select("opportunity_id")
      .eq("applicant_id", user.id),
  ]);

  // Normalise the Supabase join — PostgREST returns the FK-joined row as a
  // single object (not array) for a many-to-one relationship.
  const opportunities: OpportunityWithPoster[] = (rawOpps ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (opp: any) => {
      const raw = opp.profiles;
      const poster: PosterProfile | null = raw
        ? Array.isArray(raw)
          ? (raw[0] ?? null)
          : raw
        : null;
      return {
        id: opp.id as string,
        type: opp.type as OpportunityType,
        title: opp.title as string,
        company: opp.company as string,
        description: opp.description as string,
        created_at: opp.created_at as string,
        posted_by: opp.posted_by as string,
        poster,
      };
    }
  );

  const currentUserRole = userProfile?.graduation_year
    ? getRole(userProfile.graduation_year)
    : "student";

  const appliedIds = (applications ?? []).map((a) => a.opportunity_id);

  return (
    <OpportunitiesBoard
      opportunities={opportunities}
      initialAppliedIds={appliedIds}
      currentUserId={user.id}
      currentUserRole={currentUserRole}
    />
  );
}
