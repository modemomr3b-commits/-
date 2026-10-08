-- قم بنسخ هذا الكود بالكامل ولصقه في قسم SQL Editor في لوحة تحكم Supabase الخاصة بك ثم اضغط RUN

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text,
  description text,
  category text,
  size jsonb,
  "costPrice" numeric,
  "sellingPrice" numeric,
  "imageUrl" text,
  stock numeric,
  "minStock" numeric,
  "qrCode" text,
  "isArchived" boolean default false,
  "isDeleted" boolean default false,
  "deletedAt" bigint,
  "deletedBy" text,
  "createdAt" bigint
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text,
  description text,
  icon text,
  "isDeleted" boolean default false,
  "deletedAt" bigint,
  "deletedBy" text,
  "createdAt" bigint
);

create table if not exists users (
  id text primary key,
  uid text,
  email text,
  username text,
  "fullName" text,
  role text,
  phone text,
  password text,
  status text default 'active',
  "allowedDevice" text default 'all',
  "lastActive" bigint,
  "currentPage" text,
  "isOnline" boolean default false,
  "allowedPages" jsonb,
  "isDeleted" boolean default false,
  "deletedAt" bigint,
  "deletedBy" text,
  "createdAt" bigint
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  "orderNumber" text,
  "customerName" text,
  "customerPhone" text,
  address text,
  status text,
  notes text,
  total numeric,
  products jsonb,
  "userId" text,
  username text,
  unread boolean default true,
  "isDeleted" boolean default false,
  "deletedAt" bigint,
  "deletedBy" text,
  "createdAt" bigint
);

create table if not exists updates (
  id uuid primary key default gen_random_uuid(),
  title text,
  message text,
  date bigint,
  action text,
  "isDeleted" boolean default false,
  "deletedAt" bigint,
  "deletedBy" text,
  "createdAt" bigint
);

create table if not exists settings (
  id text primary key,
  data jsonb
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  "userId" text,
  "userName" text,
  "action" text,
  "entityType" text,
  "entityId" text,
  "details" jsonb,
  "createdAt" bigint
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  "userId" text,
  "message" text,
  "type" text,
  "read" boolean default false,
  "createdAt" bigint,
  "isDeleted" boolean default false,
  "deletedAt" bigint,
  "deletedBy" text
);

insert into settings (id, data) values ('global', '{}') on conflict do nothing;

-- Disable RLS for all tables (since the frontend accesses directly right now like it did with firebase)
-- Instead of just disabling, we ensure that if it is enabled, there are public access policies.
alter table products enable row level security;
alter table categories enable row level security;
alter table users enable row level security;
alter table orders enable row level security;
alter table updates enable row level security;
alter table settings enable row level security;
alter table activity_logs enable row level security;
alter table notifications enable row level security;

drop policy if exists "public all" on products;
create policy "public all" on products for all using (true) with check (true);

drop policy if exists "public all" on categories;
create policy "public all" on categories for all using (true) with check (true);

drop policy if exists "public all" on users;
create policy "public all" on users for all using (true) with check (true);

drop policy if exists "public all" on orders;
create policy "public all" on orders for all using (true) with check (true);

drop policy if exists "public all" on updates;
create policy "public all" on updates for all using (true) with check (true);

drop policy if exists "public all" on settings;
create policy "public all" on settings for all using (true) with check (true);

drop policy if exists "public all" on activity_logs;
create policy "public all" on activity_logs for all using (true) with check (true);

drop policy if exists "public all" on notifications;
create policy "public all" on notifications for all using (true) with check (true);

