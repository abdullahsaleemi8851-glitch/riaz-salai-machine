import { SitePageFrame } from "@/components/site-page-frame";
import { ProductCatalogue } from "@/components/product-catalogue";

export const metadata = { title: "Used Sewing Machines" };

export default function OldMachinesPage() {
  return (
    <SitePageFrame
      title="Used sewing machines"
      titleUr="استعمال شدہ سلائی مشینیں"
      description="See the used sewing machines currently listed by the shop. Contact us to confirm condition, availability, and price."
      descriptionUr="دکان کی فہرست میں موجود استعمال شدہ مشینیں دیکھیں۔ حالت، دستیابی اور قیمت کی تصدیق کے لیے رابطہ کریں۔"
    >
      <ProductCatalogue productType="used_machine" />
    </SitePageFrame>
  );
}
