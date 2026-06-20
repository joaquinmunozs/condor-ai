-- condor.ai · Seguridad de acceso (gating + rate limit)
-- Ejecuta en Supabase → SQL Editor → New query → Run

-- Tabla para limitar intentos por IP (anti-bot). La escribe solo la Edge Function (service role).
create table if not exists public.rate_limits (
  clave        text primary key,        -- ej: "otp:1.2.3.4"
  conteo       int  default 0,
  reinicia_en  timestamptz
);
alter table public.rate_limits enable row level security;  -- sin políticas públicas: solo service role

-- Función segura: ¿este correo está autorizado a recibir código? (admin o cliente)
-- security definer para poder leer admins/clientes ignorando RLS, sin exponer las tablas.
create or replace function public.correo_autorizado(p_email text)
returns boolean
language sql
security definer
stable
as $$
  select exists(select 1 from public.admins   where lower(email) = lower(p_email))
      or exists(select 1 from public.clientes where lower(email) = lower(p_email) and archivado is not true);
$$;
-- No damos execute a anon/authenticated: solo la Edge Function (service role) la usa.
revoke all on function public.correo_autorizado(text) from anon, authenticated;
