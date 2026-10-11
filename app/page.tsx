"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthGate from "@/components/AuthGate";

type Guest = {
  id: string | number;
  name: string;
  phone: string;
  party_size: number;
  tag: string | null;
  rsvp_status: string;
};

function replyBubble(status: string) {
  if (status === "confirmed")
    return { text: "Can't wait! We'll be there 🎉", color: "var(--mint)" };
  if (status === "declined")
    return { text: "So sorry, can't make it 💔", color: "var(--coral)" };
  return { text: "…", color: "var(--sunshine)" };
}

function GuestList() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .order("name", { ascending: true });

      if (error) setError(error.message);
      else setGuests(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">Your guest threads</h1>

      {error && (
        <p className="text-sm" style={{ color: "var(--coral)" }}>
          Error loading guests: {error}
        </p>
      )}

      {!loading && !error && guests.length === 0 && (
        <div
          className="rounded-2xl p-10 text-center border-2 border-dashed"
          style={{ borderColor: "var(--cloud-line)" }}
        >
          <p className="text-lg font-semibold mb-1">No threads yet</p>
          <p className="text-sm opacity-70">
            <a href="/upload" className="underline">
              Upload a guest list
            </a>{" "}
            to start texting.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {guests.map((guest) => {
          const reply = replyBubble(guest.rsvp_status);
          return (
            <div
              key={guest.id}
              className="rounded-2xl p-4"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--cloud-line)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold">{guest.name}</p>
                <div className="flex items-center gap-2">
                  {guest.tag && (
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "var(--cloud)",
                        color: "var(--violet-dark)",
                      }}
                    >
                      {guest.tag}
                    </span>
                  )}
                  <span className="text-xs font-mono opacity-50">
                    party of {guest.party_size}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="bubble-out px-4 py-2 max-w-[75%] self-end text-sm">
                  Save the date! 💌
                </div>
                <div
                  className="bubble-in px-4 py-2 max-w-[75%] self-start text-sm font-medium"
                  style={{
                    backgroundColor: reply.color + "22",
                    color: "var(--ink)",
                  }}
                >
                  {reply.text}
                </div>
              </div>

              <p className="font-mono text-xs opacity-40 mt-3">{guest.phone}</p>
            </div>
          );
        })}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <AuthGate>
      <GuestList />
    </AuthGate>
  );
}
