# Edge Functions (Supabase · Deno/TypeScript)

| Función | Qué hace |
|---------|----------|
| `diagnostico` | Diagnóstico con IA (Claude) + captura/categoriza leads. Anti-spam y anti prompt-injection. |
| `crear-pago` | Genera cobro en Mercado Pago (setup/mensual) + email al cliente. Monto leído de la base. |
| `mp-webhook` | Confirma pagos, actualiza estados, limpia alertas, avisa por correo. |
| `solicitar-acceso` | Login: envía código SOLO a correos registrados. Rate limit. Envía el código con Resend. |
| `telegram-barbara` | Webhook de Telegram: comando "Denuevo barbara" → re-dispara contenido. |
| `sofia` | (En desarrollo) Agente de email marketing. |
| `contenido` | (En desarrollo) Generador de posts para la base. |

Desplegar: ver `docs/SETUP.md`.
