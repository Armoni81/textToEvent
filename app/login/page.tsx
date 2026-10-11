"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ALREADY_EXISTS_MESSAGE =
  "An account with this email already exists. Log in instead.";

type Mode = "login" | "signup" | "forgot";

const COPY: Record<Mode, { title: string; subtitle: string; button: string }> = {
  login: {
    title: "Welcome back",
    subtitle: "Log in to see your guest threads.",
    button: "Log in",
  },
  signup: {
    title: "Create your account",
    subtitle: "Sign up to start managing your guest list.",
    button: "Sign up",
  },
  forgot: {
    title: "Reset your password",
    subtitle: "Enter your email and we'll send you a link to choose a new one.",
    button: "Send reset link",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(true);
  const [loading, setLoading] = useState(false);

  function showError(text: string) {
    setIsError(true);
    setMessage(text);
  }

  function showInfo(text: string) {
    setIsError(false);
    setMessage(text);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setMessage("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        showError(error.message);
      } else {
        // Same message whether or not the email has an account.
        showInfo(
          "If an account exists for that email, a reset link is on its way. Check your inbox and spam folder."
        );
      }
    } else if (mode === "signup") {
      // Clear any existing login first, so a new sign-up can never leave
      // you inside a previous account.
      await supabase.auth.signOut();

      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        if (/already (registered|exists)/i.test(error.message)) {
          switchMode("login");
          showError(ALREADY_EXISTS_MESSAGE);
        } else {
          showError(error.message);
        }
      } else if (data.user && data.user.identities?.length === 0) {
        // Supabase returns a fake success for emails that already exist
        // when email confirmation is turned on.
        switchMode("login");
        showError(ALREADY_EXISTS_MESSAGE);
      } else if (!data.session) {
        showInfo("Check your email to confirm your account, then log in.");
      } else {
        router.push("/");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        showError(error.message);
      } else {
        router.push("/");
      }
    }

    setLoading(false);
  }

  const inputStyle = {
    backgroundColor: "var(--card)",
    border: "1px solid var(--cloud-line)",
    color: "var(--ink)",
  };

  return (
    <main className="max-w-sm mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-1">{COPY[mode].title}</h1>
      <p className="text-sm opacity-60 mb-8">{COPY[mode].subtitle}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl px-4 py-3 text-sm outline-none"
          style={inputStyle}
        />
        {mode !== "forgot" && (
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl px-4 py-3 text-sm outline-none"
            style={inputStyle}
          />
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 px-5 py-3 rounded-full text-white font-semibold text-sm disabled:opacity-60"
          style={{ backgroundColor: "var(--violet)" }}
        >
          {loading ? "One moment…" : COPY[mode].button}
        </button>
      </form>

      {message && (
        <p
          className="mt-4 text-sm"
          style={{ color: isError ? "var(--coral)" : "var(--mint)" }}
        >
          {message}
        </p>
      )}

      <div className="mt-6 flex flex-col items-start gap-2 text-sm">
        {mode === "login" && (
          <>
            <button
              onClick={() => switchMode("forgot")}
              className="underline opacity-70"
            >
              Forgot your password?
            </button>
            <button
              onClick={() => switchMode("signup")}
              className="underline opacity-70"
            >
              New here? Create an account
            </button>
          </>
        )}
        {mode === "signup" && (
          <button
            onClick={() => switchMode("login")}
            className="underline opacity-70"
          >
            Already have an account? Log in
          </button>
        )}
        {mode === "forgot" && (
          <button
            onClick={() => switchMode("login")}
            className="underline opacity-70"
          >
            Back to log in
          </button>
        )}
      </div>
    </main>
  );
}
