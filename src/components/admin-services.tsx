"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Service = {
  id: string;
  title_en: string;
  title_ur: string;
  description_en: string;
  description_ur: string;
  display_order: number;
  is_published: boolean;
};
type ServiceImage = { id: string; service_id: string; storage_path: string; display_order: number };

const blank = { title_en: "", title_ur: "", description_en: "", description_ur: "", display_order: "0", is_published: true };

export function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [images, setImages] = useState<ServiceImage[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);

  const load = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const [serviceResult, imageResult] = await Promise.all([
        supabase.from("services").select("id,title_en,title_ur,description_en,description_ur,display_order,is_published").order("display_order"),
        supabase.from("service_images").select("id,service_id,storage_path,display_order").order("display_order"),
      ]);
      if (serviceResult.error || imageResult.error) throw serviceResult.error || imageResult.error;
      setServices((serviceResult.data ?? []) as Service[]);
      setImages((imageResult.data ?? []) as ServiceImage[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Repairing services load nahi ho sakin.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Supabase results update state only after the asynchronous requests complete.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const payload = {
      title_en: form.title_en.trim(),
      title_ur: form.title_ur.trim(),
      description_en: form.description_en.trim(),
      description_ur: form.description_ur.trim(),
      display_order: Number(form.display_order) || 0,
      is_published: form.is_published,
    };
    if (!payload.title_en) {
      setError("Service ka English naam likhein.");
      return;
    }
    const invalid = files.find((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) {
      setError("Service ki tasveer JPG, PNG ya WebP ho aur 5 MB se bari na ho.");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const result = editing
      ? await supabase.from("services").update(payload).eq("id", editing).select("id").single()
      : await supabase.from("services").insert(payload).select("id").single();
    if (result.error) {
      setError(result.error.message);
      return;
    }
    const serviceId = result.data.id as string;
    const previousCount = images.filter((image) => image.service_id === serviceId).length;
    for (const [index, file] of files.entries()) {
      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const path = `services/${serviceId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("business-media").upload(path, file, { contentType: file.type });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      const { error: imageError } = await supabase.from("service_images").insert({
        service_id: serviceId, storage_path: path, display_order: previousCount + index,
      });
      if (imageError) {
        await supabase.storage.from("business-media").remove([path]);
        setError(imageError.message);
        return;
      }
    }
    setNotice(editing ? "Repairing service tabdeel ho gayi." : "Nayi repairing service shamil ho gayi.");
    setEditing("");
    setForm(blank);
    setFiles([]);
    await load();
  }

  function edit(service: Service) {
    setEditing(service.id);
    setForm({
      title_en: service.title_en,
      title_ur: service.title_ur,
      description_en: service.description_en,
      description_ur: service.description_ur,
      display_order: String(service.display_order),
      is_published: service.is_published,
    });
    setFiles([]);
  }

  async function remove(service: Service) {
    if (!window.confirm(`"${service.title_en}" service delete karein?`)) return;
    const supabase = createSupabaseBrowserClient();
    const { data: serviceImages, error: listError } = await supabase.from("service_images").select("storage_path").eq("service_id", service.id);
    if (listError) {
      setError(listError.message);
      return;
    }
    if (serviceImages?.length) {
      const { error: storageError } = await supabase.storage.from("business-media").remove(serviceImages.map((image) => image.storage_path));
      if (storageError) {
        setError(storageError.message);
        return;
      }
    }
    const { error: deleteError } = await supabase.from("services").delete().eq("id", service.id);
    if (deleteError) setError(deleteError.message);
    else {
      if (editing === service.id) {
        setEditing("");
        setForm(blank);
        setFiles([]);
      }
      setNotice("Repairing service delete ho gayi.");
      await load();
    }
  }

  async function removeImage(image: ServiceImage) {
    if (!window.confirm("Service ki yeh tasveer hata dein?")) return;
    const supabase = createSupabaseBrowserClient();
    const { error: storageError } = await supabase.storage.from("business-media").remove([image.storage_path]);
    if (storageError) {
      setError(storageError.message);
      return;
    }
    const { error: rowError } = await supabase.from("service_images").delete().eq("id", image.id);
    if (rowError) setError(rowError.message);
    else setImages((current) => current.filter((item) => item.id !== image.id));
  }

  return (
    <main>
      <div className="admin-page-heading"><div><p className="admin-eyebrow">DUKAAN KI KHIDMAAT</p><h1>Repairing Services</h1></div></div>
      {notice && <p className="form-success" role="status">{notice}</p>}
      {error && <p className="form-notice" role="alert">{error}</p>}
      <section className="admin-panel">
        <h2>{editing ? "Service Tabdeel Karein" : "Nayi Repairing Service Shamil Karein"}</h2>
        <form className="admin-form" onSubmit={save}>
          <div className="admin-form-grid">
            <label>Service Ka Naam (English)<input required value={form.title_en} onChange={(event) => setForm({ ...form, title_en: event.target.value })} /></label>
            <label>Service Ka Naam (Urdu)<input lang="ur" dir="rtl" value={form.title_ur} onChange={(event) => setForm({ ...form, title_ur: event.target.value })} /></label>
            <label>Tafseel (English)<textarea value={form.description_en} onChange={(event) => setForm({ ...form, description_en: event.target.value })} /></label>
            <label>Tafseel (Urdu)<textarea lang="ur" dir="rtl" value={form.description_ur} onChange={(event) => setForm({ ...form, description_ur: event.target.value })} /></label>
            <label>Website Par Tarteeeb<input type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: event.target.value })} /></label>
            <label className="wide">Service Ki Tasveerain (JPG, PNG, WebP; 5 MB tak)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /><small className="admin-help">Aik ya zyada tasveerain chun sakte hain.</small></label>
            <label className="admin-check"><input type="checkbox" checked={form.is_published} onChange={(event) => setForm({ ...form, is_published: event.target.checked })} /> Service Website Par Dikhayein</label>
          </div>
          <div className="admin-actions"><button className="button-primary">{editing ? "Tabdeeli Mehfooz Karein" : "Service Mehfooz Karein"}</button>{editing && <button className="admin-secondary-button" type="button" onClick={() => { setEditing(""); setForm(blank); }}>Mansookh Karein</button>}</div>
          {editing && <div className="admin-image-list">{images.filter((image) => image.service_id === editing).map((image) => {
            const url = createSupabaseBrowserClient().storage.from("business-media").getPublicUrl(image.storage_path).data.publicUrl;
            return <div key={image.id}><img src={url} alt="" /><button type="button" className="danger" onClick={() => void removeImage(image)}>Tasveer Hataein</button></div>;
          })}</div>}
        </form>
      </section>
      <section className="admin-table-panel" style={{ marginTop: 22 }}>
        <h2>Tamam Repairing Services</h2>
        {loading ? <p>Services load ho rahi hain…</p> : !services.length ? <p>Abhi koi repairing service shamil nahi ki.</p> : <div className="admin-list">{services.map((service) => (
          <article className="admin-list-item" key={service.id}>
            <div><strong>{service.title_en}</strong><span>{service.is_published ? "Website par hai" : "Chhupi hui hai"} · Tarteeb {service.display_order}</span></div>
            <div className="admin-actions"><button type="button" onClick={() => edit(service)}>Tabdeel Karein</button><button type="button" className="danger" onClick={() => void remove(service)}>Delete Karein</button></div>
          </article>
        ))}</div>}
      </section>
    </main>
  );
}
