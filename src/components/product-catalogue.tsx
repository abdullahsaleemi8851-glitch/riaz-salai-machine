"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { MessageCircle, PackageOpen, Search } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/language-provider";
import { BusinessWhatsAppLink } from "@/components/business-whatsapp-link";
import { ProductImagePlaceholder } from "@/components/product-image-placeholder";

type Category = { id: string; name_en: string; name_ur: string; image_url: string | null };
type Product = {
  id: string;
  name_en: string;
  name_ur: string;
  description_en: string;
  description_ur: string;
  price: number;
  product_type: string;
  created_at: string;
  stock_status: "available" | "out_of_stock" | null;
  public_quantity: number | null;
};
type ProductImage = { product_id: string; storage_path: string; is_main: boolean; display_order: number };

function priceText(value: number) {
  return new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(value);
}

export function ProductCatalogue({
  productType = "spare_part",
  initialSearch = "",
  initialCategoryId = "",
}: {
  productType?: string;
  initialSearch?: string;
  initialCategoryId?: string;
}) {
  const { isUrdu } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [categoryWarning, setCategoryWarning] = useState("");
  const [imageWarning, setImageWarning] = useState("");
  const [search, setSearch] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(true);
  const pageSize = 24;

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      setCategoryWarning("");
      setImageWarning("");
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: categoryRows, error: categoryError } = await supabase
          .from("categories")
          .select("id,name_en,name_ur,image_url")
          .eq("is_active", true)
          .order("display_order");
        if (categoryError) {
          if (active) {
            setCategories([]);
            setCategoryWarning(
              isUrdu
                ? "اقسام لوڈ نہیں ہو سکیں؛ مصنوعات زمرہ فلٹر کے بغیر دکھائی جائیں گی۔"
                : "Categories could not be loaded. Products will be shown without category filters.",
            );
          }
        } else if (active) {
          setCategories(categoryRows ?? []);
        }

        const categoryLinks = categoryId
          ? await supabase.from("product_categories").select("product_id").eq("category_id", categoryId)
          : { data: null, error: null };
        if (categoryLinks.error) throw categoryLinks.error;

        let query = supabase.from("public_products").select("*", { count: "exact" }).eq("product_type", productType);
        const safeSearch = search.trim().replace(/[^\p{L}\p{N}\s_-]/gu, "");
        if (safeSearch) {
          query = query.or(`name_en.ilike.%${safeSearch}%,name_ur.ilike.%${safeSearch}%`);
        }
        const lower = Number(minPrice);
        const upper = Number(maxPrice);
        if (minPrice && Number.isFinite(lower)) query = query.gte("price", lower);
        if (maxPrice && Number.isFinite(upper)) query = query.lte("price", upper);
        if (categoryId) {
          const ids = (categoryLinks.data ?? []).map((row: { product_id: string }) => row.product_id);
          if (ids.length === 0) {
            if (active) {
              if (!categoryError) setCategories(categoryRows ?? []);
              setProducts([]);
              setImages({});
              setResultCount(0);
              setLoading(false);
            }
            return;
          }
          query = query.in("id", ids);
        }

        const sortColumn = sort.startsWith("price")
          ? "price"
          : sort === "name"
            ? "name_en"
            : "created_at";
        const ascending = sort === "oldest" || sort === "price-low" || sort === "name";
        const { data: productRows, error: productError, count } = await query
          .order(sortColumn, { ascending })
          .range(page * pageSize, page * pageSize + pageSize - 1);
        if (productError) throw productError;

        const productIds = (productRows ?? []).map((product: Product) => product.id);
        const imageQuery = productIds.length
          ? await supabase.from("product_images").select("product_id,storage_path,is_main,display_order").in("product_id", productIds).order("display_order")
          : { data: [], error: null };

        const imageMap: Record<string, string> = {};
        if (imageQuery.error) {
          if (active) {
            setImageWarning(
              isUrdu
                ? "مصنوعات کی تصاویر لوڈ نہیں ہو سکیں؛ مصنوعات کی تفصیل دستیاب رہے گی۔"
                : "Product images could not be loaded. Product details remain available.",
            );
          }
        } else {
          for (const image of (imageQuery.data ?? []) as ProductImage[]) {
            if (imageMap[image.product_id] && !image.is_main) continue;
            const { data } = supabase.storage.from("business-media").getPublicUrl(image.storage_path);
            imageMap[image.product_id] = data.publicUrl;
          }
        }
        if (active) {
          setCategories(categoryRows ?? []);
          setProducts((productRows ?? []) as Product[]);
          setResultCount(count ?? 0);
          setImages(imageMap);
        }
      } catch (loadError) {
        if (active) {
          const message = loadError instanceof Error ? loadError.message : "";
          if (message.includes("not configured")) setConfigured(false);
          else setError("Products could not be loaded. Please try again later.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [categoryId, isUrdu, maxPrice, minPrice, page, productType, search, sort]);

  const noResults = useMemo(() => !loading && !error && configured && products.length === 0, [configured, error, loading, products.length]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(0);
  }

  return (
    <div className="catalogue">
      {categories.length > 0 && (
        <div className="category-browser" role="group" aria-label={isUrdu ? "مشین کی قسم منتخب کریں" : "Choose a machine category"}>
          <button type="button" aria-pressed={!categoryId} className={!categoryId ? "selected" : ""} onClick={() => { setCategoryId(""); setPage(0); }}>{isUrdu ? "تمام اقسام" : "All categories"}</button>
          {categories.map((category) => (
            <button type="button" key={category.id} aria-pressed={categoryId === category.id} className={categoryId === category.id ? "selected" : ""} onClick={() => { setCategoryId(category.id); setPage(0); }}>
              {category.image_url && <Image src={category.image_url} alt="" width={28} height={28} unoptimized />}
              {isUrdu ? category.name_ur || category.name_en : category.name_en}
            </button>
          ))}
        </div>
      )}
      <form className="catalogue-filters" onSubmit={applyFilters}>
        <label>
          <span>{isUrdu ? "مصنوعات تلاش کریں" : "Search products"}</span>
          <span className="catalog-search">
            <Search size={16} aria-hidden="true" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder={isUrdu ? "انگریزی یا اردو میں تلاش کریں" : "Search in English or Urdu"} />
          </span>
        </label>
        <label>
          <span>{isUrdu ? "قسم" : "Category"}</span>
          <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(0); }}>
            <option value="">{isUrdu ? "تمام اقسام" : "All categories"}</option>
            {categories.map((category) => <option value={category.id} key={category.id}>{isUrdu ? category.name_ur || category.name_en : category.name_en}</option>)}
          </select>
        </label>
        <label>
          <span>{isUrdu ? "کم از کم قیمت (روپے)" : "Min price (Rs.)"}</span>
          <input type="number" min="0" value={minPrice} onChange={(event) => { setMinPrice(event.target.value); setPage(0); }} />
        </label>
        <label>
          <span>{isUrdu ? "زیادہ سے زیادہ قیمت (روپے)" : "Max price (Rs.)"}</span>
          <input type="number" min="0" value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); setPage(0); }} />
        </label>
        <label>
          <span>{isUrdu ? "ترتیب" : "Sort by"}</span>
          <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(0); }}>
            <option value="latest">{isUrdu ? "نئی پہلے" : "Latest first"}</option>
            <option value="oldest">{isUrdu ? "پرانی پہلے" : "Oldest first"}</option>
            <option value="price-low">{isUrdu ? "کم قیمت پہلے" : "Price: low to high"}</option>
            <option value="price-high">{isUrdu ? "زیادہ قیمت پہلے" : "Price: high to low"}</option>
            <option value="name">{isUrdu ? "نام: الف سے یے" : "Name: A to Z"}</option>
          </select>
        </label>
      </form>

      {!loading && !error && configured && (
        <div className="catalogue-results-toolbar">
          <p role="status" aria-live="polite">
            {isUrdu ? `کل ${resultCount} مصنوعات` : `${resultCount} ${resultCount === 1 ? "product" : "products"} found`}
          </p>
          {(search || categoryId || minPrice || maxPrice || sort !== "latest") && (
            <button
              className="catalogue-clear-filters"
              type="button"
              onClick={() => {
                setSearch("");
                setCategoryId("");
                setMinPrice("");
                setMaxPrice("");
                setSort("latest");
                setPage(0);
              }}
            >
              {isUrdu ? "فلٹر صاف کریں" : "Clear filters"}
            </button>
          )}
          {categoryWarning && <p className="catalogue-feedback" role="status">{categoryWarning}</p>}
          {imageWarning && <p className="catalogue-feedback" role="status">{imageWarning}</p>}
        </div>
      )}
      {loading && <p className="catalogue-feedback" role="status">{isUrdu ? "مصنوعات لوڈ ہو رہی ہیں…" : "Loading products…"}</p>}
      {!configured && <p className="catalogue-feedback">{isUrdu ? "مصنوعات کی فہرست ابھی منسلک نہیں۔ براہِ کرم دکان سے رابطہ کریں۔" : "The product catalogue is not connected yet. Please check back soon or contact the shop on WhatsApp."}</p>}
      {error && <p className="catalogue-feedback" role="alert">{isUrdu ? "مصنوعات لوڈ نہیں ہو سکیں۔ براہ کرم بعد میں دوبارہ کوشش کریں۔" : error}</p>}
      {noResults && (
        <div className="products-empty catalogue-empty">
          <span className="products-empty-icon"><PackageOpen size={22} /></span>
          <h3>{isUrdu ? "کوئی مصنوعات نہیں ملیں" : "No products found"}</h3>
          <p>{isUrdu ? "تلاش یا فلٹر تبدیل کریں یا دستیابی کے لیے ہم سے رابطہ کریں۔" : "Try changing your search or filters, or ask us directly about availability."}</p>
          <div className="catalogue-empty-actions">
            {(search || categoryId || minPrice || maxPrice || sort !== "latest") && (
              <button
                className="catalogue-clear-filters"
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategoryId("");
                  setMinPrice("");
                  setMaxPrice("");
                  setSort("latest");
                  setPage(0);
                }}
              >
                {isUrdu ? "فلٹر صاف کریں" : "Clear filters"}
              </button>
            )}
            <BusinessWhatsAppLink
              className="button-primary"
              message="Hello Riaz Salai Machine, please tell me about available sewing machine products and prices."
            >
              <MessageCircle size={15} />
              {isUrdu ? "واٹس ایپ پر دستیابی پوچھیں" : "Ask about availability"}
            </BusinessWhatsAppLink>
          </div>
        </div>
      )}

      <div className="catalogue-grid">
        {products.map((product) => (
          <article className="catalogue-card" key={product.id}>
            <Link className="catalogue-image" href={`/products/${product.id}`}>
              {images[product.id]
                ? <Image src={images[product.id]} alt={product.name_en} fill sizes="(max-width: 480px) 100vw, (max-width: 760px) 50vw, 25vw" unoptimized />
                : <ProductImagePlaceholder />}
            </Link>
            <div className="catalogue-card-body">
              <span className="catalogue-type">{isUrdu ? product.product_type === "new_machine" ? "نئی مشین" : product.product_type === "used_machine" ? "استعمال شدہ مشین" : "مشین کے پرزے" : product.product_type.replace("_", " ")}</span>
              <Link href={`/products/${product.id}`}><h2>{isUrdu ? product.name_ur || product.name_en : product.name_en}</h2></Link>
              {product.name_ur && !isUrdu && <p className="catalogue-urdu" lang="ur" dir="rtl">{product.name_ur}</p>}
              <strong>Rs. {priceText(Number(product.price))}</strong>
              {product.stock_status && (
                <span className={product.stock_status === "available" ? "stock-available" : "stock-out"}>
                  {product.stock_status === "available" ? isUrdu ? "دستیاب" : "Available" : isUrdu ? "دستیاب نہیں" : "Out of stock"}
                  {product.public_quantity !== null && ` · ${product.public_quantity}`}
                </span>
              )}
              <div className="catalogue-card-actions">
                <Link href={`/products/${product.id}`}>{isUrdu ? "تفصیل دیکھیں" : "View details"}</Link>
                <BusinessWhatsAppLink message={`Hello Riaz Salai Machine, I am interested in ${product.name_en}. Please share more details.`} ariaLabel={`Ask about ${product.name_en} on WhatsApp`}>
                  <MessageCircle size={16} /> {isUrdu ? "پوچھیں" : "Ask"}
                </BusinessWhatsAppLink>
              </div>
            </div>
          </article>
        ))}
      </div>
      {products.length === pageSize && (
        <div className="catalogue-pagination">
          <button type="button" disabled={page === 0 || loading} onClick={() => setPage(page - 1)}>{isUrdu ? "پچھلا" : "Previous"}</button>
          <span>{isUrdu ? `صفحہ ${page + 1}` : `Page ${page + 1}`}</span>
          <button type="button" disabled={loading} onClick={() => setPage(page + 1)}>{isUrdu ? "اگلا" : "Next"}</button>
        </div>
      )}
    </div>
  );
}
