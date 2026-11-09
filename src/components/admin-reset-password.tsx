"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AdminResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setSuccess(false);
    try {
      const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setNotice("Password badal gaya. Ab naye password se login karein.");
      setPassword("");
      setTimeout(() => router.replace("/admin/login"), 1300);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Password nahi badal saka.");
      setSuccess(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <label>Naya Password<input type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {notice && <p className={success ? "form-success" : "form-notice"} role={success ? "status" : "alert"}>{notice}</p>}
      <button className="button-primary" disabled={busy}>{busy ? "Badal rahe hain…" : "Naya Password Mehfooz Karein"}</button>
    </form>
  );
}
