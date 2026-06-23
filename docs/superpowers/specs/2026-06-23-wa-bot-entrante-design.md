# Bot WhatsApp entrante — condor.ai (pieza 2/4)

Fecha: 2026-06-23
Parte del proyecto [[project_whatsapp_bot_leads]]. Pieza 1 (reuniones) ya hecha.

## Objetivo
Recibir los WhatsApp de los leads en la WhatsApp Cloud API (Meta) y responder con
Claude sonando 100% humano, con el objetivo de **agendar una reunión** (prioridad)
o avanzar el cierre. Responde en <1 min. Cruza el número con la tabla `leads` para
personalizar. El bot puede agendar la reunión directo en el portal y avisar al equipo.

## Arquitectura
Nueva edge function `wa-bot` (webhook de Meta). Stack igual a sofia/lead-whatsapp:
Deno + Supabase service role + Claude vía fetch.

### Flujo
1. **GET** `/wa-bot?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`
   → verificación del webhook: si `hub.verify_token == WHATSAPP_VERIFY_TOKEN`,
   devuelve `hub.challenge` en texto plano. (Lo exige Meta al conectar el webhook.)
2. **POST** (mensaje entrante de Meta):
   a. Extrae `wa_id` (número E.164 sin +), `texto`, `message_id`.
   b. **Dedup:** si `message_id` ya está en `wa_mensajes`, responde 200 y termina
      (Meta reintenta si no contestas rápido → evita respuestas dobles).
   c. **Identifica lead:** busca en `leads` por `whatsapp` normalizado (solo dígitos,
      match por terminación de 8-9 dígitos). Si no existe, crea un lead nuevo
      (origen 'whatsapp-bot', whatsapp = wa_id).
   d. **Handoff:** si el lead tiene `wa_handoff = true`, el bot NO responde (un humano
      tomó la conversación); solo guarda el mensaje entrante. Evita pisar al humano.
   e. **Carga historial** de `wa_mensajes` (últimos ~20) + contexto del lead
      (negocio, problema, categoría, como_cerrar).
   f. **Claude** (sonnet) con system prompt vendedor humano + tools:
      - `agendar_reunion(titulo, fecha_hora_iso, duracion_min, resumen)`:
        inserta en `reuniones` (creado_por null), agrega a los admins como
        participantes, avisa al equipo por Telegram. Devuelve confirmación.
      - `avisar_equipo(motivo, resumen)`: handoff → marca `wa_handoff=true`, manda
        Telegram al equipo. Para cuando el lead pide humano o está listo para cerrar
        algo que requiere persona.
      Loop de tool-use hasta que Claude emite el texto final para el lead.
   g. **Envía** la respuesta al lead vía Cloud API
      (POST graph.facebook.com/v21.0/{PHONE_ID}/messages, type text).
   h. **Guarda** entrante y saliente en `wa_mensajes`.
   i. Responde 200 a Meta.

### Tablas (SQL nuevo `wa_bot.sql`)
- `wa_mensajes(id, lead_id, wa_id, message_id unique, rol 'in'|'out', texto, creado_en)`.
- `leads`: add `wa_handoff boolean default false`, `wa_ultimo timestamptz`.
- RLS: tablas con RLS on, sin policy pública (solo service role escribe; admins leen
  con es_admin() para verlas en el portal a futuro).

### Secrets (Supabase)
- `WHATSAPP_TOKEN` (access token permanente del System User), `WHATSAPP_PHONE_ID`
  (Phone number ID), `WHATSAPP_VERIFY_TOKEN` (string que inventamos), `ANTHROPIC_API_KEY`
  (ya existe), `SANDRA_TELEGRAM_BOT_TOKEN` + `SANDRA_TELEGRAM_CHAT_ID` (ya existen).

## System prompt (resumen)
Vendedor humano de condor.ai (webs + IA para negocios Perú/Chile). Cercano, tutea,
mensajes cortos de WhatsApp, NUNCA dice que es un bot/IA. Objetivo: agendar una
reunión corta para "entender tu proyecto y darte un precio especial" (técnica de
cierre). Usa el contexto del diagnóstico si existe. Ofrece horarios hábiles y al
confirmar uno, llama a `agendar_reunion`. Si el lead pide hablar con una persona o
quiere cerrar trato/pago, llama a `avisar_equipo`. No inventa precios cerrados; el
precio se ve en la reunión. Responde en español neutro/local.

## Setup Meta (lo hace el usuario — NO código)
1. Meta Business Suite → WhatsApp → activar **Coexistencia** en el número +56988989824.
2. Crear App en developers.facebook.com, producto WhatsApp, obtener Phone number ID
   y un **token permanente** (System User). 
3. Configurar Webhook: URL = `https://<ref>.supabase.co/functions/v1/wa-bot`,
   verify token = el que pusimos en `WHATSAPP_VERIFY_TOKEN`, suscribir campo `messages`.
4. Cargar los secrets en Supabase y desplegar `wa-bot --no-verify-jwt`.

## Riesgos / fuera de alcance
- **Zona horaria** del agendado: el bot confirma hora con el lead y guarda ISO/UTC;
  riesgo de desfase Perú/Chile → el system prompt pide confirmar país/hora. El equipo
  puede reprogramar en el portal.
- **Colisiones de horario:** el MVP no valida disponibilidad; el equipo reprograma si choca.
- Remarketing/ofertas a fríos y links de precio = piezas 3 y 4, NO aquí.
- Solo mensajes de texto en el MVP (audios/imágenes entrantes: futuro).
