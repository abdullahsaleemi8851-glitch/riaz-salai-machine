begin;

do $$
declare
  expected record;
  public_policy record;
  admin_policy record;
  rls_enabled boolean;
  policy_count integer;
  column_grant record;
  grantee_sql text;
begin
  if to_regclass('public.public_products') is null then
    raise exception 'Preflight failed: the existing secure public.public_products view is missing.';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'public_products'
      and c.relkind = 'v'
      and coalesce(c.reloptions, array[]::text[]) @> array['security_invoker=true']
  ) then
    raise exception 'Preflight failed: public.public_products must remain a SECURITY INVOKER view.';
  end if;

  if not exists (
    select 1
    from pg_attribute a
    where a.attrelid = 'public.public_products'::regclass
      and a.attname = 'id'
      and a.attnum > 0
      and not a.attisdropped
  ) then
    raise exception 'Preflight failed: public.public_products does not expose the product id required by the public read policies.';
  end if;

  if not has_table_privilege('anon', 'public.public_products', 'SELECT')
    or not has_table_privilege('authenticated', 'public.public_products', 'SELECT') then
    raise exception 'Preflight failed: anon and authenticated must be able to read the existing public.public_products view.';
  end if;

  for expected in
    select *
    from (values
      ('categories', 'Public can read active categories', 'Admins manage categories', 'is_active', null),
      ('subcategories', 'Public can read subcategories of active categories', 'Admins manage subcategories', 'is_active', 'categories'),
      ('product_categories', 'Public can read product category links', 'Admins manage product category links', 'is_published', null),
      ('product_images', 'Public can read images of published products', 'Admins manage product images', 'is_published', null),
      ('posts', 'Public can read published posts', 'Admins manage posts', 'is_published', null),
      ('post_images', 'Public can read images of published posts', 'Admins manage post images', 'is_published', null),
      ('services', 'Public can read published services', 'Admins manage services', 'is_published', null),
      ('service_images', 'Public can read images of published services', 'Admins manage service images', 'is_published', null)
    ) as expected_policies(table_name, public_policy_name, admin_policy_name, required_filter, secondary_filter)
  loop
    select c.relrowsecurity
    into rls_enabled
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = expected.table_name
      and c.relkind = 'r';

    if rls_enabled is distinct from true then
      raise exception 'Preflight failed: RLS is not enabled on public.%', expected.table_name;
    end if;

    select count(*)
    into policy_count
    from pg_policies
    where schemaname = 'public'
      and tablename = expected.table_name;

    if policy_count <> 2 then
      raise exception 'Preflight failed: expected exactly the known public-read and Admin policies on public.%; found %. Review unknown policies manually; none were removed.',
        expected.table_name, policy_count;
    end if;

    select *
    into public_policy
    from pg_policies
    where schemaname = 'public'
      and tablename = expected.table_name
      and policyname = expected.public_policy_name;

    if not found then
      raise exception 'Preflight failed: expected policy "%" is missing on public.%',
        expected.public_policy_name, expected.table_name;
    end if;

    if public_policy.cmd <> 'SELECT'
      or public_policy.permissive <> 'PERMISSIVE'
      or cardinality(public_policy.roles) <> 2
      or not (public_policy.roles @> array['anon'::name, 'authenticated'::name])
      or (
        position(expected.required_filter in lower(coalesce(public_policy.qual, ''))) = 0
        and not (
          expected.table_name in ('product_categories', 'product_images')
          and position('public_products' in lower(coalesce(public_policy.qual, ''))) > 0
        )
      )
      or position('is_admin' in lower(coalesce(public_policy.qual, ''))) = 0 then
      raise exception 'Preflight failed: public policy "%" on public.% does not match the expected role, command, and row-filter shape.',
        expected.public_policy_name, expected.table_name;
    end if;

    if expected.secondary_filter is not null
      and position(expected.secondary_filter in lower(coalesce(public_policy.qual, ''))) = 0 then
      raise exception 'Preflight failed: public policy "%" on public.% is missing its required related-table filter.',
        expected.public_policy_name, expected.table_name;
    end if;

    select *
    into admin_policy
    from pg_policies
    where schemaname = 'public'
      and tablename = expected.table_name
      and policyname = expected.admin_policy_name;

    if not found then
      raise exception 'Preflight failed: expected Admin policy "%" is missing on public.%',
        expected.admin_policy_name, expected.table_name;
    end if;

    if admin_policy.cmd <> 'ALL'
      or admin_policy.permissive <> 'PERMISSIVE'
      or cardinality(admin_policy.roles) <> 1
      or not (admin_policy.roles @> array['authenticated'::name])
      or position('is_admin' in lower(coalesce(admin_policy.qual, ''))) = 0
      or position('is_admin' in lower(coalesce(admin_policy.with_check, ''))) = 0 then
      raise exception 'Preflight failed: Admin policy "%" on public.% does not preserve Admin-only CRUD checks.',
        expected.admin_policy_name, expected.table_name;
    end if;
  end loop;

  for column_grant in
    select table_name, column_name, grantee, privilege_type
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name in (
        'categories', 'subcategories', 'product_categories', 'product_images',
        'posts', 'post_images', 'services', 'service_images'
      )
      and grantee in ('PUBLIC', 'anon')
  loop
    grantee_sql := case
      when column_grant.grantee = 'PUBLIC' then 'PUBLIC'
      else quote_ident(column_grant.grantee)
    end;

    execute format(
      'REVOKE %s (%I) ON TABLE public.%I FROM %s',
      column_grant.privilege_type,
      column_grant.column_name,
      column_grant.table_name,
      grantee_sql
    );
  end loop;
end;
$$;

drop policy "Public can read product category links" on public.product_categories;
create policy "Public can read product category links" on public.product_categories
  for select to anon, authenticated using (
    (
      exists (
        select 1
        from public.public_products pp
        where pp.id = product_id
      )
      and exists (
        select 1
        from public.categories c
        where c.id = category_id
          and c.is_active
      )
    )
    or (select public.is_admin())
  );

drop policy "Public can read images of published products" on public.product_images;
create policy "Public can read images of published products" on public.product_images
  for select to anon, authenticated using (
    exists (
      select 1
      from public.public_products pp
      where pp.id = product_id
    )
    or (select public.is_admin())
  );

revoke all privileges on table
  public.categories,
  public.subcategories,
  public.product_categories,
  public.product_images,
  public.posts,
  public.post_images,
  public.services,
  public.service_images
from public, anon;

grant select on table
  public.categories,
  public.subcategories,
  public.product_categories,
  public.product_images,
  public.posts,
  public.post_images,
  public.services,
  public.service_images
to anon, authenticated;

grant insert, update, delete on table
  public.categories,
  public.subcategories,
  public.product_categories,
  public.product_images,
  public.posts,
  public.post_images,
  public.services,
  public.service_images
to authenticated;

commit;

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'categories', 'subcategories', 'product_categories', 'product_images',
    'posts', 'post_images', 'services', 'service_images'
  )
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'categories', 'subcategories', 'product_categories', 'product_images',
    'posts', 'post_images', 'services', 'service_images'
  )
order by tablename, policyname;

with expected_tables(table_name) as (
  values
    ('categories'), ('subcategories'), ('product_categories'), ('product_images'),
    ('posts'), ('post_images'), ('services'), ('service_images')
)
select
  table_name,
  has_table_privilege('anon', format('public.%I', table_name), 'SELECT') as anon_select,
  has_table_privilege('anon', format('public.%I', table_name), 'INSERT') as anon_insert,
  has_table_privilege('anon', format('public.%I', table_name), 'UPDATE') as anon_update,
  has_table_privilege('anon', format('public.%I', table_name), 'DELETE') as anon_delete,
  has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT') as authenticated_select,
  has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT') as authenticated_insert,
  has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE') as authenticated_update,
  has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE') as authenticated_delete
from expected_tables
order by table_name;

select
  grantee,
  table_name,
  column_name,
  privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and table_name in (
    'categories', 'subcategories', 'product_categories', 'product_images',
    'posts', 'post_images', 'services', 'service_images'
  )
  and grantee in ('PUBLIC', 'anon')
order by table_name, column_name, grantee, privilege_type;

select
  has_table_privilege('anon', 'public.public_products', 'SELECT') as anon_can_read_public_products,
  has_table_privilege('authenticated', 'public.public_products', 'SELECT') as authenticated_can_read_public_products;
