import { MapPin, MessageCircle } from "lucide-react";
import { SitePageFrame } from "@/components/site-page-frame";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BilingualText } from "@/components/bilingual-text";
import { BusinessWhatsAppLink } from "@/components/business-whatsapp-link";
import { shopLocation, shopMapEmbedUrl } from "@/lib/shop-location";

export const metadata = { title: "Shop Location" };

export default async function LocationPage() {
  const supabase = await createSupabaseServerClient();
  const { data: row, error } = supabase
    ? await supabase.from("public_website_settings").select("value").eq("key", "business").maybeSingle()
    : { data: null, error: null };
  const business = row?.value as { maps_url?: string; address?: string; address_ur?: string } | null;
  const address = business?.address || "Near Bara Imambargah, Main Bazar, Gojra, Pakistan";
  const mapsUrl = business?.maps_url || shopLocation.mapsUrl;

  return (
    <SitePageFrame title="Find our shop" titleUr="ہماری دکان کا پتہ" description="Visit Riaz Salai Machine in Main Bazar, Gojra." descriptionUr="مین بازار، گوجرہ میں ریاض سلائی مشین تشریف لائیں۔">
      <section className="simple-content-card location-card">
        <div className="location-card-grid">
          <div className="location-address">
            <span className="location-marker" aria-hidden="true"><MapPin size={21} /></span>
            <div>
              <span className="section-kicker"><BilingualText as="span" en="VISIT OUR SHOP" ur="ہماری دکان تشریف لائیں" /></span>
              <h2><BilingualText as="span" en="Riaz Salai Machine" ur="ریاض سلائی مشین" /></h2>
              <BilingualText en={address} ur={business?.address_ur || "بارہ امام بارگاہ کے قریب، مین بازار، گوجرہ، پاکستان"} />
            </div>
          </div>
          <div className="location-direction-card">
            <div className="location-map-frame">
              <iframe
                src={shopMapEmbedUrl}
                title={`Google Map showing ${shopLocation.name}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <span className="section-kicker"><BilingualText as="span" en="DIRECTIONS" ur="راستہ" /></span>
            {error ? (
              <BilingualText
                en="The saved map link could not be loaded. Please contact the shop to confirm directions."
                ur="محفوظ نقشے کا لنک لوڈ نہیں ہو سکا۔ راستے کی تصدیق کے لیے دکان سے رابطہ کریں۔"
              />
            ) : mapsUrl ? (
              <BilingualText en="Open the shop location in your maps app." ur="اپنی میپس ایپ میں دکان کا مقام کھولیں۔" />
            ) : (
              <BilingualText en="A map link has not been added yet. Ask us to confirm directions before visiting." ur="ابھی نقشے کا لنک شامل نہیں کیا گیا۔ آنے سے پہلے راستے کی تصدیق کے لیے ہم سے پوچھیں۔" />
            )}
            <div className="location-actions">
              {mapsUrl && <a className="button-primary" href={mapsUrl} target="_blank" rel="noreferrer"><BilingualText as="span" en="Get directions" ur="راستہ دیکھیں" /></a>}
              <BusinessWhatsAppLink className="admin-secondary-button" message="Hello Riaz Salai Machine, please confirm your shop location and a suitable time to visit.">
                <MessageCircle size={15} /> <BilingualText as="span" en="Ask on WhatsApp" ur="واٹس ایپ پر پوچھیں" />
              </BusinessWhatsAppLink>
            </div>
          </div>
        </div>
      </section>
    </SitePageFrame>
  );
}
