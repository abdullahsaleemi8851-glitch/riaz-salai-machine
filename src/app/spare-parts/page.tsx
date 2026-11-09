import { SitePageFrame } from "@/components/site-page-frame";
import { ProductCatalogue } from "@/components/product-catalogue";

export const metadata = { title: "Sewing Machine Spare Parts" };

export default async function SparePartsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string | string[]; category?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialSearch = Array.isArray(params.search) ? params.search[0] : params.search;
  const initialCategoryId = Array.isArray(params.category) ? params.category[0] : params.category;

  return (
    <SitePageFrame
      title="Sewing machine spare parts"
      titleUr="سلائی مشین کے پرزے"
      description="Browse parts for Juki, Singer, Janome, overlock, simple sewing, and other machines. Ask us if you need help finding the right part."
      descriptionUr="جُوکی، سنگر، جینوم، اوورلاک، سادہ سلائی اور دیگر مشینوں کے پرزے دیکھیں۔ صحیح پرزہ تلاش کرنے میں مدد کے لیے ہم سے رابطہ کریں۔"
    >
      <ProductCatalogue initialSearch={initialSearch} initialCategoryId={initialCategoryId} />
    </SitePageFrame>
  );
}
