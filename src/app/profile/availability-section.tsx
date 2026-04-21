"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AvailabilityType } from "@/types/database";
import type { Role } from "@/lib/role";

// ── Config ────────────────────────────────────────────────────────────────────

const AVAILABILITY_CONFIG: {
  type: AvailabilityType;
  label: string;
  description: string;
  alumniOnly: boolean;
}[] = [
  {
    type: "coffee_chats",
    label: "Coffee chats",
    description: "Happy to connect for a virtual or in-person coffee chat",
    alumniOnly: false,
  },
  {
    type: "cofounder",
    label: "Co-founder search",
    description: "Exploring co-founder opportunities or collaborations",
    alumniOnly: false,
  },
  {
    type: "mentorship",
    label: "Mentorship",
    description: "Open to mentoring current students or fellow alumni",
    alumniOnly: false,
  },
  {
    type: "hiring",
    label: "Open to hiring",
    description: "Actively hiring and open to referrals from the Darden network",
    alumniOnly: true,
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type StatusState = {
  is_active: boolean;
  expires_at: string; // YYYY-MM-DD for <input type="date">, "" if none
  note: string;
  saving: boolean;
  saveError: string | null;
};

type StatusMap = Record<AvailabilityType, StatusState>;

export type InitialRow = {
  type: string;
  is_active: boolean;
  expires_at: string | null;
  note: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** "2025-12-31T23:59:59Z" → "2025-12-31" for date input */
function toDateInput(ts: string | null): string {
  return ts ? ts.slice(0, 10) : "";
}

/** "2025-12-31" → "2025-12-31T23:59:59.999Z" for DB; "" → null */
function toTimestamp(dateStr: string): string | null {
  return dateStr ? `${dateStr}T23:59:59.999Z` : null;
}

/** true if expires_at is set and already in the past */
function isExpired(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(`${dateStr}T23:59:59.999Z`) <= new Date();
}

function buildInitialState(rows: InitialRow[]): StatusMap {
  const defaults: StatusState = {
    is_active: false,
    expires_at: "",
    note: "",
    saving: false,
    saveError: null,
  };
  const map: StatusMap = {
    coffee_chats: { ...defaults },
    cofounder: { ...defaults },
    mentorship: { ...defaults },
    hiring: { ...defaults },
  };
  for (const row of rows) {
    const type = row.type as AvailabilityType;
    if (type in map) {
      map[type] = {
        is_active: row.is_active,
        expires_at: toDateInput(row.expires_at),
        note: row.note ?? "",
        saving: false,
        saveError: null,
      };
    }
  }
  return map;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AvailabilitySection({
  userId,
  role,
  initialRows,
}: {
  userId: string;
  role: Role;
  initialRows: InitialRow[];
}) {
  const supabase = createClient();

  const [statuses, setStatuses] = useState<StatusMap>(() => buildInitialState(initialRows));

  // Always-fresh ref so async callbacks (debounced saves) read current state
  const latestRef = useRef<StatusMap>(statuses);
  latestRef.current = statuses;

  const noteTimers = useRef<Partial<Record<AvailabilityType, ReturnType<typeof setTimeout>>>>({});

  const today = new Date().toISOString().slice(0, 10);

  // ── State helpers ────────────────────────────────────────────────────────

  function patch(type: AvailabilityType, update: Partial<StatusState>) {
    setStatuses((prev) => ({ ...prev, [type]: { ...prev[type], ...update } }));
  }

  // ── Upsert ───────────────────────────────────────────────────────────────

  async function save(
    type: AvailabilityType,
    fields: { is_active?: boolean; expires_at?: string; note?: string }
  ) {
    patch(type, { saving: true, saveError: null });

    // Use ref for current state to avoid stale closures in async/debounced paths
    const s = latestRef.current[type];

    const row = {
      user_id: userId,
      type,
      is_active: "is_active" in fields ? fields.is_active! : s.is_active,
      expires_at: "expires_at" in fields ? toTimestamp(fields.expires_at!) : toTimestamp(s.expires_at),
      note: "note" in fields ? fields.note! : s.note,
    };

    const { error } = await supabase
      .from("availability_status")
      .upsert(row, { onConflict: "user_id,type" });

    patch(type, {
      saving: false,
      ...(error ? { saveError: "Failed to save. Please try again." } : {}),
    });
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleToggle(type: AvailabilityType) {
    const newValue = !latestRef.current[type].is_active;
    patch(type, { is_active: newValue, saveError: null });
    save(type, { is_active: newValue });
  }

  function handleExpiryChange(type: AvailabilityType, value: string) {
    patch(type, { expires_at: value });
    save(type, { expires_at: value });
  }

  function handleNoteChange(type: AvailabilityType, value: string) {
    patch(type, { note: value });
    if (noteTimers.current[type]) clearTimeout(noteTimers.current[type]);
    noteTimers.current[type] = setTimeout(() => save(type, { note: value }), 600);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const visibleConfig = AVAILABILITY_CONFIG.filter(
    (c) => !c.alumniOnly || role === "alumni"
  );

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Availability</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Let the network know how they can connect with you. Changes save instantly.
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {visibleConfig.map((config) => {
          const s = statuses[config.type];
          const expired = s.is_active && isExpired(s.expires_at);

          return (
            <div key={config.type} className="py-4 first:pt-0 last:pb-0">
              {/* Toggle row */}
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-medium ${s.is_active ? "text-gray-900" : "text-gray-500"}`}>
                      {config.label}
                    </p>
                    {expired && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                        Expired
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                    {config.description}
                  </p>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.is_active}
                  aria-label={`Toggle ${config.label}`}
                  disabled={s.saving}
                  onClick={() => handleToggle(config.type)}
                  className={`relative inline-flex shrink-0 h-6 w-11 rounded-full transition-colors duration-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uva-navy focus-visible:ring-offset-2
                    ${s.is_active ? "bg-uva-navy" : "bg-gray-200"}
                    ${s.saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span
                    className={`pointer-events-none my-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-sm
                      transition-transform duration-200
                      ${s.is_active ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </button>
              </div>

              {/* Expanded fields — only when toggle is ON */}
              {s.is_active && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Expiry date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Expires on{" "}
                      <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="date"
                      min={today}
                      value={s.expires_at}
                      onChange={(e) => handleExpiryChange(config.type, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                        text-gray-700 focus:outline-none focus:ring-2 focus:ring-uva-navy focus:border-transparent"
                    />
                    {s.expires_at && (
                      <button
                        type="button"
                        onClick={() => handleExpiryChange(config.type, "")}
                        className="mt-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        Clear expiry
                      </button>
                    )}
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Note{" "}
                      <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder='e.g. "Available Tues / Thurs"'
                      value={s.note}
                      onChange={(e) => handleNoteChange(config.type, e.target.value)}
                      maxLength={120}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                        text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2
                        focus:ring-uva-navy focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Save error */}
              {s.saveError && (
                <p className="mt-2 text-xs text-red-600">{s.saveError}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
