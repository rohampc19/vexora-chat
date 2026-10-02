-- VEXORA CHAT monetization / profile customization
alter table users
  add column if not exists is_premium boolean not null default false,
  add column if not exists premium_plan varchar(40),
  add column if not exists premium_start_date timestamptz,
  add column if not exists premium_end_date timestamptz,
  add column if not exists subscription_status varchar(20) not null default 'inactive'
    check (subscription_status in ('inactive','active','expired','cancelled'));

create table if not exists monetization_plans (
  id uuid primary key default gen_random_uuid(),
  code varchar(40) unique not null,
  name varchar(80) not null,
  duration_days integer not null check(duration_days > 0),
  price_toman bigint not null check(price_toman >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists coin_packages (
  id uuid primary key default gen_random_uuid(),
  code varchar(40) unique not null,
  coins integer not null check(coins > 0),
  price_toman bigint not null check(price_toman >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists store_items (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) unique not null,
  name varchar(120) not null,
  description varchar(500) not null default '',
  category varchar(40) not null,
  price integer not null default 0 check(price >= 0),
  currency varchar(12) not null default 'VEX',
  preview text,
  asset text,
  access_type varchar(20) not null default 'PAID' check(access_type in ('FREE','PREMIUM','PAID')),
  is_premium boolean not null default false,
  is_limited boolean not null default false,
  is_active boolean not null default true,
  consumable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wallets (
  user_id uuid primary key references users(id) on delete cascade,
  coin_balance integer not null default 0 check(coin_balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists inventory (
  user_id uuid not null references users(id) on delete cascade,
  item_id uuid not null references store_items(id) on delete cascade,
  quantity integer not null default 1 check(quantity > 0),
  purchased_at timestamptz not null default now(),
  primary key(user_id,item_id)
);

create table if not exists profile_customization (
  user_id uuid primary key references users(id) on delete cascade,
  background_item_id uuid references store_items(id) on delete set null,
  frame_item_id uuid references store_items(id) on delete set null,
  badge_item_id uuid references store_items(id) on delete set null,
  name_effect_item_id uuid references store_items(id) on delete set null,
  banner_item_id uuid references store_items(id) on delete set null,
  theme_item_id uuid references store_items(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  purpose varchar(30) not null check(purpose in ('premium_purchase','purchase_coin')),
  reference_id uuid not null,
  amount_toman bigint not null check(amount_toman >= 0),
  status varchar(20) not null default 'pending' check(status in ('pending','completed','failed','refunded')),
  provider varchar(30) not null default 'mock',
  gateway_reference varchar(160),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists wallet_transactions (
  transaction_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type varchar(30) not null check(type in ('purchase_coin','purchase_item','premium_purchase','refund','admin_adjustment')),
  amount bigint not null,
  currency varchar(12) not null,
  status varchar(20) not null default 'pending' check(status in ('pending','completed','failed','refunded')),
  reference_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_tx_user_created on wallet_transactions(user_id,created_at desc);
create index if not exists idx_inventory_user on inventory(user_id);
create index if not exists idx_store_items_category_active on store_items(category,is_active);
create index if not exists idx_payment_user_created on payment_intents(user_id,created_at desc);

insert into monetization_plans(code,name,duration_days,price_toman)
values
('monthly','ماهانه',30,79000),
('three_months','۳ ماهه',90,199000),
('yearly','سالانه',365,699000)
on conflict(code) do update set name=excluded.name,duration_days=excluded.duration_days,price_toman=excluded.price_toman;

insert into coin_packages(code,coins,price_toman)
values
('coins_100',100,100000),
('coins_250',250,230000),
('coins_500',500,430000),
('coins_1000',1000,790000)
on conflict(code) do update set coins=excluded.coins,price_toman=excluded.price_toman;

insert into store_items(code,name,description,category,price,currency,access_type,is_premium,is_active)
values
('frame_neon','Neon Frame','قاب نئونی آبی برای آواتار','frame',49,'VEX','PAID',false,true),
('frame_fire','Fire Frame','قاب ویژه آتشین','frame',59,'VEX','PAID',false,true),
('frame_cyber','Cyber Frame','قاب سایبری','frame',69,'VEX','PAID',false,true),
('frame_galaxy','Galaxy Frame','قاب کهکشانی','frame',79,'VEX','PAID',false,true),
('frame_diamond','Diamond Frame','قاب الماسی','frame',99,'VEX','PAID',false,true),
('bg_cyber_city','Cyber City','پس‌زمینه شهر سایبری','background',79,'VEX','PAID',false,true),
('bg_space','Space','پس‌زمینه فضایی','background',69,'VEX','PAID',false,true),
('bg_gaming_room','Gaming Room','اتاق گیمینگ','background',59,'VEX','PAID',false,true),
('bg_neon_grid','Neon Grid','شبکه نئونی','background',49,'VEX','PAID',false,true),
('bg_dark_future','Dark Future','آینده تاریک','background',89,'VEX','PAID',false,true),
('badge_king','King','نشان King','badge',99,'VEX','PAID',false,true),
('badge_pro','Pro Gamer','نشان Pro Gamer','badge',69,'VEX','PAID',false,true),
('badge_og','OG','نشان OG','badge',59,'VEX','PAID',false,true),
('badge_legend','Legend','نشان Legend','badge',89,'VEX','PAID',false,true),
('badge_night','Night Gamer','نشان Night Gamer','badge',49,'VEX','PAID',false,true),
('name_neon','Neon','افکت اسم نئونی','name_effect',49,'VEX','PAID',false,true),
('name_fire','Fire','افکت اسم آتشین','name_effect',59,'VEX','PAID',false,true),
('name_electric','Electric','افکت الکتریکی','name_effect',69,'VEX','PAID',false,true),
('name_glitch','Glitch','افکت گلیچ','name_effect',79,'VEX','PAID',false,true),
('name_rainbow','Rainbow','افکت رنگین‌کمانی','name_effect',89,'VEX','PAID',false,true),
('sticker_gg','GG','استیکر GG','sticker',15,'VEX','PAID',false,true),
('sticker_lol','LOL','استیکر LOL','sticker',15,'VEX','PAID',false,true),
('sticker_nice','Nice','استیکر Nice','sticker',15,'VEX','PAID',false,true),
('sticker_rage','Rage','استیکر Rage','sticker',15,'VEX','PAID',false,true),
('sticker_victory','Victory','استیکر Victory','sticker',20,'VEX','PAID',false,true),
('theme_cyan','Cyan Glass','تم شیشه‌ای Cyan','theme',0,'VEX','PREMIUM',true,true),
('theme_purple','Purple Glass','تم شیشه‌ای Purple','theme',0,'VEX','PREMIUM',true,true)
on conflict(code) do nothing;

insert into wallets(user_id)
select id from users on conflict(user_id) do nothing;

insert into profile_customization(user_id)
select id from users on conflict(user_id) do nothing;
