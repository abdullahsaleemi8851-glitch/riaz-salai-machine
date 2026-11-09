import { SitePageFrame } from "@/components/site-page-frame";
import { ProductCatalogue } from "@/components/product-catalogue";

export const metadata = { title: "New Sewing Machines" };

export default function NewMachinesPage() {
  return (
    <SitePageFrame
      title="New sewing machines"
      titleUr="نئی سلائی مشینیں"
      description="Ask about new sewing machines and current availability. Product prices and stock will be shown when the shop publishes its catalogue."
      descriptionUr="نئی سلائی مشینوں اور دستیابی کے بارے میں پوچھیں۔ دکان کی فہرست میں مصنوعات شامل ہونے پر قیمت اور دستیابی یہاں نظر آئے گی۔"
    >
      <ProductCatalogue productType="new_machine" />
    </SitePageFrame>
  );
}
