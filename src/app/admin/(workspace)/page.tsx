import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <p>Website ka database setup nahi hai.</p>;

  const [products, categories, newInquiries, inventory, posts] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("products").select("stock_quantity"),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_published", true),
  ]);
  const queryError = products.error || categories.error || newInquiries.error || inventory.error || posts.error;
  const totalStock = (inventory.data ?? []).reduce((total, item) => total + item.stock_quantity, 0);

  return (
    <main>
      <div className="admin-page-heading">
        <div><p className="admin-eyebrow">DUKAAN KA KHULASA</p><h1>Main Screen</h1></div>
        <Link className="admin-outline-button" href="/">Website Dekhein</Link>
      </div>
      {queryError && <p className="form-notice" role="alert">Dashboard ki kuch maloomat load nahi ho saki. Database setup check karein.</p>}
      <section className="admin-stats" aria-label="Dukaan ka khulasa">
        <article><span>Tamam Products</span><strong>{products.count ?? "—"}</strong><Link href="/admin/products">Products Dekhein →</Link></article>
        <article><span>Product Ki Qisam</span><strong>{categories.count ?? "—"}</strong><Link href="/admin/categories">Qisamain Dekhein →</Link></article>
        <article><span>Mojood Stock</span><strong>{inventory.error ? "—" : totalStock}</strong><Link href="/admin/products">Stock Dekhein →</Link></article>
        <article><span>Naye Paighamaat</span><strong>{newInquiries.count ?? "—"}</strong><Link href="/admin/inquiries">Paighamaat Dekhein →</Link></article>
        <article><span>Website Posts</span><strong>{posts.count ?? "—"}</strong><Link href="/admin/posts">Posts Dekhein →</Link></article>
      </section>
      <section className="admin-panel">
        <p className="admin-eyebrow">SHURU KAREIN</p>
        <h2>Apni website ka kaam yahan karein</h2>
        <p>Asal products shamil karein, rabtay ki maloomat badlein aur customers ke paighamaat dekhein.</p>
        <div className="admin-quick-links">
          <Link href="/admin/products">Naya Product Add Karein <span>→</span></Link>
          <Link href="/admin/categories">Product Ki Qisam Banayein <span>→</span></Link>
          <Link href="/admin/settings">Website Ki Settings Badlein <span>→</span></Link>
        </div>
      </section>
    </main>
  );
}
