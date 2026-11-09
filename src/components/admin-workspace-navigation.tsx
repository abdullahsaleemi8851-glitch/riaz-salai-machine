"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const adminLinks = [
  ["Main Screen", "/admin"],
  ["Tamam Products", "/admin/products"],
  ["Nayi Machines", "/admin/new-machines"],
  ["Purani Machines", "/admin/old-machines"],
  ["Product Ki Qisam", "/admin/categories"],
  ["Repairing Services", "/admin/services"],
  ["Website Posts", "/admin/posts"],
  ["Customers Ke Paighamaat", "/admin/inquiries"],
  ["Website Ki Settings", "/admin/settings"],
  ["Data Download", "/admin/export"],
];

export function AdminWorkspaceNavigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <button
        className="admin-menu-toggle"
        type="button"
        aria-controls="admin-navigation"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={18} /> : <Menu size={18} />}
        {menuOpen ? "Menu Band Karein" : "Menu"}
      </button>
      <nav id="admin-navigation" data-open={menuOpen} aria-label="Admin menu">
        {adminLinks.map(([label, href]) => (
          <Link
            href={href}
            key={href}
            aria-current={pathname === href ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
