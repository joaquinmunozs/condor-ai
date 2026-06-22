-- Módulo Leads v2 — campos para CRM/ventas + visualización en el admin
-- Pega en Supabase → SQL Editor → Run (idempotente)

-- Chuleta de venta que genera la IA: cómo cerrar a este lead según sus respuestas (NO se muestra al cliente)
alter table public.leads add column if not exists como_cerrar text;

-- ¿El lead tocó el botón de WhatsApp en el resultado? (separa "fueron al WhatsApp" vs "carrito abandonado")
alter table public.leads add column if not exists fue_whatsapp boolean default false;
alter table public.leads add column if not exists whatsapp_en  timestamptz;

-- Tipo de proyecto/servicio — para organizar el módulo de forma escalable
alter table public.leads add column if not exists proyecto text default 'pagina-web';

-- Para que el panel admin pueda LEER los leads (RLS): solo admins autenticados.
-- Reusa la función es_admin() que ya usa el panel de clientes.
drop policy if exists "admins_ven_leads" on public.leads;
create policy "admins_ven_leads" on public.leads for select using ( public.es_admin() );
drop policy if exists "admins_editan_leads" on public.leads;
create policy "admins_editan_leads" on public.leads for update using ( public.es_admin() );

create index if not exists idx_leads_whatsapp on public.leads (fue_whatsapp);
create index if not exists idx_leads_proyecto on public.leads (proyecto);
