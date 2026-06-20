<div align="center">

# 🦅 condor.ai

**Agencia de Inteligencia Artificial — plataforma completa**

Sitio web · Portal de clientes y pagos · Diagnóstico con IA · Motor de contenido para redes · Analítica de campañas

[![Web](https://img.shields.io/badge/web-condorai.cl-2747ff?style=flat-square)](https://condorai.cl)
[![Stack](https://img.shields.io/badge/stack-Supabase%20%2B%20GitHub%20Actions%20%2B%20Claude-7a5bff?style=flat-square)](#-stack-técnico)

</div>

---

## 📖 Qué es esto

Este es el **monorepo** de condor.ai: todo el código de la plataforma en un solo lugar, ordenado para que cualquier desarrollador del equipo pueda entenderlo y mejorarlo.

condor.ai vende **páginas web, videos con IA y automatizaciones** a negocios de LATAM. Esta plataforma incluye desde el sitio público hasta el sistema de cobros, pasando por agentes de IA que crean contenido y analizan campañas publicitarias solos.

---

## 🗂️ Estructura del repositorio

```
condor-ai/
├── apps/
│   └── web/                  → El sitio web (condorai.cl). HTML/CSS/JS, sin framework.
│                               Incluye portal de clientes (portal.html) y panel admin (admin.html).
│
├── services/                 → Automatizaciones que corren en GitHub Actions (cron).
│   ├── barbara/              → "Barbara": genera carruseles y reels para redes con IA.
│   ├── meta-analyzer/        → Analiza la campaña de Meta Ads y reporta por Telegram 2×/día.
│   ├── noticias/             → Genera el blog de noticias IA semanal de la web.
│   └── sheets/               → Sincroniza leads/clientes a Google Sheets (Apps Script).
│
├── supabase/                 → Backend (base de datos + funciones serverless).
│   ├── functions/            → Edge Functions (Deno/TypeScript):
│   │   ├── diagnostico/      → Diagnóstico con IA (Claude) + captura de leads.
│   │   ├── crear-pago/       → Genera cobros en Mercado Pago + email al cliente.
│   │   ├── mp-webhook/       → Confirma pagos y actualiza estados.
│   │   ├── solicitar-acceso/ → Login seguro: envía código solo a correos registrados.
│   │   ├── telegram-barbara/ → Comando "Denuevo barbara" desde el grupo de Telegram.
│   │   ├── sofia/            → (Agente de email, en desarrollo).
│   │   └── contenido/        → (Generador de posts, en desarrollo).
│   └── migrations/           → Todo el esquema SQL (tablas, RLS, funciones). Ver SETUP.
│
├── .github/workflows/        → Los cron jobs (hoy en modo manual; ver docs/DEPLOY.md).
│
└── docs/                     → Documentación: arquitectura, setup y despliegue.
```

---

## 🧱 Stack técnico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | HTML + CSS + JS vanilla (sin framework, rápido). Hospedado en GitHub Pages → `condorai.cl` |
| **Backend / BD** | [Supabase](https://supabase.com) — PostgreSQL + Row Level Security + Edge Functions (Deno) |
| **IA** | [Claude](https://www.anthropic.com) (Haiku/Sonnet) para diagnóstico, contenido y análisis |
| **Pagos** | Mercado Pago (Checkout + suscripciones) |
| **Generación de imágenes/video** | [Higgsfield](https://higgsfield.ai) (carruseles y reels) |
| **Automatización** | GitHub Actions (cron jobs) |
| **Mensajería** | Telegram (bot para revisión de contenido y reportes) · WhatsApp (contacto) |

> Diagrama detallado en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🚀 Empezar (para desarrolladores)

```bash
git clone https://github.com/joaquinmunozs/condor-ai.git
cd condor-ai
```

- **Ver el sitio:** abre `apps/web/index.html` en el navegador (o usa Live Server).
- **Editar el backend:** las funciones están en `supabase/functions/` (Deno/TypeScript).
- **Entender un servicio:** cada carpeta en `services/` tiene su README.

👉 Lee primero [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) y [`docs/SETUP.md`](docs/SETUP.md).

---

## 👥 Equipo

| | Rol |
|--|-----|
| **Joaquín Muñoz** | Cofundador & CEO — estrategia y producto |
| **Alejandro Tobar** | Cofundador & Backend — infraestructura y seguridad |
| **Maximiliano Pino** | Cofundador & Desarrollo — frontend y experiencia |
| **Samuel Ospitia** | Arquitecto de Software — arquitectura y calidad |

---

## 📋 Convenciones

- **Ramas:** `main` es producción. Trabaja en ramas `feat/...` o `fix/...` y abre Pull Request.
- **Commits:** mensajes claros en español (`feat:`, `fix:`, `docs:`, `chore:`).
- **No subir secretos:** las claves van en GitHub Secrets / Supabase Secrets, nunca en el código. Ver [`docs/SETUP.md`](docs/SETUP.md).

---

<div align="center">
🦅 <b>condor.ai</b> · Inteligencia artificial para hacer crecer tu negocio
</div>
