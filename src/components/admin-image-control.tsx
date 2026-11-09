"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo } from "react";

type AdminImageControlProps = {
  label: string;
  imageUrl: string;
  file?: File;
  disabled?: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
  onInvalid: (message: string) => void;
};

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;

export function AdminImageControl({ label, imageUrl, file, disabled = false, onSelect, onRemove, onInvalid }: AdminImageControlProps) {
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    if (!allowedTypes.includes(selected.type) || selected.size > maxImageSize) {
      onInvalid("JPG, PNG ya WebP tasveer chunain jo 5 MB se bari na ho.");
      return;
    }
    onSelect(selected);
  }

  const displayedUrl = previewUrl || imageUrl;
  return (
    <div className="admin-image-control">
      <span className="admin-image-control-label">{label}</span>
      <div className="admin-image-control-preview">
        {displayedUrl
          ? <Image src={displayedUrl} alt={`${label} ka preview`} width={320} height={180} unoptimized />
          : <span>Abhi koi tasveer nahi · Website par default design dikhai dega</span>}
      </div>
      {file && <small className="admin-help">Nayi tasveer chun li gayi hai; tabdeeliyan mehfooz karne par upload hogi.</small>}
      <div className="admin-image-control-actions">
        <label className="admin-secondary-button">
          {imageUrl || file ? "Tasveer Tabdeel Karein" : "Tasveer Upload Karein"}
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={handleChange} />
        </label>
        {(imageUrl || file) && (
          <button type="button" className="admin-secondary-button danger" disabled={disabled} onClick={onRemove}>Tasveer Hataein</button>
        )}
      </div>
    </div>
  );
}
