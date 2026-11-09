import Image from "next/image";
import { MessageCircle, Wrench } from "lucide-react";
import { SitePageFrame } from "@/components/site-page-frame";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BilingualText } from "@/components/bilingual-text";
import { BusinessWhatsAppLink } from "@/components/business-whatsapp-link";

export const metadata = { title: "Sewing Machine Repair Services" };

export default async function RepairingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: services, error } = supabase
    ? await supabase.from("services").select("id,title_en,title_ur,description_en,description_ur").eq("is_published", true).order("display_order")
    : { data: null, error: null };
  const serviceIds = (services ?? []).map((service) => service.id);
  const { data: images, error: imageError } = supabase && serviceIds.length
    ? await supabase.from("service_images").select("service_id,storage_path,alt_en,display_order").in("service_id", serviceIds).order("display_order")
    : { data: [], error: null };
  const serviceImageMap = new Map<string, string[]>();
  for (const image of images ?? []) {
    const url = supabase!.storage.from("business-media").getPublicUrl(image.storage_path).data.publicUrl;
    serviceImageMap.set(image.service_id, [...(serviceImageMap.get(image.service_id) ?? []), url]);
  }
  return (
    <SitePageFrame title="Sewing machine repair" titleUr="سلائی مشین کی مرمت" description="Talk with us about a sewing machine that needs attention." descriptionUr="اپنی سلائی مشین کی مرمت کے بارے میں ہم سے بات کریں۔">
      <section className="simple-content-card">
        <Wrench size={24} />
        <BilingualText as="h2" en="Need help with your sewing machine?" ur="کیا آپ کی سلائی مشین میں مسئلہ ہے؟" />
        <BilingualText en="Contact the shop and explain what is happening. If you can, send a clear photo or short video on WhatsApp so we can understand the issue before you visit." ur="دکان سے رابطہ کرکے مسئلے کی وضاحت کریں۔ ممکن ہو تو واٹس ایپ پر واضح تصویر یا مختصر ویڈیو بھیجیں تاکہ آپ کے آنے سے پہلے مسئلہ سمجھنے میں مدد ملے۔" />
        {(error || imageError) && (
          <div className="catalogue-feedback" role="alert">
            <BilingualText
              en="Service details or images could not be loaded. Contact the shop directly for help."
              ur="مرمت کی خدمات یا تصاویر لوڈ نہیں ہو سکیں۔ براہِ کرم دکان سے براہِ راست رابطہ کریں۔"
            />
          </div>
        )}
        {supabase && !error && !services?.length && (
          <div className="catalogue-feedback">
            <BilingualText en="No repair services are listed yet. Ask us on WhatsApp how we can help." ur="ابھی مرمت کی کوئی خدمت درج نہیں۔ ہماری مدد کے بارے میں واٹس ایپ پر پوچھیں۔" />
          </div>
        )}
        {services?.map((service) => (
          <article className="service-item" key={service.title_en}>
            {serviceImageMap.get(service.id)?.map((url) => <Image className="service-image" src={url} alt={service.title_en} key={url} width={1040} height={680} sizes="(max-width: 760px) 100vw, 520px" unoptimized />)}
            <BilingualText as="h3" en={service.title_en} ur={service.title_ur} />
            <BilingualText en={service.description_en} ur={service.description_ur} />
          </article>
        ))}
        <BusinessWhatsAppLink className="button-primary" message="Hello Riaz Salai Machine, I would like to ask about sewing machine repair. Please let me know how to proceed.">
          <MessageCircle size={15} /> <BilingualText as="span" en="Ask about a repair" ur="مرمت کے بارے میں پوچھیں" />
        </BusinessWhatsAppLink>
      </section>
    </SitePageFrame>
  );
}
