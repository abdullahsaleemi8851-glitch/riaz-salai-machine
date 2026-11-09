"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AdminImageControl } from "@/components/admin-image-control";
import { AdminCategoryImages } from "@/components/admin-category-images";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { removeUnreferencedBusinessMedia } from "@/lib/storage-images";

type SettingsForm = {
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
  about_en: string;
  about_ur: string;
  footer_en: string;
  footer_ur: string;
};

const initial: SettingsForm = {
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
  banner_heading_en: "Your Trusted Partner for Sewing Machines and Spare Parts",
  banner_heading_ur: "سلائی مشینوں اور پرزوں کے لیے آپ کا قابلِ اعتماد ساتھی",
  banner_description_en: "",
  banner_description_ur: "",
  banner_image_url: "",
  bottom_banner_image_url: "",
  about_en: "",
  about_ur: "",
  footer_en: "",
  footer_ur: "",
};

export function AdminSettings() {
  const [form, setForm] = useState(initial);
  const [imageFiles, setImageFiles] = useState<Partial<Record<"logo_url" | "banner_image_url" | "bottom_banner_image_url", File>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const savedImageUrls = useRef({ logo_url: "", banner_image_url: "", bottom_banner_image_url: "" });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error: loadError } = await createSupabaseBrowserClient().from("website_settings").select("key,value");
        if (loadError) throw loadError;
        const values = Object.fromEntries((data ?? []).map((row) => [row.key, row.value as Record<string, string>]));
        if (active) {
          const loadedForm = {
            ...initial,
            ...(values.business ?? {}),
            ...(values.home ?? {}),
            ...(values.about ?? {}),
          };
          setForm(loadedForm);
          savedImageUrls.current = {
            logo_url: loadedForm.logo_url,
            banner_image_url: loadedForm.banner_image_url,
            bottom_banner_image_url: loadedForm.bottom_banner_image_url,
          };
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Website ki settings load nahi ho sakin.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  function setField<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseSettingImage(field: "logo_url" | "banner_image_url" | "bottom_banner_image_url", file: File) {
    setError("");
    setImageFiles((current) => ({ ...current, [field]: file }));
  }

  function removeSettingImage(field: "logo_url" | "banner_image_url" | "bottom_banner_image_url") {
    const file = imageFiles[field];
    if (form[field] && !window.confirm("Yeh tasveer website se hata dein? Tabdeeliyan mehfooz karne ke baad hi tasveer hatayi jayegi.")) return;
    if (file && !form[field] && !window.confirm("Upload ke liye chuni hui tasveer hata dein?")) return;
    setField(field, "");
    setImageFiles((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!/^[+\d\s().-]{7,30}$/.test(form.whatsapp_number)) {
      setError("WhatsApp ka durust number likhein.");
      return;
    }
    if (form.maps_url && !validWebUrl(form.maps_url)) {
      setError("Maps ka link durust HTTPS address hona chahiye.");
      return;
    }
    if (form.instagram_url && !validWebUrl(form.instagram_url)) {
      setError("Instagram ka link durust HTTPS address hona chahiye.");
      return;
    }
    if (form.logo_url && !validWebUrl(form.logo_url)) {
      setError("Logo tasveer ka link durust HTTPS address hona chahiye.");
      return;
    }
    if (form.banner_image_url && !validWebUrl(form.banner_image_url)) {
      setError("Banner tasveer ka link durust HTTPS address hona chahiye.");
      return;
    }
    if (form.bottom_banner_image_url && !validWebUrl(form.bottom_banner_image_url)) {
      setError("Neeche wale banner ki tasveer ka link durust HTTPS address hona chahiye.");
      return;
    }
    setBusy(true);
    const uploadedPaths: string[] = [];
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Admin login khatam ho gaya. Dobara login karein.");
      const nextImageUrls = {
        logo_url: form.logo_url,
        banner_image_url: form.banner_image_url,
        bottom_banner_image_url: form.bottom_banner_image_url,
      };
      const imageFields = Object.keys(imageFiles) as Array<keyof typeof imageFiles>;
      for (const [index, field] of imageFields.entries()) {
        const file = imageFiles[field];
        if (!file) continue;
        const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
        const path = `settings/${field}/${crypto.randomUUID()}.${extension}`;
        setUploadProgress(`Tasveer ${index + 1} / ${imageFields.length} upload ho rahi hai…`);
        const { error: uploadError } = await supabase.storage.from("business-media").upload(path, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        nextImageUrls[field] = supabase.storage.from("business-media").getPublicUrl(path).data.publicUrl;
      }
      const business = {
        business_name: form.business_name,
        logo_text: form.logo_text,
        logo_url: nextImageUrls.logo_url,
        whatsapp_number: form.whatsapp_number,
        phone_number: form.phone_number,
        email: form.email,
        address: form.address,
        address_ur: form.address_ur,
        maps_url: form.maps_url,
        instagram_url: form.instagram_url,
      };
      const home = {
        banner_heading_en: form.banner_heading_en,
        banner_heading_ur: form.banner_heading_ur,
        banner_description_en: form.banner_description_en,
        banner_description_ur: form.banner_description_ur,
        banner_image_url: nextImageUrls.banner_image_url,
        bottom_banner_image_url: nextImageUrls.bottom_banner_image_url,
      };
      const about = { body_en: form.about_en, body_ur: form.about_ur, footer_en: form.footer_en, footer_ur: form.footer_ur };
      const { error: saveError } = await supabase.from("website_settings").upsert([
        { key: "business", value: business, updated_by: user.id },
        { key: "home", value: home, updated_by: user.id },
        { key: "about", value: about, updated_by: user.id },
      ]);
      if (saveError) throw saveError;
      const previousUrls = savedImageUrls.current;
      const finalUrls = { ...nextImageUrls };
      const urlsStillReferenced = new Set(Object.values(finalUrls).filter(Boolean));
      const cleanupErrors: string[] = [];
      for (const field of Object.keys(previousUrls) as Array<keyof typeof previousUrls>) {
        const oldUrl = previousUrls[field];
        if (!oldUrl || oldUrl === finalUrls[field] || urlsStillReferenced.has(oldUrl)) continue;
        try {
          await removeUnreferencedBusinessMedia(supabase, oldUrl, `settings/${field}/`);
        } catch (removeError) {
          cleanupErrors.push(removeError instanceof Error ? removeError.message : "Purani tasveer nahi hat saki.");
        }
      }
      savedImageUrls.current = finalUrls;
      setForm((current) => ({ ...current, ...finalUrls }));
      setImageFiles({});
      setNotice("Website ki settings mehfooz ho gayi hain.");
      if (cleanupErrors.length) setError(`Settings mehfooz ho gayi hain, lekin purani tasveer saaf nahi ho saki: ${cleanupErrors.join("; ")}`);
    } catch (saveError) {
      const { error: cleanupError } = uploadedPaths.length
        ? await createSupabaseBrowserClient().storage.from("business-media").remove(uploadedPaths)
        : { error: null };
      const cleanupMessage = cleanupError ? ` Nayi upload tasveer saaf nahi ho saki: ${cleanupError.message}` : "";
      setError(`${saveError instanceof Error ? saveError.message : "Website ki settings mehfooz nahi ho sakin."}${cleanupMessage}`);
    } finally {
      setBusy(false);
      setUploadProgress("");
    }
  }

  return (
    <main>
      <div className="admin-page-heading"><div><p className="admin-eyebrow">PUBLIC WEBSITE</p><h1>Website Ki Settings</h1></div></div>
      {loading && <p>Settings load ho rahi hain…</p>}
      {notice && <p className="form-success" role="status">{notice}</p>}
      {error && <p className="form-notice" role="alert">{error}</p>}
      <form className="admin-panel admin-form" onSubmit={save}>
        <h2>Dukaan Ki Maloomat</h2>
        <div className="admin-form-grid">
          <label>Dukaan Ka Naam<input value={form.business_name} onChange={(event) => setField("business_name", event.target.value)} /></label>
          <label>Logo Par Likha Naam<input value={form.logo_text} onChange={(event) => setField("logo_text", event.target.value)} /></label>
          <div className="wide"><AdminImageControl label="Website Logo" imageUrl={form.logo_url} file={imageFiles.logo_url} disabled={busy || loading} onSelect={(file) => chooseSettingImage("logo_url", file)} onRemove={() => removeSettingImage("logo_url")} onInvalid={setError} /></div>
          <label>Logo Tasveer Ka Link<input type="url" value={form.logo_url} onChange={(event) => {
            if (form.logo_url && !event.target.value && !window.confirm("Logo tasveer hatayein?")) return;
            setField("logo_url", event.target.value);
          }} /></label>
          <label>WhatsApp Number<input required value={form.whatsapp_number} onChange={(event) => setField("whatsapp_number", event.target.value)} /></label>
          <label>Doosra Phone Number (Zaroori Nahi)<input value={form.phone_number} onChange={(event) => setField("phone_number", event.target.value)} /></label>
          <label>Email<input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} /></label>
          <label>Dukaan Ka Pata<input value={form.address} onChange={(event) => setField("address", event.target.value)} /></label>
          <label>Dukaan Ka Pata (Urdu)<input lang="ur" dir="rtl" value={form.address_ur} onChange={(event) => setField("address_ur", event.target.value)} /></label>
          <label>Google Maps Ka Link (Zaroori Nahi)<input type="url" placeholder="https://" value={form.maps_url} onChange={(event) => setField("maps_url", event.target.value)} /></label>
          <label>Instagram Ka Link (Zaroori Nahi)<input type="url" placeholder="https://" value={form.instagram_url} onChange={(event) => setField("instagram_url", event.target.value)} /></label>
        </div>
        <h2>Home Page Ka Banner</h2>
        <div className="admin-form-grid">
          <label>Unwan (English)<input value={form.banner_heading_en} onChange={(event) => setField("banner_heading_en", event.target.value)} /></label>
          <label>Unwan (Urdu)<input lang="ur" dir="rtl" value={form.banner_heading_ur} onChange={(event) => setField("banner_heading_ur", event.target.value)} /></label>
          <label>Tafseel (English)<textarea value={form.banner_description_en} onChange={(event) => setField("banner_description_en", event.target.value)} /></label>
          <label>Tafseel (Urdu)<textarea lang="ur" dir="rtl" value={form.banner_description_ur} onChange={(event) => setField("banner_description_ur", event.target.value)} /></label>
          <div className="wide"><AdminImageControl label="Homepage Ka Upar Wala Banner" imageUrl={form.banner_image_url} file={imageFiles.banner_image_url} disabled={busy || loading} onSelect={(file) => chooseSettingImage("banner_image_url", file)} onRemove={() => removeSettingImage("banner_image_url")} onInvalid={setError} /></div>
          <label>Banner Tasveer Ka Link<input type="url" value={form.banner_image_url} onChange={(event) => {
            if (form.banner_image_url && !event.target.value && !window.confirm("Upar wala banner hatayein?")) return;
            setField("banner_image_url", event.target.value);
          }} /></label>
        </div>
        <h2>Home Page Ka Neeche Wala Banner</h2>
        <p className="admin-help">Yeh banner upar wale banner se alag hai. Isay tabdeel karne se upar wala banner nahi badlega.</p>
        <div className="admin-form-grid">
          <div className="wide"><AdminImageControl label="Homepage Ka Neeche Wala Banner" imageUrl={form.bottom_banner_image_url} file={imageFiles.bottom_banner_image_url} disabled={busy || loading} onSelect={(file) => chooseSettingImage("bottom_banner_image_url", file)} onRemove={() => removeSettingImage("bottom_banner_image_url")} onInvalid={setError} /></div>
        </div>
        <h2>About Aur Footer Ki Maloomat</h2>
        <div className="admin-form-grid">
          <label>Hamare Bare Mein (English)<textarea value={form.about_en} onChange={(event) => setField("about_en", event.target.value)} /></label>
          <label>Hamare Bare Mein (Urdu)<textarea lang="ur" dir="rtl" value={form.about_ur} onChange={(event) => setField("about_ur", event.target.value)} /></label>
          <label>Website Ke Neeche Ka Matn (English)<textarea value={form.footer_en} onChange={(event) => setField("footer_en", event.target.value)} /></label>
          <label>Website Ke Neeche Ka Matn (Urdu)<textarea lang="ur" dir="rtl" value={form.footer_ur} onChange={(event) => setField("footer_ur", event.target.value)} /></label>
        </div>
        {uploadProgress && <p className="admin-help" role="status">{uploadProgress}</p>}
        <button className="button-primary" type="submit" disabled={busy || loading}>{busy ? "Mehfooz ho rahi hain…" : "Tabdeeliyan Mehfooz Karein"}</button>
      </form>
      <AdminCategoryImages />
    </main>
  );
}

function validWebUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
