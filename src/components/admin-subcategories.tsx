"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Subcategory = { id: string; category_id: string; name_en: string; name_ur: string; display_order: number };
type ParentCategory = { id: string; name_en: string };

export function AdminSubcategories({ category }: { category: ParentCategory }) {
  const [items, setItems] = useState<Subcategory[]>([]);
  const [nameEn, setNameEn] = useState("");
  const [nameUr, setNameUr] = useState("");
  const [order, setOrder] = useState("0");
  const [editing, setEditing] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error: loadError } = await createSupabaseBrowserClient()
      .from("subcategories")
      .select("id,category_id,name_en,name_ur,display_order")
      .eq("category_id", category.id)
      .order("display_order");
    if (loadError) setError(`Mazeed qisamain load nahi ho sakin: ${loadError.message}`);
    else setItems((data ?? []) as Subcategory[]);
  }, [category.id]);

  // Supabase results update state only after the asynchronous request completes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!nameEn.trim()) {
      setError("Mazeed qisam ka English naam likhein.");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const payload = { name_en: nameEn.trim(), name_ur: nameUr.trim(), display_order: Number(order) || 0 };
    const result = editing
      ? await supabase.from("subcategories").update(payload).eq("id", editing)
      : await supabase.from("subcategories").insert({ ...payload, category_id: category.id });
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setNameEn("");
    setNameUr("");
    setOrder("0");
    setEditing("");
    await load();
  }

  function edit(item: Subcategory) {
    setEditing(item.id);
    setNameEn(item.name_en);
    setNameUr(item.name_ur);
    setOrder(String(item.display_order));
  }

  async function remove(item: Subcategory) {
    if (!window.confirm(`"${item.name_en}" mazeed qisam delete karein? Is se jure products mehfooz rahenge, sirf yeh taalluq khatam hoga.`)) return;
    const { error: deleteError } = await createSupabaseBrowserClient().from("subcategories").delete().eq("id", item.id);
    if (deleteError) setError(deleteError.message);
    else {
      if (editing === item.id) {
        setEditing("");
        setNameEn("");
        setNameUr("");
        setOrder("0");
      }
      await load();
    }
  }

  return (
    <div className="subcategory-admin">
      <strong>Mazeed Product Qisamain</strong>
      {!items.length && <span>Abhi koi mazeed qisam nahi bani.</span>}
      {items.map((item) => (
        <div className="subcategory-row" key={item.id}>
          <span>{item.name_en} · {item.name_ur || "Urdu naam nahi diya"} · Tarteeb {item.display_order}</span>
          <button type="button" onClick={() => edit(item)}>Tabdeel Karein</button>
          <button type="button" onClick={() => void remove(item)}>Delete Karein</button>
        </div>
      ))}
      <form className="subcategory-form" onSubmit={save}>
        <input aria-label={`${category.name_en} mazeed qisam English naam`} placeholder="Mazeed qisam ka naam (English)" value={nameEn} onChange={(event) => setNameEn(event.target.value)} />
        <input aria-label={`${category.name_en} subcategory Urdu name`} placeholder="نام (اردو)" lang="ur" dir="rtl" value={nameUr} onChange={(event) => setNameUr(event.target.value)} />
        <input aria-label="Mazeed qisam ki tarteeb" type="number" placeholder="Tarteeb" value={order} onChange={(event) => setOrder(event.target.value)} />
        <button type="submit">{editing ? "Mehfooz Karein" : "Mazeed Qisam Banayein"}</button>
        {editing && <button type="button" onClick={() => { setEditing(""); setNameEn(""); setNameUr(""); setOrder("0"); }}>Mansookh Karein</button>}
      </form>
      {error && <span className="form-notice" role="alert">{error}</span>}
    </div>
  );
}
