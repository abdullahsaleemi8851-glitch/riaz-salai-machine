import { SitePageFrame } from "@/components/site-page-frame";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BilingualText } from "@/components/bilingual-text";

export const metadata = { title: "About Us" };

export default async function AboutPage() {
  const supabase = await createSupabaseServerClient();
  const { data: row, error } = supabase
    ? await supabase.from("public_website_settings").select("value").eq("key", "about").maybeSingle()
    : { data: null, error: null };
  const about = row?.value as { body_en?: string; body_ur?: string } | null;
  return (
    <SitePageFrame
      title="About Riaz Salai Machine"
      titleUr="ریاض سلائی مشین کے بارے میں"
      description="Practical help for sewing machine users in Gojra."
      descriptionUr="گوجرہ میں سلائی مشین استعمال کرنے والوں کے لیے آسان مدد۔"
    >
      <section className="simple-content-card">
        <BilingualText as="h2" en="Practical help for sewing machine users" ur="سلائی مشین استعمال کرنے والوں کے لیے آسان مدد" />
        {error && (
          <div className="catalogue-feedback" role="status">
            <BilingualText
              en="Business information could not be loaded. The details below are general shop information."
              ur="کاروباری معلومات لوڈ نہیں ہو سکیں۔ ذیل میں دکان کی عمومی معلومات دی گئی ہیں۔"
            />
          </div>
        )}
        <BilingualText en={about?.body_en || "We offer sewing machine spare parts, new and used machines, and repair services from our shop near Bara Imambargah, Main Bazar, Gojra."} ur={about?.body_ur || "ہم بارہ امام بارگاہ کے قریب، مین بازار، گوجرہ میں سلائی مشین کے پرزے، نئی اور استعمال شدہ مشینیں اور مرمت کی خدمات فراہم کرتے ہیں۔"} />
        <BilingualText en="Tell us what machine or part you are looking for. If you are unsure of the name, send us a photo on WhatsApp and we will do our best to guide you." ur="ہمیں بتائیں کہ آپ کو کون سی مشین یا پرزہ درکار ہے۔ نام معلوم نہ ہو تو واٹس ایپ پر تصویر بھیجیں، ہم رہنمائی کی کوشش کریں گے۔" />
      </section>
    </SitePageFrame>
  );
}
