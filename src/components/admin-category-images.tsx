"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminImageControl } from "@/components/admin-image-control";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { removeUnreferencedBusinessMedia } from "@/lib/storage-images";

type CategoryImage = { id: string; name_en: string; name_ur: string; image_url: string | null };

function categoryImagePath(categoryId: string, file: File) {
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  return `categories/${categoryId}/${crypto.randomUUID()}.${extension}`;
}

export function AdminCategoryImages() {
  const [categories, setCategories] = useState<CategoryImage[]>([]);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: loadError } = await createSupabaseBrowserClient()
        .from("categories")
        .select("id,name_en,name_ur,image_url")
        .order("display_order");
      if (loadError) throw loadError;
      setCategories((data ?? []) as CategoryImage[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Category ki tasveerain load nahi ho sakin.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Supabase results update state only after the asynchronous requests complete.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function removeOldImageIfUnreferenced(category: CategoryImage) {
    if (!category.image_url) return;
    await removeUnreferencedBusinessMedia(
      createSupabaseBrowserClient(),
      category.image_url,
      `categories/${category.id}/`,
    );
  }

  async function saveImage(category: CategoryImage) {
    const file = files[category.id];
    if (!file) return;
    setBusyId(category.id);
    setError("");
    setNotice("");
    let uploadedPath = "";
    try {
      const supabase = createSupabaseBrowserClient();
      uploadedPath = categoryImagePath(category.id, file);
      const { error: uploadError } = await supabase.storage.from("business-media").upload(uploadedPath, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("business-media").getPublicUrl(uploadedPath);
      const { error: saveError } = await supabase.from("categories").update({ image_url: publicUrl.publicUrl }).eq("id", category.id);
      if (saveError) throw saveError;
      setCategories((current) => current.map((item) => item.id === category.id ? { ...item, image_url: publicUrl.publicUrl } : item));
      setFiles((current) => {
        const next = { ...current };
        delete next[category.id];
        return next;
      });
      try {
        await removeOldImageIfUnreferenced(category);
        setNotice("Category ki tasveer mehfooz ho gayi.");
      } catch {
        setNotice("Nayi category tasveer mehfooz ho gayi; purani file khud delete nahi ho saki. Support se rabta karein.");
      }
    } catch (saveError) {
      if (uploadedPath) {
        const { error: cleanupError } = await createSupabaseBrowserClient().storage.from("business-media").remove([uploadedPath]);
        if (cleanupError) {
          setError(`Tasveer mehfooz nahi hui, aur nayi upload file saaf nahi ho saki: ${cleanupError.message}`);
          setBusyId("");
          return;
        }
      }
      setError(saveError instanceof Error ? saveError.message : "Category ki tasveer mehfooz nahi ho saki.");
    } finally {
      setBusyId("");
    }
  }

  async function removeImage(category: CategoryImage) {
    if (!category.image_url || !window.confirm(`"${category.name_en}" ki tasveer hata dein? Category aur products delete nahi honge.`)) return;
    setBusyId(category.id);
    setError("");
    setNotice("");
    try {
      const { error: updateError } = await createSupabaseBrowserClient()
        .from("categories")
        .update({ image_url: null })
        .eq("id", category.id);
      if (updateError) throw updateError;
      setCategories((current) => current.map((item) => item.id === category.id ? { ...item, image_url: null } : item));
      try {
        await removeOldImageIfUnreferenced(category);
        setNotice("Category ki tasveer hata di gayi; website par default placeholder dikhai dega.");
      } catch {
        setNotice("Category ki tasveer website se hata di gayi, lekin purani file saaf nahi ho saki. Support se rabta karein.");
      }
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Category ki tasveer nahi hat saki.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="admin-panel admin-category-image-manager">
      <div className="admin-category-image-heading">
        <div>
          <h2>Homepage Category Card Ki Tasveerain</h2>
          <p>Har category ki tasveer alag mehfooz karein. Tasveer na ho to homepage par saaf default icon dikhai dega.</p>
        </div>
        <button type="button" className="admin-secondary-button" onClick={() => void load()} disabled={loading || Boolean(busyId)}>Nayi Categories Dekhein</button>
      </div>
      {error && <p className="form-notice" role="alert">{error}</p>}
      {notice && <p className="form-success" role="status">{notice}</p>}
      {loading ? <p>Categories load ho rahi hain…</p> : !categories.length ? <p>Abhi koi category mojood nahi.</p> : (
        <div className="admin-category-image-list">
          {categories.map((category) => (
            <article key={category.id} className="admin-category-image-row">
              <div className="admin-category-image-name">
                <strong>{category.name_en}</strong>
                {category.name_ur && <span lang="ur" dir="rtl">{category.name_ur}</span>}
              </div>
              <AdminImageControl
                label="Category Card"
                imageUrl={category.image_url ?? ""}
                file={files[category.id]}
                disabled={Boolean(busyId)}
                onSelect={(file) => setFiles((current) => ({ ...current, [category.id]: file }))}
                onRemove={() => {
                  if (files[category.id]) {
                    setFiles((current) => {
                      const next = { ...current };
                      delete next[category.id];
                      return next;
                    });
                    return;
                  }
                  void removeImage(category);
                }}
                onInvalid={setError}
              />
              {files[category.id] && (
                <button type="button" className="button-primary" disabled={Boolean(busyId)} onClick={() => void saveImage(category)}>
                  {busyId === category.id ? "Tasveer upload ho rahi hai…" : "Tabdeeliyan Mehfooz Karein"}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
