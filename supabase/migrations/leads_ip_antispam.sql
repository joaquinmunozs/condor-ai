-- condor.ai · Anti-spam del diagnóstico (límite por IP)
-- Ejecuta en Supabase → SQL Editor → New query → Run
alter table public.leads add column if not exists ip text;
create index if not exists idx_leads_ip on public.leads (ip, creado_en desc);
