import { createClient } from "@/lib/supabase/server";
import DirectoryList from "./directory-list";
import type { DirectoryProfile } from "./directory-filter";

export default async function DirectoryPage() {
  const supabase = createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, current_role, current_company, industry, location, graduation_year, program, availability_status(type, is_active, expires_at)"
    )
    .order("full_name");

  if (error) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Member Directory</h1>
        <p role="alert" className="mt-6 text-sm text-red-700">
          Could not load members. Refresh the page to try again.
        </p>
      </main>
    );
  }

  // Search and filters run in the browser: the pilot directory is small enough
  // to load once, so filtering is instant and needs no extra queries.
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <DirectoryList profiles={(profiles ?? []) as DirectoryProfile[]} />
    </main>
  );
}
