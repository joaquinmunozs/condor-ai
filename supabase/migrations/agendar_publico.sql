-- condor.ai · Agendamiento público de reuniones (desde la web)
-- Campos para rastrear el origen web y la IP (rate-limit anti-spam).
-- Aplicar en Supabase prod. Idempotente.

alter table public.reuniones add column if not exists ip text;
alter table public.reuniones add column if not exists origen text;          -- 'web' = agendado desde la página pública
alter table public.reuniones add column if not exists contacto text;        -- nombre/whatsapp/email del que agendó

-- Índice para contar agendamientos por IP por día (límite diario)
create index if not exists idx_reuniones_ip on public.reuniones (ip, created_at desc);
