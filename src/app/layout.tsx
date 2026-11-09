import type { Metadata } from "next";
import { LanguageProvider } from "@/components/language-provider";
import { PublicSettingsProvider } from "@/components/public-settings-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Riaz Salai Machine | Sewing Machines & Spare Parts",
    template: "%s | Riaz Salai Machine",
  },
  description:
    "Sewing machine spare parts, new and used machines, and repair services in Main Bazar, Gojra.",
  openGraph: {
    type: "website",
    siteName: "Riaz Salai Machine",
    title: "Riaz Salai Machine | Sewing Machines & Spare Parts",
    description:
      "Sewing machine spare parts, new and used machines, and repair services in Main Bazar, Gojra.",
  },
  twitter: {
    card: "summary",
    title: "Riaz Salai Machine | Sewing Machines & Spare Parts",
    description:
      "Sewing machine spare parts, new and used machines, and repair services in Main Bazar, Gojra.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body><LanguageProvider><PublicSettingsProvider>{children}</PublicSettingsProvider></LanguageProvider></body>
    </html>
  );
}
