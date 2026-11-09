"use client";

import { createWhatsAppUrl } from "@/lib/whatsapp";
import { usePublicSettings } from "@/components/public-settings-provider";

export function BusinessWhatsAppLink({
  message,
  children,
  className,
  ariaLabel,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const settings = usePublicSettings();
  return (
    <a
      className={className}
      href={createWhatsAppUrl(message, settings.whatsapp_number)}
      target="_blank"
      rel="noreferrer"
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}
