"use client";

import { createElement } from "react";
import { useLanguage } from "@/components/language-provider";

export function BilingualText({
  en,
  ur,
  as = "p",
  className,
}: {
  en: string;
  ur?: string | null;
  as?: "p" | "h2" | "h3" | "span";
  className?: string;
}) {
  const { isUrdu } = useLanguage();
  return createElement(as, {
    className,
    lang: isUrdu ? "ur" : "en",
    dir: isUrdu ? "rtl" : "ltr",
  }, isUrdu ? ur || en : en);
}
