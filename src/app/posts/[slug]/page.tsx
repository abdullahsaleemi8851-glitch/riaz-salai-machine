import Image from "next/image";
import { notFound } from "next/navigation";
import { SitePageFrame } from "@/components/site-page-frame";
import { PostShareButton } from "@/components/post-share-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BilingualText } from "@/components/bilingual-text";
import { BusinessWhatsAppLink } from "@/components/business-whatsapp-link";

export default async function PostDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <SitePageFrame title="Post unavailable" description="Updates have not been connected yet." />;
  const { data: post, error } = await supabase.from("posts").select("*").eq("slug", slug).maybeSingle();
  if (error) return <SitePageFrame title="Post unavailable" description="We could not load this update right now." />;
  if (!post) notFound();
  const { data: images, error: imageError } = await supabase.from("post_images").select("storage_path,alt_en,alt_ur,display_order").eq("post_id", post.id).order("display_order");
  if (imageError) {
    return <SitePageFrame title={post.title_en} titleUr={post.title_ur} description={post.body_en} descriptionUr={post.body_ur} />;
  }
  const postImageUrls = (images ?? []).map((image) => ({
    url: supabase.storage.from("business-media").getPublicUrl(image.storage_path).data.publicUrl,
    alt: image.alt_en || post.title_en,
  }));

  return (
    <SitePageFrame title={post.title_en} titleUr={post.title_ur} description="News and updates from Riaz Salai Machine." descriptionUr="ریاض سلائی مشین کی تازہ خبریں اور اعلانات۔">
      <article className="simple-content-card">
        {postImageUrls.map((image) => <Image className="post-detail-image" src={image.url} alt={image.alt} key={image.url} width={1200} height={900} sizes="(max-width: 760px) 100vw, 1000px" unoptimized />)}
        <BilingualText en={post.body_en} ur={post.body_ur} />
        <div className="post-actions">
          <PostShareButton title={post.title_en} />
          <BusinessWhatsAppLink className="admin-secondary-button" message={`Hello Riaz Salai Machine, I would like to ask about this update: ${post.title_en}`}><BilingualText as="span" en="Ask about this update on WhatsApp" ur="اس تازہ خبر کے بارے میں واٹس ایپ پر پوچھیں" /></BusinessWhatsAppLink>
        </div>
      </article>
    </SitePageFrame>
  );
}
