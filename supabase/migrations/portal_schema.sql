-- condor.ai · Portal de clientes (Supabase)
-- Pega y ejecuta en: Supabase -> SQL Editor -> New query -> Run

-- Tabla de clientes (uno por negocio que contrató condor.ai)
create table if not exists public.clientes (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,                 -- correo con el que el cliente inicia sesión
  negocio       text,
  plan          text,                          -- Esencial / Pro / Premium
  concepto      text,                          -- qué incluye (ej: "Landing + Videos IA")
  setup_monto   int  default 0,                -- monto exacto a cobrar (setup)
  mensual_monto int  default 0,                -- monto exacto a cobrar (mensual)
  moneda        text default 'CLP',
  setup_estado   text default 'pendiente',     -- pendiente / pagado
  mensual_estado text default 'pendiente',     -- pendiente / al_dia / vencido
  proximo_cobro  date,
  link_setup    text,                          -- link de pago de Mercado Pago (setup)
  link_mensual  text,                          -- link de suscripción de Mercado Pago (mensual)
  link_paypal   text,                          -- link de PayPal (opción secundaria)
  web_url       text,                          -- link a la web entregada al cliente
  creado_en     timestamptz default now()
);

-- Pagos (historial; opcional, se llena cuando automaticemos con webhook)
create table if not exists public.pagos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references public.clientes(id) on delete cascade,
  tipo        text,                            -- setup / mensual
  monto       int,
  estado      text default 'pendiente',        -- pendiente / pagado / rechazado
  mp_id       text,
  creado_en   timestamptz default now()
);

-- Seguridad: cada cliente solo ve SU fila (match por su correo de sesión)
alter table public.clientes enable row level security;
alter table public.pagos    enable row level security;

drop policy if exists "cliente_ve_lo_suyo" on public.clientes;
create policy "cliente_ve_lo_suyo" on public.clientes
  for select using ( email = (select auth.jwt() ->> 'email') );

drop policy if exists "cliente_ve_sus_pagos" on public.pagos;
create policy "cliente_ve_sus_pagos" on public.pagos
  for select using ( exists (
    select 1 from public.clientes c
    where c.id = pagos.cliente_id and c.email = (select auth.jwt() ->> 'email')
  ));

-- Si ya habías creado la tabla antes, agrega las columnas nuevas:
alter table public.clientes add column if not exists link_paypal text;
alter table public.clientes add column if not exists concepto text;
-- Con el botón inteligente ya NO necesitas link_setup/link_mensual (el cobro se crea solo
-- con el monto de cada cliente). Puedes dejarlos vacíos.

-- (Tú como admin gestionas las filas desde Table Editor con la service key, que ignora RLS.)
