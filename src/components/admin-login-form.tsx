"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setNotice("Login nahi ho saka. Email aur password dobara check karein.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Login mukammal nahi ho saka.");
    } finally {
      setBusy(false);
    }
  }

  async function recoverPassword() {
    setNotice("");
    if (!email.trim()) {
      setNotice("Password wapas hasil karne ke liye pehle Admin email likhein.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });
      setNotice(error ? "Password reset email nahi bheji ja saki. Email aur setup check karein." : "Agar yeh Admin account mojood hai to password reset email bhej di gayi hai.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Password reset email nahi bheji ja saki.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      {searchParams.get("error") === "not-authorized" && (
        <p className="form-notice" role="alert">Yeh account website manage karne ke liye Admin nahi hai.</p>
      )}
      {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
        <p className="form-notice" role="status">Login se pehle .env.local mein Supabase setup karein.</p>
      )}
      <label>
        Admin Email
        <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        Password
        <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      {notice && <p className="form-notice" role="status">{notice}</p>}
      <button className="button-primary" type="submit" disabled={busy}>
        {busy ? "Thora intezar karein…" : "Login Karein"}
      </button>
      <button className="link-button" type="button" disabled={busy} onClick={recoverPassword}>
        Password Bhool Gaye?
      </button>
    </form>
  );
}
