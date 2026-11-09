import Link from "next/link";
import { AdminResetPassword } from "@/components/admin-reset-password";

export default function AdminResetPasswordPage() {
  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card">
        <Link className="admin-brand" href="/">RIAZ SALAI MACHINE</Link>
        <p className="admin-eyebrow">ACCOUNT KI HIFAZAT</p>
        <h1>Naya Password Rakhein</h1>
        <p className="admin-intro">Admin password kam az kam 10 haroof ka rakhein.</p>
        <AdminResetPassword />
      </section>
    </main>
  );
}
