# 🎨 Barbara — motor de contenido para redes

Genera carruseles y reels para Instagram/TikTok con IA y los manda al grupo de Telegram para revisar antes de subir.

## Qué hace
- **Lun / Mié / Vie** → carrusel (`barbara.mjs`): Noticiero IA · IA por industria · Filosofía IA.
- **Mar / Jue** → reel (`reels.mjs`): Trailer de servicios · UGC sobre IA.
- **Memoria anti-repetición** (`content-log.json`): el director lee lo último creado y tiene orden de innovar, nunca repetir ángulo/protagonista/diálogo.

## Cómo funciona
1. (Lun/Vie) Claude investiga en la web.
2. Claude actúa de director creativo (lee la memoria) → genera los prompts.
3. **Higgsfield** genera las imágenes (`nano_banana_2`) o el video (`seedance1_5`).
4. Se envía a Telegram con la caption lista.

## Comando "Denuevo barbara"
Si el equipo escribe **"Denuevo barbara"** en el grupo, la Edge Function `telegram-barbara`
re-dispara el último contenido mejorado. Setup en `PASOS_DENUEVO_BARBARA.md`.

## Corre con
GitHub Actions (`.github/workflows/barbara.yml` y `reels.yml`). Requiere secrets de
Higgsfield, Anthropic y Telegram (ver `docs/SETUP.md`).
