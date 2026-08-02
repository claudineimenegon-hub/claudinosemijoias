-- Claudino Semijoias - esquema inicial do banco
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','editor')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sku text unique,
  category_id uuid references public.categories(id) on delete set null,
  price numeric(12,2) not null check (price >= 0),
  promotional_price numeric(12,2) check (promotional_price is null or promotional_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  featured boolean not null default false,
  weight_grams integer check (weight_grams is null or weight_grams >= 0),
  image_url text,
  gallery jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','shipped','delivered')),
  payment_method text,
  subtotal numeric(12,2) not null default 0,
  shipping numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  items jsonb not null default '[]'::jsonb,
  shipping_address jsonb not null default '{}'::jsonb,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists store_settings_set_updated_at on public.store_settings;
create trigger store_settings_set_updated_at before update on public.store_settings
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

-- Catálogo público
create policy "public_read_categories" on public.categories
for select using (active = true);

create policy "public_read_products" on public.products
for select using (active = true);

create policy "public_read_store_settings" on public.store_settings
for select using (key not like 'secret_%');

-- Administração autenticada
create policy "admin_manage_categories" on public.categories
for all using (public.is_admin()) with check (public.is_admin());

create policy "admin_manage_products" on public.products
for all using (public.is_admin()) with check (public.is_admin());

create policy "admin_manage_store_settings" on public.store_settings
for all using (public.is_admin()) with check (public.is_admin());

create policy "admin_read_orders" on public.orders
for select using (public.is_admin());

create policy "admin_manage_orders" on public.orders
for update using (public.is_admin()) with check (public.is_admin());

-- Pedidos são inseridos apenas por função segura da Netlify usando service role.
