# Barbara Reels — videos martes (UGC que habla) y jueves (trailer cinematográfico por industria)

Fecha: 2026-06-23

## Objetivo

Barbara publica **dos videos verticales (9:16) por semana**, además de los 3 carruseles
(lun/mié/vie) que ya genera:

- **Martes 9am Perú — UGC que habla.** Una vocera recurrente (misma cara) habla en
  español neutro sobre lo importante que es implementar IA en tu negocio, con hook fuerte
  en los primeros 3s y cierre con CTA *"Contáctanos y vemos cómo implementarla en tu negocio"*.
- **Jueves 9am Perú — trailer cinematográfico por industria.** Trailer estilo cine de una
  industria distinta cada semana (rota rubros) transformada por la IA. Sin diálogo: imagen
  cinematográfica + texto en pantalla + música. Nunca repite el ángulo del carrusel del miércoles.

Ambos máximo ~30s, formato vertical, se mandan a Telegram para revisar antes de subir.

## Motores y costos (verificados con get_cost, plan Ultra)

| Pieza | Motor | Config | Créditos |
|---|---|---|---|
| Avatar fijo (1 sola vez) | soul_2 | imagen 9:16 | ~0,12 |
| Martes UGC (8s/clip) | Veo 3.1 fast | 9:16, voz nativa, start_image=avatar | 22 / clip |
| Jueves trailer (15s/clip) | Seedance 2.0 | 9:16, 720p, audio | 67,5 / clip |

- **Martes:** 4 clips × 8s ≈ 32s → **~88 créditos**.
- **Jueves:** 2 clips × 15s = 30s → **~135 créditos**.
- **Semana ~223 cr · Mes ~965 cr.** Cada "Denuevo barbara" re-genera ese día.
- Claude (director, Sonnet) = costo despreciable frente a créditos.

## Arquitectura

Se **refactoriza `services/barbara/reels.mjs`** (ya cableado a martes/jueves vía `reels.yml`,
cron `0 14 * * 2,4`). No se crean servicios nuevos.

Mapeo de día → tipo (override por variable `TIPO`):
- Martes (UTCDay 2) → `ugc`
- Jueves (UTCDay 4) → `trailer`

### Memoria compartida (anti-repetición)
- `services/barbara/content-log.json` (compartida con los carruseles).
- **Bug a corregir:** hoy `reels.mjs` apunta a `barbara/content-log.json`; debe ser
  `services/barbara/content-log.json` para que la memoria se lea/guarde bien.
- El director recibe las últimas ~15 piezas para no repetir ángulos.
- Para el trailer, además se deriva la **industria** menos usada recientemente del log.

### Martes — `ugc` (Veo 3.1)
1. Avatar fijo: imagen `services/barbara/avatar.png` (commiteada al repo, generada una vez).
2. Director (Claude Sonnet) devuelve JSON:
   - `angulo`, `caption`, `texto_en_pantalla`,
   - `clips`: 4 tomas de 8s; cada una con prompt en inglés (look UGC + descripción de la
     vocera para consistencia) **y la línea EXACTA de diálogo en español neutro** que dirá
     en esa toma. Toma 1 = hook (primeros 3s). Toma 4 = CTA "Contáctanos…".
3. Por cada toma: `higgsfield generate create veo3_1 --prompt "…" --aspect_ratio 9:16
   --duration 8 --start-image services/barbara/avatar.png --wait …` → URL del clip.
4. ffmpeg concatena las 4 tomas → reel ~30s. (Subtítulos quemados: fase 2 opcional.)

### Jueves — `trailer` (Seedance 2.0)
1. Industria elegida del pool (restaurante, retail, clínica, inmobiliaria, taller, logística,
   gimnasio, estudio jurídico, hotel, e-commerce, constructora, agro…), evitando las usadas
   recientemente según el log.
2. Director devuelve JSON con `angulo`, `caption`, `texto_en_pantalla` y 2 prompts de clip
   (15s c/u), estilo trailer cinematográfico de esa industria potenciada por IA, máxima
   técnica de hook/retención.
3. Por cada clip: `higgsfield generate create seedance_2_0 --prompt "…" --aspect_ratio 9:16
   --duration 15 --resolution 720p --generate_audio true --wait …`.
4. ffmpeg concatena → reel 30s.

### Común
- Candado anti-doble-publicación por fecha (salvo `RETRY=1`).
- Envío a Telegram: video + caption + texto en pantalla + nota "Denuevo barbara".
- Registro en `content-log.json` con `tipo` = `reel-ugc` / `reel-trailer` y, para trailer,
  la `industria` usada.
- `TEST=1` / `TIPO=test` → mensaje de conexión.

## Riesgos
- **Veo 3.1 no garantiza acento 100% neutro.** Mitigación: subtítulos + "Denuevo barbara".
  Plan B documentado: voz TTS en español neutro superpuesta con ffmpeg.
- **Cortes entre tomas** (cada clip parte del mismo start_image). Mitigación: prompts con
  encuadres distintos (close-up / plano medio) + estilo UGC de cortes rápidos.
- **CLI**: `higgsfield generate create veo3_1` debe aceptar `--start-image`, `--duration`,
  `--quality`. Verificado: el CLI 0.2.2 soporta `--start-image <path>` (auto-upload).

## Fuera de alcance (YAGNI)
- Subtítulos automáticos quemados (fase 2).
- Voz TTS plan B (solo si Veo decepciona en producción).
- Publicación automática a Instagram/TikTok (sigue siendo revisión manual por Telegram).
