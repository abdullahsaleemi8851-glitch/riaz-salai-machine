import Link from "next/link";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin-login-form";

export default function AdminLoginPage() {
  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card">
        <Link className="admin-brand" href="/">RIAZ SALAI MACHINE</Link>
        <p className="admin-eyebrow">PRIVATE ADMIN HISSA</p>
        <h1>Admin Panel Mein Aayein</h1>
        <p className="admin-intro">Apne muqarrar Admin account se login karein.</p>
        <Suspense fallback={<p>Login load ho raha hai…</p>}>
          <AdminLoginForm />
        </Suspense>
        <Link className="back-home" href="/">← Website Par Wapas Jayein</Link>
      </section>
    </main>
  );
}
