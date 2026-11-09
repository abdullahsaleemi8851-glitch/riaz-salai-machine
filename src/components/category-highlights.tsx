"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowUpRight, Cog } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name_en: string;
  name_ur: string;
  image_url: string | null;
};

export function CategoryHighlights() {
  const { isUrdu } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { data, error: queryError } = await createSupabaseBrowserClient()
          .from("categories")
          .select("id,name_en,name_ur,image_url")
          .eq("is_active", true)
          .order("display_order");
        if (queryError) throw queryError;
        if (active) setCategories(data ?? []);
      } catch {
        if (active) setError(true);
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  if (error) {
    return (
      <p className="home-category-feedback" role="status">
        {isUrdu ? "اقسام ابھی لوڈ نہیں ہو سکیں۔" : "Categories are temporarily unavailable."}
      </p>
    );
  }

  if (!categories.length) return null;

  return (
    <div className="home-category-highlights" aria-label={isUrdu ? "مشین کی اقسام" : "Browse machine categories"}>
      {categories.map((category, index) => (
        <Link
          className="home-category-link"
          href={`/spare-parts?category=${encodeURIComponent(category.id)}`}
          key={category.id}
        >
          <span className="home-category-index">{String(index + 1).padStart(2, "0")}</span>
          <span className="home-category-image" aria-hidden="true">
            {category.image_url
              ? <Image src={category.image_url} alt="" width={48} height={48} unoptimized />
              : <Cog size={24} strokeWidth={1.2} />}
          </span>
          <span>{isUrdu ? category.name_ur || category.name_en : category.name_en}</span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
