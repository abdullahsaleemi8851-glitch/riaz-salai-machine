"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, Newspaper } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PostShareButton } from "@/components/post-share-button";

type Post = {
  id: string;
  slug: string;
  title_en: string;
  title_ur: string;
  body_en: string;
  body_ur: string;
  published_at: string | null;
};
type PostImage = { post_id: string; storage_path: string; display_order: number };

export function LatestPosts() {
  const { isUrdu } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setMessage("");
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.from("posts")
          .select("id,slug,title_en,title_ur,body_en,body_ur,published_at")
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(3);
        if (error) throw error;
        const ids = (data ?? []).map((post: Post) => post.id);
        const { data: imageRows, error: imageError } = ids.length
          ? await supabase.from("post_images").select("post_id,storage_path,display_order").in("post_id", ids).order("display_order")
          : { data: [], error: null };
        if (imageError) throw imageError;
        const imageMap: Record<string, string> = {};
        for (const image of (imageRows ?? []) as PostImage[]) {
          if (imageMap[image.post_id]) continue;
          imageMap[image.post_id] = supabase.storage.from("business-media").getPublicUrl(image.storage_path).data.publicUrl;
        }
        if (active) {
          setPosts((data ?? []) as Post[]);
          setImages(imageMap);
        }
      } catch {
        if (active) setMessage(isUrdu ? "تازہ خبریں ابھی لوڈ نہیں ہو سکیں۔" : "Updates could not be loaded right now.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [isUrdu]);

  return (
    <section className="section latest-posts-section">
      <div className="section-heading">
        <div>
          <span className="section-kicker">{isUrdu ? "دکان سے تازہ خبریں" : "From the shop"}</span>
          <h2>{isUrdu ? "تازہ خبریں اور اعلانات" : "Latest updates"}</h2>
        </div>
        <Link className="text-link" href="/posts">{isUrdu ? "تمام خبریں دیکھیں" : "View all posts"} <ArrowRight size={14} /></Link>
      </div>
      {loading ? (
        <div className="products-empty" role="status" aria-live="polite">
          <span className="products-empty-icon"><Newspaper size={22} /></span>
          <p>{isUrdu ? "تازہ خبریں لوڈ ہو رہی ہیں…" : "Loading updates…"}</p>
        </div>
      ) : !posts.length ? (
        <div className="products-empty">
          <span className="products-empty-icon"><Newspaper size={22} /></span>
          <p role={message ? "alert" : undefined}>{message || (isUrdu ? "اس وقت کوئی تازہ خبر شائع نہیں کی گئی۔" : "There are no published updates at the moment.")}</p>
        </div>
      ) : (
        <div className="latest-post-grid">
          {posts.map((post) => (
            <article className="latest-post-card" key={post.id}>
              {images[post.id] && <Link href={`/posts/${post.slug}`} className="latest-post-image"><Image src={images[post.id]} alt={post.title_en} width={960} height={600} sizes="(max-width: 760px) 100vw, 33vw" unoptimized /></Link>}
              <span className="section-kicker">{isUrdu ? "دکان کی تازہ خبر" : "SHOP UPDATE"}</span>
              <h3><Link href={`/posts/${post.slug}`}>{isUrdu ? post.title_ur || post.title_en : post.title_en}</Link></h3>
              <p>{isUrdu ? post.body_ur || post.body_en : post.body_en}</p>
              <div className="latest-post-actions">
                <Link href={`/posts/${post.slug}`}>{isUrdu ? "پڑھیں" : "Read post"}</Link>
                <PostShareButton title={isUrdu ? post.title_ur || post.title_en : post.title_en} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
