"use client";

import { PackageOpen } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function ProductImagePlaceholder() {
  const { isUrdu } = useLanguage();

  return (
    <span
      className="product-image-placeholder"
      role="img"
      aria-label={isUrdu ? "مصنوعات کی تصویر دستیاب نہیں" : "Product image not available"}
    >
      <span className="product-image-placeholder-icon" aria-hidden="true">
        <PackageOpen size={30} strokeWidth={1.3} />
      </span>
      <span className="product-image-placeholder-label">
        {isUrdu ? "تصویر جلد دستیاب ہوگی" : "Product image"}
      </span>
    </span>
  );
}
