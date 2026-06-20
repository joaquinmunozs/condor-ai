-- condor.ai · Cierre de vulnerabilidades V3, V4, V5
-- Ejecuta en Supabase → SQL Editor → New query → Run

-- V3 · Asegurar RLS activo en TODAS las tablas (sin políticas públicas = nadie lee/escribe directo).
-- Idempotente: si ya está activo, no pasa nada.
alter table if exists public.leads        enable row level security;
alter table if exists public.contenido    enable row level security;
alter table if exists public.rate_limits  enable row level security;
alter table if exists public.clientes     enable row level security;
alter table if exists public.pagos        enable row level security;
alter table if exists public.admins       enable row level security;

-- V5 · Log de intentos de acceso (para detectar abuso de envío de códigos).
create table if not exists public.acceso_log (
  id          bigint generated always as identity primary key,
  email       text,
  ip          text,
  autorizado  boolean,
  creado_en   timestamptz default now()
);
alter table public.acceso_log enable row level security;  -- solo service role escribe/lee
create index if not exists idx_acceso_log_creado on public.acceso_log (creado_en desc);
create index if not exists idx_acceso_log_ip on public.acceso_log (ip, creado_en desc);

-- Verificación: lista qué tablas tienen RLS activo (rowsecurity debe ser true en todas)
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('leads','contenido','rate_limits','clientes','pagos','admins','acceso_log')
order by tablename;
