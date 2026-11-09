"use client";

import Image from "next/image";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Cog,
  Clock3,
  MapPin,
  MessageCircle,
  PackageOpen,
  Phone,
  RotateCcw,
  Wrench,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { LatestProducts } from "@/components/latest-products";
import { LatestPosts } from "@/components/latest-posts";
import { CategoryHighlights } from "@/components/category-highlights";
import { usePublicSettings } from "@/components/public-settings-provider";
import { SitePageHeader } from "@/components/site-page-header";
import { SiteFooter } from "@/components/site-footer";
import { BusinessWhatsAppLink } from "@/components/business-whatsapp-link";

export default function HomePage() {
  const { language } = useLanguage();
  const settings = usePublicSettings();
  const isUrdu = language === "ur";

  const text = isUrdu
    ? {
        home: "صفحہ اول",
        parts: "مشین کے پرزے",
        machines: "مشینیں",
        about: "ہمارے بارے میں",
        contact: "رابطہ",
        posts: "تازہ خبریں",
        search: "تلاش",
        heroKicker: "گوجرہ، پاکستان میں آپ کا قابلِ اعتماد ساتھی",
        headline: "سلائی مشینوں کے لیے",
        highlight: "ہر ضروری چیز۔",
        intro:
          "سلائی مشین کے پرزے، نئی اور استعمال شدہ مشینیں، اور مرمت کی سہولت — آپ کے لیے ایک ہی جگہ۔",
        browse: "پرزے دیکھیں",
        whatsapp: "واٹس ایپ پر رابطہ",
        trust1: "معیاری مشین کے پرزے",
        trust2: "نئی اور پرانی مشینیں",
        trust3: "مرمت کی سہولت",
        trust4: "گوہرہ میں موجود",
        catalogKicker: "ہماری مصنوعات اور خدمات",
        catalogTitle: "آپ کو کیا درکار ہے؟",
        catalogIntro:
          "اپنی ضرورت کے مطابق حصہ منتخب کریں۔ اگر یقین نہ ہو تو ہم سے پوچھیں — ہم مدد کے لیے موجود ہیں۔",
        viewDetails: "مزید دیکھیں",
        productsKicker: "دکان سے تازہ",
        productsTitle: "دستیاب مصنوعات",
        productsIntro: "مصنوعات کی فہرست جلد دستیاب ہوگی۔ اپنی ضرورت کے لیے ابھی رابطہ کریں۔",
        noProducts: "فہرست تیار کی جا رہی ہے",
        noProductsInfo:
          "ہم اپنی مصنوعات کی فہرست تیار کر رہے ہیں۔ دستیابی اور قیمت کے لیے براہِ راست رابطہ کریں۔",
        aboutKicker: "ریاض سلائی مشین",
        aboutTitle: "آپ کے کام کے لیے صحیح مشین اور صحیح مدد۔",
        aboutText:
          "ہم گوجرہ میں سلائی مشین کے پرزے، نئی اور استعمال شدہ مشینیں، اور مرمت کی خدمات فراہم کرتے ہیں۔ ہمیں بتائیں کہ آپ کو کیا چاہیے، اور ہم آپ کی رہنمائی کریں گے۔",
        aboutLink: "ہم سے بات کریں",
        contactKicker: "ہماری دکان",
        contactTitle: "ہم آپ کی مدد کے لیے حاضر ہیں۔",
        contactInfo:
          "مصنوعات کی دستیابی یا مرمت کے بارے میں پوچھنا ہو تو ہمیں واٹس ایپ پر پیغام بھیجیں۔",
        location: "پتہ",
        hours: "دکان",
        hoursInfo: "دورے سے پہلے وقت کی تصدیق کے لیے رابطہ کریں",
        footer: "تمام حقوق محفوظ ہیں۔",
      }
    : {
        home: "Home",
        parts: "Spare Parts",
        machines: "Machines",
        about: "About Us",
        contact: "Contact",
        posts: "Posts",
        search: "Search",
        heroKicker: "Your trusted partner in Gojra, Pakistan",
        headline: "Everything your",
        highlight: "sewing needs.",
        intro:
          "Sewing machine parts, new and pre-owned machines, and repair services — all in one place.",
        browse: "Explore spare parts",
        whatsapp: "Contact on WhatsApp",
        trust1: "Quality machine parts",
        trust2: "New & used machines",
        trust3: "Repair services",
        trust4: "Based in Gojra",
        catalogKicker: "What we offer",
        catalogTitle: "What are you looking for?",
        catalogIntro:
          "Choose the section that fits your needs. Not sure? Just ask — we're happy to help.",
        viewDetails: "Explore",
        productsKicker: "From our shop",
        productsTitle: "Available products",
        productsIntro:
          "Our product catalogue is being prepared. Get in touch to ask about what you need.",
        noProducts: "Catalogue coming soon",
        noProductsInfo:
          "We’re preparing our product listings. Contact us directly for availability and pricing.",
        aboutKicker: "Riaz Salai Machine",
        aboutTitle: "The right machine and the right help for your work.",
        aboutText:
          "We offer sewing machine spare parts, new and used machines, and repair services in Gojra. Tell us what you need and we’ll help you find the right option.",
        aboutLink: "Talk to our team",
        contactKicker: "Visit or get in touch",
        contactTitle: "We’re here to help.",
        contactInfo:
          "Ask about product availability or repairs. Send us a message on WhatsApp and we’ll get back to you.",
        location: "Our location",
        hours: "Store hours",
        hoursInfo: "Message us to confirm a good time to visit",
        footer: "All rights reserved.",
      };

  const categories = [
    {
      title: isUrdu ? "مشین کے پرزے" : "Spare Parts",
      description: isUrdu
        ? "مختلف سلائی مشینوں کے پرزوں کی تلاش کریں۔"
        : "Browse parts for different sewing machines.",
      imageNumber: "01",
      href: "/spare-parts",
    },
    {
      title: isUrdu ? "نئی مشینیں" : "New Machines",
      description: isUrdu
        ? "اپنے کام کے لیے نئی سلائی مشینیں دیکھیں۔"
        : "Explore new sewing machines for your work.",
      imageNumber: "02",
      href: "/new-machines",
    },
    {
      title: isUrdu ? "استعمال شدہ مشینیں" : "Used Machines",
      description: isUrdu
        ? "استعمال شدہ مشینوں کی دستیابی معلوم کریں۔"
        : "Ask us about current pre-owned machines.",
      imageNumber: "03",
      href: "/old-machines",
    },
    {
      title: isUrdu ? "مرمت کی خدمت" : "Repair Service",
      description: isUrdu
        ? "اپنی سلائی مشین کی مرمت کے بارے میں بات کریں۔"
        : "Talk to us about sewing machine repairs.",
      imageNumber: "04",
      href: "/repairing",
    },
  ];
  const categoryIcons = [PackageOpen, Cog, RotateCcw, Wrench];

  return (
    <div className="site-shell" dir={isUrdu ? "rtl" : "ltr"}>
      <div className="announcement">
        <span>{isUrdu ? "گوجرہ، مین بازار میں واقع" : "Proudly serving Gojra, Main Bazar"}</span>
        <span aria-hidden="true">·</span>
        <BusinessWhatsAppLink message="Hello Riaz Salai Machine, I have a question.">
          {isUrdu ? "واٹس ایپ پر پیغام بھیجیں" : "Message us on WhatsApp"}
        </BusinessWhatsAppLink>
      </div>

      <SitePageHeader />

      <main>
        <section className="hero" id="home" style={settings.banner_image_url ? { backgroundImage: `linear-gradient(90deg, rgba(20, 26, 22, 0.82) 0%, rgba(20, 26, 22, 0.65) 45%, rgba(20, 26, 22, 0.1) 100%), url("${settings.banner_image_url}")` } : undefined}>
          <div className="hero-copy">
            <span className="eyebrow">{text.heroKicker}</span>
            <h1>
              {isUrdu
                ? settings.banner_heading_ur || `${text.headline} ${text.highlight}`
                : settings.banner_heading_en || `${text.headline} ${text.highlight}`}
            </h1>
            <p>{isUrdu ? settings.banner_description_ur || text.intro : settings.banner_description_en || text.intro}</p>
            <div className="hero-buttons">
              <a className="button-light" href="/spare-parts">
                {text.browse}
                {isUrdu ? <ArrowLeft size={15} /> : <ArrowRight size={15} />}
              </a>
              <a className="button-outline" href="/contact">
                <MessageCircle size={15} />
                {text.contact}
              </a>
            </div>
          </div>
          {!settings.banner_image_url && (
            <div className="hero-visual" aria-hidden="true">
              <div className="hero-visual-orbit">
                <Cog size={174} strokeWidth={0.75} />
              </div>
              <div className="hero-visual-card">
                <PackageOpen size={26} strokeWidth={1.4} />
                <span>{isUrdu ? "پرزے · مشینیں · مرمت" : "PARTS · MACHINES · REPAIR"}</span>
              </div>
              <span className="hero-visual-mark">RIAZ SALAI MACHINE · GOJRA</span>
            </div>
          )}
          <a className="hero-note" href="#catalog">
            {isUrdu ? "دیکھنے کے لیے نیچے جائیں" : "Scroll to discover"}
            <ArrowDown size={13} />
          </a>
        </section>

        <section className="trust-strip" aria-label="Our services">
          <div className="trust-item"><PackageOpen size={19} /><span>{text.trust1}</span></div>
          <div className="trust-item"><BadgeCheck size={19} /><span>{text.trust2}</span></div>
          <div className="trust-item"><Wrench size={19} /><span>{text.trust3}</span></div>
          <div className="trust-item"><MapPin size={19} /><span>{text.trust4}</span></div>
        </section>

        <section className="section" id="catalog">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{text.catalogKicker}</span>
              <h2>{text.catalogTitle}</h2>
            </div>
            <p>{text.catalogIntro}</p>
          </div>
          <div className="category-grid">
            {categories.map((category, index) => {
              const CategoryIcon = categoryIcons[index];
              return (
                <a className="category-card" href={category.href} key={category.imageNumber}>
                  <span className="category-visual" aria-hidden="true">
                    <CategoryIcon size={48} strokeWidth={1.15} />
                    <span>{category.imageNumber}</span>
                  </span>
                  <span className="category-number">{category.imageNumber} / 04</span>
                  <h3>{category.title}</h3>
                  <p>{category.description}</p>
                  <span className="category-link">
                    {text.viewDetails}
                    {isUrdu ? <ArrowLeft size={14} /> : <ChevronRight size={14} />}
                  </span>
                </a>
              );
            })}
          </div>
          <div className="category-highlights-block">
            <div className="category-highlights-heading">
              <span className="section-kicker">{isUrdu ? "مشین کی اقسام" : "Shop by category"}</span>
              <p>{isUrdu ? "دستیاب اقسام میں سے اپنی ضرورت منتخب کریں۔" : "Explore the active categories listed by the shop."}</p>
            </div>
            <CategoryHighlights />
          </div>
        </section>

        <section className="section products-section" id="products">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{text.productsKicker}</span>
              <h2>{text.productsTitle}</h2>
            </div>
            <p>{text.productsIntro}</p>
          </div>
          <LatestProducts />
        </section>

        <LatestPosts />

        <section className="story-panel" id="about">
          <div className="story-image" role="img" aria-label={isUrdu ? "سلائی مشین کے کام کی علامتی تصویر" : "Illustration representing sewing machine work"}>
            <div className="story-visual" aria-hidden="true">
              <Cog size={126} strokeWidth={0.8} />
              <Wrench size={58} strokeWidth={1} />
              <span>{isUrdu ? "سلائی مشین · پرزے · مرمت" : "SEWING MACHINES · PARTS · REPAIR"}</span>
            </div>
          </div>
          <div className="story-copy">
            <span className="eyebrow">{text.aboutKicker}</span>
            <h2>{text.aboutTitle}</h2>
            <p>{isUrdu ? settings.body_ur || text.aboutText : settings.body_en || text.aboutText}</p>
            <a className="text-link" href="#contact">
              {text.aboutLink} {isUrdu ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
            </a>
          </div>
        </section>

        <section className="home-bottom-banner" aria-label={isUrdu ? "سلائی مشین کے پرزے اور مرمت" : "Sewing machine parts and repair"}>
          {settings.bottom_banner_image_url
            ? <Image className="home-bottom-banner-image" src={settings.bottom_banner_image_url} alt="" fill sizes="100vw" unoptimized />
            : <div className="home-bottom-banner-fallback" aria-hidden="true"><Cog size={76} strokeWidth={0.8} /><span>RIAZ SALAI MACHINE · GOJRA</span></div>}
          <div className="home-bottom-banner-copy">
            <span className="eyebrow">{isUrdu ? "ریاض سلائی مشین · گوجرہ" : "RIAZ SALAI MACHINE · GOJRA"}</span>
            <h2>{isUrdu ? "پرزوں یا مرمت کے بارے میں پوچھیں" : "Need a machine part or repair?"}</h2>
            <BusinessWhatsAppLink className="button-light" message="Hello Riaz Salai Machine, I would like to ask about sewing machine parts or repair.">
              <MessageCircle size={15} />
              {isUrdu ? "واٹس ایپ پر رابطہ کریں" : "Ask us on WhatsApp"}
            </BusinessWhatsAppLink>
          </div>
        </section>

        <section className="section contact-section" id="contact">
          <div>
            <span className="section-kicker">{text.contactKicker}</span>
            <h2>{text.contactTitle}</h2>
            <p>{text.contactInfo}</p>
            <BusinessWhatsAppLink
              className="button-primary"
              message="Hello Riaz Salai Machine, I would like to ask about your products or services."
            >
              <MessageCircle size={15} />
              {text.whatsapp}
            </BusinessWhatsAppLink>
          </div>
          <div className="contact-details">
            <div className="contact-detail">
              <MapPin size={18} />
              <div><strong>{text.location}</strong><span>{isUrdu ? settings.address_ur || settings.address : settings.address}</span></div>
            </div>
            <div className="contact-detail">
              <Phone size={18} />
              <div><strong>WhatsApp</strong><BusinessWhatsAppLink message="Hello Riaz Salai Machine, I would like to contact the shop.">{settings.whatsapp_number}</BusinessWhatsAppLink></div>
            </div>
            <div className="contact-detail">
              <Clock3 size={18} />
              <div><strong>{text.hours}</strong><span>{text.hoursInfo}</span></div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <BusinessWhatsAppLink
        className="floating-whatsapp"
        message="Hello Riaz Salai Machine, I would like to ask about your products."
        ariaLabel={isUrdu ? "ریاض سلائی مشین سے واٹس ایپ پر رابطہ کریں" : "Contact Riaz Salai Machine on WhatsApp"}
      >
        <MessageCircle size={18} />
        {text.whatsapp}
      </BusinessWhatsAppLink>
    </div>
  );
}
