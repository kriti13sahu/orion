"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getRole } from "@/lib/role";

const PROGRAMS = ["MBA", "EMBA", "Ph.D.", "MS Commerce", "Other"];

const INDUSTRIES = [
  "Consulting",
  "Finance / Investment Banking",
  "Private Equity / Venture Capital",
  "Technology",
  "Healthcare",
  "Consumer / Retail",
  "Real Estate",
  "Government / Nonprofit",
  "Media / Entertainment",
  "Energy",
  "Other",
];

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR + 2 - i);

interface FormData {
  full_name: string;
  graduation_year: string;
  program: string;
  current_role: string;
  current_company: string;
  industry: string;
  location: string;
  linkedin_url: string;
  bio: string;
}

const EMPTY_FORM: FormData = {
  full_name: "",
  graduation_year: "",
  program: "",
  current_role: "",
  current_company: "",
  industry: "",
  location: "",
  linkedin_url: "",
  bio: "",
};

type StepId = "basics" | "professional" | "extras";

const STEP_META: Record<StepId, { title: string; subtitle: string }> = {
  basics:       { title: "Let's get started",      subtitle: "Tell us a bit about yourself." },
  professional: { title: "Your professional life",  subtitle: "Help the community find you." },
  extras:       { title: "Final touches",           subtitle: "Optional details to complete your profile." },
};

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<StepId>("basics");
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const derivedRole =
    form.graduation_year ? getRole(parseInt(form.graduation_year)) : null;

  // Visible steps depend on role — students skip "professional"
  const visibleSteps: StepId[] =
    derivedRole === "student" ? ["basics", "extras"] : ["basics", "professional", "extras"];

  const currentStepNum = visibleSteps.indexOf(step) + 1;
  const totalSteps = visibleSteps.length;
  const isLastStep = step === "extras";

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validateStep(): string | null {
    if (step === "basics") {
      if (!form.full_name.trim()) return "Full name is required.";
      if (!form.graduation_year) return "Graduation year is required.";
      if (!form.program) return "Program is required.";
    }
    if (step === "professional") {
      if (!form.current_role.trim()) return "Current role is required.";
      if (!form.current_company.trim()) return "Current company is required.";
    }
    return null;
  }

  function handleNext() {
    const validationError = validateStep();
    if (validationError) { setError(validationError); return; }
    setError(null);

    if (step === "basics") {
      // Re-derive role from the just-validated graduation_year
      const role = getRole(parseInt(form.graduation_year));
      setStep(role === "student" ? "extras" : "professional");
    } else if (step === "professional") {
      setStep("extras");
    }
  }

  function handleBack() {
    setError(null);
    if (step === "extras") {
      setStep(derivedRole === "student" ? "basics" : "professional");
    } else if (step === "professional") {
      setStep("basics");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Session expired. Please log in again.");

      const role = getRole(parseInt(form.graduation_year));
      const isAlumni = role === "alumni";

      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email!,
        full_name: form.full_name.trim(),
        graduation_year: parseInt(form.graduation_year),
        program: form.program || null,
        current_role: isAlumni ? (form.current_role.trim() || null) : null,
        current_company: isAlumni ? (form.current_company.trim() || null) : null,
        industry: isAlumni ? (form.industry || null) : null,
        location: isAlumni ? (form.location.trim() || null) : null,
        linkedin_url: form.linkedin_url.trim() || null,
        bio: form.bio.trim() || null,
        is_verified: true,
      });

      if (upsertError) throw upsertError;

      router.push("/directory");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress bars */}
        <div className="flex items-center gap-2 mb-8">
          {visibleSteps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < currentStepNum ? "bg-uva-navy" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <p className="text-xs font-medium text-uva-orange uppercase tracking-wider mb-1">
            Step {currentStepNum} of {totalSteps}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{STEP_META[step].title}</h1>
          <p className="text-sm text-gray-500 mb-8">{STEP_META[step].subtitle}</p>

          <form onSubmit={isLastStep ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>

            {/* ── Step 1: Basics ───────────────────────────────────────── */}
            {step === "basics" && (
              <div className="space-y-5">
                <Field label="Full name" required>
                  <input
                    type="text"
                    placeholder="Jane Smith"
                    value={form.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Program" required>
                    <select value={form.program} onChange={(e) => set("program", e.target.value)} className={inputCls}>
                      <option value="">Select…</option>
                      {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>

                  <Field label="Your Darden graduation year" required>
                    <select value={form.graduation_year} onChange={(e) => set("graduation_year", e.target.value)} className={inputCls}>
                      <option value="">Select…</option>
                      {GRAD_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </Field>
                </div>

                {/* Show role hint once year is selected */}
                {derivedRole && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    {derivedRole === "student"
                      ? "You'll be registered as a current student."
                      : "You'll be registered as an alumnus/alumna."}
                  </p>
                )}
              </div>
            )}

            {/* ── Step 2: Professional (alumni only) ───────────────────── */}
            {step === "professional" && (
              <div className="space-y-5">
                <Field label="Current role" required>
                  <input
                    type="text"
                    placeholder="Product Manager"
                    value={form.current_role}
                    onChange={(e) => set("current_role", e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <Field label="Current company" required>
                  <input
                    type="text"
                    placeholder="Acme Corp"
                    value={form.current_company}
                    onChange={(e) => set("current_company", e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Industry">
                    <select value={form.industry} onChange={(e) => set("industry", e.target.value)} className={inputCls}>
                      <option value="">Select…</option>
                      {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                    </select>
                  </Field>

                  <Field label="Location">
                    <input
                      type="text"
                      placeholder="New York, NY"
                      value={form.location}
                      onChange={(e) => set("location", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* ── Step 3: Extras ───────────────────────────────────────── */}
            {step === "extras" && (
              <div className="space-y-5">
                <Field label="LinkedIn URL">
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/…"
                    value={form.linkedin_url}
                    onChange={(e) => set("linkedin_url", e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <Field label="Short bio">
                  <textarea
                    rows={4}
                    placeholder="A sentence or two about your background and interests…"
                    value={form.bio}
                    onChange={(e) => set("bio", e.target.value)}
                    maxLength={200}
                    className={`${inputCls} resize-none`}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{form.bio.length}/200</p>
                </Field>

                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  You can set your availability (coffee chats, mentorship, etc.) from your profile page after joining.
                </p>
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Nav buttons */}
            <div className="flex gap-3 mt-8">
              {step !== "basics" && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-uva-navy text-white py-2.5 rounded-lg text-sm font-medium hover:bg-uva-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving…" : isLastStep ? "Complete profile" : "Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-uva-navy focus:border-transparent";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
