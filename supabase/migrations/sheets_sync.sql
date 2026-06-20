-- condor.ai · Sincronización a Google Sheets vía Apps Script
-- ==========================================================
-- Ejecuta esto en Supabase → SQL Editor → New query → Run.
--
-- ANTES de ejecutar, reemplaza (2 veces si hace falta):
--   __APPS_SCRIPT_URL__  → la URL de tu Web App de Apps Script (termina en /exec)
--   __TOKEN__            → el MISMO token secreto que pusiste en AppsScript.gs

create extension if not exists pg_net with schema extensions;

-- Función genérica: manda la fila recién insertada al Apps Script.
-- TG_ARGV[0] = nombre de la pestaña ("Clientes" o "Leads").
create or replace function public.sync_sheets()
returns trigger
language plpgsql
security definer
as $$
declare
  url text := '__APPS_SCRIPT_URL__';
  tok text := '__TOKEN__';
begin
  perform net.http_post(
    url     := url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object('token', tok, 'tabla', TG_ARGV[0], 'fila', to_jsonb(NEW))
  );
  return NEW;
exception when others then
  return NEW;  -- nunca bloquear el insert si la sincronización falla
end;
$$;

-- Clientes nuevos → pestaña "Clientes"
drop trigger if exists trg_sync_clientes on public.clientes;
create trigger trg_sync_clientes
  after insert on public.clientes
  for each row execute function public.sync_sheets('Clientes');

-- Leads nuevos (del diagnóstico / CTA Meta) → pestaña "Leads"
drop trigger if exists trg_sync_leads on public.leads;
create trigger trg_sync_leads
  after insert on public.leads
  for each row execute function public.sync_sheets('Leads');
