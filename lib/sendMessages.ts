import { supabase } from "@/lib/supabase";

export type SendResult = { sent: number; failed: number; skipped: number };

// Call this from any button/form in the app to text one or more guests.
export async function sendMessages(
  guestIds: (string | number)[],
  body: string
): Promise<SendResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) throw new Error("Not logged in");

  const res = await fetch("/api/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ guestIds, body }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to send messages");

  return json as SendResult;
}
