"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Inquiry = {
  id: string;
  customer_name: string;
  phone: string;
  message: string;
  status: "new" | "in_progress" | "completed";
  created_at: string;
};
type Note = { id: string; inquiry_id: string; note: string; created_at: string };

function phoneForWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  if (digits.startsWith("92")) return digits;
  return digits;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

export function AdminInquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const [inquiryResult, noteResult] = await Promise.all([
        supabase.from("inquiries").select("id,customer_name,phone,message,status,created_at").order("created_at", { ascending: false }),
        supabase.from("inquiry_notes").select("id,inquiry_id,note,created_at").order("created_at", { ascending: false }),
      ]);
      if (inquiryResult.error || noteResult.error) throw inquiryResult.error || noteResult.error;
      setInquiries((inquiryResult.data ?? []) as Inquiry[]);
      setNotes((noteResult.data ?? []) as Note[]);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Customers ke paighamaat load nahi ho sake."));
    } finally {
      setLoading(false);
    }
  }, []);

  // Supabase results update state only after the asynchronous requests complete.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function updateStatus(inquiry: Inquiry, status: Inquiry["status"]) {
    setError("");
    const { error: updateError } = await createSupabaseBrowserClient().from("inquiries").update({ status }).eq("id", inquiry.id);
    if (updateError) setError(updateError.message);
    else {
      setInquiries((current) => current.map((item) => item.id === inquiry.id ? { ...item, status } : item));
      setNotice("Paighaam ki halat tabdeel ho gayi.");
    }
  }

  async function addNote(inquiryId: string) {
    const note = (drafts[inquiryId] ?? "").trim();
    if (!note) {
      setError("Mehfooz karne se pehle apna note likhein.");
      return;
    }
    setError("");
    const { data: { user }, error: userError } = await createSupabaseBrowserClient().auth.getUser();
    if (userError || !user) {
      setError("Aap ka Admin login khatam ho gaya. Dobara login karein.");
      return;
    }
    const { data, error: insertError } = await createSupabaseBrowserClient()
      .from("inquiry_notes")
      .insert({ inquiry_id: inquiryId, note, created_by: user.id })
      .select("id,inquiry_id,note,created_at")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNotes((current) => [data as Note, ...current]);
    setDrafts((current) => ({ ...current, [inquiryId]: "" }));
    setNotice("Admin ka private note mehfooz ho gaya.");
  }

  return (
    <main>
      <div className="admin-page-heading"><div><p className="admin-eyebrow">CUSTOMERS KE PAIGHAMAAT</p><h1>Customers Ke Paighamaat</h1></div></div>
      {notice && <p className="form-success" role="status">{notice}</p>}
      {error && <p className="form-notice" role="alert">{error}</p>}
      <section className="admin-table-panel">
        <h2>Aane Wale Paighamaat</h2>
        {loading ? <p>Paighamaat load ho rahe hain…</p> : !inquiries.length ? <p>Abhi kisi customer ka paighaam nahi aaya.</p> : (
          <div className="admin-list">{inquiries.map((inquiry) => (
            <article className="inquiry-admin-card" key={inquiry.id}>
              <div className="inquiry-admin-heading">
                <div><strong>{inquiry.customer_name}</strong><span>{new Date(inquiry.created_at).toLocaleString("en-PK")}</span></div>
                <select aria-label={`${inquiry.customer_name} ke paighaam ki halat`} value={inquiry.status} onChange={(event) => void updateStatus(inquiry, event.target.value as Inquiry["status"])}>
                  <option value="new">Naya</option><option value="in_progress">Kaam Jari Hai</option><option value="completed">Mukammal</option>
                </select>
              </div>
              <a className="inquiry-phone" href={`https://wa.me/${phoneForWhatsApp(inquiry.phone)}`} target="_blank" rel="noreferrer">{inquiry.phone} · WhatsApp Par Rabta Karein</a>
              <p>{inquiry.message}</p>
              <div className="inquiry-notes">
                <strong>Sirf Admin Ke Liye Notes</strong>
                {notes.filter((note) => note.inquiry_id === inquiry.id).map((note) => <p key={note.id}>{note.note}<small>{new Date(note.created_at).toLocaleString("en-PK")}</small></p>)}
                <textarea aria-label={`${inquiry.customer_name} ke liye private note`} value={drafts[inquiry.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [inquiry.id]: event.target.value }))} placeholder="Sirf Admin ke liye note likhein…" />
                <button className="admin-secondary-button" type="button" onClick={() => void addNote(inquiry.id)}>Private Note Mehfooz Karein</button>
              </div>
            </article>
          ))}</div>
        )}
      </section>
    </main>
  );
}
