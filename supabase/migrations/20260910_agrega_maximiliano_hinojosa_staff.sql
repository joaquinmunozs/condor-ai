-- Cóndor AI · acceso de equipo para Maximiliano Hinojosa.
-- `admins` es la fuente de verdad que consulta `es_admin()` al iniciar sesión;
-- no se crea una cuenta paralela ni se conceden permisos solo en el frontend.

insert into public.admins (email, nombre) values
  ('maximilianohinojosa35@gmail.com', 'Maximiliano Hinojosa')
on conflict (email) do update
  set nombre = excluded.nombre;

notify pgrst, 'reload schema';
