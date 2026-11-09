"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "@/components/language-provider";

export function InquiryForm() {
  const { isUrdu, language } = useLanguage();
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setNotice("");
    setSuccess(false);
    setBusy(true);

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          phone: values.get("phone"),
          message: values.get("message"),
          website: values.get("website"),
          language,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setNotice(isUrdu ? "پیغام بھیجا نہیں جا سکا۔ براہ کرم دوبارہ کوشش کریں یا واٹس ایپ پر رابطہ کریں۔" : result.error || "Your message could not be sent. Please try again.");
        return;
      }
      form.reset();
      setSuccess(true);
      setNotice(isUrdu ? "شکریہ، آپ کا پیغام موصول ہوگیا ہے۔" : "Thank you. Your message has been received.");
    } catch {
      setNotice(isUrdu ? "رابطہ نہیں ہوسکا۔ دوبارہ کوشش کریں یا واٹس ایپ پر رابطہ کریں۔" : "We could not connect. Please try again or contact us on WhatsApp.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="inquiry-form" onSubmit={submit}>
      <label>
        {isUrdu ? "آپ کا نام" : "Your name"}
        <input name="name" autoComplete="name" minLength={2} maxLength={100} required />
      </label>
      <label>
        {isUrdu ? "فون نمبر" : "Phone number"}
        <input name="phone" type="tel" autoComplete="tel" minLength={7} maxLength={30} pattern="[+\d\s().-]+" required />
      </label>
      <label>
        {isUrdu ? "ہم آپ کی کیا مدد کرسکتے ہیں؟" : "How can we help?"}
        <textarea name="message" rows={5} minLength={5} maxLength={2000} required />
      </label>
      <label className="honeypot" aria-hidden="true">
        {isUrdu ? "اس خانے کو خالی چھوڑیں" : "Leave this field empty"}
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {notice && <p className={success ? "form-success" : "form-notice"} role="status">{notice}</p>}
      <button className="button-primary" type="submit" disabled={busy}>
        {busy ? isUrdu ? "بھیجا جا رہا ہے…" : "Sending…" : isUrdu ? "پیغام بھیجیں" : "Send inquiry"}
      </button>
    </form>
  );
}
