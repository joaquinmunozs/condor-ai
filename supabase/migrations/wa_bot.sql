-- ── Bot WhatsApp entrante (2026-06-23) ──
-- Historial de conversación + estado de handoff. Aplicar en Supabase prod.
-- Idempotente.

-- Historial de mensajes del bot de WhatsApp
create table if not exists public.wa_mensajes (
  id          bigint generated always as identity primary key,
  lead_id     bigint references public.leads(id) on delete set null,
  wa_id       text not null,                 -- número E.164 sin '+' (ej. 56988989824)
  message_id  text unique,                   -- id del mensaje de Meta (dedup de reintentos)
  rol         text not null check (rol in ('in','out')),
  texto       text,
  creado_en   timestamptz default now()
);
create index if not exists idx_wa_msg_waid on public.wa_mensajes (wa_id, creado_en);

-- Estado de conversación en el lead
alter table public.leads add column if not exists wa_handoff boolean default false; -- true = lo tomó un humano, el bot calla
alter table public.leads add column if not exists wa_ultimo  timestamptz;           -- último mensaje del bot/lead

-- RLS: solo service role escribe; los admins pueden leer (para verlo en el portal a futuro)
alter table public.wa_mensajes enable row level security;
drop policy if exists "admins_ven_wa" on public.wa_mensajes;
create policy "admins_ven_wa" on public.wa_mensajes for select using ( public.es_admin() );
