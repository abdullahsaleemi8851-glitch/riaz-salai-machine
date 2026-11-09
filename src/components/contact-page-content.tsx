"use client";

import { Mail, MapPin, MessageCircle } from "lucide-react";
import { InquiryForm } from "@/components/inquiry-form";
import { SitePageFrame } from "@/components/site-page-frame";
import { useLanguage } from "@/components/language-provider";
import { usePublicSettings } from "@/components/public-settings-provider";
import { BusinessWhatsAppLink } from "@/components/business-whatsapp-link";

export function ContactPageContent() {
  const { isUrdu } = useLanguage();
  const settings = usePublicSettings();
  return (
    <SitePageFrame
      title="How can we help?"
      titleUr="ہم آپ کی کیا مدد کر سکتے ہیں؟"
      description="Ask about sewing machine parts, machine availability, or repair services. We’ll be glad to help."
      descriptionUr="سلائی مشین کے پرزوں، مشینوں کی دستیابی یا مرمت کے بارے میں پوچھیں۔ ہمیں آپ کی مدد کرکے خوشی ہوگی۔"
    >
      <div className="contact-page-grid">
        <section>
          <h2>{isUrdu ? "ہمیں پیغام بھیجیں" : "Send us a message"}</h2>
          <InquiryForm />
        </section>
        <aside className="contact-info-card">
          <h2>{isUrdu ? "رابطہ کریں" : "Get in touch"}</h2>
          <p>{settings.business_name}</p>
          <div><MessageCircle size={18} /><BusinessWhatsAppLink message="Hello Riaz Salai Machine, I have a question.">{isUrdu ? "واٹس ایپ" : "WhatsApp"}: {settings.whatsapp_number}</BusinessWhatsAppLink></div>
          <div><Mail size={18} /><a href={`mailto:${settings.email}`}>{settings.email}</a></div>
          <div><MapPin size={18} /><span>{isUrdu ? settings.address_ur || settings.address : settings.address}</span></div>
          {settings.phone_number && <div><Mail size={18} /><a href={`tel:${settings.phone_number}`}>{settings.phone_number}</a></div>}
          {settings.instagram_url && <div><a href={settings.instagram_url} target="_blank" rel="noreferrer">Instagram</a></div>}
          <BusinessWhatsAppLink className="button-primary" message="Hello Riaz Salai Machine, I would like to ask about your products.">
            <MessageCircle size={16} /> {isUrdu ? "واٹس ایپ پر بات کریں" : "Chat on WhatsApp"}
          </BusinessWhatsAppLink>
        </aside>
      </div>
    </SitePageFrame>
  );
}
