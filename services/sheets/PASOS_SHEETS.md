# 🦅 condor.ai · Conectar Supabase con Google Sheets (clientes + leads)

Cuando se cree un **cliente** (desde el admin) o llegue un **lead** (del diagnóstico /
CTA de Meta), la fila aparece sola en tu Google Sheet. Sin Zapier, sin terceros.

## Una sola vez

### 1) Crea la hoja
1. Crea un Google Sheet nuevo (en la cuenta Google que quieras que sea la dueña).
2. No necesitas crear las pestañas a mano: el script crea `Clientes` y `Leads` solo.

### 2) Pega el Apps Script
1. En la hoja: **Extensiones → Apps Script**.
2. Borra lo que haya y pega TODO el contenido de `AppsScript.gs`.
3. En la línea `const TOKEN = "..."` pon una **clave secreta larga** que inventes
   (ej. `condor_a9f3k2_2026`). **Anótala**, la usarás en el paso 4.
4. **Implementar → Nueva implementación → Tipo: Aplicación web**:
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier persona**.
   - Implementar → autoriza con tu cuenta.
5. Copia la **URL de la app web** (termina en `/exec`).

### 3) (Opcional) Prueba el script
Pega esto en tu navegador (cambia la URL): debe responder `{"ok":true,...}`
```
https://script.google.com/macros/s/XXXX/exec
```

### 4) Crea los triggers en Supabase
1. Abre `supabase/sheets_sync.sql`.
2. Reemplaza `__APPS_SCRIPT_URL__` por la URL del paso 2.5 y `__TOKEN__` por tu clave del paso 2.3.
3. Supabase → **SQL Editor → New query** → pega TODO → **Run**.

### 5) Probar de punta a punta
- En el admin, crea un cliente de prueba → debe aparecer una fila en la pestaña **Clientes**.
- Haz un diagnóstico de prueba en `diagnostico-quiz.html` → debe aparecer una fila en **Leads**.

> Si cambias el TOKEN o la URL después, vuelve a correr `sheets_sync.sql` con los valores nuevos.
> Los leads se siguen guardando en Supabase aunque la hoja falle (la sincronización nunca bloquea el registro).
