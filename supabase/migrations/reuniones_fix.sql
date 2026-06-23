-- ── Fix sistema de reuniones del portal (2026-06-23) ──
-- Arregla: reunión no se guardaba (faltaba columna 'cliente' en prod) y
-- "no la visualizan todos" (RLS dejaba ver solo a creador/invitados).
-- Aplicar en Supabase prod (SQL editor). Es idempotente: se puede correr varias veces.

-- 1) Columna 'cliente' que el panel ya inserta (causa raíz del INSERT que fallaba)
alter table public.reuniones add column if not exists cliente text;

-- 2) Visibilidad: cualquier admin ve TODAS las reuniones del equipo.
--    (Reemplaza la policy 'ver_propias' que limitaba a creador + participantes.)
drop policy if exists "ver_propias" on public.reuniones;
drop policy if exists "admins_ven_reuniones" on public.reuniones;
create policy "admins_ven_reuniones" on public.reuniones
  for select using ( public.es_admin() );

-- 3) Participantes: cualquier admin ve todos los participantes (para listar asistentes).
drop policy if exists "ver_participantes" on public.reuniones_admins;
drop policy if exists "admins_ven_participantes" on public.reuniones_admins;
create policy "admins_ven_participantes" on public.reuniones_admins
  for select using ( public.es_admin() );

-- 4) (Se mantienen) crear/borrar reunión e insertar participantes por el creador:
--    'crear_reunion', 'borrar_reunion' e 'insertar_participantes' de reuniones.sql.
--    Si por alguna razón no existieran, descomenta:
-- create policy "crear_reunion" on public.reuniones for insert with check ( creado_por = auth.uid() );
-- create policy "borrar_reunion" on public.reuniones for delete using ( creado_por = auth.uid() );
