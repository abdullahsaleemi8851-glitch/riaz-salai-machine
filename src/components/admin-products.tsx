"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Category = { id: string; name_en: string; name_ur: string };
type Subcategory = { id: string; category_id: string; name_en: string; name_ur: string };
type Product = {
  id: string;
  name_en: string;
  name_ur: string;
  description_en: string;
  description_ur: string;
  price: number;
  stock_quantity: number;
  show_stock: boolean;
  show_exact_quantity: boolean;
  subcategory_id: string | null;
  product_type: string;
  is_published: boolean;
};
type ProductCategory = { product_id: string; category_id: string };
type ProductImage = { id: string; product_id: string; storage_path: string; is_main: boolean; display_order: number };
type ProductForm = {
  name_en: string;
  name_ur: string;
  description_en: string;
  description_ur: string;
  price: string;
  stock_quantity: string;
  show_stock: boolean;
  show_exact_quantity: boolean;
  product_type: "spare_part" | "new_machine" | "used_machine";
  is_published: boolean;
  category_ids: string[];
  subcategory_id: string;
};

function createEmptyForm(productType: ProductForm["product_type"] = "spare_part"): ProductForm {
  return {
    name_en: "", name_ur: "", description_en: "", description_ur: "",
    price: "", stock_quantity: "0", show_stock: true, show_exact_quantity: false,
    product_type: productType, is_published: false, category_ids: [], subcategory_id: "",
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

function isProductRecord(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" &&
    typeof row.name_en === "string" &&
    typeof row.name_ur === "string" &&
    typeof row.description_en === "string" &&
    typeof row.description_ur === "string" &&
    typeof row.price === "number" &&
    typeof row.stock_quantity === "number" &&
    typeof row.show_stock === "boolean" &&
    typeof row.show_exact_quantity === "boolean" &&
    typeof row.product_type === "string" &&
    typeof row.is_published === "boolean" &&
    (typeof row.subcategory_id === "string" || row.subcategory_id === null);
}

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;
const pageSize = 20;

export function AdminProducts({ initialType = "all" }: { initialType?: string }) {
  const defaultProductType: ProductForm["product_type"] =
    initialType === "new_machine" || initialType === "used_machine" || initialType === "spare_part"
      ? initialType
      : "spare_part";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [publishedProducts, setPublishedProducts] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [filteredCount, setFilteredCount] = useState(0);
  const [form, setForm] = useState<ProductForm>(() => createEmptyForm(defaultProductType));
  const [editingId, setEditingId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [newMainImageIndex, setNewMainImageIndex] = useState<number | null>(null);
  const [imageUploadProgress, setImageUploadProgress] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState(initialType);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const loadSequence = useRef(0);
  const metricsLoaded = useRef(false);

  const load = useCallback(async () => {
    const requestSequence = ++loadSequence.current;
    setLoading(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const [categoryResult, subcategoryResult] = await Promise.all([
        supabase.from("categories").select("id,name_en,name_ur").order("display_order"),
        supabase.from("subcategories").select("id,category_id,name_en,name_ur").order("display_order"),
      ]);
      if (categoryResult.error || subcategoryResult.error) throw categoryResult.error || subcategoryResult.error;
      if (requestSequence !== loadSequence.current) return;

      const loadedCategories = (categoryResult.data ?? []) as Category[];
      setCategories(loadedCategories);
      setSubcategories((subcategoryResult.data ?? []) as Subcategory[]);

      if (!metricsLoaded.current) {
        const [totalResult, publishedResult] = await Promise.all([
          supabase.from("products").select("id", { count: "exact", head: true }),
          supabase.from("products").select("id", { count: "exact", head: true }).eq("is_published", true),
        ]);
        if (totalResult.error || publishedResult.error) throw totalResult.error || publishedResult.error;
        const categoryCountResults = await Promise.all(loadedCategories.map(async (category) => {
          const { count, error: countError } = await supabase
            .from("product_categories")
            .select("product_id", { count: "exact", head: true })
            .eq("category_id", category.id);
          if (countError) throw countError;
          return [category.id, count ?? 0] as const;
        }));
        if (requestSequence !== loadSequence.current) return;
        setCategoryCounts(Object.fromEntries(categoryCountResults));
        setTotalProducts(totalResult.count ?? 0);
        setPublishedProducts(publishedResult.count ?? 0);
        metricsLoaded.current = true;
      }

      let productQuery = supabase
        .from("products")
        .select(categoryFilter
          ? "id,name_en,name_ur,description_en,description_ur,price,stock_quantity,show_stock,show_exact_quantity,product_type,is_published,subcategory_id,product_categories!inner(category_id)"
          : "id,name_en,name_ur,description_en,description_ur,price,stock_quantity,show_stock,show_exact_quantity,product_type,is_published,subcategory_id", { count: "exact" })
        .order("created_at", { ascending: false });
      if (filterType !== "all") productQuery = productQuery.eq("product_type", filterType);
      if (statusFilter === "published") productQuery = productQuery.eq("is_published", true);
      if (statusFilter === "draft") productQuery = productQuery.eq("is_published", false);
      if (statusFilter === "out_of_stock") productQuery = productQuery.eq("stock_quantity", 0);
      if (categoryFilter) productQuery = productQuery.eq("product_categories.category_id", categoryFilter);
      const safeSearch = debouncedSearch.trim().replace(/[^\p{L}\p{N}\s-]/gu, "");
      if (safeSearch) productQuery = productQuery.or(`name_en.ilike.%${safeSearch}%,name_ur.ilike.%${safeSearch}%`);
      const { data: productRows, count, error: productError } = await productQuery.range(page * pageSize, (page + 1) * pageSize - 1);
      if (productError) throw productError;
      if (requestSequence !== loadSequence.current) return;

      const rows: unknown = productRows;
      const loadedProducts = Array.isArray(rows) ? rows.filter(isProductRecord) : [];
      setProducts(loadedProducts);
      setFilteredCount(count ?? 0);
      const productIds = loadedProducts.map((product) => product.id);
      if (productIds.length) {
        const [linksResult, imageResult] = await Promise.all([
          supabase.from("product_categories").select("product_id,category_id").in("product_id", productIds),
          supabase.from("product_images").select("id,product_id,storage_path,is_main,display_order").in("product_id", productIds).order("display_order"),
        ]);
        if (linksResult.error || imageResult.error) throw linksResult.error || imageResult.error;
        if (requestSequence !== loadSequence.current) return;
        setProductCategories((linksResult.data ?? []) as ProductCategory[]);
        setImages((imageResult.data ?? []) as ProductImage[]);
      } else {
        setProductCategories([]);
        setImages([]);
      }
    } catch (loadError) {
      if (requestSequence === loadSequence.current) {
        setError(getErrorMessage(loadError, "Products load nahi ho sake."));
      }
    } finally {
      if (requestSequence === loadSequence.current) setLoading(false);
    }
  }, [categoryFilter, debouncedSearch, filterType, page, statusFilter]);

  // The async Supabase load updates this component after its requests complete.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(productSearch), 300);
    return () => window.clearTimeout(timer);
  }, [productSearch]);
  useEffect(() => {
    let cancelled = false;
    Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("Tasveer ka preview load nahi ho saka."));
      reader.readAsDataURL(file);
    })))
      .then((urls) => { if (!cancelled) setFilePreviewUrls(urls); })
      .catch(() => { if (!cancelled) setError("Tasveer ka preview nahi load ho saka. Doosri tasveer try karein."); });
    return () => { cancelled = true; };
  }, [files]);

  function update<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function editProduct(product: Product) {
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: relationError } = await supabase
        .from("product_categories")
        .select("category_id")
        .eq("product_id", product.id);
      if (relationError) throw relationError;
      setForm({
        name_en: product.name_en,
        name_ur: product.name_ur,
        description_en: product.description_en,
        description_ur: product.description_ur,
        price: String(product.price),
        stock_quantity: String(product.stock_quantity),
        show_stock: product.show_stock,
        show_exact_quantity: product.show_exact_quantity,
        product_type: product.product_type as ProductForm["product_type"],
        is_published: product.is_published,
        category_ids: (data ?? []).map((row) => row.category_id),
        subcategory_id: product.subcategory_id ?? "",
      });
      setEditingId(product.id);
      setFiles([]);
      setNewMainImageIndex(null);
      document.getElementById("admin-product-form")?.scrollIntoView({ behavior: "smooth" });
    } catch (editError) {
      setError(getErrorMessage(editError, "Yeh product load nahi ho saka."));
    }
  }

  function onFilesChanged(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    const invalid = selected.find((file) => !allowedTypes.includes(file.type) || file.size > maxImageSize);
    if (invalid) {
      setError("Tasveer JPG, PNG ya WebP ho aur 5 MB se bari na ho.");
      return;
    }
    setError("");
    if (files.length === 0 && !images.some((image) => image.product_id === editingId && image.is_main)) setNewMainImageIndex(0);
    setFiles((current) => [...current, ...selected]);
  }

  function removeNewFile(index: number) {
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setNewMainImageIndex((current) => {
      if (current === null) return null;
      if (current === index) return files.length > 1 ? 0 : null;
      return current > index ? current - 1 : current;
    });
  }

  function moveNewFile(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    setFiles((current) => current.map((file, currentIndex) =>
      currentIndex === index ? current[targetIndex] : currentIndex === targetIndex ? current[index] : file,
    ));
    setNewMainImageIndex((current) => current === index ? targetIndex : current === targetIndex ? index : current);
  }

  async function uploadImages(productId: string, selectedFiles: File[], selectedMainIndex: number | null) {
    if (!selectedFiles.length) return;
    const supabase = createSupabaseBrowserClient();
    const existing = images.filter((image) => image.product_id === productId);
    const inserted: ProductImage[] = [];

    for (const [index, file] of selectedFiles.entries()) {
      setImageUploadProgress(`Tasveer ${index + 1} / ${selectedFiles.length} upload ho rahi hai…`);
      const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const path = `products/${productId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("business-media").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data, error: rowError } = await supabase.from("product_images").insert({
        product_id: productId,
        storage_path: path,
        is_main: false,
        display_order: Math.max(-1, ...existing.map((image) => image.display_order)) + index + 1,
      }).select("id,product_id,storage_path,is_main,display_order").single();
      if (rowError) {
        await supabase.storage.from("business-media").remove([path]);
        throw rowError;
      }
      inserted.push(data as ProductImage);
    }
    const mainIndex = selectedMainIndex ?? (existing.some((image) => image.is_main) ? -1 : existing.length ? -1 : 0);
    if (mainIndex >= 0 && inserted[mainIndex]) {
      const { error: clearError } = await supabase.from("product_images").update({ is_main: false }).eq("product_id", productId);
      if (clearError) throw clearError;
      const { error: setMainError } = await supabase.from("product_images").update({ is_main: true }).eq("id", inserted[mainIndex].id);
      if (setMainError) throw setMainError;
      inserted[mainIndex] = { ...inserted[mainIndex], is_main: true };
    }
    setImages((current) => [...current, ...inserted]);
    setImageUploadProgress("");
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");
    const price = Number(form.price);
    const quantity = Number(form.stock_quantity);
    if (!form.name_en.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 0) {
      setError("Product ka English naam, durust qeemat aur stock ki poori tadaad likhein.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const productPayload = {
        name_en: form.name_en.trim(),
        name_ur: form.name_ur.trim(),
        description_en: form.description_en.trim(),
        description_ur: form.description_ur.trim(),
        price,
        stock_quantity: quantity,
        show_stock: form.show_stock,
        show_exact_quantity: form.show_stock && form.show_exact_quantity,
        product_type: form.product_type,
        is_published: form.is_published,
        subcategory_id: form.subcategory_id || null,
      };
      const result = editingId
        ? await supabase.from("products").update(productPayload).eq("id", editingId).select("id,product_type,is_published").single()
        : await supabase.from("products").insert(productPayload).select("id,product_type,is_published").single();
      if (result.error) throw result.error;
      const productId = result.data.id as string;
      const savedValuesMatch =
        result.data.product_type === productPayload.product_type &&
        result.data.is_published === productPayload.is_published;

      const { error: clearLinksError } = await supabase.from("product_categories").delete().eq("product_id", productId);
      if (clearLinksError) throw clearLinksError;
      if (form.category_ids.length) {
        const { error: linkError } = await supabase.from("product_categories").insert(
          form.category_ids.map((category_id) => ({ product_id: productId, category_id })),
        );
        if (linkError) throw linkError;
      }
      await uploadImages(productId, files, newMainImageIndex);
      const publicResult = result.data.is_published
        ? await supabase
          .from("public_products")
          .select("id,product_type")
          .eq("id", productId)
          .maybeSingle()
        : null;
      const publicListingMissing =
        result.data.is_published &&
        (Boolean(publicResult?.error) ||
          !publicResult?.data ||
          publicResult.data.product_type !== result.data.product_type);
      setEditingId("");
      setFiles([]);
      setNewMainImageIndex(null);
      setForm(createEmptyForm(defaultProductType));
      metricsLoaded.current = false;
      await load();
      if (!savedValuesMatch || publicListingMissing) {
        const detail = publicResult?.error ? ` Supabase: ${publicResult.error.message}` : "";
        setError(`Product save ho gaya, lekin database status aur public listing verify nahi hui. Product dobara add na karein; Admin list, Supabase project aur public_products setup check karein.${detail}`);
        return;
      }
      setNotice(productPayload.is_published
        ? editingId ? "Product tabdeel aur website par verify ho gaya." : "Naya product mehfooz aur website par verify ho gaya."
        : editingId ? "Product draft ki surat mein mehfooz ho gaya." : "Naya product draft ki surat mein mehfooz ho gaya.");
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Product mehfooz nahi ho saka."));
    } finally {
      setBusy(false);
      setImageUploadProgress("");
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`"${product.name_en}" aur is ki tamam tasveerain hamesha ke liye delete karein?`)) return;
    setError("");
    setNotice("");
    try {
      const supabase = createSupabaseBrowserClient();
      const productImages = images.filter((image) => image.product_id === product.id);
      if (productImages.length) {
        const { error: storageError } = await supabase.storage.from("business-media").remove(productImages.map((image) => image.storage_path));
        if (storageError) throw storageError;
      }
      const { error: deleteError } = await supabase.from("products").delete().eq("id", product.id);
      if (deleteError) throw deleteError;
      setNotice("Product delete ho gaya.");
      if (editingId === product.id) {
        setEditingId("");
        setForm(createEmptyForm(defaultProductType));
      }
      metricsLoaded.current = false;
      await load();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Product delete nahi ho saka."));
    }
  }

  async function updateMainImage(image: ProductImage) {
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: clearError } = await supabase.from("product_images").update({ is_main: false }).eq("product_id", image.product_id);
      if (clearError) throw clearError;
      const { error: setError } = await supabase.from("product_images").update({ is_main: true }).eq("id", image.id);
      if (setError) throw setError;
      setImages((current) => current.map((item) => item.product_id === image.product_id ? { ...item, is_main: item.id === image.id } : item));
      return true;
    } catch (updateError) {
      setError(getErrorMessage(updateError, "Bunyadi tasveer tabdeel nahi ho saki."));
      return false;
    }
  }

  async function moveImage(image: ProductImage, direction: -1 | 1) {
    const ordered = images.filter((item) => item.product_id === image.product_id).sort((a, b) => a.display_order - b.display_order);
    const currentIndex = ordered.findIndex((item) => item.id === image.id);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;
    [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]];
    try {
      const supabase = createSupabaseBrowserClient();
      for (const [index, item] of ordered.entries()) {
        const { error: orderError } = await supabase.from("product_images").update({ display_order: index }).eq("id", item.id);
        if (orderError) throw orderError;
      }
      setImages((current) => current.map((item) => {
        const newOrder = ordered.findIndex((row) => row.id === item.id);
        return newOrder >= 0 ? { ...item, display_order: newOrder } : item;
      }));
    } catch (moveError) {
      setError(getErrorMessage(moveError, "Tasveeron ki tarteeb tabdeel nahi ho saki."));
    }
  }

  async function deleteImage(image: ProductImage) {
    if (!window.confirm("Yeh product tasveer hata dein?")) return;
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const remainingImages = images
        .filter((item) => item.product_id === image.product_id && item.id !== image.id)
        .sort((left, right) => left.display_order - right.display_order);
      if (image.is_main && remainingImages[0] && !(await updateMainImage(remainingImages[0]))) return;
      const { error: rowError } = await supabase.from("product_images").delete().eq("id", image.id);
      if (rowError) throw rowError;
      setImages((current) => current.filter((item) => item.id !== image.id));
      const { error: storageError } = await supabase.storage.from("business-media").remove([image.storage_path]);
      if (storageError) throw new Error(`Tasveer website se hat gayi lekin Storage file saaf nahi ho saki: ${storageError.message}`);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Tasveer nahi hat saki."));
    }
  }

  const pageCount = Math.ceil(filteredCount / pageSize);

  return (
    <main>
      <div className="admin-page-heading">
        <div><p className="admin-eyebrow">DUKAAN KE PRODUCTS</p><h1>{filterType === "new_machine" ? "Nayi Machines" : filterType === "used_machine" ? "Purani Machines" : filterType === "spare_part" ? "Machine Ke Purzay" : "Tamam Products"}</h1></div>
        <button className="admin-outline-button" type="button" onClick={() => { setEditingId(""); setFiles([]); setForm(createEmptyForm(defaultProductType)); document.getElementById("admin-product-form")?.scrollIntoView({ behavior: "smooth" }); }}>Naya Product Add Karein</button>
      </div>
      {notice && <p className="form-success" role="status">{notice}</p>}
      {error && <p className="form-notice" role="alert">{error}</p>}

      <section className="admin-product-manager" aria-labelledby="product-manager-heading">
        <div className="admin-product-manager-heading">
          <div>
            <p className="admin-eyebrow">PRODUCTS KA HISAB</p>
            <h2 id="product-manager-heading">Tamam Products Dekhein Aur Manage Karein</h2>
            <p>Naam dhoondein, category ya halat chunein, phir product tabdeel ya delete karein.</p>
          </div>
          <div className="admin-product-totals" aria-label="Product totals">
            <article><span>Kul Products</span><strong>{totalProducts}</strong></article>
            <article><span>Website Par Dikhaye Gaye</span><strong>{publishedProducts}</strong></article>
          </div>
        </div>
        <div className="admin-category-counts">
          {categories.map((category) => (
            <button type="button" key={category.id} onClick={() => { setCategoryFilter(categoryFilter === category.id ? "" : category.id); setPage(0); }} aria-pressed={categoryFilter === category.id}>
              <span>{category.name_en}</span><strong>{categoryCounts[category.id] ?? 0}</strong>
            </button>
          ))}
          {!categories.length && <p>Abhi koi category mojood nahi.</p>}
        </div>
        <div className="admin-product-filters">
          <label>Product Ka Naam Dhoondein
            <input type="search" value={productSearch} onChange={(event) => { setProductSearch(event.target.value); setPage(0); }} placeholder="English ya Urdu naam likhein" />
          </label>
          <label>Product Ki Category
            <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(0); }}>
              <option value="">Tamam Categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name_en} ({categoryCounts[category.id] ?? 0})</option>)}
            </select>
          </label>
          <label>Product Ki Qisam
            <select value={filterType} onChange={(event) => { setFilterType(event.target.value); setPage(0); }}>
              <option value="all">Tamam Qisamain</option><option value="spare_part">Machine Ke Purzay</option><option value="new_machine">Nayi Machines</option><option value="used_machine">Purani Machines</option>
            </select>
          </label>
          <label>Website Aur Stock Ki Halat
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(0); }}>
              <option value="all">Tamam Halat</option><option value="published">Website Par Hai</option><option value="draft">Draft Hai</option><option value="out_of_stock">Stock Khatam Hai</option>
            </select>
          </label>
        </div>
        <p className="admin-product-result-count" role="status">{loading ? "Products load ho rahe hain…" : `${filteredCount} product mile · aik safhe par ${pageSize} tak`}</p>
        {loading ? <p>Thora intezar karein…</p> : error ? null : !products.length ? (
          <div className="admin-product-empty"><strong>Is chayan mein koi product nahi mila.</strong><span>Doosri category ya halat chunein, ya search ka lafz badlein.</span></div>
        ) : (
          <div className="admin-product-list">
            {products.map((product) => {
              const productImages = images.filter((image) => image.product_id === product.id);
              const mainImage = productImages.find((image) => image.is_main) ?? productImages[0];
              const imageUrl = mainImage
                ? createSupabaseBrowserClient().storage.from("business-media").getPublicUrl(mainImage.storage_path).data.publicUrl
                : "";
              const assignedCategories = productCategories
                .filter((link) => link.product_id === product.id)
                .map((link) => categories.find((category) => category.id === link.category_id)?.name_en)
                .filter((name): name is string => Boolean(name));
              const subcategoryName = subcategories.find((subcategory) => subcategory.id === product.subcategory_id)?.name_en;
              return (
                <article className="admin-product-row" key={product.id}>
                  <div className="admin-product-image">
                    {imageUrl ? <Image src={imageUrl} alt="" width={64} height={64} unoptimized /> : <span>Tasveer nahi</span>}
                  </div>
                  <div className="admin-product-info">
                    <strong>{product.name_en}</strong>
                    {product.name_ur && <span lang="ur" dir="rtl">{product.name_ur}</span>}
                    <small>{[...assignedCategories, subcategoryName].filter(Boolean).join(" · ") || "Category nahi chuni"}</small>
                  </div>
                  <div className="admin-product-meta">
                    <strong>Rs. {Number(product.price).toLocaleString("en-PK")}</strong>
                    <span>Stock Mojood: {product.stock_quantity}</span>
                  </div>
                  <span className={`admin-product-status ${product.is_published ? "is-published" : "is-draft"}`}>{product.is_published ? "Website Par Hai" : "Draft Hai"}</span>
                  <div className="admin-product-actions">
                    <button type="button" onClick={() => void editProduct(product)}>Tabdeel Karein</button>
                    <button type="button" className="danger" onClick={() => void deleteProduct(product)}>Delete Karein</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {pageCount > 1 && (
          <nav className="admin-product-pagination" aria-label="Product pages">
            <button type="button" disabled={page === 0 || loading} onClick={() => setPage((current) => Math.max(0, current - 1))}>Pichla Safha</button>
            <span>Safha {page + 1} / {pageCount}</span>
            <button type="button" disabled={page + 1 >= pageCount || loading} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}>Agla Safha</button>
          </nav>
        )}
      </section>

      <section className="admin-panel" id="admin-product-form">
        <p className="admin-eyebrow">{editingId ? "PRODUCT TABDEEL KAREIN" : "NAYA PRODUCT"}</p>
        <h2>{editingId ? "Product Ki Maloomat Tabdeel Karein" : "Naya Product Shamil Karein"}</h2>
        <form className="admin-form" onSubmit={saveProduct}>
          <div className="admin-form-grid">
            <div className="wide admin-product-image-uploader">
              <span className="admin-label">Product Ki Tasveerain</span>
              <small className="admin-help">JPG, PNG ya WebP, har tasveer 5 MB tak. Pehle preview dekhein; save karne par nayi tasveer upload hogi.</small>
              <input ref={imageInputRef} className="admin-visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onFilesChanged} />
              <button type="button" className="admin-secondary-button admin-add-image-button" onClick={() => imageInputRef.current?.click()} disabled={busy}>
                <Plus size={17} /> Tasveer Upload Karein
              </button>
            </div>
            <label>Product Ka Naam (English)<input required maxLength={160} placeholder="Misal: Sewing machine needle" value={form.name_en} onChange={(event) => update("name_en", event.target.value)} /><small className="admin-help">Naam English mein likhein taa-ke customers asani se dhoond sakein.</small></label>
            <label>Product Ka Naam (Urdu)<input lang="ur" dir="rtl" maxLength={160} placeholder="پروڈکٹ کا نام" value={form.name_ur} onChange={(event) => update("name_ur", event.target.value)} /><small className="admin-help">Urdu naam ho to yahan likhein.</small></label>
            <div className="wide">
              <span className="admin-label">Product Ki Qisam Aur Category</span>
              <small className="admin-help">Product ki qisam chunain, phir aik ya zyada categories select karein.</small>
              <label>Product Kis Qisam Ka Hai?
                <select value={form.product_type} onChange={(event) => update("product_type", event.target.value as ProductForm["product_type"])}>
                  <option value="spare_part">Machine Ka Purza</option><option value="new_machine">Nayi Machine</option><option value="used_machine">Purani Machine</option>
                </select>
              </label>
              <div className="admin-checkboxes">
                {categories.map((category) => (
                  <label key={category.id}>
                    <input type="checkbox" checked={form.category_ids.includes(category.id)} onChange={(event) => update("category_ids", event.target.checked ? [...form.category_ids, category.id] : form.category_ids.filter((id) => id !== category.id))} />
                    {category.name_en}
                  </label>
                ))}
                {!categories.length && <span>Pehle Product Ki Qisam wale safhe se category banayein.</span>}
              </div>
              <label>Mazeed Qisam (Zaroori Nahi)
                <select value={form.subcategory_id} onChange={(event) => update("subcategory_id", event.target.value)}>
                  <option value="">Koi mazeed qisam nahi</option>
                  {subcategories.filter((subcategory) => form.category_ids.includes(subcategory.category_id)).map((subcategory) => (
                    <option value={subcategory.id} key={subcategory.id}>{subcategory.name_en}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>Product Ki Qeemat (PKR)<input type="number" min="0" step="1" required placeholder="Misal: 1500" value={form.price} onChange={(event) => update("price", event.target.value)} /><small className="admin-help">Qeemat rupay mein likhein.</small></label>
            <label>Kitna Stock Mojood Hai<input type="number" min="0" step="1" required placeholder="Misal: 10" value={form.stock_quantity} onChange={(event) => update("stock_quantity", event.target.value)} /><small className="admin-help">Mojood pieces ki poori tadaad likhein.</small></label>
            <label className="wide">Product Ki Tafseel (English)<textarea maxLength={10000} placeholder="Product ke bare mein zaroori maloomat likhein." value={form.description_en} onChange={(event) => update("description_en", event.target.value)} /><small className="admin-help">English mein product ki khasusiyat aur istemal samjhayein.</small></label>
            <label className="wide">Product Ki Tafseel (Urdu)<textarea lang="ur" dir="rtl" maxLength={10000} placeholder="پروڈکٹ کی تفصیل" value={form.description_ur} onChange={(event) => update("description_ur", event.target.value)} /><small className="admin-help">Urdu mein tafseel dena zaroori nahi.</small></label>
            <p className="wide admin-help">Product code ka field abhi database mein mojood nahi; code save karne ke liye database tabdeeli darkar hogi.</p>
            <label className="admin-check"><input type="checkbox" checked={form.show_stock} onChange={(event) => update("show_stock", event.target.checked)} /> Customers ko stock ki mojoodgi dikhayein</label>
            <label className="admin-check"><input type="checkbox" checked={form.show_exact_quantity} disabled={!form.show_stock} onChange={(event) => update("show_exact_quantity", event.target.checked)} /> Stock ki exact tadaad website par dikhayein</label>
            <label className="admin-check wide"><input type="checkbox" checked={form.is_published} onChange={(event) => update("is_published", event.target.checked)} /> Product Website Par Dikhayein</label>
          </div>
          {editingId && images.filter((image) => image.product_id === editingId).length > 0 && (
            <div className="admin-image-list admin-product-images wide" aria-label="Product ki mehfooz tasveerain">
              {images.filter((image) => image.product_id === editingId).map((image) => {
                const supabase = createSupabaseBrowserClient();
                const { data } = supabase.storage.from("business-media").getPublicUrl(image.storage_path);
                return (
                  <div className="admin-product-image-card" key={image.id}>
                    <Image src={data.publicUrl} alt="" width={180} height={130} unoptimized />
                    <span className={image.is_main ? "admin-image-main-badge is-main" : "admin-image-main-badge"}>{image.is_main ? "Bunyadi Tasveer" : "Mazeed Tasveer"}</span>
                    <div className="admin-image-actions">
                      {!image.is_main && <button type="button" onClick={() => void updateMainImage(image)}>Main Tasveer Banayein</button>}
                      <button type="button" aria-label="Tasveer pehle karein" onClick={() => void moveImage(image, -1)}>↑</button>
                      <button type="button" aria-label="Tasveer baad mein karein" onClick={() => void moveImage(image, 1)}>↓</button>
                      <button type="button" className="danger" aria-label="Tasveer Hataein" onClick={() => void deleteImage(image)}><X size={15} /> Hataein</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {editingId && images.filter((image) => image.product_id === editingId).length === 0 && files.length === 0 && (
            <p className="wide admin-help">Abhi is product ki tasveer nahi. Website par default product placeholder dikhai dega.</p>
          )}
          {filePreviewUrls.length > 0 && (
            <div className="admin-image-list admin-product-images admin-new-product-images wide" aria-label="Nayi chun hui tasveerain">
              {filePreviewUrls.map((url, index) => (
                <div className="admin-product-image-card" key={`${url}-${index}`}>
                  <Image src={url} alt={`Chuni hui product tasveer ${index + 1}`} width={180} height={130} unoptimized />
                  <span className={newMainImageIndex === index || (newMainImageIndex === null && !images.some((image) => image.product_id === editingId && image.is_main) && index === 0) ? "admin-image-main-badge is-main" : "admin-image-main-badge"}>
                    {newMainImageIndex === index || (newMainImageIndex === null && !images.some((image) => image.product_id === editingId && image.is_main) && index === 0) ? "Bunyadi Tasveer" : "Mazeed Tasveer"}
                  </span>
                  <div className="admin-image-actions">
                    {newMainImageIndex !== index && <button type="button" onClick={() => setNewMainImageIndex(index)}>Main Tasveer Banayein</button>}
                    <button type="button" aria-label="Nayi tasveer pehle karein" onClick={() => moveNewFile(index, -1)} disabled={index === 0}>↑</button>
                    <button type="button" aria-label="Nayi tasveer baad mein karein" onClick={() => moveNewFile(index, 1)} disabled={index === files.length - 1}>↓</button>
                    <button type="button" className="danger" aria-label="Chuni hui tasveer hataein" onClick={() => removeNewFile(index)}><X size={15} /> Hataein</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {imageUploadProgress && <p className="wide admin-help" role="status">{imageUploadProgress}</p>}
          <div className="admin-actions">
            <button className="button-primary" type="submit" disabled={busy}>{busy ? "Mehfooz ho raha hai…" : form.is_published ? "Website Par Dikhayein Aur Mehfooz Karein" : "Draft Mehfooz Karein"}</button>
            {editingId && <button className="admin-secondary-button" type="button" onClick={() => { setEditingId(""); setForm(createEmptyForm(defaultProductType)); setFiles([]); }}>Tabdeeli Mansookh Karein</button>}
          </div>
        </form>
      </section>

    </main>
  );
}
