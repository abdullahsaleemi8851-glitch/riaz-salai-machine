"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type PublicSettings = {
  business_name: string;
  logo_text: string;
  logo_url: string;
  whatsapp_number: string;
  phone_number: string;
  email: string;
  address: string;
  address_ur: string;
  maps_url: string;
  instagram_url: string;
  banner_heading_en: string;
  banner_heading_ur: string;
  banner_description_en: string;
  banner_description_ur: string;
  banner_image_url: string;
  bottom_banner_image_url: string;
  body_en: string;
  body_ur: string;
  footer_en: string;
  footer_ur: string;
};

const defaults: PublicSettings = {
  business_name: "Riaz Salai Machine",
  logo_text: "RIAZ SALAI MACHINE",
  logo_url: "",
  whatsapp_number: "03280070651",
  phone_number: "",
  email: "riaz.sewing.machine.gojra@gmail.com",
  address: "Near Bara Imambargah, Main Bazar, Gojra, Pakistan.",
  address_ur: "بارہ امام بارگاہ کے قریب، مین بازار، گوجرہ، پاکستان",
  maps_url: "",
  instagram_url: "",
  banner_heading_en: "",
  banner_heading_ur: "",
  banner_description_en: "",
  banner_description_ur: "",
  banner_image_url: "",
  bottom_banner_image_url: "",
  body_en: "",
  body_ur: "",
  footer_en: "",
  footer_ur: "",
};

const PublicSettingsContext = createContext<PublicSettings>(defaults);

export function PublicSettingsProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, setSettings] = useState(defaults);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error } = await createSupabaseBrowserClient()
          .from("public_website_settings")
          .select("key,value")
          .in("key", ["business", "home", "about"]);
        if (error) throw error;
        const values = Object.fromEntries((data ?? []).map((row) => [row.key, row.value as Record<string, string>]));
        if (active) {
          setSettings({
            ...defaults,
            ...(values.business ?? {}),
            ...(values.home ?? {}),
            ...(values.about ?? {}),
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") console.error("Could not load public website settings:", error);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const value = useMemo(() => settings, [settings]);
  return <PublicSettingsContext.Provider value={value}>{children}</PublicSettingsContext.Provider>;
}

export function usePublicSettings() {
  return useContext(PublicSettingsContext);
}
