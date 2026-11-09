"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Post = {
  id: string;
  slug: string;
  title_en: string;
  title_ur: string;
  body_en: string;
  body_ur: string;
  is_featured: boolean;
  is_published: boolean;
};
type PostImage = { id: string; post_id: string; storage_path: string; display_order: number };

const emptyPost = { title_en: "", title_ur: "", body_en: "", body_ur: "", is_featured: false, is_published: false };

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AdminPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [images, setImages] = useState<PostImage[]>([]);
  const [form, setForm] = useState(emptyPost);
  const [editing, setEditing] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const [postResult, imageResult] = await Promise.all([
        supabase.from("posts").select("id,slug,title_en,title_ur,body_en,body_ur,is_featured,is_published").order("created_at", { ascending: false }),
        supabase.from("post_images").select("id,post_id,storage_path,display_order").order("display_order"),
      ]);
      if (postResult.error || imageResult.error) throw postResult.error || imageResult.error;
      setPosts((postResult.data ?? []) as Post[]);
      setImages((imageResult.data ?? []) as PostImage[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Posts load nahi ho sake.");
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
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const payload = {
        ...form,
        title_en: form.title_en.trim(),
        title_ur: form.title_ur.trim(),
        body_en: form.body_en.trim(),
        body_ur: form.body_ur.trim(),
        published_at: form.is_published ? new Date().toISOString() : null,
        slug: slugify(form.title_en) || crypto.randomUUID(),
      };
      const result = editing
        ? await supabase.from("posts").update(payload).eq("id", editing).select("id").single()
        : await supabase.from("posts").insert(payload).select("id").single();
      if (result.error) throw result.error;
      const postId = result.data.id as string;
      const invalid = files.find((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024);
      if (invalid) throw new Error("Post ki tasveer JPG, PNG ya WebP ho aur 5 MB se bari na ho.");
      const oldImages = images.filter((image) => image.post_id === postId);
      const added: PostImage[] = [];
      for (const [index, file] of files.entries()) {
        const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
        const path = `posts/${postId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("business-media").upload(path, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        const { data: addedImage, error: imageError } = await supabase.from("post_images").insert({
          post_id: postId, storage_path: path, display_order: oldImages.length + index,
        }).select("id,post_id,storage_path,display_order").single();
        if (imageError) {
          await supabase.storage.from("business-media").remove([path]);
          throw imageError;
        }
        added.push(addedImage as PostImage);
      }
      setImages((current) => [...current, ...added]);
      setNotice(editing ? "Post tabdeel ho gaya." : "Naya post ban gaya.");
      setEditing("");
      setForm(emptyPost);
      setFiles([]);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Post mehfooz nahi ho saka.");
    } finally {
      setBusy(false);
    }
  }

  function edit(post: Post) {
    setEditing(post.id);
    setForm({
      title_en: post.title_en, title_ur: post.title_ur,
      body_en: post.body_en, body_ur: post.body_ur,
      is_featured: post.is_featured, is_published: post.is_published,
    });
    setFiles([]);
    document.getElementById("post-form")?.scrollIntoView({ behavior: "smooth" });
  }

  async function remove(post: Post) {
    if (!window.confirm(`"${post.title_en}" aur is ki tasveerain hamesha ke liye delete karein?`)) return;
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { data: postImages, error: listError } = await supabase.from("post_images").select("id,storage_path").eq("post_id", post.id);
    if (listError) {
      setError(listError.message);
      return;
    }
    if (postImages?.length) {
      const { error: storageError } = await supabase.storage.from("business-media").remove(postImages.map((image) => image.storage_path));
      if (storageError) {
        setError(storageError.message);
        return;
      }
    }
    const { error: deleteError } = await supabase.from("posts").delete().eq("id", post.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (editing === post.id) {
      setEditing("");
      setForm(emptyPost);
      setFiles([]);
    }
    setNotice("Post delete ho gaya.");
    await load();
  }

  async function removeImage(image: PostImage) {
    if (!window.confirm("Post ki yeh tasveer hata dein?")) return;
    const supabase = createSupabaseBrowserClient();
    const { error: storageError } = await supabase.storage.from("business-media").remove([image.storage_path]);
    if (storageError) {
      setError(storageError.message);
      return;
    }
    const { error: deleteError } = await supabase.from("post_images").delete().eq("id", image.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setImages((current) => current.filter((item) => item.id !== image.id));
  }

  async function moveImage(image: PostImage, direction: -1 | 1) {
    const ordered = images.filter((item) => item.post_id === image.post_id).sort((a, b) => a.display_order - b.display_order);
    const index = ordered.findIndex((item) => item.id === image.id);
    const next = index + direction;
    if (next < 0 || next >= ordered.length) return;
    [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
    const supabase = createSupabaseBrowserClient();
    for (const [display_order, item] of ordered.entries()) {
      const { error: orderError } = await supabase.from("post_images").update({ display_order }).eq("id", item.id);
      if (orderError) {
        setError(orderError.message);
        return;
      }
    }
    setImages((current) => current.map((item) => {
      const display_order = ordered.findIndex((row) => row.id === item.id);
      return display_order >= 0 ? { ...item, display_order } : item;
    }));
  }

  return (
    <main>
      <div className="admin-page-heading"><div><p className="admin-eyebrow">WEBSITE KI KHABRAIN</p><h1>Website Posts</h1></div></div>
      {notice && <p className="form-success" role="status">{notice}</p>}
      {error && <p className="form-notice" role="alert">{error}</p>}
      <section className="admin-panel" id="post-form">
        <p className="admin-eyebrow">{editing ? "POST TABDEEL KAREIN" : "NAYA POST"}</p>
        <h2>{editing ? "Post Ki Maloomat Tabdeel Karein" : "Naya Post Banayein"}</h2>
        <form className="admin-form" onSubmit={save}>
          <div className="admin-form-grid">
            <label>Unwan (English)<input required maxLength={180} value={form.title_en} onChange={(event) => setForm({ ...form, title_en: event.target.value })} /></label>
            <label>Unwan (Urdu)<input lang="ur" dir="rtl" maxLength={180} value={form.title_ur} onChange={(event) => setForm({ ...form, title_ur: event.target.value })} /></label>
            <label>Tafseel (English)<textarea maxLength={12000} value={form.body_en} onChange={(event) => setForm({ ...form, body_en: event.target.value })} /></label>
            <label>Tafseel (Urdu)<textarea lang="ur" dir="rtl" maxLength={12000} value={form.body_ur} onChange={(event) => setForm({ ...form, body_ur: event.target.value })} /></label>
            <label className="wide">Tasveerain (JPG, PNG, WebP; 5 MB tak)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>
            <label className="admin-check"><input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} /> Is post ko numayan karein</label>
            <label className="admin-check"><input type="checkbox" checked={form.is_published} onChange={(event) => setForm({ ...form, is_published: event.target.checked })} /> Post Website Par Dikhayein</label>
          </div>
          <p>Draft post website par customers ko nazar nahi aayega.</p>
          <div className="admin-actions">
            <button className="button-primary" type="submit" disabled={busy}>{busy ? "Mehfooz ho raha hai…" : editing ? "Tabdeeli Mehfooz Karein" : "Post Mehfooz Karein"}</button>
            {editing && <button className="admin-secondary-button" type="button" onClick={() => { setEditing(""); setForm(emptyPost); setFiles([]); }}>Mansookh Karein</button>}
            {editing && images.filter((image) => image.post_id === editing).length > 0 && (
              <div className="admin-image-list">
                {images.filter((image) => image.post_id === editing).map((image) => {
                  const url = createSupabaseBrowserClient().storage.from("business-media").getPublicUrl(image.storage_path).data.publicUrl;
                  return <div key={image.id}>
                    <img src={url} alt="" />
                    <div className="admin-actions">
                      <button type="button" onClick={() => void moveImage(image, -1)} aria-label="Tasveer pehle karein">↑</button>
                      <button type="button" onClick={() => void moveImage(image, 1)} aria-label="Tasveer baad mein karein">↓</button>
                      <button type="button" className="danger" onClick={() => void removeImage(image)}>Tasveer Hataein</button>
                    </div>
                  </div>;
                })}
              </div>
            )}
          </div>
        </form>
      </section>
      <section className="admin-table-panel" style={{ marginTop: 22 }}>
        <h2>Tamam Posts</h2>
        {loading ? <p>Posts load ho rahe hain…</p> : !posts.length ? <p>Abhi koi post nahi banaya.</p> : (
          <div className="admin-list">{posts.map((post) => (
            <article className="admin-list-item" key={post.id}>
              <div><strong>{post.title_en}</strong><span>{post.is_published ? "Website par hai" : "Draft"}{post.is_featured ? " · Numayan" : ""}</span></div>
              <div className="admin-actions">
                <a className="admin-secondary-button" href={`/posts/${post.slug}`} target="_blank" rel="noreferrer">Website Par Dekhein</a>
                <button type="button" onClick={() => edit(post)}>Tabdeel Karein</button>
                <button type="button" className="danger" onClick={() => void remove(post)}>Delete Karein</button>
              </div>
            </article>
          ))}</div>
        )}
      </section>
    </main>
  );
}
