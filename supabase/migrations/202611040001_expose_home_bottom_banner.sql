begin;

do $$
begin
  if to_regclass('public.website_settings') is null
    or to_regclass('public.public_website_settings') is null
    or to_regprocedure('public.get_public_website_settings()') is null then
    raise exception 'Required website settings objects are missing; no changes were made.';
  end if;

  if not exists (
    select 1
    from pg_class c
    where c.oid = 'public.website_settings'::regclass
      and c.relrowsecurity
  ) then
    raise exception 'RLS is not enabled on public.website_settings; no changes were made.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'website_settings'
      and policyname = 'Admins manage website settings'
      and cmd = 'ALL'
  ) then
    raise exception 'Expected Admin settings policy is missing; no changes were made.';
  end if;
end
$$;

create or replace function public.get_public_website_settings()
returns table (key text, value jsonb)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    s.key,
    case s.key
      when 'business' then pg_catalog.jsonb_build_object(
        'business_name', s.value -> 'business_name',
        'logo_text', s.value -> 'logo_text',
        'logo_url', s.value -> 'logo_url',
        'whatsapp_number', s.value -> 'whatsapp_number',
        'phone_number', s.value -> 'phone_number',
        'email', s.value -> 'email',
        'address', s.value -> 'address',
        'address_ur', s.value -> 'address_ur',
        'maps_url', s.value -> 'maps_url',
        'instagram_url', s.value -> 'instagram_url'
      )
      when 'home' then pg_catalog.jsonb_build_object(
        'banner_heading_en', s.value -> 'banner_heading_en',
        'banner_heading_ur', s.value -> 'banner_heading_ur',
        'banner_description_en', s.value -> 'banner_description_en',
        'banner_description_ur', s.value -> 'banner_description_ur',
        'banner_image_url', s.value -> 'banner_image_url',
        'bottom_banner_image_url', s.value -> 'bottom_banner_image_url'
      )
      when 'about' then pg_catalog.jsonb_build_object(
        'body_en', s.value -> 'body_en',
        'body_ur', s.value -> 'body_ur',
        'footer_en', s.value -> 'footer_en',
        'footer_ur', s.value -> 'footer_ur'
      )
    end as value
  from public.website_settings as s
  where s.key in ('business', 'home', 'about');
$function$;

alter function public.get_public_website_settings() owner to postgres;

revoke all privileges
  on function public.get_public_website_settings()
  from public, anon, authenticated;

grant execute
  on function public.get_public_website_settings()
  to anon, authenticated;

commit;
