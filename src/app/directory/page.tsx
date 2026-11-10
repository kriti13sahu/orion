import { createClient } from "@/lib/supabase/server";
import DirectoryList from "./directory-list";
import type { DirectoryProfile } from "./directory-list";

export default async function DirectoryPage() {
  const supabase = createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, full_name, current_role, current_company, industry, location, graduation_year, program, availability_status(type, is_active, expires_at)"
    )
    .order("full_name");

  // Search and filters run in the browser: the pilot directory is small enough
  // to load once, so filtering is instant and needs no extra queries.
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <DirectoryList profiles={(profiles ?? []) as DirectoryProfile[]} />
    </main>
  );
}
