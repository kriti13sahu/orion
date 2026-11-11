"use client";

// TEST LOGIN — email + password sign-in for shared test accounts during the pilot,
// so testers don't depend on emailed sign-in links. Off unless
// NEXT_PUBLIC_ENABLE_TEST_LOGIN=true is set (in .env.local or the Vercel project).
// Remove the env var (and redeploy) to turn it off. Delete this page before launch.

import { useState } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TEST_LOGIN === "true";

export default function DevLoginPage() {
  if (!ENABLED) notFound();
  return <DevLoginForm />;
}

function DevLoginForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw signInError;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      window.location.href = profile ? "/directory" : "/onboarding";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-amber-300 p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
          Test login
        </p>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Sign in with a test account</h1>
        <p className="text-sm text-gray-500 mb-6">
          Create the account in Supabase → Authentication → Users → Add user (auto-confirm).
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="dev-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="dev-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-uva-navy"
            />
          </div>
          <div>
            <label htmlFor="dev-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="dev-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-uva-navy"
            />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-uva-navy text-white py-2.5 rounded-lg text-sm font-medium hover:bg-uva-blue disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
