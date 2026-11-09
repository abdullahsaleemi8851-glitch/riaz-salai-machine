import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Newspaper } from "lucide-react";
import { SitePageFrame } from "@/components/site-page-frame";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BilingualText } from "@/components/bilingual-text";
import { BusinessWhatsAppLink } from "@/components/business-whatsapp-link";

export const metadata = { title: "News and Updates" };

export default async function PostsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: posts, error } = supabase
    ? await supabase.from("posts").select("id,slug,title_en,title_ur,body_en,body_ur,published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(24)
    : { data: null, error: null };
  const postIds = (posts ?? []).map((post) => post.id);
  const { data: postImages, error: imageError } = supabase && postIds.length
    ? await supabase.from("post_images").select("post_id,storage_path,display_order").in("post_id", postIds).order("display_order")
    : { data: [], error: null };
  const imageUrls = new Map<string, string>();
  for (const image of postImages ?? []) {
    if (imageUrls.has(image.post_id)) continue;
    imageUrls.set(image.post_id, supabase!.storage.from("business-media").getPublicUrl(image.storage_path).data.publicUrl);
  }

  return (
    <SitePageFrame title="News & updates" titleUr="تازہ خبریں اور اعلانات" description="Offers, announcements, and updates from Riaz Salai Machine." descriptionUr="ریاض سلائی مشین کی آفرز، اعلانات اور کاروباری تازہ خبریں۔">
      {(error || imageError) && <div className="catalogue-feedback" role="alert"><BilingualText en="Posts or images could not be loaded. Please try again later." ur="تازہ خبریں یا تصاویر لوڈ نہیں ہو سکیں۔ براہ کرم بعد میں دوبارہ کوشش کریں۔" /></div>}
      {!error && posts?.length === 0 && (
        <div className="public-empty-state">
          <span className="public-empty-state-icon" aria-hidden="true"><Newspaper size={25} strokeWidth={1.4} /></span>
          <div>
            <span className="section-kicker"><BilingualText as="span" en="FROM THE SHOP" ur="دکان سے" /></span>
            <BilingualText as="h2" en="No updates just yet" ur="ابھی کوئی تازہ خبر نہیں" />
            <BilingualText en="There are no published updates at the moment. Contact us if you need help or want to ask about availability." ur="اس وقت کوئی تازہ خبر شائع نہیں کی گئی۔ مدد یا دستیابی کے بارے میں پوچھنے کے لیے ہم سے رابطہ کریں۔" />
          </div>
          <BusinessWhatsAppLink className="button-primary" message="Hello Riaz Salai Machine, I would like to ask about your latest updates.">
            <MessageCircle size={15} />
            <BilingualText as="span" en="Ask us on WhatsApp" ur="واٹس ایپ پر پوچھیں" />
          </BusinessWhatsAppLink>
        </div>
      )}
      {!supabase && <div className="catalogue-feedback"><BilingualText en="Updates will appear here after the shop connects its website catalogue." ur="دکان کی ویب سائٹ منسلک ہونے کے بعد تازہ خبریں یہاں نظر آئیں گی۔" /></div>}
      <div className="post-grid">
        {posts?.map((post) => {
          const imageUrl = imageUrls.get(post.id);
          return (
            <article className="post-card" key={post.id}>
              {imageUrl && <Image className="post-card-image" src={imageUrl} alt={post.title_en} width={960} height={600} sizes="(max-width: 760px) 100vw, 33vw" unoptimized />}
              <span className="section-kicker"><BilingualText as="span" en="SHOP UPDATE" ur="دکان کی تازہ خبر" /></span>
              <h2><Link href={`/posts/${post.slug}`}><BilingualText as="span" en={post.title_en} ur={post.title_ur} /></Link></h2>
              <BilingualText className="post-card-excerpt" en={`${post.body_en.slice(0, 180)}${post.body_en.length > 180 ? "…" : ""}`} ur={`${post.body_ur.slice(0, 180)}${post.body_ur.length > 180 ? "…" : ""}`} />
              {post.published_at && <time dateTime={post.published_at}>{new Date(post.published_at).toLocaleDateString("en-PK")}</time>}
            </article>
          );
        })}
      </div>
    </SitePageFrame>
  );
}
