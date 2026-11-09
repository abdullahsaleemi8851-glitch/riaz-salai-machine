const BUSINESS_WHATSAPP = "923280070651";

export function createWhatsAppUrl(message: string, phone = BUSINESS_WHATSAPP) {
  const digits = phone.replace(/\D/g, "");
  const normalizedPhone = digits.startsWith("0")
    ? `92${digits.slice(1)}`
    : digits.startsWith("92")
      ? digits
      : digits.length === 10 && digits.startsWith("3")
        ? `92${digits}`
        : digits;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
