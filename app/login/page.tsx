"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
      } else if (!data.session) {
        setMessage("Check your email to confirm your account, then log in.");
      } else {
        router.push("/");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
      } else {
        router.push("/");
      }
    }

    setLoading(false);
  }

  return (
    <main className="max-w-sm mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-1">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="text-sm opacity-60 mb-8">
        {mode === "login"
          ? "Log in to see your guest threads."
          : "Sign up to start managing your guest list."}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl px-4 py-3 text-sm outline-none"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--cloud-line)",
            color: "var(--ink)",
          }}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (6+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl px-4 py-3 text-sm outline-none"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--cloud-line)",
            color: "var(--ink)",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-2 px-5 py-3 rounded-full text-white font-semibold text-sm disabled:opacity-60"
          style={{ backgroundColor: "var(--violet)" }}
        >
          {loading ? "One moment…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-sm" style={{ color: "var(--coral)" }}>
          {message}
        </p>
      )}

      <button
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setMessage("");
        }}
        className="mt-6 text-sm underline opacity-70"
      >
        {mode === "login"
          ? "New here? Create an account"
          : "Already have an account? Log in"}
      </button>
    </main>
  );
}
