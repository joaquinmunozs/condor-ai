-- condor.ai · Habilita archivar clientes (sin borrarlos)
-- Ejecuta en Supabase → SQL Editor → New query → Run
alter table public.clientes add column if not exists archivado boolean default false;
