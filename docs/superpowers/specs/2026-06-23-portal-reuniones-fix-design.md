# Fix sistema de reuniones del portal (calendario + notificación)

Fecha: 2026-06-23
Pieza 1 de 4 del proyecto "Automatizar WhatsApp para leads" (el bot agendará aquí).

## Síntomas reportados
1. Al agregar una reunión, NO se visualiza en el calendario.
2. No se notifica a los miembros (admins) de la reunión.
3. No la visualizan todos los admins.
4. No hay botón para añadir a Google/Apple Calendar.

## Causa raíz (diagnóstico)
- **Cascada por INSERT que falla:** `admin.html` inserta la columna `cliente` en
  `reuniones` (admin.html:665), pero esa columna vive en `reuniones_cliente.sql`,
  migración casi seguro NO aplicada en prod. El INSERT falla → la reunión nunca se
  guarda → no se visualiza, no se abre el detalle (donde están los botones de
  calendario, que SÍ existen en admin.html:231-232) y no hay nada que notificar.
- **Síntoma 3 es por diseño RLS:** la policy `ver_propias` solo deja ver al creador
  y a los participantes marcados. El equipo quiere que TODOS los admins vean TODAS
  las reuniones.
- **Síntoma 2:** `reunion-notificar` solo avisa al grupo de Telegram de Sandra; no
  manda correo individual a los invitados.

## Decisiones del usuario
- Visibilidad: **todos los admins ven todas las reuniones**.
- Notificación: **ambos** — grupo de Telegram + email individual con `.ics` adjunto.

## Diseño

### A. Migración SQL nueva `reuniones_fix.sql` (la aplica Alejandro en prod)
1. `alter table reuniones add column if not exists cliente text;` (idempotente).
2. Reemplazar policy de SELECT de `reuniones`: cualquier admin ve todas
   → `for select using ( public.es_admin() )`.
3. Reemplazar policy de SELECT de `reuniones_admins`: cualquier admin ve todos los
   participantes → `for select using ( public.es_admin() )`.
4. Mantener insert/delete por `creado_por = auth.uid()` (solo el creador gestiona).

### B. Frontend `admin.html`
- En el guardado, pasar al body de `reunion-notificar` los invitados como
  `[{nombre, email}]` (ya disponibles en `adminsList`) en lugar de solo nombres,
  para que el backend pueda enviar los correos.
- El error del INSERT ya se muestra en `#calMsg`; sin cambios de lógica de guardado.
- Sin más cambios: con la RLS nueva el calendario se llena para todos y el detalle
  (con botones Google/Apple) revive solo.

### C. Edge function `reunion-notificar/index.ts`
- Mantener el aviso al grupo de Telegram (igual que hoy).
- Agregar: por cada invitado con email, enviar correo vía Resend (RESEND_API_KEY,
  EMAIL_FROM ya existen) con:
  - datos de la reunión (título, fecha/hora CL, duración, cliente, descripción),
  - botón "Añadir a Google Calendar" (link `calendar.google.com/render?...`),
  - archivo `.ics` adjunto (base64) para Apple/Outlook.
- Generar el `.ics` en la función (VEVENT con DTSTART/DTEND UTC).
- No bloquear ni fallar la notificación de Telegram si Resend falla (best-effort).

## Riesgos / dependencias
- **El cambio SQL lo aplica Alejandro** en Supabase prod. Sin eso el bug persiste.
  Se entrega `reuniones_fix.sql` + mensaje para Alejandro.
- Resend debe tener dominio verificado para `EMAIL_FROM` (ya usado por sofia).

## Fuera de alcance (YAGNI)
- Editar/reprogramar/cancelar reuniones, recordatorios previos, invitar a clientes
  externos. Solo dejar el agendado del equipo sólido.
