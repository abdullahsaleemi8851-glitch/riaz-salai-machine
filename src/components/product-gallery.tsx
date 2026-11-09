"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PackageOpen } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

type GalleryImage = { src: string; alt: string };

export function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const { isUrdu } = useLanguage();
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const mainButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const mainButton = mainButtonRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      } else if (event.key === "ArrowLeft" && images.length > 1) {
        setSelected((current) => (current + images.length - 1) % images.length);
      } else if (event.key === "ArrowRight" && images.length > 1) {
        setSelected((current) => (current + 1) % images.length);
      } else if (event.key === "Tab") {
        const buttons = Array.from(modalRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
        if (!buttons.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      mainButton?.focus();
    };
  }, [images.length, open]);

  if (!images.length) {
    return (
      <div
        className="product-gallery-placeholder"
        role="img"
        aria-label={isUrdu ? `${name}: تصویر دستیاب نہیں` : `${name}: no image available`}
      >
        <div className="product-gallery-placeholder-art" aria-hidden="true">
          <PackageOpen size={46} strokeWidth={1.1} />
          <strong>{isUrdu ? "تصویر دستیاب نہیں" : "Image coming soon"}</strong>
          <span>{name}</span>
        </div>
      </div>
    );
  }

  const image = images[selected];
  return (
    <div className="product-gallery">
      <button
        ref={mainButtonRef}
        className="product-gallery-main"
        type="button"
        onClick={() => setOpen(true)}
        aria-label={isUrdu ? "مصنوعات کی تصویری گیلری کھولیں" : "Open product image gallery"}
      >
        <Image src={image.src} alt={image.alt} fill sizes="(max-width: 620px) 100vw, 50vw" unoptimized />
      </button>
      {images.length > 1 && (
        <div className="product-gallery-thumbnails" aria-label="Product images">
          {images.map((item, index) => (
            <button
              type="button"
              key={item.src}
              onClick={() => setSelected(index)}
              aria-label={isUrdu ? `تصویر ${index + 1} دکھائیں` : `Show image ${index + 1}`}
              aria-pressed={selected === index}
            >
              <Image src={item.src} alt="" fill sizes="62px" unoptimized />
            </button>
          ))}
        </div>
      )}
      {open && (
        <div ref={modalRef} className="gallery-modal" role="dialog" aria-modal="true" aria-label={isUrdu ? `${name} تصویری گیلری` : `${name} image gallery`}>
          <button ref={closeButtonRef} className="gallery-close" type="button" onClick={() => setOpen(false)}>{isUrdu ? "بند کریں" : "Close"}</button>
          {images.length > 1 && <button className="gallery-prev" type="button" onClick={() => setSelected((selected + images.length - 1) % images.length)}>{isUrdu ? "پچھلی تصویر" : "Previous"}</button>}
          <Image src={image.src} alt={image.alt} width={1200} height={900} sizes="(max-width: 620px) 100vw, 78vw" unoptimized />
          {images.length > 1 && <button className="gallery-next" type="button" onClick={() => setSelected((selected + 1) % images.length)}>{isUrdu ? "اگلی تصویر" : "Next"}</button>}
        </div>
      )}
    </div>
  );
}
