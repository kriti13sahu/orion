import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Nav() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, current_role, current_company")
    .eq("id", user.id)
    .single();

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Wordmark */}
        <Link href="/directory" className="text-lg font-bold text-uva-navy">
          Orion
        </Link>

        {/* Main nav */}
        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/directory" className="hover:text-uva-navy transition-colors">
            Directory
          </Link>
          <Link href="/opportunities" className="hover:text-uva-navy transition-colors">
            Opportunities
          </Link>
          <Link href="/feed" className="hover:text-uva-navy transition-colors">
            Feed
          </Link>
          <Link href="/messages" className="hover:text-uva-navy transition-colors">
            Messages
          </Link>
        </nav>

        {/* User avatar */}
        <Link
          href="/profile"
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-uva-navy text-white text-xs font-semibold flex items-center justify-center">
            {initials}
          </div>
          <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
            {profile?.full_name ?? user.email}
          </span>
        </Link>
      </div>
    </header>
  );
}
