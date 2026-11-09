import Link from "next/link";
import { AdminWorkspaceNavigation } from "@/components/admin-workspace-navigation";

export default function AdminWorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/">RIAZ SALAI MACHINE</Link>
        <span className="admin-sidebar-label">WEBSITE KA KAAM</span>
        <AdminWorkspaceNavigation />
        <form action="/admin/logout" method="post">
          <button className="admin-logout" type="submit">Logout Karein</button>
        </form>
      </aside>
      <div className="admin-content">{children}</div>
    </div>
  );
}
