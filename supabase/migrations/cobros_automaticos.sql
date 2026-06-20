-- condor.ai · Cobros por correo + recordatorios + alertas de impago
-- Ejecuta en Supabase → SQL Editor → New query → Run
alter table public.clientes add column if not exists creado_por          text;        -- correo del admin que creó al cliente (a quién avisar)
alter table public.clientes add column if not exists irresponsable       boolean default false;  -- impago > 2 días tras el cobro
alter table public.clientes add column if not exists dias_sin_pagar      int default 0;
alter table public.clientes add column if not exists ultimo_recordatorio_en date;     -- último recordatorio mensual enviado al cliente
alter table public.clientes add column if not exists alerta_admin_en     date;        -- último aviso de impago enviado al admin
alter table public.pagos    add column if not exists cobro_enviado_en    timestamptz; -- cuándo se le mandó el correo de cobro al cliente
