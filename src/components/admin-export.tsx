"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminExport() {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  async function exportData(type: "products" | "categories") {
    setBusy(type);
    setMessage("");
    setMessageType("success");
    try {
      const supabase = createSupabaseBrowserClient();
      if (type === "categories") {
        const { data, error } = await supabase
          .from("categories")
          .select("name_en,name_ur,description_en,description_ur,display_order,is_active")
          .order("display_order");
        if (error) throw error;
        downloadCsv("riaz-salai-categories.csv", [
          ["Naam (English)", "Naam (Urdu)", "Tafseel (English)", "Tafseel (Urdu)", "Website par tarteeb", "Chalu"],
          ...(data ?? []).map((row) => [row.name_en, row.name_ur, row.description_en, row.description_ur, row.display_order, row.is_active]),
        ]);
      } else {
        const [products, categories, links] = await Promise.all([
          supabase.from("products").select("id,name_en,name_ur,price,description_en,description_ur,stock_quantity,product_type,is_published").order("created_at", { ascending: false }),
          supabase.from("categories").select("id,name_en"),
          supabase.from("product_categories").select("product_id,category_id"),
        ]);
        if (products.error || categories.error || links.error) throw products.error || categories.error || links.error;
        const categoryNames = new Map((categories.data ?? []).map((category) => [category.id, category.name_en]));
        const assigned = new Map<string, string[]>();
        for (const link of links.data ?? []) {
          const current = assigned.get(link.product_id) ?? [];
          const name = categoryNames.get(link.category_id);
          if (name) current.push(name);
          assigned.set(link.product_id, current);
        }
        downloadCsv("riaz-salai-products.csv", [
          ["Naam (English)", "Naam (Urdu)", "Qeemat (PKR)", "Tafseel (English)", "Tafseel (Urdu)", "Mojood stock", "Qisam", "Product ki qisamain", "Website par dikhaya"],
          ...(products.data ?? []).map((row) => [
            row.name_en, row.name_ur, row.price, row.description_en, row.description_ur,
            row.stock_quantity, row.product_type, (assigned.get(row.id) ?? []).join("; "), row.is_published,
          ]),
        ]);
      }
      setMessage(`${type === "products" ? "Products" : "Product ki qisamain"} ki file download ho gayi.`);
      setMessageType("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "File tayyar nahi ho saki.");
      setMessageType("error");
    } finally {
      setBusy("");
    }
  }

  return (
    <main>
      <div className="admin-page-heading"><div><p className="admin-eyebrow">RECORDS AUR DOWNLOAD</p><h1>Data Download</h1></div></div>
      <section className="admin-panel">
        <p>Products aur qisamon ki CSV files download karein. Product file mein private stock ki tadaad shamil hoti hai, is liye ise mehfooz rakhein.</p>
        {message && <p className={messageType === "success" ? "form-success" : "form-notice"} role={messageType === "error" ? "alert" : "status"}>{message}</p>}
        <div className="admin-actions">
          <button className="button-primary" type="button" disabled={Boolean(busy)} onClick={() => void exportData("products")}>{busy === "products" ? "File tayyar ho rahi hai…" : "Products Ki CSV Download Karein"}</button>
          <button className="admin-secondary-button" type="button" disabled={Boolean(busy)} onClick={() => void exportData("categories")}>{busy === "categories" ? "File tayyar ho rahi hai…" : "Product Qisamon Ki CSV Download Karein"}</button>
        </div>
      </section>
    </main>
  );
}
