"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/language-provider";
import { usePublicSettings } from "@/components/public-settings-provider";
import { BusinessWhatsAppLink } from "@/components/business-whatsapp-link";

export function SiteFooter() {
  const { isUrdu } = useLanguage();
  const settings = usePublicSettings();

  const links = [
    { href: "/", en: "Home", ur: "صفحہ اول" },
    { href: "/spare-parts", en: "Spare parts", ur: "مشین کے پرزے" },
    { href: "/new-machines", en: "New machines", ur: "نئی مشینیں" },
    { href: "/old-machines", en: "Used machines", ur: "استعمال شدہ مشینیں" },
    { href: "/repairing", en: "Repairing", ur: "مرمت" },
    { href: "/posts", en: "Posts", ur: "تازہ خبریں" },
    { href: "/about", en: "About", ur: "ہمارے بارے میں" },
    { href: "/location", en: "Location", ur: "مقام" },
    { href: "/contact", en: "Contact", ur: "رابطہ" },
  ];

  return (
    <footer className="footer site-footer" dir={isUrdu ? "rtl" : "ltr"}>
      <Link className="brand" href="/">
        {settings.logo_url
          ? <Image className="brand-logo-image" src={settings.logo_url} alt="" width={40} height={40} unoptimized />
          : <span className="brand-mark" aria-hidden="true">R</span>}
        <span>{settings.logo_text || settings.business_name}<small>{isUrdu ? "گوجرہ، پاکستان" : "GOJRA, PAKISTAN"}</small></span>
      </Link>
      <nav className="footer-links" aria-label={isUrdu ? "صفحے کے نچلے حصے کی نیویگیشن" : "Footer navigation"}>
        {links.map((link) => <Link href={link.href} key={link.href}>{isUrdu ? link.ur : link.en}</Link>)}
      </nav>
      <div className="site-footer-contact">
        <span>{isUrdu ? settings.address_ur || settings.address : settings.address}</span>
        <a href={`mailto:${settings.email}`}>{settings.email}</a>
        <BusinessWhatsAppLink message="Hello Riaz Salai Machine, I would like to ask about your products.">
          {isUrdu ? "واٹس ایپ" : "WhatsApp"}
        </BusinessWhatsAppLink>
        {settings.instagram_url && <a href={settings.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}
      </div>
      <span className="footer-copy">
        © {new Date().getFullYear()} {settings.business_name}. {isUrdu ? settings.footer_ur || "تمام حقوق محفوظ ہیں۔" : settings.footer_en || "All rights reserved."}
      </span>
    </footer>
  );
}
