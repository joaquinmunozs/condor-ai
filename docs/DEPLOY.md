# 🚀 Despliegue y migración — condor.ai

## Estado actual (importante)

La **producción vive en los repos originales**:
- **Web** `condorai.cl` → repo `joaquinmunozs/condor-ai-web` (GitHub Pages, dominio + HTTPS).
- **Automatizaciones + Supabase** → repo `joaquinmunozs/condorweb-diagnostico` (cron jobs activos).

Este **monorepo** (`condor-ai`) es el hub de **desarrollo y colaboración**. Sus cron jobs están **desactivados** (solo `workflow_dispatch` manual) para no duplicar publicaciones mientras coexiste con los repos viejos.

## Cómo trabajar sin romper producción

1. Desarrolla aquí, en ramas `feat/...`, y abre Pull Request a `main`.
2. Para probar un workflow del monorepo: **Actions → elige el workflow → Run workflow** (manual). No publicará doble porque el cron está apagado aquí.
3. Los cambios de la web puedes previsualizarlos local (`apps/web/index.html`).

## Migrar producción al monorepo (cuando el equipo decida)

> Hacerlo en una ventana tranquila (no en medio de una campaña activa). Checklist:

### A) Web → GitHub Pages desde el monorepo
1. En este repo: **Settings → Pages**.
2. Configurar despliegue por **GitHub Actions** sirviendo la carpeta `apps/web`
   (o mover `apps/web` a la raíz si se prefiere Pages clásico).
3. Mover el dominio `condorai.cl`:
   - Quitar el custom domain del repo `condor-ai-web`.
   - Ponerlo en este repo (Settings → Pages → Custom domain → `condorai.cl`) + Enforce HTTPS.
   - El archivo `CNAME` ya está en `apps/web/`.

### B) Automatizaciones → activar crons aquí
1. Copiar los **GitHub Secrets** al monorepo (ver `SETUP.md`).
2. En `.github/workflows/*.yml`, **descomentar** las líneas `schedule:` y `- cron:`.
3. En el repo viejo `condorweb-diagnostico`, **desactivar** o borrar esos workflows (para que no corran dos veces).

### C) Supabase
- No cambia: las Edge Functions y la base siguen siendo el mismo proyecto.
- Si cambias el repo origen, vuelve a desplegar las funciones desde aquí (`SETUP.md`).

### D) Apagar lo viejo
- Una vez verificado que todo corre desde el monorepo, archiva los repos `condor-ai-web` y `condorweb-diagnostico`.

## Despliegue continuo (futuro sugerido)
- Web: deploy automático en cada push a `main` vía GitHub Actions → Pages.
- Edge Functions: un workflow que corra `supabase functions deploy` al cambiar `supabase/functions/`.
