import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RequestsInbox from "./requests-inbox";
import type { ChatRequestWithPerson, PersonSummary } from "./requests-inbox";

export default async function RequestsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // RLS ("chat_requests: parties read") already limits this to requests the
  // user sent or received; the .or() keeps the intent explicit.
  const { data: requests } = await supabase
    .from("chat_requests")
    .select("id, from_user_id, to_user_id, message, status, created_at")
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const rows = requests ?? [];

  // Look up the other person on each request in one query.
  const otherIds = Array.from(
    new Set(rows.map((r) => (r.from_user_id === user.id ? r.to_user_id : r.from_user_id)))
  );

  const { data: people } = otherIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, graduation_year, current_role, current_company")
        .in("id", otherIds)
    : { data: [] as PersonSummary[] };

  const peopleById = new Map((people ?? []).map((p) => [p.id, p as PersonSummary]));

  const toItem = (r: (typeof rows)[number]): ChatRequestWithPerson => {
    const otherId = r.from_user_id === user.id ? r.to_user_id : r.from_user_id;
    return { ...r, other: peopleById.get(otherId) ?? null };
  };

  const received = rows.filter((r) => r.to_user_id === user.id).map(toItem);
  const sent = rows.filter((r) => r.from_user_id === user.id).map(toItem);

  return <RequestsInbox currentUserId={user.id} received={received} sent={sent} />;
}
