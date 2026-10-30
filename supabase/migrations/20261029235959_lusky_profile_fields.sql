alter table public.lusky_profiles add column if not exists full_name text not null default '';
alter table public.lusky_profiles add column if not exists phone text not null default '';
alter table public.lusky_profiles add column if not exists contact_preference text not null default 'app';
