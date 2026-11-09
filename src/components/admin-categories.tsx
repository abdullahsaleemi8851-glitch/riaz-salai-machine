"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AdminSubcategories } from "@/components/admin-subcategories";

type Category = {
  id: string;
  slug: string;
  name_en: string;
  name_ur: string;
  description_en: string;
  description_ur: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
};

const blank = {
  name_en: "", name_ur: "", description_en: "", description_ur: "",
  image_url: "", display_order: "0", is_active: true,
};

function toSlug(name: string) {
  return name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, error: loadError } = await createSupabaseBrowserClient()
        .from("categories")
        .select("id,slug,name_en,name_ur,description_en,description_ur,image_url,display_order,is_active")
        .order("display_order");
      if (loadError) throw loadError;
      setCategories((data ?? []) as Category[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Product ki qisamain load nahi ho sakin.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Supabase results update state only after the asynchronous requests complete.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  function setField<K extends keyof typeof blank>(key: K, value: (typeof blank)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!form.name_en.trim()) {
      setError("Product ki qisam ka English naam likhein.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const payload = {
        name_en: form.name_en.trim(),
        name_ur: form.name_ur.trim(),
        description_en: form.description_en.trim(),
        description_ur: form.description_ur.trim(),
        image_url: form.image_url.trim() || null,
        display_order: Number(form.display_order) || 0,
        is_active: form.is_active,
      };
      const result = editing
        ? await supabase.from("categories").update(payload).eq("id", editing).select("id").single()
        : await supabase.from("categories").insert({ ...payload, slug: toSlug(form.name_en) || crypto.randomUUID() }).select("id").single();
      if (result.error) throw result.error;
      if (imageFile) {
        const categoryId = result.data.id as string;
        const supabaseImage = createSupabaseBrowserClient();
        const ext = imageFile.type === "image/jpeg" ? "jpg" : imageFile.type.split("/")[1];
        const path = `categories/${categoryId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabaseImage.storage.from("business-media").upload(path, imageFile, { contentType: imageFile.type });
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabaseImage.storage.from("business-media").getPublicUrl(path);
        const { error: imageSaveError } = await supabaseImage.from("categories").update({ image_url: publicUrl.publicUrl }).eq("id", categoryId);
        if (imageSaveError) throw imageSaveError;
      }
      setNotice(editing ? "Product ki qisam tabdeel ho gayi." : "Nayi product qisam ban gayi.");
      setForm(blank);
      setEditing("");
      setImageFile(null);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Product ki qisam mehfooz nahi ho saki.");
    } finally {
      setBusy(false);
    }
  }

  async function edit(category: Category) {
    setEditing(category.id);
    setForm({
      name_en: category.name_en,
      name_ur: category.name_ur,
      description_en: category.description_en,
      description_ur: category.description_ur,
      image_url: category.image_url ?? "",
      display_order: String(category.display_order),
      is_active: category.is_active,
    });
    setImageFile(null);
    document.getElementById("category-form")?.scrollIntoView({ behavior: "smooth" });
  }

  async function remove(category: Category) {
    const supabase = createSupabaseBrowserClient();
    const { count, error: countError } = await supabase
      .from("product_categories")
      .select("product_id", { count: "exact", head: true })
      .eq("category_id", category.id);
    if (countError) {
      setError(countError.message);
      return;
    }
    const impact = count ? ` Is se ${count} product ka category se taalluq khatam hoga, product delete nahi hoga.` : "";
    if (!window.confirm(`"${category.name_en}" qisam delete karein?${impact}`)) return;
    setError("");
    setNotice("");
    const { error: deleteError } = await supabase.from("categories").delete().eq("id", category.id);
    if (deleteError) {
      setError(`Qisam delete nahi ho saki: ${deleteError.message}`);
      return;
    }
    if (editing === category.id) {
      setEditing("");
      setForm(blank);
      setImageFile(null);
    }
    setNotice("Product ki qisam delete ho gayi. Products mehfooz hain.");
    await load();
  }

  return (
    <main>
      <div className="admin-page-heading">
        <div><p className="admin-eyebrow">PRODUCT KI QISMAIN</p><h1>Product Ki Qisam</h1></div>
        <button className="admin-outline-button" type="button" onClick={() => { setEditing(""); setForm(blank); }}>Nayi Qisam Banayein</button>
      </div>
      {notice && <p className="form-success" role="status">{notice}</p>}
      {error && <p className="form-notice" role="alert">{error}</p>}
      <section className="admin-panel" id="category-form">
        <p className="admin-eyebrow">{editing ? "QISAM TABDEEL KAREIN" : "NAYI QISAM"}</p>
        <h2>{editing ? "Qisam Ki Maloomat Tabdeel Karein" : "Product Ki Nayi Qisam Banayein"}</h2>
        <form className="admin-form" onSubmit={save}>
          <div className="admin-form-grid">
            <label>Qisam Ka Naam (English)<input required maxLength={120} value={form.name_en} onChange={(event) => setField("name_en", event.target.value)} /><small className="admin-help">Website par dikhane ke liye English naam likhein.</small></label>
            <label>Qisam Ka Naam (Urdu)<input lang="ur" dir="rtl" maxLength={120} value={form.name_ur} onChange={(event) => setField("name_ur", event.target.value)} /><small className="admin-help">Urdu naam mojood ho to likhein.</small></label>
            <label>Tafseel (English)<textarea maxLength={2000} value={form.description_en} onChange={(event) => setField("description_en", event.target.value)} /></label>
            <label>Tafseel (Urdu)<textarea lang="ur" dir="rtl" value={form.description_ur} onChange={(event) => setField("description_ur", event.target.value)} /></label>
            <label>Tasveer Ka Link<input type="url" value={form.image_url} onChange={(event) => setField("image_url", event.target.value)} /></label>
            <label>Qisam Ki Tasveer Upload Karein (JPG, PNG, WebP; 5 MB tak)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (file && (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
                setError("JPG, PNG ya WebP tasveer chunain jo 5 MB se bari na ho.");
                event.target.value = "";
                setImageFile(null);
                return;
              }
              setImageFile(file);
            }} /></label>
            <label>Website Par Tarteeeb<input type="number" step="1" value={form.display_order} onChange={(event) => setField("display_order", event.target.value)} /></label>
            <label className="admin-check"><input type="checkbox" checked={form.is_active} onChange={(event) => setField("is_active", event.target.checked)} /> Website Par Qisam Dikhayein</label>
          </div>
          <div className="admin-actions">
            <button className="button-primary" type="submit" disabled={busy}>{busy ? "Mehfooz ho raha hai…" : editing ? "Tabdeeli Mehfooz Karein" : "Qisam Banayein"}</button>
            {editing && <button className="admin-secondary-button" type="button" onClick={() => { setEditing(""); setForm(blank); setImageFile(null); }}>Mansookh Karein</button>}
          </div>
        </form>
      </section>
      <section className="admin-table-panel" style={{ marginTop: 22 }}>
        <h2>Tamam Product Ki Qisamain</h2>
        {loading ? <p>Qisamain load ho rahi hain…</p> : !categories.length ? <p>Abhi koi qisam nahi bani.</p> : (
          <div className="admin-list">
            {categories.map((category) => (
              <article className="admin-list-item" key={category.id}>
                <div>
                  {category.image_url && <img className="category-admin-thumb" src={category.image_url} alt="" />}
                  <strong>{category.name_en}</strong><span>{category.name_ur || "Urdu naam nahi diya"} · Tarteeb {category.display_order} · {category.is_active ? "Website par nazar aa rahi hai" : "Chhupi hui hai"}</span>
                  <AdminSubcategories category={category} />
                </div>
                <div className="admin-actions">
                  <button type="button" onClick={() => void edit(category)}>Tabdeel Karein</button>
                  <button type="button" className="danger" onClick={() => void remove(category)}>Delete Karein</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
