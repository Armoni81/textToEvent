"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Status = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    // Supabase signs the person in from the link in their email and
    // announces it with a PASSWORD_RECOVERY event.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setStatus((s) => (s === "checking" ? "ready" : s));
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setStatus((s) =>
        s === "checking" ? (data.session ? "ready" : "invalid") : s
      );
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (password !== confirm) {
      setMessage("The two passwords don't match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setStatus("done");
    setTimeout(() => router.push("/"), 1500);
  }

  const inputStyle = {
    backgroundColor: "var(--card)",
    border: "1px solid var(--cloud-line)",
    color: "var(--ink)",
  };

  return (
    <main className="max-w-sm mx-auto py-16 px-4">
      {status === "checking" && (
        <p className="text-sm opacity-60">Checking your link…</p>
      )}

      {status === "invalid" && (
        <>
          <h1 className="text-3xl font-bold mb-1">Link expired</h1>
          <p className="text-sm opacity-60 mb-6">
            This reset link is invalid or has already been used. Request a new
            one from the login page.
          </p>
          <a
            href="/login"
            className="inline-block px-5 py-3 rounded-full text-white font-semibold text-sm"
            style={{ backgroundColor: "var(--violet)" }}
          >
            Back to log in
          </a>
        </>
      )}

      {status === "ready" && (
        <>
          <h1 className="text-3xl font-bold mb-1">Choose a new password</h1>
          <p className="text-sm opacity-60 mb-8">
            Pick something you haven't used here before.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              required
              minLength={6}
              placeholder="New password (6+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl px-4 py-3 text-sm outline-none"
              style={inputStyle}
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded-xl px-4 py-3 text-sm outline-none"
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-2 px-5 py-3 rounded-full text-white font-semibold text-sm disabled:opacity-60"
              style={{ backgroundColor: "var(--violet)" }}
            >
              {loading ? "One moment…" : "Save new password"}
            </button>
          </form>

          {message && (
            <p className="mt-4 text-sm" style={{ color: "var(--coral)" }}>
              {message}
            </p>
          )}
        </>
      )}

      {status === "done" && (
        <>
          <h1 className="text-3xl font-bold mb-1">Password updated</h1>
          <p className="text-sm opacity-60">Taking you to your guest list…</p>
        </>
      )}
    </main>
  );
}
