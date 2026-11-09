create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ur text not null default '',
  description_en text not null default '',
  description_ur text not null default '',
  image_url text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name_en text not null,
  name_ur text not null default '',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ur text not null default '',
  description_en text not null default '',
  description_ur text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  show_stock boolean not null default true,
  show_exact_quantity boolean not null default false,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  product_type text not null default 'spare_part'
    check (product_type in ('spare_part', 'new_machine', 'used_machine')),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_en text not null default '',
  alt_ur text not null default '',
  display_order integer not null default 0,
  is_main boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, storage_path)
);

create unique index if not exists product_images_one_main_per_product
  on public.product_images(product_id) where is_main;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text not null,
  title_ur text not null default '',
  body_en text not null default '',
  body_ur text not null default '',
  is_featured boolean not null default false,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null,
  alt_en text not null default '',
  alt_ur text not null default '',
  display_order integer not null default 0
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  phone text not null check (char_length(phone) between 7 and 30),
  message text not null check (char_length(message) between 5 and 2000),
  language text not null default 'en' check (language in ('en', 'ur')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inquiry_notes (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  note text not null check (char_length(note) between 1 and 5000),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.website_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_ur text not null default '',
  description_en text not null default '',
  description_ur text not null default '',
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_images (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  storage_path text not null,
  alt_en text not null default '',
  alt_ur text not null default '',
  display_order integer not null default 0
);

create index if not exists categories_active_order_idx on public.categories(is_active, display_order);
create index if not exists subcategories_category_order_idx on public.subcategories(category_id, display_order);
create index if not exists products_published_created_idx on public.products(is_published, created_at desc);
create index if not exists products_price_idx on public.products(price);
create index if not exists products_name_en_idx on public.products using gin (to_tsvector('simple', name_en));
create index if not exists products_name_ur_idx on public.products using gin (to_tsvector('simple', name_ur));
create index if not exists product_categories_category_idx on public.product_categories(category_id, product_id);
create index if not exists posts_published_created_idx on public.posts(is_published, published_at desc);
create index if not exists inquiries_status_created_idx on public.inquiries(status, created_at desc);

create or replace view public.public_products
with (security_barrier = true)
as
select
  p.id,
  p.name_en,
  p.name_ur,
  p.description_en,
  p.description_ur,
  p.price,
  p.product_type,
  p.created_at,
  case
    when p.show_stock then case when p.stock_quantity > 0 then 'available' else 'out_of_stock' end
    else null
  end as stock_status,
  case
    when p.show_stock and p.show_exact_quantity then p.stock_quantity
    else null
  end as public_quantity
from public.products p
where p.is_published;

grant select on public.public_products to anon, authenticated;
revoke all on public.public_products from public;
revoke select on public.products from anon;
grant select (id, is_published) on public.products to anon;
grant select on public.products to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['categories', 'subcategories', 'products', 'posts', 'inquiries', 'services', 'website_settings'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
  end loop;
end;
$$;

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_images enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.inquiries enable row level security;
alter table public.inquiry_notes enable row level security;
alter table public.website_settings enable row level security;
alter table public.services enable row level security;
alter table public.service_images enable row level security;

drop policy if exists "Admins can view admin membership" on public.admin_users;
create policy "Admins can view admin membership" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories" on public.categories
  for select to anon, authenticated using (is_active or (select public.is_admin()));
drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can read subcategories of active categories" on public.subcategories;
create policy "Public can read subcategories of active categories" on public.subcategories
  for select to anon, authenticated using (
    exists (select 1 from public.categories c where c.id = category_id and c.is_active)
    or (select public.is_admin())
  );
drop policy if exists "Admins manage subcategories" on public.subcategories;
create policy "Admins manage subcategories" on public.subcategories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can read published products" on public.products;
create policy "Public can read published products" on public.products
  for select to anon, authenticated using (is_published or (select public.is_admin()));
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can read product category links" on public.product_categories;
create policy "Public can read product category links" on public.product_categories
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_id and p.is_published)
    or (select public.is_admin())
  );
drop policy if exists "Admins manage product category links" on public.product_categories;
create policy "Admins manage product category links" on public.product_categories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can read images of published products" on public.product_images;
create policy "Public can read images of published products" on public.product_images
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_id and p.is_published)
    or (select public.is_admin())
  );
drop policy if exists "Admins manage product images" on public.product_images;
create policy "Admins manage product images" on public.product_images
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can read published posts" on public.posts;
create policy "Public can read published posts" on public.posts
  for select to anon, authenticated using (is_published or (select public.is_admin()));
drop policy if exists "Admins manage posts" on public.posts;
create policy "Admins manage posts" on public.posts
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can read images of published posts" on public.post_images;
create policy "Public can read images of published posts" on public.post_images
  for select to anon, authenticated using (
    exists (select 1 from public.posts p where p.id = post_id and p.is_published)
    or (select public.is_admin())
  );
drop policy if exists "Admins manage post images" on public.post_images;
create policy "Admins manage post images" on public.post_images
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can submit inquiries" on public.inquiries;
create policy "Public can submit inquiries" on public.inquiries
  for insert to anon, authenticated with check (
    status = 'new'
    and char_length(customer_name) between 2 and 100
    and char_length(phone) between 7 and 30
    and phone ~ '^[+0-9 ()-]+$'
    and char_length(message) between 5 and 2000
  );
drop policy if exists "Admins manage inquiries" on public.inquiries;
create policy "Admins manage inquiries" on public.inquiries
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Admins manage inquiry notes" on public.inquiry_notes;
create policy "Admins manage inquiry notes" on public.inquiry_notes
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can read public website settings" on public.website_settings;
create policy "Public can read public website settings" on public.website_settings
  for select to anon, authenticated using (key in ('business', 'home', 'about') or (select public.is_admin()));
drop policy if exists "Admins manage website settings" on public.website_settings;
create policy "Admins manage website settings" on public.website_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.website_settings (key, value)
values
  ('business', jsonb_build_object(
    'business_name', 'Riaz Salai Machine',
    'logo_text', 'RIAZ SALAI MACHINE',
    'logo_url', '',
    'whatsapp_number', '03280070651',
    'phone_number', '',
    'email', 'riaz.sewing.machine.gojra@gmail.com',
    'address', 'Near Bara Imambargah, Main Bazar, Gojra, Pakistan.',
    'address_ur', 'بارہ امام بارگاہ کے قریب، مین بازار، گوجرہ، پاکستان',
    'maps_url', '',
    'instagram_url', ''
  )),
  ('home', jsonb_build_object(
    'banner_heading_en', 'Your Trusted Partner for Sewing Machines and Spare Parts',
    'banner_heading_ur', 'سلائی مشینوں اور پرزوں کے لیے آپ کا قابلِ اعتماد ساتھی',
    'banner_description_en', 'Sewing machine parts, new and pre-owned machines, and repair services — all in one place.',
    'banner_description_ur', 'سلائی مشین کے پرزے، نئی اور استعمال شدہ مشینیں، اور مرمت کی سہولت — آپ کے لیے ایک ہی جگہ۔',
    'banner_image_url', ''
  )),
  ('about', jsonb_build_object(
    'body_en', 'We offer sewing machine spare parts, new and used machines, and repair services from our shop in Gojra.',
    'body_ur', 'ہم گوجرہ میں سلائی مشین کے پرزے، نئی اور استعمال شدہ مشینیں اور مرمت کی خدمات فراہم کرتے ہیں۔',
    'footer_en', '',
    'footer_ur', ''
  ))
on conflict (key) do nothing;

drop policy if exists "Public can read published services" on public.services;
create policy "Public can read published services" on public.services
  for select to anon, authenticated using (is_published or (select public.is_admin()));
drop policy if exists "Admins manage services" on public.services;
create policy "Admins manage services" on public.services
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can read images of published services" on public.service_images;
create policy "Public can read images of published services" on public.service_images
  for select to anon, authenticated using (
    exists (select 1 from public.services s where s.id = service_id and s.is_published)
    or (select public.is_admin())
  );
drop policy if exists "Admins manage service images" on public.service_images;
create policy "Admins manage service images" on public.service_images
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.categories (slug, name_en, name_ur, display_order)
values
  ('juki-machines', 'Juki Machines', 'جُوکی مشینیں', 1),
  ('simple-sewing-machines', 'Simple Sewing Machines', 'سادہ سلائی مشینیں', 2),
  ('overlock-machines', 'Overlock Machines', 'اوورلاک مشینیں', 3),
  ('disc-embroidery-machines', 'Disc Embroidery Machines', 'ڈسک کڑھائی مشینیں', 4),
  ('103k-machines', '103K Machines', '103K مشینیں', 5),
  ('singer-machines', 'Singer Machines', 'سنگر مشینیں', 6),
  ('janome-machines', 'Janome Machines', 'جینوم مشینیں', 7),
  ('other-spare-parts', 'Other Spare Parts', 'دیگر پرزے', 8)
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-media', 'business-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view business media" on storage.objects;
create policy "Public can view business media" on storage.objects
  for select to anon, authenticated using (bucket_id = 'business-media');
drop policy if exists "Admins upload business media" on storage.objects;
create policy "Admins upload business media" on storage.objects
  for insert to authenticated with check (bucket_id = 'business-media' and (select public.is_admin()));
drop policy if exists "Admins update business media" on storage.objects;
create policy "Admins update business media" on storage.objects
  for update to authenticated using (bucket_id = 'business-media' and (select public.is_admin()))
  with check (bucket_id = 'business-media' and (select public.is_admin()));
drop policy if exists "Admins delete business media" on storage.objects;
create policy "Admins delete business media" on storage.objects
  for delete to authenticated using (bucket_id = 'business-media' and (select public.is_admin()));
