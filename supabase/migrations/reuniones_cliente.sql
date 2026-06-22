-- Campo "cliente" en las reuniones (para asociar la reunión a un cliente/negocio)
alter table public.reuniones add column if not exists cliente text;
