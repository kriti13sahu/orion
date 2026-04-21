import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/role";
import { redirect } from "next/navigation";
import PostOpportunityForm from "./post-opportunity-form";

export default async function NewOpportunityPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("graduation_year")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  const role = profile.graduation_year ? getRole(profile.graduation_year) : "student";

  return <PostOpportunityForm userId={user.id} role={role} />;
}
