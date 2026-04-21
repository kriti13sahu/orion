"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { OpportunityType } from "@/types/database";
import type { Role } from "@/lib/role";

const ALL_TYPES: { value: OpportunityType; label: string; description: string; alumniOnly: boolean }[] = [
  { value: "cofounder",  label: "Co-founder search", description: "Looking for a co-founder or collaborator", alumniOnly: false },
  { value: "job",        label: "Full-time job",       description: "Permanent position at your company",       alumniOnly: true },
  { value: "internship", label: "Internship",           description: "Internship opportunity for students",      alumniOnly: true },
  { value: "contract",   label: "Contract / Freelance", description: "Project-based or contract work",          alumniOnly: true },
];

export default function PostOpportunityForm({
  userId,
  role,
}: {
  userId: string;
  role: Role;
}) {
  const router = useRouter();
  const supabase = createClient();

  const availableTypes = ALL_TYPES.filter((t) => !t.alumniOnly || role === "alumni");

  const [form, setForm] = useState({
    type: availableTypes[0].value as OpportunityType,
    title: "",
    company: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.company.trim()) { setError("Company is required."); return; }
    if (!form.description.trim()) { setError("Description is required."); return; }

    setError(null);
    setLoading(true);

    const { error: insertError } = await supabase.from("opportunities").insert({
      posted_by: userId,
      type: form.type,
      title: form.title.trim(),
      company: form.company.trim(),
      description: form.description.trim(),
      is_active: true,
    });

    setLoading(false);

    if (insertError) {
      setError("Failed to post opportunity. Please try again.");
    } else {
      router.push("/opportunities");
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <a
          href="/opportunities"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to opportunities
        </a>
        <h1 className="text-2xl font-bold text-gray-900">Post an opportunity</h1>
        {role === "student" && (
          <p className="text-sm text-gray-500 mt-1">
            Students can post co-founder searches. Alumni can post all opportunity types.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opportunity type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableTypes.map((t) => {
                const selected = form.type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set("type", t.value)}
                    className={`flex flex-col items-start px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                      selected
                        ? "border-uva-navy bg-uva-navy/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className={`text-sm font-medium ${selected ? "text-uva-navy" : "text-gray-800"}`}>
                      {t.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <Field label="Title" required>
            <input
              type="text"
              placeholder="e.g. Senior Product Manager"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={inputCls}
              maxLength={120}
            />
          </Field>

          {/* Company */}
          <Field label="Company / Organization" required>
            <input
              type="text"
              placeholder="e.g. Acme Corp"
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
              className={inputCls}
              maxLength={120}
            />
          </Field>

          {/* Description */}
          <Field label="Description" required>
            <textarea
              rows={6}
              placeholder="Describe the role, what you're looking for, how to stand out..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={`${inputCls} resize-none`}
              maxLength={2000}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.description.length}/2000</p>
          </Field>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <a
              href="/opportunities"
              className="flex-1 text-center py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-uva-navy text-white rounded-lg text-sm font-medium hover:bg-uva-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Posting…" : "Post opportunity"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

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
