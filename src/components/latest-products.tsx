"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { MessageCircle, PackageOpen } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BusinessWhatsAppLink } from "@/components/business-whatsapp-link";
import { ProductImagePlaceholder } from "@/components/product-image-placeholder";

type Product = {
  id: string;
  name_en: string;
  name_ur: string;
  price: number;
  stock_status: "available" | "out_of_stock" | null;
  public_quantity: number | null;
};

type ProductImage = { product_id: string; storage_path: string; is_main: boolean; display_order: number };

export function LatestProducts() {
  const { isUrdu } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setMessage("");
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("public_products")
          .select("id,name_en,name_ur,price,stock_status,public_quantity")
          .order("created_at", { ascending: false })
          .limit(4);
        if (error) throw error;
        const ids = (data ?? []).map((product: Product) => product.id);
        const imageResult = ids.length
          ? await supabase.from("product_images").select("product_id,storage_path,is_main,display_order").in("product_id", ids).order("display_order")
          : { data: [], error: null };
        if (imageResult.error) throw imageResult.error;
        const urls: Record<string, string> = {};
        for (const image of (imageResult.data ?? []) as ProductImage[]) {
          if (urls[image.product_id] && !image.is_main) continue;
          urls[image.product_id] = supabase.storage.from("business-media").getPublicUrl(image.storage_path).data.publicUrl;
        }
        if (active) {
          setProducts((data ?? []) as Product[]);
          setImageUrls(urls);
        }
      } catch {
        if (active) setMessage(isUrdu ? "مصنوعات ابھی لوڈ نہیں ہو سکیں۔ براہ کرم دکان سے رابطہ کریں۔" : "Products are not available right now. Please contact the shop.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [isUrdu]);

  if (loading) {
    return (
      <div className="products-empty" role="status" aria-live="polite">
        <span className="products-empty-icon"><PackageOpen size={23} /></span>
        <p>{isUrdu ? "مصنوعات لوڈ ہو رہی ہیں…" : "Loading products…"}</p>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="products-empty">
        <span className="products-empty-icon"><PackageOpen size={23} /></span>
        <h3>{message ? (isUrdu ? "مصنوعات دستیاب نہیں" : "Products unavailable") : (isUrdu ? "مصنوعات کی فہرست تیار کی جا رہی ہے" : "Catalogue coming soon")}</h3>
        <p>{message || (isUrdu ? "دستیابی اور قیمت کے لیے براہِ راست رابطہ کریں۔" : "Ask the shop directly about availability and pricing.")}</p>
        <BusinessWhatsAppLink className="button-primary" message="Hello Riaz Salai Machine, please tell me about available sewing machine products and prices." >
          <MessageCircle size={15} /> {isUrdu ? "واٹس ایپ پر رابطہ" : "Contact on WhatsApp"}
        </BusinessWhatsAppLink>
      </div>
    );
  }

  return (
    <div className="latest-product-grid">
      {products.map((product) => (
        <article className="catalogue-card" key={product.id}>
          <Link className="catalogue-image" href={`/products/${product.id}`}>
            {imageUrls[product.id]
              ? <Image src={imageUrls[product.id]} alt={product.name_en} fill sizes="(max-width: 760px) 50vw, 25vw" unoptimized />
              : <ProductImagePlaceholder />}
          </Link>
          <div className="catalogue-card-body">
            <Link href={`/products/${product.id}`}><h2>{isUrdu ? product.name_ur || product.name_en : product.name_en}</h2></Link>
            <strong>Rs. {Number(product.price).toLocaleString("en-PK")}</strong>
            {product.stock_status && <span className={product.stock_status === "available" ? "stock-available" : "stock-out"}>{product.stock_status === "available" ? isUrdu ? "دستیاب" : "Available" : isUrdu ? "دستیاب نہیں" : "Out of stock"}</span>}
            <BusinessWhatsAppLink message={`Hello Riaz Salai Machine, I am interested in ${product.name_en}. Please share more details.`}>
              <MessageCircle size={15} /> {isUrdu ? "پوچھیں" : "Ask on WhatsApp"}
            </BusinessWhatsAppLink>
          </div>
        </article>
      ))}
    </div>
  );
}
