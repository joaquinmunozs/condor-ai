# Nicolás — Reportes de ingresos

Agente que corre semanalmente (viernes) y mensualmente (día 30) para generar reportes de ingresos en Google Sheets y enviarlos a Telegram.

## Setup previo (una sola vez)

1. Google Cloud Console → crear proyecto → habilitar Google Sheets API
2. Crear Service Account → descargar JSON
3. Crear Google Spreadsheet → copiar ID de la URL
4. Compartir el Spreadsheet con el `client_email` del JSON (rol Editor)

## Secrets en GitHub

- `GOOGLE_SERVICE_ACCOUNT_JSON` — contenido completo del JSON descargado
- `GOOGLE_SPREADSHEET_ID` — ID del spreadsheet (entre `/d/` y `/edit` en la URL)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ANTHROPIC_API_KEY` — ya existen

## Correr manualmente

En GitHub Actions → Nicolás → Run workflow → elegir modo `semanal` o `mensual`.
