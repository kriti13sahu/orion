"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/role";

// ── Config ────────────────────────────────────────────────────────────────────

// Kept in sync with the onboarding list so a saved industry always round-trips.
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

const BIO_MAX = 200;
const NAME_MAX = 80;

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProfileCardData = {
  id: string;
  full_name: string;
  graduation_year: number | null;
  program: string | null;
  current_role: string | null;
  current_company: string | null;
  industry: string | null;
  location: string | null;
  linkedin_url: string | null;
  bio: string | null;
};

type EditableFields = {
  full_name: string;
  location: string;
  linkedin_url: string;
  bio: string;
  current_role: string;
  current_company: string;
  industry: string;
};

type Mode = "read" | "edit" | "saving" | "saved";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toForm(p: ProfileCardData): EditableFields {
  return {
    full_name: p.full_name ?? "",
    location: p.location ?? "",
    linkedin_url: p.linkedin_url ?? "",
    bio: p.bio ?? "",
    current_role: p.current_role ?? "",
    current_company: p.current_company ?? "",
    industry: p.industry ?? "",
  };
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.length ? parts.map((n) => n[0]).join("").toUpperCase() : "?";
}

/**
 * Accepts an empty value, or an http(s) URL on linkedin.com (any subdomain).
 * Returns an error message, or null if valid.
 */
export function validateLinkedIn(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Enter a full URL, starting with https://";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "Enter a full URL, starting with https://";
  }
  const host = url.hostname.toLowerCase();
  if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) {
    return "That doesn't look like a LinkedIn link (expected linkedin.com)";
  }
  return null;
}

export function validateForm(form: EditableFields): Partial<Record<keyof EditableFields, string>> {
  const errors: Partial<Record<keyof EditableFields, string>> = {};
  if (!form.full_name.trim()) errors.full_name = "Name can't be empty";
  else if (form.full_name.trim().length > NAME_MAX) errors.full_name = `Keep your name under ${NAME_MAX} characters`;
  if (form.bio.length > BIO_MAX) errors.bio = `Bio must be ${BIO_MAX} characters or fewer`;
  const li = validateLinkedIn(form.linkedin_url);
  if (li) errors.linkedin_url = li;
  return errors;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfileCard({
  initialProfile,
  role,
}: {
  initialProfile: ProfileCardData;
  role: Role;
}) {
  const supabase = createClient();
  const router = useRouter();
  const isAlumni = role === "alumni";

  const [profile, setProfile] = useState<ProfileCardData>(initialProfile);
  const [form, setForm] = useState<EditableFields>(toForm(initialProfile));
  const [mode, setMode] = useState<Mode>("read");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EditableFields, string>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function set<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function startEdit() {
    setForm(toForm(profile));
    setFieldErrors({});
    setSaveError(null);
    setMode("edit");
  }

  function cancel() {
    setForm(toForm(profile));
    setFieldErrors({});
    setSaveError(null);
    setMode("read");
  }

  async function save() {
    const errors = validateForm(form);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setMode("saving");
    setSaveError(null);

    const update = {
      full_name: form.full_name.trim(),
      location: form.location.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      bio: form.bio.trim() || null,
      // Students never carry professional fields, even if stale data exists.
      current_role: isAlumni ? form.current_role.trim() || null : null,
      current_company: isAlumni ? form.current_company.trim() || null : null,
      industry: isAlumni ? form.industry || null : null,
    };

    // Update (not upsert): the row already exists, and we must never touch
    // email, graduation_year or program from this screen.
    const { data, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", profile.id)
      .select(
        "id, full_name, graduation_year, program, current_role, current_company, industry, location, linkedin_url, bio"
      )
      .single();

    if (error || !data) {
      // Keep the user's edits so they can retry without retyping.
      setSaveError("Couldn't save your changes. Check your connection and try again.");
      setMode("edit");
      return;
    }

    setProfile(data as ProfileCardData);
    setMode("saved");
    router.refresh(); // keep server-rendered nav / other pages in sync
    setTimeout(() => setMode("read"), 2000);
  }

  const initials = initialsOf(mode === "read" || mode === "saved" ? profile.full_name : form.full_name);
  const editing = mode === "edit" || mode === "saving";
  const saving = mode === "saving";

  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-uva-navy/40 focus:border-uva-navy disabled:bg-gray-50 disabled:text-gray-400";
  const errCls = "border-red-400 focus:ring-red-300 focus:border-red-400";

  // ── Read mode ───────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-uva-navy text-white text-xl font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{profile.full_name}</h1>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  role === "student" ? "bg-uva-orange/10 text-uva-orange" : "bg-uva-navy/10 text-uva-navy"
                }`}
              >
                {role === "student" ? "Student" : "Alumni"}
              </span>
            </div>

            {isAlumni && (profile.current_role || profile.current_company) && (
              <p className="text-sm text-gray-600 mt-0.5">
                {[profile.current_role, profile.current_company].filter(Boolean).join(" · ")}
              </p>
            )}

            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
              {(profile.program || profile.graduation_year) && (
                <span className="text-xs text-gray-400">
                  {[profile.program, profile.graduation_year].filter(Boolean).join(" · ")}
                </span>
              )}
              {profile.location && <span className="text-xs text-gray-400">{profile.location}</span>}
              {isAlumni && profile.industry && <span className="text-xs text-gray-400">{profile.industry}</span>}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {mode === "saved" && (
              <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5" role="status">
                Saved ✓
              </span>
            )}
            <button
              type="button"
              onClick={startEdit}
              className="text-xs font-medium text-uva-navy border border-uva-navy/30 rounded-lg px-3 py-1.5 hover:bg-uva-navy/5 transition-colors"
            >
              Edit profile
            </button>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 text-sm text-gray-600 border-t border-gray-100 pt-4 leading-relaxed">{profile.bio}</p>
        )}

        {profile.linkedin_url && (
          <a
            href={profile.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-uva-navy hover:underline"
          >
            LinkedIn profile
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    );
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────
  return (
    <form
      className="bg-white rounded-2xl border border-gray-200 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!saving) save();
      }}
      noValidate
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-uva-navy text-white text-xl font-bold flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-gray-900">Edit profile</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {[profile.program, profile.graduation_year].filter(Boolean).join(" · ")} — program and graduation year
            can&apos;t be changed here.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full name" error={fieldErrors.full_name} className="sm:col-span-2">
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            disabled={saving}
            maxLength={NAME_MAX}
            className={`${inputCls} ${fieldErrors.full_name ? errCls : ""}`}
          />
        </Field>

        {isAlumni && (
          <>
            <Field label="Current role" error={fieldErrors.current_role}>
              <input
                type="text"
                value={form.current_role}
                onChange={(e) => set("current_role", e.target.value)}
                disabled={saving}
                placeholder="e.g. Senior Consultant"
                className={inputCls}
              />
            </Field>
            <Field label="Company" error={fieldErrors.current_company}>
              <input
                type="text"
                value={form.current_company}
                onChange={(e) => set("current_company", e.target.value)}
                disabled={saving}
                placeholder="e.g. McKinsey & Company"
                className={inputCls}
              />
            </Field>
            <Field label="Industry" error={fieldErrors.industry}>
              <select
                value={form.industry}
                onChange={(e) => set("industry", e.target.value)}
                disabled={saving}
                className={inputCls}
              >
                <option value="">Select an industry</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        <Field label="Location" error={fieldErrors.location}>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            disabled={saving}
            placeholder="City, State"
            className={inputCls}
          />
        </Field>

        <Field label="LinkedIn URL" error={fieldErrors.linkedin_url} className="sm:col-span-2">
          <input
            type="url"
            value={form.linkedin_url}
            onChange={(e) => set("linkedin_url", e.target.value)}
            disabled={saving}
            placeholder="https://linkedin.com/in/…"
            className={`${inputCls} ${fieldErrors.linkedin_url ? errCls : ""}`}
          />
        </Field>

        <Field label="Short bio" error={fieldErrors.bio} className="sm:col-span-2">
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            disabled={saving}
            maxLength={BIO_MAX}
            className={`${inputCls} resize-none ${fieldErrors.bio ? errCls : ""}`}
          />
          <p
            className={`text-xs mt-1 text-right ${
              form.bio.length >= BIO_MAX ? "text-red-600 font-medium" : "text-gray-400"
            }`}
          >
            {form.bio.length}/{BIO_MAX}
          </p>
        </Field>
      </div>

      {saveError && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {saveError}
        </p>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className="text-sm font-medium text-gray-600 rounded-lg px-4 py-2 hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="text-sm font-medium text-white bg-uva-navy rounded-lg px-4 py-2 hover:bg-uva-navy/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : saveError ? "Try again" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

// ── Small field wrapper ───────────────────────────────────────────────────────

function Field({
  label,
  error,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}
