"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const UVA_DOMAIN = "@virginia.edu";
const DOMAIN_ERROR =
  "This platform is only available to the UVA community. Please use your @virginia.edu email.";
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

type Step = "email" | "otp";

export default function LoginPage() {
  const supabase = createClient();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Frontend domain check — must come before any Supabase call
    if (!DEV_MODE && !email.toLowerCase().endsWith(UVA_DOMAIN)) {
      setError(DOMAIN_ERROR);
      return;
    }

    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (otpError) throw otpError;

      setStep("otp");
      startResendCooldown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: verify OTP ───────────────────────────────────────────────────
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.toLowerCase(),
        token: otp,
        type: "email",
      });

      if (verifyError) throw verifyError;

      // Middleware will redirect to /directory or /onboarding via the session
      // but we trigger the callback check ourselves here for SPA flow
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .single();

      window.location.href = profile ? "/directory" : "/onboarding";
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message === "Token has expired or is invalid"
            ? "That code is incorrect or has expired. Please try again."
            : err.message
          : "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function startResendCooldown(seconds = 60) {
    setResendCooldown(seconds);
    const interval = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError(null);
    setLoading(true);
    try {
      const { error: resendError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (resendError) throw resendError;
      startResendCooldown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-uva-navy flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / wordmark */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Orion
          </h1>
          <p className="mt-2 text-slate-300 text-sm">
            The UVA Darden professional network
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === "email" ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Sign in
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Use your <span className="font-medium">@virginia.edu</span>{" "}
                email to get started.
              </p>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    UVA email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="mst3k@virginia.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-uva-navy focus:border-transparent placeholder:text-gray-400"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-uva-navy text-white py-2.5 rounded-lg text-sm font-medium hover:bg-uva-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending code…" : "Send verification code"}
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep("email"); setOtp(""); setError(null); }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5 -mt-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Check your email
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-gray-700">{email}</span>
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="otp"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Verification code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-uva-navy focus:border-transparent placeholder:text-gray-400"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-uva-navy text-white py-2.5 rounded-lg text-sm font-medium hover:bg-uva-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Verifying…" : "Verify code"}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-gray-500">
                Didn&apos;t get it?{" "}
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="font-medium text-uva-navy hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </p>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Access restricted to the UVA Darden community.
        </p>
      </div>
    </main>
  );
}
