-- CondorWeb · Base de datos de leads (Supabase / Postgres)
-- Pega y ejecuta esto en: Supabase → SQL Editor → New query → Run

create table if not exists public.leads (
  id            bigint generated always as identity primary key,
  negocio       text,
  tipo          text,
  web           text,
  clientes_mes  text,
  origen        text,
  problema      text,
  instagram     text,
  whatsapp      text,
  email         text,
  diagnostico   text,
  problemas     jsonb,
  recomendacion text,
  creado_en     timestamptz default now()
);

-- Categorización automática del lead (la IA lo clasifica al generar el diagnóstico)
alter table public.leads add column if not exists categoria  text;  -- Listo para comprar / Interesado / Explorando
alter table public.leads add column if not exists prioridad  text;  -- Alta / Media / Baja

-- Email marketing (Sofia): estado del lead + en qué email de la secuencia va
alter table public.leads add column if not exists estado     text default 'activo'; -- activo / cliente / baja
alter table public.leads add column if not exists email_paso int  default 0;

create index if not exists idx_leads_creado on public.leads (creado_en desc);
create index if not exists idx_leads_email  on public.leads (email);

-- Seguridad: activamos RLS y NO creamos políticas públicas.
-- Las Edge Functions escriben con la "service role key" (que ignora RLS),
-- así que el público NUNCA puede leer ni escribir las tablas directamente.
alter table public.leads enable row level security;

-- =========================================================
-- Contenido para redes sociales (generado por IA)
-- =========================================================
create table if not exists public.contenido (
  id         bigint generated always as identity primary key,
  plataforma text,                 -- Instagram / Facebook / TikTok
  formato    text,                 -- Post / Reel / Historia
  titulo     text,
  copy       text,
  hashtags   text,
  estado     text default 'borrador',
  creado_en  timestamptz default now()
);
alter table public.contenido enable row level security;
