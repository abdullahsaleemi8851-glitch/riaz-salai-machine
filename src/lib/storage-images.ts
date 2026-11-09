import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;

export function getBusinessMediaPath(url: string) {
  const marker = "/storage/v1/object/public/business-media/";
  const markerIndex = url.indexOf(marker);
  return markerIndex < 0 ? "" : decodeURIComponent(url.slice(markerIndex + marker.length));
}

export async function removeUnreferencedBusinessMedia(supabase: SupabaseBrowserClient, url: string, ownedPathPrefix: string) {
  const path = getBusinessMediaPath(url);
  if (!path || !path.startsWith(ownedPathPrefix)) return false;

  const [categoryResult, productResult, postResult, serviceResult, settingsResult] = await Promise.all([
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("image_url", url),
    supabase.from("product_images").select("id", { count: "exact", head: true }).eq("storage_path", path),
    supabase.from("post_images").select("id", { count: "exact", head: true }).eq("storage_path", path),
    supabase.from("service_images").select("id", { count: "exact", head: true }).eq("storage_path", path),
    supabase.from("website_settings").select("value"),
  ]);
  const queryError = categoryResult.error || productResult.error || postResult.error || serviceResult.error || settingsResult.error;
  if (queryError) throw queryError;

  const settingsStillReferenceImage = (settingsResult.data ?? []).some(({ value }) =>
    JSON.stringify(value).includes(url),
  );
  if (
    categoryResult.count ||
    productResult.count ||
    postResult.count ||
    serviceResult.count ||
    settingsStillReferenceImage
  ) return false;

  const { error: removeError } = await supabase.storage.from("business-media").remove([path]);
  if (removeError) throw removeError;
  return true;
}
