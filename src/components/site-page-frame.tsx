"use client";

import { MessageCircle } from "lucide-react";
import { SitePageHeader } from "@/components/site-page-header";
import { SiteFooter } from "@/components/site-footer";
import { useLanguage } from "@/components/language-provider";
import { BusinessWhatsAppLink } from "@/components/business-whatsapp-link";

export function SitePageFrame({
  title,
  titleUr,
  description,
  descriptionUr,
  children,
}: Readonly<{
  title: string;
  titleUr?: string;
  description: string;
  descriptionUr?: string;
  children?: React.ReactNode;
}>) {
  const language = useLanguage();
  const titleText = language.isUrdu ? titleUr || title : title;
  const descriptionText = language.isUrdu ? descriptionUr || description : description;
  return (
    <div className="public-page" dir={language.isUrdu ? "rtl" : "ltr"}>
      <SitePageHeader />
      <main className="public-page-main">
        <p className="section-kicker">{language.isUrdu ? "ریاض سلائی مشین · گوجرہ" : "RIAZ SALAI MACHINE · GOJRA"}</p>
        <h1>{titleText}</h1>
        <p className="public-page-description">{descriptionText}</p>
        {children}
      </main>
      <SiteFooter />
      <BusinessWhatsAppLink
        className="floating-whatsapp"
        message="Hello Riaz Salai Machine, I would like to ask about your products."
        ariaLabel={language.isUrdu ? "ریاض سلائی مشین سے واٹس ایپ پر رابطہ کریں" : "Contact Riaz Salai Machine on WhatsApp"}
      >
        <MessageCircle size={18} />
        {language.isUrdu ? "واٹس ایپ" : "WhatsApp"}
      </BusinessWhatsAppLink>
    </div>
  );
}
