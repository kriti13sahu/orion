"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getRole } from "@/lib/role";
import type { ChatRequest, ChatRequestStatus } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PersonSummary = {
  id: string;
  full_name: string;
  /** Only present for accepted requests; null otherwise (stripped on the server). */
  email: string | null;
  graduation_year: number | null;
  current_role: string | null;
  current_company: string | null;
};

export type ChatRequestWithPerson = ChatRequest & {
  /** The other party: the sender for received requests, the recipient for sent ones. */
  other: PersonSummary | null;
};

type TabId = "received" | "sent";

const STATUS_BADGE: Record<ChatRequestStatus, string> = {
  pending:  "bg-amber-100 text-amber-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-gray-100 text-gray-600",
};

const STATUS_LABEL: Record<ChatRequestStatus, string> = {
  pending:  "Pending",
  accepted: "Accepted",
  declined: "Declined",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RequestsInbox({
  currentUserId,
  received: initialReceived,
  sent,
}: {
  currentUserId: string;
  received: ChatRequestWithPerson[];
  sent: ChatRequestWithPerson[];
}) {
  const supabase = createClient();

  const [tab, setTab] = useState<TabId>("received");
  const [received, setReceived] = useState(initialReceived);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  const pendingCount = received.filter((r) => r.status === "pending").length;

  async function respond(requestId: string, status: "accepted" | "declined") {
    setSavingId(requestId);
    setNotice("");
    setErrors((prev) => ({ ...prev, [requestId]: "" }));

    try {
      // Only a still-pending request addressed to me can be answered. If it was
      // already answered (e.g. in another tab), zero rows match and we say so
      // instead of silently overwriting the earlier answer.
      const { data, error } = await supabase
        .from("chat_requests")
        .update({ status })
        .eq("id", requestId)
        .eq("to_user_id", currentUserId)
        .eq("status", "pending")
        .select("id, status")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setErrors((prev) => ({
          ...prev,
          [requestId]: "This request was already answered. Refresh the page to see its current status.",
        }));
        return;
      }

      // The requester's email isn't on the page until the request is accepted,
      // so fetch it now that it is.
      let email: string | null = null;
      if (data.status === "accepted") {
        const fromId = received.find((r) => r.id === requestId)?.from_user_id;
        if (fromId) {
          const { data: p } = await supabase.from("profiles").select("email").eq("id", fromId).maybeSingle();
          email = p?.email ?? null;
        }
      }

      setReceived((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: data.status, other: r.other ? { ...r.other, email } : null }
            : r
        )
      );
      setNotice(
        status === "accepted"
          ? "Request accepted. Their email is now shown so you can set up a time."
          : "Request declined."
      );
    } catch {
      setErrors((prev) => ({
        ...prev,
        [requestId]: "Could not save your response. Check your connection and try again.",
      }));
    } finally {
      setSavingId(null);
    }
  }

  const list = tab === "received" ? received : sent;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Coffee chat requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          Accept or decline requests sent to you, and see where your own requests stand.
        </p>
      </div>

      <p role="status" className="text-sm text-green-700 mb-4 min-h-[1.25rem]">{notice}</p>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {(
          [
            { id: "received", label: "Received", count: pendingCount, countLabel: "pending" },
            { id: "sent", label: "Sent", count: sent.length, countLabel: "total" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-gray-400" aria-label={`${t.count} ${t.countLabel}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">
            {tab === "received" ? "No requests yet." : "You haven't sent any requests."}
          </p>
          <p className="text-sm mt-1">
            {tab === "received" ? (
              "Turn on “Open to coffee chats” on your profile so members can reach you."
            ) : (
              <>
                Find someone in the{" "}
                <Link href="/directory" className="text-uva-navy hover:underline">directory</Link>{" "}
                who is open to coffee chats.
              </>
            )}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((req) => {
            const person = req.other;
            const role = person?.graduation_year ? getRole(person.graduation_year) : null;
            const isSaving = savingId === req.id;
            const canRespond = tab === "received" && req.status === "pending";

            return (
              <li key={req.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">
                      {tab === "received" ? "From" : "To"} · {formatDate(req.created_at)}
                    </p>
                    {person ? (
                      <Link
                        href={`/directory/${person.id}`}
                        className="font-semibold text-gray-900 hover:text-uva-navy hover:underline"
                      >
                        {person.full_name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-gray-500">Former member</span>
                    )}
                    {person && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[
                          role === "student" ? "Student" : role === "alumni" ? "Alumni" : null,
                          role === "alumni" ? person.current_role : null,
                          role === "alumni" ? person.current_company : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[req.status]}`}>
                    {STATUS_LABEL[req.status]}
                  </span>
                </div>

                <p className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{req.message}</p>

                {/* Accepted: share contact so the two can schedule */}
                {req.status === "accepted" && person?.email && (
                  <p className="mt-3 text-sm text-gray-600">
                    {tab === "received" ? "Reply to set up a time: " : `${person.full_name.split(" ")[0]} accepted. Reach them at `}
                    <a href={`mailto:${person.email}`} className="font-medium text-uva-navy hover:underline">
                      {person.email}
                    </a>
                  </p>
                )}

                {tab === "sent" && req.status === "declined" && (
                  <p className="mt-3 text-sm text-gray-500">
                    This member can&apos;t meet right now. Try someone else in the directory.
                  </p>
                )}

                {canRespond && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={savingId !== null}
                      onClick={() => respond(req.id, "accepted")}
                      className="px-4 py-2 bg-uva-navy text-white text-sm font-medium rounded-lg hover:bg-uva-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? "Saving…" : "Accept"}
                    </button>
                    <button
                      type="button"
                      disabled={savingId !== null}
                      onClick={() => respond(req.id, "declined")}
                      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Decline
                    </button>
                  </div>
                )}

                {errors[req.id] && (
                  <p role="alert" className="mt-2 text-xs text-red-600">{errors[req.id]}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
