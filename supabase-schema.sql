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
  role text,
  phone text,
  password text,
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

insert into settings (id, data) values ('global', '{}') on conflict do nothing;

-- Disable RLS for all tables (since the frontend accesses directly right now like it did with firebase)
alter table products disable row level security;
alter table categories disable row level security;
alter table users disable row level security;
alter table orders disable row level security;
alter table updates disable row level security;
alter table settings disable row level security;
