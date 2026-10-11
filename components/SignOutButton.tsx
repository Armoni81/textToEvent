"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignOutButton() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setEmail(data.session?.user.email ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      setEmail(session?.user.email ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!email) return null;

  return (
    <>
      <span className="hidden sm:inline text-xs text-white/70 px-2">
        {email}
      </span>
      <button
        onClick={signOut}
        className="px-3 py-2 rounded-full text-sm font-medium text-white/90 hover:bg-white/10"
      >
        Sign out
      </button>
    </>
  );
}
