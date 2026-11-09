begin;

do $$
begin
  if to_regclass('public.products') is null
    or to_regclass('public.inquiries') is null
    or to_regclass('public.inquiry_notes') is null then
    raise exception 'Required Admin tables are missing; no permissions were changed.';
  end if;

  if not exists (
    select 1
    from pg_class c
    where c.oid = 'public.products'::regclass
      and c.relrowsecurity
  ) or not exists (
    select 1
    from pg_class c
    where c.oid = 'public.inquiries'::regclass
      and c.relrowsecurity
  ) or not exists (
    select 1
    from pg_class c
    where c.oid = 'public.inquiry_notes'::regclass
      and c.relrowsecurity
  ) then
    raise exception 'RLS is not enabled for every affected table; no permissions were changed.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Admins manage products'
      and cmd = 'ALL'
  ) or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'inquiries'
      and policyname = 'Admins manage inquiries'
      and cmd = 'ALL'
  ) or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'inquiries'
      and policyname = 'Public can submit inquiries'
      and cmd = 'INSERT'
  ) or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'inquiry_notes'
      and policyname = 'Admins manage inquiry notes'
      and cmd = 'ALL'
  ) then
    raise exception 'Expected Admin/public inquiry policies are missing; no permissions were changed.';
  end if;
end
$$;

revoke all privileges on table public.inquiries, public.inquiry_notes
  from public, anon;

grant insert, update, delete on table public.products to authenticated;
grant insert on table public.inquiries to anon;
grant select, insert, update, delete
  on table public.inquiries, public.inquiry_notes
  to authenticated;

commit;

select
  has_table_privilege('anon', 'public.inquiries', 'INSERT') as anon_can_submit_inquiries,
  has_table_privilege('anon', 'public.inquiries', 'SELECT') as anon_can_read_inquiries,
  has_table_privilege('anon', 'public.inquiries', 'UPDATE') as anon_can_update_inquiries,
  has_table_privilege('anon', 'public.inquiries', 'DELETE') as anon_can_delete_inquiries,
  has_table_privilege('anon', 'public.inquiry_notes', 'SELECT') as anon_can_read_inquiry_notes,
  has_table_privilege('anon', 'public.inquiry_notes', 'INSERT') as anon_can_write_inquiry_notes,
  has_table_privilege('authenticated', 'public.inquiries', 'SELECT') as authenticated_can_read_inquiries,
  has_table_privilege('authenticated', 'public.inquiry_notes', 'SELECT') as authenticated_can_read_inquiry_notes,
  has_table_privilege('authenticated', 'public.products', 'INSERT') as authenticated_can_create_products,
  has_table_privilege('authenticated', 'public.products', 'UPDATE') as authenticated_can_update_products,
  has_table_privilege('authenticated', 'public.products', 'DELETE') as authenticated_can_delete_products;
