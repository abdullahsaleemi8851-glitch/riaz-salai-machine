import { notFound } from "next/navigation";
import { SitePageFrame } from "@/components/site-page-frame";
import { ProductGallery } from "@/components/product-gallery";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BilingualText } from "@/components/bilingual-text";
import { BusinessWhatsAppLink } from "@/components/business-whatsapp-link";

export const dynamic = "force-dynamic";

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <SitePageFrame title="Product catalogue unavailable" description="The product catalogue has not been connected yet." />;
  }

  const { data: product, error } = await supabase
    .from("public_products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return <SitePageFrame title="Product unavailable" description="We could not load this product. Please try again later." />;
  }
  if (!product) notFound();

  const { data: images, error: imageError } = await supabase
    .from("product_images")
    .select("storage_path,alt_en,alt_ur,is_main,display_order")
    .eq("product_id", id)
    .order("display_order");
  const publicImages = (images ?? []).map((image) => {
    const { data } = supabase.storage.from("business-media").getPublicUrl(image.storage_path);
    return {
      src: data.publicUrl,
      alt: image.alt_en || product.name_en,
      isMain: image.is_main,
    };
  });
  publicImages.sort((left, right) => Number(right.isMain) - Number(left.isMain));

  return (
    <SitePageFrame
      title={product.name_en}
      titleUr={product.name_ur}
      description="Product details and availability from Riaz Salai Machine."
      descriptionUr="ریاض سلائی مشین سے مصنوعات کی تفصیل اور دستیابی۔"
    >
      <div className="product-detail">
        <ProductGallery images={publicImages} name={product.name_en} />
        <section>
          <p className="product-detail-price"><BilingualText as="span" en={`Rs. ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(Number(product.price))}`} ur={`روپے ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(Number(product.price))}`} /></p>
          {imageError && <p className="catalogue-feedback" role="status"><BilingualText en="Product images could not be loaded. Product details are still available." ur="مصنوعات کی تصاویر لوڈ نہیں ہو سکیں۔ مصنوعات کی تفصیل دستیاب ہے۔" /></p>}
          {product.stock_status && <p className={product.stock_status === "available" ? "stock-available" : "stock-out"}><BilingualText as="span" en={product.stock_status === "available" ? "Available" : "Out of stock"} ur={product.stock_status === "available" ? "دستیاب" : "دستیاب نہیں"} /></p>}
          {product.public_quantity !== null && <p className="stock-available"><BilingualText as="span" en={`Quantity: ${product.public_quantity}`} ur={`تعداد: ${product.public_quantity}`} /></p>}
          <BilingualText en={product.description_en} ur={product.description_ur} />
          <BusinessWhatsAppLink className="button-primary" message={`Hello Riaz Salai Machine, I am interested in ${product.name_en}. Please share more details.`}>
            <BilingualText as="span" en="Ask about this product on WhatsApp" ur="اس مصنوعات کے بارے میں واٹس ایپ پر پوچھیں" />
          </BusinessWhatsAppLink>
        </section>
      </div>
    </SitePageFrame>
  );
}
