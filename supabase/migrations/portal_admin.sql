-- condor.ai · Roles admin/cliente para el portal
-- Pega y ejecuta en: Supabase -> SQL Editor -> New query -> Run

-- 1) Tabla de admins (el equipo condor.ai)
create table if not exists public.admins (
  email  text primary key,
  nombre text
);

insert into public.admins (email, nombre) values
  ('j.ignaciomunozsilva@gmail.com',        'Joaquín'),
  ('maximilianopinocv@gmail.com',          'Maximiliano'),
  ('alejandrotobarq@gmail.com',            'Alejandro'),
  ('samuelisaacospitiaquintero@gmail.com', 'Samuel')
on conflict (email) do nothing;

alter table public.admins enable row level security;
-- Cada usuario puede ver SOLO su propia fila de admin (para saber si lo es)
drop policy if exists "ver_mi_admin" on public.admins;
create policy "ver_mi_admin" on public.admins
  for select using ( email = (select auth.jwt() ->> 'email') );

-- 2) Función para chequear admin (ignora RLS de forma segura)
create or replace function public.es_admin() returns boolean
  language sql security definer stable as $$
  select exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'));
$$;
grant execute on function public.es_admin() to anon, authenticated;

-- 3) Los admins pueden VER y GESTIONAR todo (clientes y pagos)
drop policy if exists "admin_all_clientes" on public.clientes;
create policy "admin_all_clientes" on public.clientes
  for all using ( public.es_admin() ) with check ( public.es_admin() );

drop policy if exists "admin_all_pagos" on public.pagos;
create policy "admin_all_pagos" on public.pagos
  for all using ( public.es_admin() ) with check ( public.es_admin() );

-- (Las políticas de cliente "ve lo suyo" siguen vigentes: un cliente normal
--  solo ve su propia ficha y sus propios pagos.)
