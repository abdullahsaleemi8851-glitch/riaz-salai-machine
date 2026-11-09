"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, MessageCircle, Search, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { usePublicSettings } from "@/components/public-settings-provider";
import { BusinessWhatsAppLink } from "@/components/business-whatsapp-link";

export function SitePageHeader() {
  const { isUrdu, toggleLanguage } = useLanguage();
  const settings = usePublicSettings();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const links = [
    { href: "/", en: "Home", ur: "صفحہ اول" },
    { href: "/spare-parts", en: "Products", ur: "مشین کے پرزے" },
    { href: "/new-machines", en: "New machines", ur: "نئی مشینیں" },
    { href: "/old-machines", en: "Used machines", ur: "استعمال شدہ مشینیں" },
    { href: "/repairing", en: "Repairing", ur: "مرمت" },
    { href: "/posts", en: "Posts", ur: "تازہ خبریں" },
    { href: "/about", en: "About", ur: "ہمارے بارے میں" },
    { href: "/location", en: "Location", ur: "مقام" },
    { href: "/contact", en: "Contact", ur: "رابطہ" },
  ];

  return (
    <header className="header public-site-header" dir={isUrdu ? "rtl" : "ltr"}>
      <Link className="brand" href="/" aria-label={settings.business_name}>
        {settings.logo_url
          ? <Image className="brand-logo-image" src={settings.logo_url} alt="" width={40} height={40} unoptimized />
          : <span className="brand-mark" aria-hidden="true">R</span>}
        <span>{settings.logo_text || settings.business_name}<small>{isUrdu ? "گوجرہ، پاکستان" : "GOJRA, PAKISTAN"}</small></span>
      </Link>
      <nav className="nav-links" id="public-navigation" data-open={menuOpen} aria-label={isUrdu ? "مرکزی نیویگیشن" : "Main navigation"}>
        {links.map((link) => (
          <Link
            href={link.href}
            key={link.href}
            aria-current={pathname === link.href ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {isUrdu ? link.ur : link.en}
          </Link>
        ))}
        <button className="language-button" type="button" onClick={toggleLanguage} aria-label={isUrdu ? "Switch to English" : "Switch to Urdu"}>
          {isUrdu ? "English" : "اردو"}
        </button>
      </nav>
      <div className="header-actions">
        <button
          className="header-search-toggle"
          type="button"
          aria-controls="header-search"
          aria-expanded={searchOpen}
          aria-label={searchOpen ? (isUrdu ? "تلاش بند کریں" : "Close search") : (isUrdu ? "تلاش" : "Search")}
          onClick={() => setSearchOpen((open) => !open)}
        >
          {searchOpen ? <X size={18} /> : <Search size={18} />}
          <span>{isUrdu ? "تلاش" : "Search"}</span>
        </button>
        <BusinessWhatsAppLink className="header-contact" message="Hello Riaz Salai Machine, I would like to know more.">
          <MessageCircle size={15} />
          {isUrdu ? "واٹس ایپ" : "WhatsApp"}
        </BusinessWhatsAppLink>
        <button
          className="menu-toggle"
          type="button"
          aria-controls="public-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? (isUrdu ? "مینو بند کریں" : "Close menu") : (isUrdu ? "مینو کھولیں" : "Open menu")}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {searchOpen && (
        <form className="header-search-form" id="header-search" action="/spare-parts" role="search">
          <label className="visually-hidden" htmlFor="site-search">{isUrdu ? "مصنوعات تلاش کریں" : "Search products"}</label>
          <input
            id="site-search"
            type="search"
            name="search"
            placeholder={isUrdu ? "مصنوعات تلاش کریں" : "Search products"}
            autoFocus
          />
          <button className="button-primary" type="submit">{isUrdu ? "تلاش" : "Search"}</button>
        </form>
      )}
    </header>
  );
}
