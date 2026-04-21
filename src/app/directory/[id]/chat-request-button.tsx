"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  fromUserId: string;
  toUserId: string;
  toName: string;
};

type ModalState = "idle" | "open" | "submitting" | "success";

export default function ChatRequestButton({ fromUserId, toUserId, toName }: Props) {
  const supabase = createClient();
  const firstName = toName.split(" ")[0];

  const defaultMessage =
    `Hi ${firstName}, I came across your profile on Orion and would love to connect for a coffee chat. ` +
    `Happy to work around your schedule — would you be open to a brief call?`;

  const [modalState, setModalState] = useState<ModalState>("idle");
  const [message, setMessage] = useState(defaultMessage);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (modalState === "open") {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [modalState]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && (modalState === "open" || modalState === "success")) {
        handleClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalState]);

  function handleOpen() {
    setMessage(defaultMessage);
    setError(null);
    setModalState("open");
  }

  function handleClose() {
    setModalState("idle");
    setError(null);
  }

  async function handleSubmit() {
    if (!message.trim()) {
      setError("Please write a message before sending.");
      return;
    }
    setError(null);
    setModalState("submitting");

    const { error: insertError } = await supabase.from("chat_requests").insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      message: message.trim(),
      status: "pending",
    });

    if (insertError) {
      setError("Failed to send request. Please try again.");
      setModalState("open");
    } else {
      setModalState("success");
    }
  }

  const isOpen = modalState === "open" || modalState === "submitting" || modalState === "success";

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-uva-navy text-white text-sm font-medium rounded-lg hover:bg-uva-blue transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Request a chat
      </button>

      {/* Modal backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          aria-modal="true"
          role="dialog"
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={modalState !== "submitting" ? handleClose : undefined}
          />

          {/* Modal card */}
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            {modalState === "success" ? (
              /* ── Success state ─────────────────────────────────── */
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Request sent!</h2>
                <p className="text-sm text-gray-500 mb-6">
                  {firstName} will be notified. You'll hear back via messages.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 bg-uva-navy text-white text-sm font-medium rounded-lg hover:bg-uva-blue transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              /* ── Compose state ─────────────────────────────────── */
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Request a coffee chat</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Your message to {firstName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={modalState === "submitting"}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  disabled={modalState === "submitting"}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800
                    focus:outline-none focus:ring-2 focus:ring-uva-navy focus:border-transparent
                    resize-none disabled:opacity-60"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{message.length}/500</p>

                {error && (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={modalState === "submitting"}
                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium
                      text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={modalState === "submitting" || !message.trim()}
                    className="flex-1 py-2.5 bg-uva-navy text-white rounded-lg text-sm font-medium
                      hover:bg-uva-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {modalState === "submitting" ? "Sending…" : "Send request"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
