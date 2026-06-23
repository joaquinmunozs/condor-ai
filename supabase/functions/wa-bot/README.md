# 🤖 wa-bot — Bot de WhatsApp entrante

Responde los WhatsApp de los leads con Claude (suena humano), cruza el número con la
tabla `leads`, agenda reuniones en el portal y hace handoff al equipo por Telegram.

## Puesta en marcha (pasos del usuario en Meta — NO código)

### 1. Activar Coexistencia en el número del cel
Meta Business Suite → WhatsApp → tu número **+56988989824** → activar **Coexistencia**
(así el número sigue en la app del cel Y queda disponible para la Cloud API).

### 2. Crear la App y obtener credenciales
1. https://developers.facebook.com → **Crear app** → tipo "Business".
2. Agregar el producto **WhatsApp**.
3. Anota el **Phone number ID** (no es el número, es un ID numérico) → secret `WHATSAPP_PHONE_ID`.
4. Crea un **token permanente**: Business Settings → Usuarios del sistema → nuevo System
   User con rol admin → generar token con permisos `whatsapp_business_messaging` y
   `whatsapp_business_management` → ese token va en `WHATSAPP_TOKEN`.
5. Inventa una palabra secreta (cualquiera) para `WHATSAPP_VERIFY_TOKEN`
   (ej. `condor-2026-xyz`).

### 3. Cargar los secrets en Supabase
Supabase → Project Settings → Edge Functions → Secrets (o `supabase secrets set`):
```
WHATSAPP_TOKEN=...          (token permanente del System User)
WHATSAPP_PHONE_ID=...       (Phone number ID)
WHATSAPP_VERIFY_TOKEN=...   (la palabra secreta que inventaste)
```
`ANTHROPIC_API_KEY`, `SANDRA_TELEGRAM_BOT_TOKEN` y `SANDRA_TELEGRAM_CHAT_ID` ya existen.

### 4. Desplegar la función
```
supabase functions deploy wa-bot --no-verify-jwt
```
URL pública: `https://<project-ref>.supabase.co/functions/v1/wa-bot`

### 5. Conectar el Webhook en Meta
WhatsApp → Configuration → Webhook:
- **Callback URL:** la URL de arriba.
- **Verify token:** el mismo `WHATSAPP_VERIFY_TOKEN`.
- Al guardar, Meta hace un GET de verificación (la función responde el challenge).
- **Suscribir** el campo **`messages`**.

### 6. Aplicar la migración
Correr `supabase/migrations/wa_bot.sql` en el SQL editor (crea `wa_mensajes` y los
campos `wa_handoff` / `wa_ultimo` en `leads`).

## Probar
Escríbele al WhatsApp del negocio desde otro teléfono. El bot debería responder en
segundos, llevando la conversación hacia agendar una reunión. Cuando agende, la verás
en el calendario del portal y llegará aviso a Telegram.

## Cómo retomar un chat manualmente (handoff)
Si el bot llama a `avisar_equipo` (o el lead pide humano), el lead queda con
`wa_handoff = true` y **el bot deja de responder** ese número. Respóndele tú desde la
app del cel. Para devolverlo al bot, pon `wa_handoff = false` en ese lead.

## Pendiente de hardening (futuro)
- Verificar la firma `X-Hub-Signature-256` de Meta con el App Secret (evita que
  terceros disparen el webhook y gasten tokens). Hoy el bot solo procesa mensajes con
  número válido, así que el riesgo es bajo.
- Soportar audios/imágenes entrantes (hoy solo texto).
