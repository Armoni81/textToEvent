"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthGate from "@/components/AuthGate";
import { sendMessages } from "@/lib/sendMessages";

type Guest = {
  id: number;
  name: string;
  phone: string;
  party_size: number;
  tag: string | null;
  rsvp_status: string;
};

type Message = {
  id: string;
  guest_id: number;
  body: string;
  direction: string;
  status: string;
  created_at: string;
};

type Draft = {
  name: string;
  phone: string;
  party_size: string;
  tag: string;
  rsvp_status: string;
};

const VISIBLE_MESSAGES = 4;
const RSVP_OPTIONS = ["pending", "confirmed", "declined"];
const NEW_GROUP = "__new__";

function rsvpColor(status: string) {
  if (status === "confirmed") return "var(--mint)";
  if (status === "declined") return "var(--coral)";
  return "var(--sunshine)";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Turns "(555) 123-4567" or "555-123-4567" into "+15551234567".
// Returns null if it doesn't look like a real phone number.
function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function Dashboard() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [target, setTarget] = useState("all");
  const [body, setBody] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({
    name: "",
    phone: "",
    party_size: "1",
    tag: "",
    rsvp_status: "pending",
  });
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [cardError, setCardError] = useState<{
    id: number;
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    const [g, m] = await Promise.all([
      supabase.from("guests").select("*").order("name", { ascending: true }),
      supabase
        .from("messages")
        .select("id, guest_id, body, direction, status, created_at")
        .order("created_at", { ascending: true }),
    ]);

    setError(g.error?.message ?? m.error?.message ?? null);
    if (!g.error) setGuests((g.data ?? []) as Guest[]);
    if (!m.error) setMessages((m.data ?? []) as Message[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const messagesByGuest = useMemo(() => {
    const map: Record<number, Message[]> = {};
    messages.forEach((m) => {
      (map[m.guest_id] = map[m.guest_id] || []).push(m);
    });
    return map;
  }, [messages]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    guests.forEach((g) => {
      if (g.tag) counts[g.tag] = (counts[g.tag] || 0) + 1;
    });
    return counts;
  }, [guests]);

  const tags = Object.keys(tagCounts).sort();

  const recipients = useMemo(() => {
    if (target === "all") return guests;
    if (target.startsWith("tag:")) {
      const tag = target.slice(4);
      return guests.filter((g) => g.tag === tag);
    }
    if (target.startsWith("guest:")) {
      const id = target.slice(6);
      return guests.filter((g) => String(g.id) === id);
    }
    return [];
  }, [target, guests]);

  // If the selected guest/group no longer exists (edited or deleted), reset.
  useEffect(() => {
    if (target !== "all" && recipients.length === 0) setTarget("all");
  }, [target, recipients]);

  const hasNonAscii = /[^\x00-\x7F]/.test(body);
  const segments =
    body.length === 0 ? 0 : Math.ceil(body.length / (hasNonAscii ? 70 : 160));

  const canSend =
    !sending && consent && body.trim().length > 0 && recipients.length > 0;

  async function handleSend() {
    if (!canSend) return;

    const count = recipients.length;
    if (count > 1 && !window.confirm(`Send this text to ${count} guests?`)) {
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const r = await sendMessages(
        recipients.map((g) => g.id),
        body.trim()
      );

      let text = `Sent to ${r.sent} guest${r.sent === 1 ? "" : "s"}.`;
      if (r.failed > 0) {
        text += ` ${r.failed} failed — they're marked "Not delivered" in the guest's thread.`;
      }
      if (r.skipped > 0) text += ` ${r.skipped} skipped.`;

      setResult({ ok: r.failed === 0, text });
      if (r.sent > 0) setBody("");
      await load();
    } catch (e: any) {
      setResult({ ok: false, text: e?.message || "Something went wrong." });
    } finally {
      setSending(false);
    }
  }

  function startEdit(guest: Guest) {
    setDraft({
      name: guest.name,
      phone: guest.phone,
      party_size: String(guest.party_size),
      tag: guest.tag ?? "",
      rsvp_status: guest.rsvp_status,
    });
    setCreatingGroup(false);
    setEditingId(guest.id);
    setCardError(null);
  }

  function cancelEdit() {
    setCreatingGroup(false);
    setEditingId(null);
    setCardError(null);
  }

  async function saveEdit(guest: Guest) {
    const name = draft.name.trim();
    const phone = normalizePhone(draft.phone);
    const partySize = parseInt(draft.party_size, 10);

    if (!name) {
      setCardError({ id: guest.id, text: "Name is required." });
      return;
    }
    if (!phone) {
      setCardError({
        id: guest.id,
        text: "Enter a valid phone number, like +15551234567.",
      });
      return;
    }
    if (!partySize || partySize < 1) {
      setCardError({ id: guest.id, text: "Party size must be at least 1." });
      return;
    }

    const typedTag = draft.tag.trim();
    const existingTag = tags.find(
      (t) => t.toLowerCase() === typedTag.toLowerCase()
    );
    const finalTag = typedTag ? existingTag ?? typedTag : null;

    setSavingEdit(true);
    setCardError(null);

    const { data, error } = await supabase
      .from("guests")
      .update({
        name,
        phone,
        party_size: partySize,
        tag: finalTag,
        rsvp_status: draft.rsvp_status,
      })
      .eq("id", guest.id)
      .select()
      .single();

    setSavingEdit(false);

    if (error || !data) {
      setCardError({
        id: guest.id,
        text: error?.message || "Couldn't save changes.",
      });
      return;
    }

    setGuests((prev) =>
      prev
        .map((g) => (g.id === guest.id ? (data as Guest) : g))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditingId(null);
  }

  async function deleteGuest(guest: Guest) {
    const count = (messagesByGuest[guest.id] || []).length;
    const extra =
      count > 0 ? ` and their ${count} message${count === 1 ? "" : "s"}` : "";

    if (!window.confirm(`Delete ${guest.name}${extra}? This can't be undone.`)) {
      return;
    }

    setDeletingId(guest.id);
    setCardError(null);

    // Remove the guest's message history first, then the guest.
    const delMessages = await supabase
      .from("messages")
      .delete()
      .eq("guest_id", guest.id);

    if (delMessages.error) {
      setDeletingId(null);
      setCardError({ id: guest.id, text: delMessages.error.message });
      return;
    }

    const delGuest = await supabase
      .from("guests")
      .delete()
      .eq("id", guest.id)
      .select("id");

    setDeletingId(null);

    if (delGuest.error) {
      setCardError({ id: guest.id, text: delGuest.error.message });
      return;
    }
    if (!delGuest.data || delGuest.data.length === 0) {
      setCardError({
        id: guest.id,
        text: "Couldn't delete this guest. Nothing was changed.",
      });
      return;
    }

    setGuests((prev) => prev.filter((g) => g.id !== guest.id));
    setMessages((prev) => prev.filter((m) => m.guest_id !== guest.id));
  }

  const inputStyle = {
    backgroundColor: "var(--cloud)",
    border: "1px solid var(--cloud-line)",
    color: "var(--ink)",
  };

  return (
    <main className="max-w-2xl mx-auto py-6 sm:py-10 px-4">
      <h1 className="text-2xl sm:text-3xl font-bold mb-1">Your guest threads</h1>
      {!loading && guests.length > 0 && (
        <p className="text-sm opacity-60 mb-8">
          {guests.length} guest{guests.length === 1 ? "" : "s"}
          {tags.length > 0 &&
            ` · ${tags.length} group${tags.length === 1 ? "" : "s"}`}
        </p>
      )}

      {error && (
        <p className="text-sm mb-4" style={{ color: "var(--coral)" }}>
          Error loading data: {error}
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

      {guests.length > 0 && (
        <section
          className="rounded-2xl p-4 sm:p-5 mb-8"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--cloud-line)",
          }}
        >
          <h2 className="font-semibold mb-4">New message</h2>

          <label className="block text-xs font-mono opacity-60 mb-1">
            Send to
          </label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm mb-4 outline-none"
            style={inputStyle}
          >
            <option value="all">Everyone ({guests.length})</option>
            {tags.length > 0 && (
              <optgroup label="Groups">
                {tags.map((t) => (
                  <option key={t} value={`tag:${t}`}>
                    {t} ({tagCounts[t]})
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Individual guests">
              {guests.map((g) => (
                <option key={g.id} value={`guest:${g.id}`}>
                  {g.name}
                </option>
              ))}
            </optgroup>
          </select>

          <label className="block text-xs font-mono opacity-60 mb-1">
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={1600}
            placeholder="Hi! We're getting married on June 14 — save the date!"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
            style={inputStyle}
          />
          <p className="text-xs font-mono opacity-50 mt-1 mb-4">
            {body.length} characters
            {segments > 0 &&
              ` · ~${segments} text segment${segments === 1 ? "" : "s"} per guest`}
            {hasNonAscii && " · emoji use shorter segments"}
          </p>

          <label className="flex items-start gap-2 text-sm mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            <span className="opacity-80">
              These guests have shared their phone numbers with me for this
              event.
            </span>
          </label>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="w-full sm:w-auto px-5 py-3 rounded-full text-white font-semibold text-sm disabled:opacity-40"
              style={{ backgroundColor: "var(--violet)" }}
            >
              {sending
                ? "Sending…"
                : `Send to ${recipients.length} guest${recipients.length === 1 ? "" : "s"}`}
            </button>
            {result && (
              <p
                className="text-sm"
                style={{ color: result.ok ? "var(--mint)" : "var(--coral)" }}
              >
                {result.text}
              </p>
            )}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-6">
        {guests.map((guest) => {
          const thread = messagesByGuest[guest.id] || [];
          const isExpanded = !!expanded[guest.id];
          const shown = isExpanded ? thread : thread.slice(-VISIBLE_MESSAGES);
          const hidden = thread.length - shown.length;
          const isEditing = editingId === guest.id;
          const isDeleting = deletingId === guest.id;

          return (
            <div
              key={guest.id}
              className="rounded-2xl p-4"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--cloud-line)",
                opacity: isDeleting ? 0.5 : 1,
              }}
            >
              {isEditing ? (
                <div className="mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono opacity-60 mb-1">
                        Name
                      </label>
                      <input
                        value={draft.name}
                        onChange={(e) =>
                          setDraft({ ...draft, name: e.target.value })
                        }
                        className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono opacity-60 mb-1">
                        Phone
                      </label>
                      <input
                        value={draft.phone}
                        onChange={(e) =>
                          setDraft({ ...draft, phone: e.target.value })
                        }
                        placeholder="+15551234567"
                        className="w-full rounded-xl px-3 py-2 text-sm outline-none font-mono"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono opacity-60 mb-1">
                        Party size
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={draft.party_size}
                        onChange={(e) =>
                          setDraft({ ...draft, party_size: e.target.value })
                        }
                        className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono opacity-60 mb-1">
                        Group
                      </label>
                      <select
                        value={creatingGroup ? NEW_GROUP : draft.tag}
                        onChange={(e) => {
                          if (e.target.value === NEW_GROUP) {
                            setCreatingGroup(true);
                            setDraft({ ...draft, tag: "" });
                          } else {
                            setCreatingGroup(false);
                            setDraft({ ...draft, tag: e.target.value });
                          }
                        }}
                        className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                        style={inputStyle}
                      >
                        <option value="">No group</option>
                        {tags.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                        <option value={NEW_GROUP}>+ New group…</option>
                      </select>
                      {creatingGroup && (
                        <input
                          value={draft.tag}
                          onChange={(e) =>
                            setDraft({ ...draft, tag: e.target.value })
                          }
                          placeholder="New group name"
                          autoFocus
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none mt-2"
                          style={inputStyle}
                        />
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-mono opacity-60 mb-1">
                        RSVP
                      </label>
                      <select
                        value={draft.rsvp_status}
                        onChange={(e) =>
                          setDraft({ ...draft, rsvp_status: e.target.value })
                        }
                        className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                        style={inputStyle}
                      >
                        {RSVP_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={() => saveEdit(guest)}
                      disabled={savingEdit}
                      className="px-5 py-2.5 rounded-full text-white font-semibold text-sm disabled:opacity-50"
                      style={{ backgroundColor: "var(--violet)" }}
                    >
                      {savingEdit ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={savingEdit}
                      className="text-sm underline opacity-70"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                  <p className="font-semibold break-words">{guest.name}</p>
                  <div className="flex items-center gap-2 flex-wrap sm:justify-end">
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
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${rsvpColor(guest.rsvp_status)} 25%, transparent)`,
                        color: "var(--ink)",
                      }}
                    >
                      {guest.rsvp_status}
                    </span>
                    <span className="text-xs font-mono opacity-50">
                      party of {guest.party_size}
                    </span>
                  </div>
                </div>
              )}

              {thread.length === 0 ? (
                <p className="text-sm opacity-50 py-2">No messages yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {hidden > 0 && (
                    <button
                      onClick={() =>
                        setExpanded({ ...expanded, [guest.id]: true })
                      }
                      className="text-xs underline opacity-60 self-center"
                    >
                      Show {hidden} earlier message{hidden === 1 ? "" : "s"}
                    </button>
                  )}
                  {shown.map((m) => {
                    const outbound = m.direction === "outbound";
                    const failed = m.status === "failed";
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${outbound ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`${outbound ? "bubble-out" : "bubble-in"} px-4 py-2 max-w-[85%] sm:max-w-[75%] text-sm whitespace-pre-wrap break-words`}
                          style={
                            outbound
                              ? { opacity: failed ? 0.5 : 1 }
                              : {
                                  backgroundColor: "var(--cloud)",
                                  border: "1px solid var(--cloud-line)",
                                }
                          }
                        >
                          {m.body}
                        </div>
                        <p className="text-[10px] font-mono opacity-50 mt-1">
                          {failed ? (
                            <span style={{ color: "var(--coral)", opacity: 1 }}>
                              Not delivered ·{" "}
                            </span>
                          ) : null}
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {cardError && cardError.id === guest.id && (
                <p className="text-sm mt-3" style={{ color: "var(--coral)" }}>
                  {cardError.text}
                </p>
              )}

              {!isEditing && (
                <div className="flex items-center justify-between mt-3 gap-2">
                  <p className="font-mono text-xs opacity-40">{guest.phone}</p>
                  <div className="flex items-center gap-1 text-sm">
                    <button
                      onClick={() => startEdit(guest)}
                      disabled={isDeleting}
                      className="px-3 py-2 underline opacity-60 hover:opacity-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteGuest(guest)}
                      disabled={isDeleting}
                      className="px-3 py-2 underline hover:opacity-100"
                      style={{ color: "var(--coral)" }}
                    >
                      {isDeleting ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              )}
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
      <Dashboard />
    </AuthGate>
  );
}
