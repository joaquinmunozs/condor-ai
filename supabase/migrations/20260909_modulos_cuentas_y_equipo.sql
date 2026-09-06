-- Cóndor AI · Centro de cuentas y directorio de equipo.
-- Una cuenta deja de ser una tarjeta aislada: puede pertenecer a un módulo
-- operativo (por ejemplo "Marketing Cóndor" o "Infraestructura").

create table if not exists public.modulos_cuentas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  descripcion text,
  cliente_id uuid references public.clientes(id) on delete set null,
  color text not null default 'azul'
    check (color in ('azul', 'violeta', 'verde', 'naranjo', 'gris')),
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists modulos_cuentas_cliente_idx
  on public.modulos_cuentas (cliente_id) where cliente_id is not null;
alter table public.modulos_cuentas enable row level security;
drop policy if exists "admin_all_modulos_cuentas" on public.modulos_cuentas;
create policy "admin_all_modulos_cuentas" on public.modulos_cuentas
  for all using (public.es_admin()) with check (public.es_admin());

alter table public.notas_internas
  add column if not exists modulo_cuenta_id uuid
  references public.modulos_cuentas(id) on delete set null;
create index if not exists notas_internas_modulo_cuenta_idx
  on public.notas_internas (modulo_cuenta_id, actualizado_en desc)
  where modulo_cuenta_id is not null;

-- El directorio es deliberadamente de altas/ediciones, no de bajas: retirar
-- a alguien del acceso es una decisión sensible y no un click casual.
drop policy if exists "ver_mi_admin" on public.admins;
drop policy if exists "staff_ve_equipo" on public.admins;
drop policy if exists "staff_agrega_equipo" on public.admins;
drop policy if exists "staff_actualiza_equipo" on public.admins;
create policy "staff_ve_equipo" on public.admins for select using (public.es_admin());
create policy "staff_agrega_equipo" on public.admins for insert with check (public.es_admin());
create policy "staff_actualiza_equipo" on public.admins for update using (public.es_admin()) with check (public.es_admin());

notify pgrst, 'reload schema';
