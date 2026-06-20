-- ── 1) Tablas (crear las 3 primero; las policies referencian entre tablas) ──

-- Perfiles de admins (se auto-puebla en el primer login de cada admin)
create table if not exists admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text not null,
  created_at timestamptz default now()
);

-- Reuniones
create table if not exists reuniones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  fecha_hora timestamptz not null,
  duracion_min int default 60,
  creado_por uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Participantes de reuniones
create table if not exists reuniones_admins (
  reunion_id uuid references reuniones(id) on delete cascade,
  admin_id uuid references auth.users(id),
  primary key (reunion_id, admin_id)
);

-- ── 2) Funciones SECURITY DEFINER ──
-- Rompen la recursión: una policy de 'reuniones' que consulta 'reuniones_admins'
-- (y viceversa) gatilla la RLS de la otra tabla en bucle. Estas funciones corren
-- con permisos del dueño (saltan RLS), así que las subconsultas NO re-disparan policies.
create or replace function public.es_participante(rid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from reuniones_admins where reunion_id = rid and admin_id = auth.uid())
$$;

create or replace function public.es_creador(rid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from reuniones where id = rid and creado_por = auth.uid())
$$;

-- ── 3) Row Level Security ──
alter table admin_profiles    enable row level security;
alter table reuniones         enable row level security;
alter table reuniones_admins  enable row level security;

-- ── 4) Policies ──

-- admin_profiles: cualquier admin autenticado puede ver todos los perfiles (para el multiselect)
drop policy if exists "admins_ven_perfiles" on admin_profiles;
create policy "admins_ven_perfiles" on admin_profiles for select using (auth.uid() is not null);
drop policy if exists "admins_upsert_perfil" on admin_profiles;
create policy "admins_upsert_perfil" on admin_profiles for insert with check (id = auth.uid());
drop policy if exists "admins_update_perfil" on admin_profiles;
create policy "admins_update_perfil" on admin_profiles for update using (id = auth.uid());

-- reuniones: el admin ve las que creó o donde está invitado (sin recursión, vía función)
drop policy if exists "ver_propias" on reuniones;
create policy "ver_propias" on reuniones for select using (
  creado_por = auth.uid() or public.es_participante(id)
);
drop policy if exists "crear_reunion" on reuniones;
create policy "crear_reunion" on reuniones for insert with check (creado_por = auth.uid());
drop policy if exists "borrar_reunion" on reuniones;
create policy "borrar_reunion" on reuniones for delete using (creado_por = auth.uid());

-- reuniones_admins: ves tus invitaciones o las de reuniones que creaste (sin recursión, vía función)
drop policy if exists "ver_participantes" on reuniones_admins;
create policy "ver_participantes" on reuniones_admins for select using (
  admin_id = auth.uid() or public.es_creador(reunion_id)
);
drop policy if exists "insertar_participantes" on reuniones_admins;
create policy "insertar_participantes" on reuniones_admins for insert with check (
  public.es_creador(reunion_id)
);
