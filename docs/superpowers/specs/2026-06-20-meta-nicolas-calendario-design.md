# Spec: Meta-analyzer fix + Nicolás + Calendario admin
_Fecha: 2026-06-20_

## Subsistema 1 — Fix meta-analyzer ("Barbara")

### Problema
El analizador corre 2×/día (13:00 y 23:00 UTC) y cuando la API de Claude falla devuelve literalmente "Sin análisis." al Telegram. Si no hay campañas activas también manda mensajes innecesarios.

### Cambios
**`meta-analyzer.yml`**
- Eliminar cron de las 13:00 UTC.
- Dejar solo `0 0 * * *` (medianoche UTC = 9 PM Chile invierno).

**`meta-analyzer.mjs`**
- Si `activas.length === 0` → salir silenciosamente sin enviar nada al Telegram.
- Si el response de Claude falla o `analisis` queda vacío → log de error y salir sin mandar mensaje.

---

## Subsistema 2 — Agente Nicolás

### Qué hace
- **Semanal (viernes 23:59 UTC):** Lee cobros de Supabase de los últimos 7 días. Crea/actualiza una hoja nueva en un Google Spreadsheet maestro via Google Sheets API (Service Account). Columnas: Cliente, Plan, Monto, Estado (Pagado/Pendiente), Fecha. Manda el link al Telegram.
- **Mensual (día 30, 23:00 UTC):** Consolida el mes completo, genera análisis humanizado con Claude Haiku (tendencia vs mes anterior, clientes en riesgo), manda link + texto al Telegram.

### Archivos nuevos
```
services/nicolas/
  nicolas.mjs          — lógica principal
  README.md
.github/workflows/
  nicolas.yml          — cron semanal + mensual
```

### Secrets nuevos en GitHub
- `GOOGLE_SERVICE_ACCOUNT_JSON` — JSON de la Service Account de Google.
- `GOOGLE_SPREADSHEET_ID` — ID del Spreadsheet maestro en Drive.

### Datos de Supabase
Lee tabla `clientes` (misma que `cobros-diarios.mjs`). Filtra por `created_at` / `proximo_cobro` en el rango semanal/mensual. Columnas clave: nombre, plan, monto_mensual, estado (activo/vencido), proximo_cobro.

---

## Subsistema 3 — Calendario en admin.html

### Supabase — 2 tablas nuevas (migración SQL)
```sql
create table reuniones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  fecha_hora timestamptz not null,
  duracion_min int default 60,
  creado_por uuid references auth.users(id),
  created_at timestamptz default now()
);

create table reuniones_admins (
  reunion_id uuid references reuniones(id) on delete cascade,
  admin_id uuid references auth.users(id),
  primary key (reunion_id, admin_id)
);

alter table reuniones enable row level security;
alter table reuniones_admins enable row level security;

-- Admin ve sus reuniones (creadas por él o donde está invitado)
create policy "ver_propias" on reuniones for select
  using (
    creado_por = auth.uid() or
    exists (select 1 from reuniones_admins where reunion_id = id and admin_id = auth.uid())
  );

create policy "ver_invitaciones" on reuniones_admins for select
  using (admin_id = auth.uid() or reunion_id in (select id from reuniones where creado_por = auth.uid()));

create policy "crear_reunion" on reuniones for insert with check (creado_por = auth.uid());
create policy "insertar_admins" on reuniones_admins for insert with check (true);
```

### UI en admin.html
- Nueva sección `#calendario` al fondo del panel, misma paleta visual (--bg-2, --linea, --azul, --grad, border-radius var(--r), tipografía var(--sf), animaciones de las cards existentes).
- **Vista mes:** Grid 7 columnas (días de la semana). Cada celda con fecha. Días con reuniones muestran un punto/chip azul con el título truncado.
- **Botón "Nueva reunión":** Abre modal con: título (input), descripción (textarea), fecha (date), hora (time), duración (select: 30/60/90/120 min), multiselect de admins (lista de usuarios de Supabase auth).
- **Click en evento:** Muestra detalle (título, descripción, hora, quién creó, quiénes asisten).
- **Navegación:** Flechas ← → para cambiar de mes.

### Fix bonus — news-bar amarilla en index.html
Cambiar `.news-bar` en `styles.css`:
- Background: `linear-gradient(115deg, #f5b800 0%, #ffd600 55%, #ff9900 100%)`
- Color texto: `#1a1a1a` (oscuro, legible sobre amarillo)
- Box-shadow: `0 14px 34px -16px rgba(245,184,0,.55)`
- `news-tag` y `news-btn`: `background: rgba(0,0,0,.1)`
- Hover shadow: `rgba(245,184,0,.7)`
