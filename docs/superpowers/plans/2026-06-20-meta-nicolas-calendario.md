# Meta fix + Nicolás + Calendario Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix el analizador Meta (1×/día, sin mensajes vacíos), crear agente Nicolás (reportes de ingresos a Google Sheets + Telegram), agregar calendario en admin.html, y cambiar la news-bar de la home a amarillo.

**Architecture:** 4 tareas independientes sobre el mismo monorepo. Meta-analyzer y Nicolás son GitHub Actions en Node.js puro (sin npm). El calendario usa Supabase + vanilla JS directamente en admin.html. El cambio visual es solo CSS.

**Tech Stack:** Node.js 22 (ESM, crypto builtin), Supabase REST API, Google Sheets API v4 (JWT con Service Account), Telegram Bot API, GitHub Actions cron, HTML/CSS/JS vanilla.

## Global Constraints

- Node.js 22, ESM (`import`/`export`), sin npm install en Actions (solo módulos built-in)
- Supabase URL: `https://ogmvdthxwcmvqjlxhpsr.supabase.co`, ANON_KEY ya en admin.html línea 88
- Paleta visual: `--azul:#2747ff`, `--grad:linear-gradient(115deg,#2747ff 0%,#7a5bff 48%,#ff3b4e 100%)`, `--bg-2:#fafafa`, `--linea:rgba(0,0,0,.08)`, `--r:22px`, font `var(--sf)`, animaciones `.rev` + `transition` del sistema existente
- Todos los commits en rama `main`, push directo

---

## Task 1: Fix meta-analyzer — 1×/día + silencio cuando no hay datos

**Files:**
- Modify: `.github/workflows/meta-analyzer.yml`
- Modify: `services/meta-analyzer/meta-analyzer.mjs`

**Interfaces:**
- Produces: El analizador solo corre a las 00:00 UTC (9 PM Chile invierno) y no envía nada a Telegram si no hay campañas activas o si Claude falla.

- [ ] **Step 1: Cambiar cron a 1×/día**

En `.github/workflows/meta-analyzer.yml`, reemplazar el bloque `schedule` actual:

```yaml
# ANTES (2 veces/día):
  schedule:
    - cron: '0 13 * * *'
    - cron: '0 23 * * *'
```

por:

```yaml
  schedule:
    - cron: '0 0 * * *'
```

El archivo completo queda:

```yaml
name: Analizador de campaña Meta

on:
  schedule:
    - cron: '0 0 * * *'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  analizar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Analizar campañas y avisar por Telegram
        run: node services/meta-analyzer/meta-analyzer.mjs
        env:
          META_ACCESS_TOKEN: ${{ secrets.META_ACCESS_TOKEN }}
          META_AD_ACCOUNT_ID: ${{ secrets.META_AD_ACCOUNT_ID }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
      - name: Guardar memoria de campaña
        run: |
          git config user.name "condor-bot"
          git config user.email "bot@condorai.cl"
          if git diff --quiet services/meta-analyzer/campaign-log.json; then echo "sin cambios"; else
            git add services/meta-analyzer/campaign-log.json
            git commit -m "meta: memoria de campaña $(date +%Y-%m-%d_%H%M)"
            for n in 1 2 3; do git pull --rebase origin main && git push && break || sleep 5; done
          fi
```

- [ ] **Step 2: Silenciar cuando no hay campañas activas**

En `services/meta-analyzer/meta-analyzer.mjs`, localizar el bloque actual en `main()` (línea ~73):

```js
  if (!activas.length) {
    await tg("📊 *Campaña condor.ai* — Aún no hay campaña activa. Cuando lances, te aviso 2 veces al día con cómo va y qué hacer. 🦅");
    console.log("Sin campañas activas"); return;
  }
```

Reemplazarlo por:

```js
  if (!activas.length) {
    console.log("Sin campañas activas — no se envía nada"); return;
  }
```

- [ ] **Step 3: Silenciar cuando Claude falla o devuelve vacío**

Localizar el bloque de análisis Claude (líneas ~148-159):

```js
  const resp = await fetch("https://api.anthropic.com/v1/messages", { ... });
  const data = await resp.json();
  const analisis = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("") || "Sin análisis.";
  await tg(`📊 *Campaña condor.ai* · ${horaCL} hrs\n\n${analisis}`);
```

Reemplazarlo por:

```js
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": AK, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5", max_tokens: 800, system: sys,
      messages: [{ role: "user", content: `Datos de la campaña hoy:\n${JSON.stringify(resumen, null, 2)}\n\nTendencia de días anteriores (tu memoria):\n${tendencia}\n\nEscríbele a Joaquín el mensaje corto y humano por Telegram, con la decisión de qué hacer.` }],
    }),
  });
  if (!resp.ok) { console.error("Claude HTTP", resp.status); return; }
  const data = await resp.json();
  const analisis = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
  if (!analisis) { console.error("Claude devolvió vacío"); return; }
  await tg(`📊 *Campaña condor.ai* · ${horaCL} hrs\n\n${analisis}`);
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/meta-analyzer.yml services/meta-analyzer/meta-analyzer.mjs
git commit -m "fix(meta): 1x/dia a medianoche, silencio si no hay campaña o Claude falla"
```

---

## Task 2: News-bar amarilla en index.html

**Files:**
- Modify: `apps/web/assets/styles.css` (líneas 53-59)

**Interfaces:**
- Produces: El pill de "IA · Esta semana" en la home usa fondo amarillo-ámbar con texto oscuro.

- [ ] **Step 1: Cambiar colores del news-bar**

En `apps/web/assets/styles.css`, localizar las líneas 53-59:

```css
.news-bar{display:flex;align-items:center;gap:12px;max-width:680px;margin:0 auto 30px;padding:11px 18px;background:var(--grad);color:#fff;border-radius:999px;width:100%;box-shadow:0 14px 34px -16px rgba(39,71,255,.6);transition:transform .35s,box-shadow .35s}
.news-bar:hover{transform:translateY(-2px);box-shadow:0 18px 40px -16px rgba(39,71,255,.7)}
.news-tag{flex:0 0 auto;font-size:.7rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:rgba(255,255,255,.22);padding:4px 10px;border-radius:999px}
.news-title{flex:1;font-size:.92rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:opacity .35s}
.news-btn{flex:0 0 auto;font-weight:700;font-size:.8rem;background:rgba(255,255,255,.2);padding:6px 13px;border-radius:999px;white-space:nowrap;transition:background .25s,transform .25s}
.news-bar:hover .news-btn{background:rgba(255,255,255,.32);transform:translateX(2px)}
@media(max-width:759px){.news-bar{margin:0 auto 22px;padding:9px 9px 9px 14px;gap:8px}.news-tag{display:none}.news-title{white-space:normal;font-size:.82rem}.news-btn{font-size:.72rem;padding:6px 10px}}
```

Reemplazarlas por:

```css
.news-bar{display:flex;align-items:center;gap:12px;max-width:680px;margin:0 auto 30px;padding:11px 18px;background:linear-gradient(115deg,#f5b800 0%,#ffd600 55%,#ff9900 100%);color:#1a1a1a;border-radius:999px;width:100%;box-shadow:0 14px 34px -16px rgba(245,184,0,.55);transition:transform .35s,box-shadow .35s}
.news-bar:hover{transform:translateY(-2px);box-shadow:0 18px 40px -16px rgba(245,184,0,.7)}
.news-tag{flex:0 0 auto;font-size:.7rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:rgba(0,0,0,.12);padding:4px 10px;border-radius:999px}
.news-title{flex:1;font-size:.92rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:opacity .35s}
.news-btn{flex:0 0 auto;font-weight:700;font-size:.8rem;background:rgba(0,0,0,.1);padding:6px 13px;border-radius:999px;white-space:nowrap;transition:background .25s,transform .25s}
.news-bar:hover .news-btn{background:rgba(0,0,0,.18);transform:translateX(2px)}
@media(max-width:759px){.news-bar{margin:0 auto 22px;padding:9px 9px 9px 14px;gap:8px}.news-tag{display:none}.news-title{white-space:normal;font-size:.82rem}.news-btn{font-size:.72rem;padding:6px 10px}}
```

- [ ] **Step 2: Verificar visualmente**

Abrir `apps/web/index.html` en browser local (o revisar en condorai.cl tras el push). El pill de noticias debe verse amarillo-dorado con texto negro. Verificar que el hover funciona.

- [ ] **Step 3: Commit**

```bash
git add apps/web/assets/styles.css
git commit -m "style(home): news-bar amarillo llamativo"
```

---

## Task 3: Agente Nicolás — Reportes de ingresos a Google Sheets + Telegram

**Files:**
- Create: `services/nicolas/nicolas.mjs`
- Create: `services/nicolas/README.md`
- Create: `.github/workflows/nicolas.yml`

**Interfaces:**
- Consumes: Secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SPREADSHEET_ID`, `ANTHROPIC_API_KEY`
- Produces: Nueva hoja en el Google Spreadsheet por semana/mes + mensaje Telegram con link + análisis

**Prerequisito manual (Joaco debe hacer esto ANTES de que el Action corra):**
1. Ir a [Google Cloud Console](https://console.cloud.google.com/) → crear proyecto `condorai-bots`
2. Habilitar Google Sheets API
3. Crear Service Account → Descargar JSON de credenciales
4. Agregar `GOOGLE_SERVICE_ACCOUNT_JSON` como secret en GitHub (contenido completo del JSON)
5. Crear un Google Spreadsheet → copiar su ID de la URL (la parte entre `/d/` y `/edit`)
6. Agregar `GOOGLE_SPREADSHEET_ID` como secret en GitHub
7. En el Spreadsheet → Compartir → pegar el `client_email` del JSON de service account con rol Editor

- [ ] **Step 1: Crear `services/nicolas/nicolas.mjs`**

```js
// condor.ai · Nicolás — Reportes de ingresos semanales y mensuales
// Semanal (viernes): lee pagos de la semana → Google Sheets nueva hoja → link a Telegram
// Mensual (día 30): consolida el mes → análisis Claude → Telegram
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
//          GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SPREADSHEET_ID, ANTHROPIC_API_KEY

import { createSign } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TG = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;
const AK = process.env.ANTHROPIC_API_KEY;
const SA = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "{}");
const SHEET_ID = (process.env.GOOGLE_SPREADSHEET_ID || "").trim();
const MODO = process.env.NICOLAS_MODO || "semanal"; // "semanal" | "mensual"

if (!SUPABASE_URL || !SERVICE) { console.error("Faltan SUPABASE_URL / SERVICE_ROLE_KEY"); process.exit(1); }
if (!TG || !CHAT) { console.error("Faltan TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID"); process.exit(1); }
if (!SA.client_email || !SHEET_ID) { console.error("Faltan GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_SPREADSHEET_ID"); process.exit(1); }

// ── Supabase REST ──────────────────────────────────────────────────
const H = { apikey: SERVICE, Authorization: "Bearer " + SERVICE };
const sget = async (path) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error("Supabase: " + await r.text());
  return r.json();
};

// ── Telegram ───────────────────────────────────────────────────────
const tg = (text) => fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ chat_id: CHAT, text, parse_mode: "Markdown", disable_web_page_preview: true }),
}).then(r => r.json());

// ── Google OAuth2 con Service Account (sin npm) ────────────────────
function b64url(obj) {
  const s = typeof obj === "string" ? obj : JSON.stringify(obj);
  return Buffer.from(s).toString("base64url");
}

async function getGoogleToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: "RS256", typ: "JWT" });
  const payload = b64url({
    iss: SA.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const unsigned = `${header}.${payload}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(SA.private_key, "base64url");
  const jwt = `${unsigned}.${sig}`;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error("Google OAuth falló: " + JSON.stringify(d));
  return d.access_token;
}

// ── Google Sheets API ──────────────────────────────────────────────
async function sheetsReq(token, method, path, body) {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error("Sheets API: " + text);
  return JSON.parse(text);
}

async function crearHoja(token, nombre) {
  await sheetsReq(token, "POST", ":batchUpdate", {
    requests: [{ addSheet: { properties: { title: nombre } } }],
  });
}

async function escribirHoja(token, nombre, rows) {
  await sheetsReq(token, "PUT",
    `/values/${encodeURIComponent(nombre + "!A1")}?valueInputOption=USER_ENTERED`,
    { values: rows }
  );
}

// ── Datos de Supabase ──────────────────────────────────────────────
function rangoFechas(dias) {
  const hasta = new Date();
  const desde = new Date(Date.now() - dias * 86400000);
  return {
    desde: desde.toISOString().slice(0, 10),
    hasta: hasta.toISOString().slice(0, 10),
  };
}

async function obtenerPagos(desde, hasta) {
  const pagos = await sget(
    `pagos?select=monto,estado,tipo,cliente_id,created_at&created_at=gte.${desde}T00:00:00&created_at=lte.${hasta}T23:59:59&order=created_at.desc`
  );
  const clientes = await sget("clientes?select=id,negocio,plan,moneda&archivado=eq.false");
  const cMap = Object.fromEntries(clientes.map(c => [c.id, c]));
  return pagos.map(p => ({
    ...p,
    negocio: cMap[p.cliente_id]?.negocio || "—",
    plan: cMap[p.cliente_id]?.plan || "—",
    moneda: cMap[p.cliente_id]?.moneda || "CLP",
  }));
}

// ── Informe semanal ────────────────────────────────────────────────
async function reporteSemanal(token) {
  const { desde, hasta } = rangoFechas(7);
  const pagos = await obtenerPagos(desde, hasta);

  const semana = `Semana ${desde}`;
  try { await crearHoja(token, semana); } catch { /* ya existe */ }

  const pagados = pagos.filter(p => p.estado === "pagado");
  const pendientes = pagos.filter(p => p.estado === "pendiente");
  const totalCobrado = pagados.reduce((s, p) => s + (p.monto || 0), 0);
  const totalPend = pendientes.reduce((s, p) => s + (p.monto || 0), 0);

  const headers = ["Cliente", "Plan", "Tipo", "Monto", "Moneda", "Estado", "Fecha"];
  const rows = [
    headers,
    ...pagos.map(p => [
      p.negocio, p.plan, p.tipo || "—",
      String(p.monto || 0), p.moneda,
      p.estado === "pagado" ? "✅ Pagado" : "⏳ Pendiente",
      (p.created_at || "").slice(0, 10),
    ]),
    [],
    ["RESUMEN", "", "", "", "", "", ""],
    ["Total cobrado", String(totalCobrado), "", "", "", "", ""],
    ["Total pendiente", String(totalPend), "", "", "", "", ""],
    ["Pagos confirmados", String(pagados.length), "", "", "", "", ""],
  ];

  await escribirHoja(token, semana, rows);

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}`;
  await tg(`📊 *Nicolás · Reporte semanal*\n_${desde} → ${hasta}_\n\n` +
    `✅ Cobrado: *${totalCobrado.toLocaleString()}* (${pagados.length} pagos)\n` +
    `⏳ Pendiente: ${totalPend.toLocaleString()} (${pendientes.length} cobros)\n\n` +
    `[Ver en Google Sheets →](${url})`);
}

// ── Informe mensual con análisis Claude ────────────────────────────
async function reporteMensual(token) {
  const { desde, hasta } = rangoFechas(30);
  const pagos = await obtenerPagos(desde, hasta);

  const mes = `Mes ${new Date().toISOString().slice(0, 7)}`;
  try { await crearHoja(token, mes); } catch { /* ya existe */ }

  const pagados = pagos.filter(p => p.estado === "pagado");
  const pendientes = pagos.filter(p => p.estado === "pendiente");
  const totalCobrado = pagados.reduce((s, p) => s + (p.monto || 0), 0);
  const totalPend = pendientes.reduce((s, p) => s + (p.monto || 0), 0);

  const porCliente = {};
  for (const p of pagados) {
    if (!porCliente[p.negocio]) porCliente[p.negocio] = { total: 0, pagos: 0, moneda: p.moneda };
    porCliente[p.negocio].total += (p.monto || 0);
    porCliente[p.negocio].pagos++;
  }

  const headers = ["Cliente", "Plan", "Tipo", "Monto", "Moneda", "Estado", "Fecha"];
  const rows = [
    headers,
    ...pagos.map(p => [
      p.negocio, p.plan, p.tipo || "—",
      String(p.monto || 0), p.moneda,
      p.estado === "pagado" ? "✅ Pagado" : "⏳ Pendiente",
      (p.created_at || "").slice(0, 10),
    ]),
    [],
    ["RESUMEN DEL MES", "", "", "", "", "", ""],
    ["Total cobrado", String(totalCobrado), "", "", "", "", ""],
    ["Total pendiente", String(totalPend), "", "", "", "", ""],
    ["Clientes con cobros", String(new Set(pagos.map(p => p.cliente_id)).size), "", "", "", "", ""],
  ];

  await escribirHoja(token, mes, rows);

  // Análisis humanizado con Claude Haiku
  let analisis = "";
  if (AK) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": AK, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5", max_tokens: 600,
          system: `Eres Nicolás, el asistente financiero de condor.ai. Le escribes a Joaquín por Telegram con el cierre del mes. Tono cercano y humano, como un contador amigo. Máx 150 palabras. Sin títulos ni secciones. Habla de los números, destaca si el mes fue bueno o regular, menciona clientes morosos si los hay, y da 1 consejo concreto para el próximo mes.`,
          messages: [{
            role: "user",
            content: `Resumen del mes:\n- Total cobrado: ${totalCobrado.toLocaleString()}\n- Total pendiente: ${totalPend.toLocaleString()}\n- Pagos confirmados: ${pagados.length}\n- Cobros pendientes: ${pendientes.length}\n- Clientes activos con cobros: ${Object.keys(porCliente).length}\n\nTop clientes:\n${Object.entries(porCliente).sort((a,b)=>b[1].total-a[1].total).slice(0,5).map(([n,d])=>`  ${n}: ${d.moneda} ${d.total.toLocaleString()}`).join("\n")}\n\nEscribe el cierre de mes para Joaquín.`,
          }],
        }),
      });
      const d = await r.json();
      analisis = (d.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
    } catch (e) { console.log("Claude análisis falló:", String(e).slice(0, 80)); }
  }

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}`;
  const msg = `📊 *Nicolás · Cierre del mes ${new Date().toISOString().slice(0, 7)}*\n\n` +
    (analisis ? analisis + "\n\n" : "") +
    `💰 Total cobrado: *${totalCobrado.toLocaleString()}*\n` +
    `⏳ Pendiente: ${totalPend.toLocaleString()}\n\n` +
    `[Ver reporte completo →](${url})`;
  await tg(msg);
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log("Nicolás | modo:", MODO);
  const token = await getGoogleToken();
  if (MODO === "mensual") {
    await reporteMensual(token);
  } else {
    await reporteSemanal(token);
  }
  console.log("OK");
}

main().catch(async (e) => {
  console.error(e);
  try { await tg("⚠️ *Nicolás* falló: " + String(e).slice(0, 250)); } catch {}
  process.exit(1);
});
```

- [ ] **Step 2: Crear `services/nicolas/README.md`**

```markdown
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
```

- [ ] **Step 3: Crear `.github/workflows/nicolas.yml`**

```yaml
name: Nicolás — Reportes de ingresos

on:
  schedule:
    # Semanal: viernes a las 23:59 UTC
    - cron: '59 23 * * 5'
    # Mensual: día 30 a las 23:00 UTC
    - cron: '0 23 30 * *'
  workflow_dispatch:
    inputs:
      modo:
        description: 'Modo del reporte'
        required: true
        default: 'semanal'
        type: choice
        options:
          - semanal
          - mensual

jobs:
  reporte:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Generar reporte
        run: node services/nicolas/nicolas.mjs
        env:
          NICOLAS_MODO: ${{ github.event.inputs.modo || (github.event.schedule == '0 23 30 * *' && 'mensual' || 'semanal') }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
          GOOGLE_SERVICE_ACCOUNT_JSON: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}
          GOOGLE_SPREADSHEET_ID: ${{ secrets.GOOGLE_SPREADSHEET_ID }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

- [ ] **Step 4: Verificar en GitHub Actions**

Después del commit, ir a GitHub → Actions → "Nicolás — Reportes de ingresos" → Run workflow → modo `semanal`. El Action debe terminar en verde. Revisar Telegram y el Google Spreadsheet para confirmar la hoja nueva y el link.

Si falla por `GOOGLE_SERVICE_ACCOUNT_JSON` o `GOOGLE_SPREADSHEET_ID` no configurados, seguir los pasos de Setup en el README.

- [ ] **Step 5: Commit**

```bash
git add services/nicolas/ .github/workflows/nicolas.yml
git commit -m "feat(nicolas): reporte semanal/mensual → Google Sheets + Telegram"
```

---

## Task 4: Calendario en admin.html

**Files:**
- Create: `supabase/migrations/reuniones.sql`
- Modify: `apps/web/admin.html`

**Interfaces:**
- Consumes: Supabase auth (sesión ya establecida en admin.html), tabla `admin_profiles` (se crea aquí), tablas `reuniones` + `reuniones_admins`
- Produces: Sección de calendario mensual en el panel admin con CRUD de reuniones

- [ ] **Step 1: Crear migración SQL**

Crear `supabase/migrations/reuniones.sql`:

```sql
-- Perfiles de admins (se auto-puebla en el primer login de cada admin)
create table if not exists admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text not null,
  created_at timestamptz default now()
);
alter table admin_profiles enable row level security;
-- Cualquier admin autenticado puede ver todos los perfiles (para el multiselect)
create policy "admins_ven_perfiles" on admin_profiles for select using (auth.uid() is not null);
create policy "admins_upsert_perfil" on admin_profiles for insert with check (id = auth.uid());
create policy "admins_update_perfil" on admin_profiles for update using (id = auth.uid());

-- Reuniones
create table if not exists reuniones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  fecha_hora timestamptz not null,
  duracion_min int default 60,
  creado_por uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table reuniones enable row level security;
-- Admin ve reuniones que creó o donde está invitado
create policy "ver_propias" on reuniones for select using (
  creado_por = auth.uid() or
  exists (select 1 from reuniones_admins where reunion_id = id and admin_id = auth.uid())
);
create policy "crear_reunion" on reuniones for insert with check (creado_por = auth.uid());
create policy "borrar_reunion" on reuniones for delete using (creado_por = auth.uid());

-- Participantes de reuniones
create table if not exists reuniones_admins (
  reunion_id uuid references reuniones(id) on delete cascade,
  admin_id uuid references auth.users(id),
  primary key (reunion_id, admin_id)
);
alter table reuniones_admins enable row level security;
create policy "ver_participantes" on reuniones_admins for select using (
  admin_id = auth.uid() or
  reunion_id in (select id from reuniones where creado_por = auth.uid())
);
create policy "insertar_participantes" on reuniones_admins for insert with check (
  reunion_id in (select id from reuniones where creado_por = auth.uid())
);
```

**Aplicar en Supabase:** ir al dashboard → SQL Editor → pegar y ejecutar.

- [ ] **Step 2: Agregar CSS del calendario al `<style>` de admin.html**

Dentro del bloque `<style>` existente (antes del cierre `</style>` en línea ~26), agregar al final:

```css
    /* ── Calendario ── */
    .cal-section{margin-top:32px}
    .cal-nav{display:flex;align-items:center;gap:12px;margin-bottom:14px}
    .cal-mes{font-size:1rem;font-weight:700;min-width:180px;text-align:center;letter-spacing:-.02em}
    .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
    .cal-dh{text-align:center;font-size:.7rem;font-weight:700;color:var(--tx-2);padding:6px 0;text-transform:uppercase;letter-spacing:.04em}
    .cal-dia{min-height:72px;background:var(--bg-2);border:1px solid var(--linea);border-radius:12px;padding:7px;cursor:default;transition:border-color .2s}
    .cal-dia.otro-mes{opacity:.35}
    .cal-dia.hoy{border-color:var(--azul);background:rgba(39,71,255,.04)}
    .cal-dia.tiene-eventos{cursor:pointer}.cal-dia.tiene-eventos:hover{border-color:var(--azul)}
    .cal-num{font-size:.8rem;font-weight:700;margin-bottom:4px;color:var(--tx-2)}
    .cal-dia.hoy .cal-num{color:var(--azul)}
    .cal-chip{font-size:.65rem;font-weight:600;background:var(--azul);color:#fff;border-radius:5px;padding:2px 5px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.4}
    /* Modal calendario */
    .cal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;align-items:center;justify-content:center}
    .cal-overlay.open{display:flex}
    .cal-modal{background:var(--bg);border-radius:var(--r);padding:28px;width:calc(100% - 40px);max-width:500px;max-height:88vh;overflow-y:auto;box-shadow:var(--sombra)}
    .cal-modal h3{font-size:1.15rem;margin-bottom:16px}
    .cal-admins-list{display:flex;flex-wrap:wrap;gap:7px;margin-top:6px;padding:10px;border:1px solid var(--linea);border-radius:10px;min-height:44px}
    .cal-admin-chip{font-size:.78rem;font-weight:600;padding:5px 11px;border-radius:999px;background:var(--bg-3);border:1.5px solid var(--linea);cursor:pointer;transition:all .2s;user-select:none}
    .cal-admin-chip.sel{background:var(--azul);color:#fff;border-color:var(--azul)}
    .cal-msg{font-size:.82rem;color:var(--tx-2);margin-top:8px}
    @media(max-width:640px){.cal-grid{gap:2px}.cal-dia{min-height:54px;padding:5px}.cal-chip{display:none}.cal-dia.tiene-eventos .cal-num::after{content:" •";color:var(--azul)}}
```

- [ ] **Step 3: Agregar HTML del calendario dentro de `#panel`**

Localizar en admin.html (línea ~81-82) el cierre del `#panel`:

```html
      </div>
    </div>
```

Reemplazar el cierre `</div>` de `#panel` (la segunda línea) por el calendario + cierre:

```html
      </div>

      <!-- ── Calendario ── -->
      <div class="cal-section">
        <div class="pcard">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:10px">
            <h3 style="font-size:1.1rem">📅 Calendario</h3>
            <button class="btn btn-grad mini" id="btnNuevaReunion">+ Nueva reunión</button>
          </div>
          <div class="cal-nav">
            <button class="btn btn-soft mini" id="calPrev">←</button>
            <span class="cal-mes" id="calMesLabel"></span>
            <button class="btn btn-soft mini" id="calNext">→</button>
          </div>
          <div class="cal-grid" id="calGrid"></div>
        </div>
      </div>

    </div><!-- fin #panel -->

    <!-- Modal nueva reunión -->
    <div class="cal-overlay" id="calModal">
      <div class="cal-modal">
        <h3>Nueva reunión</h3>
        <label>Título</label><input id="r_titulo" placeholder="Reunión de equipo" style="margin-bottom:8px" />
        <label>Descripción</label>
        <textarea id="r_desc" style="width:100%;border:1px solid var(--linea);border-radius:10px;padding:10px 12px;font-family:var(--sf);font-size:.92rem;margin-top:4px;margin-bottom:8px;min-height:70px;resize:vertical" placeholder="Opcional"></textarea>
        <div class="fgrid">
          <div><label>Fecha</label><input id="r_fecha" type="date" /></div>
          <div><label>Hora</label><input id="r_hora" type="time" value="09:00" /></div>
        </div>
        <label>Duración</label>
        <select id="r_dur" style="margin-bottom:8px">
          <option value="30">30 min</option>
          <option value="60" selected>1 hora</option>
          <option value="90">1.5 horas</option>
          <option value="120">2 horas</option>
        </select>
        <label>Participantes (click para seleccionar)</label>
        <div class="cal-admins-list" id="r_admins"></div>
        <div style="display:flex;gap:10px;margin-top:18px">
          <button class="btn btn-grad" id="btnGuardarReunion" style="flex:1">Guardar</button>
          <button class="btn btn-soft" id="btnCerrarModal">Cancelar</button>
        </div>
        <p class="cal-msg" id="calMsg"></p>
      </div>
    </div>

    <!-- Detalle reunión -->
    <div class="cal-overlay" id="calDetalle">
      <div class="cal-modal" style="max-width:420px">
        <h3 id="det_titulo" style="margin-bottom:8px"></h3>
        <p id="det_fecha" style="color:var(--tx-2);font-size:.9rem;margin-bottom:6px"></p>
        <p id="det_desc" style="margin-bottom:10px;white-space:pre-line"></p>
        <p id="det_creador" style="color:var(--tx-2);font-size:.82rem;margin-bottom:3px"></p>
        <p id="det_asistentes" style="color:var(--tx-2);font-size:.82rem"></p>
        <button class="btn btn-soft" id="btnCerrarDetalle" style="width:100%;margin-top:18px">Cerrar</button>
      </div>
    </div>
```

- [ ] **Step 4: Agregar JS del calendario en el `<script>` de admin.html**

Localizar en admin.html (línea ~116):

```js
      $("panel").style.display="block";
      cargar();
```

Reemplazarlo por:

```js
      $("panel").style.display="block";
      cargar();
      upsertPerfil(user);
      cargarCalendario();
```

Y agregar estas funciones antes de la última línea `init();` (línea ~230):

```js
    // ── Calendario ────────────────────────────────────────────────
    let calFecha = new Date();
    let calReuniones = [];
    let adminsList = [];
    let selectedAdmins = new Set();
    let currentUser = null;

    async function upsertPerfil(user) {
      currentUser = user;
      const nombre = (user.email || "").split("@")[0];
      await sb.from("admin_profiles").upsert({ id: user.id, email: user.email, nombre }, { onConflict: "id" });
    }

    async function cargarCalendario() {
      const año = calFecha.getFullYear();
      const mes = calFecha.getMonth();
      const desde = new Date(año, mes, 1).toISOString();
      const hasta = new Date(año, mes + 1, 0, 23, 59, 59).toISOString();

      const { data } = await sb.from("reuniones").select("*,reuniones_admins(admin_id,admin_profiles(nombre,email))")
        .gte("fecha_hora", desde).lte("fecha_hora", hasta).order("fecha_hora");
      calReuniones = data || [];
      renderCalendario(año, mes);
    }

    function renderCalendario(año, mes) {
      const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
      $("calMesLabel").textContent = `${meses[mes]} ${año}`;

      const dias = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
      const primerDia = new Date(año, mes, 1).getDay();
      const ultimoDia = new Date(año, mes + 1, 0).getDate();
      const hoy = new Date();

      let html = dias.map(d => `<div class="cal-dh">${d}</div>`).join("");

      for (let i = 0; i < primerDia; i++) {
        const d = new Date(año, mes, 0 - (primerDia - i - 1));
        html += `<div class="cal-dia otro-mes"><div class="cal-num">${d.getDate()}</div></div>`;
      }
      for (let d = 1; d <= ultimoDia; d++) {
        const esHoy = hoy.getFullYear() === año && hoy.getMonth() === mes && hoy.getDate() === d;
        const clave = `${año}-${String(mes + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const eventos = calReuniones.filter(r => r.fecha_hora.slice(0, 10) === clave);
        const chips = eventos.slice(0, 2).map(r =>
          `<div class="cal-chip">${esc(r.titulo)}</div>`
        ).join("") + (eventos.length > 2 ? `<div class="cal-chip">+${eventos.length - 2} más</div>` : "");
        html += `<div class="cal-dia${esHoy ? " hoy" : ""}${eventos.length ? " tiene-eventos" : ""}" data-fecha="${clave}">
          <div class="cal-num">${d}</div>${chips}
        </div>`;
      }

      $("calGrid").innerHTML = html;

      $("calGrid").querySelectorAll(".cal-dia.tiene-eventos").forEach(el => {
        el.addEventListener("click", () => {
          const clave = el.dataset.fecha;
          const eventos = calReuniones.filter(r => r.fecha_hora.slice(0, 10) === clave);
          if (eventos.length === 1) abrirDetalle(eventos[0]);
          else abrirDetalle(eventos[0]); // primer evento; lista múltiple futura
        });
      });
    }

    function abrirDetalle(r) {
      const dt = new Date(r.fecha_hora);
      const dur = r.duracion_min >= 60 ? `${r.duracion_min/60}h` : `${r.duracion_min} min`;
      $("det_titulo").textContent = r.titulo;
      $("det_fecha").textContent = dt.toLocaleDateString("es-CL", {weekday:"long",day:"numeric",month:"long"}) + " · " + dt.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"}) + " (" + dur + ")";
      $("det_desc").textContent = r.descripcion || "";
      $("det_creador").textContent = "";
      const participantes = (r.reuniones_admins || []).map(a => a.admin_profiles?.nombre || a.admin_id);
      $("det_asistentes").textContent = participantes.length ? "Participantes: " + participantes.join(", ") : "";
      $("calDetalle").classList.add("open");
    }

    $("calPrev").addEventListener("click", () => {
      calFecha = new Date(calFecha.getFullYear(), calFecha.getMonth() - 1, 1);
      cargarCalendario();
    });
    $("calNext").addEventListener("click", () => {
      calFecha = new Date(calFecha.getFullYear(), calFecha.getMonth() + 1, 1);
      cargarCalendario();
    });

    $("btnNuevaReunion").addEventListener("click", async () => {
      $("calMsg").textContent = "";
      const hoy = new Date().toISOString().slice(0,10);
      $("r_fecha").value = hoy;
      $("r_titulo").value = "";
      $("r_desc").value = "";
      $("r_hora").value = "09:00";
      $("r_dur").value = "60";
      selectedAdmins = new Set();

      const { data: perfiles } = await sb.from("admin_profiles").select("id,nombre,email");
      adminsList = perfiles || [];
      $("r_admins").innerHTML = adminsList.map(a =>
        `<span class="cal-admin-chip" data-id="${a.id}">${esc(a.nombre)}</span>`
      ).join("");
      $("r_admins").querySelectorAll(".cal-admin-chip").forEach(chip => {
        chip.addEventListener("click", () => {
          const id = chip.dataset.id;
          if (selectedAdmins.has(id)) { selectedAdmins.delete(id); chip.classList.remove("sel"); }
          else { selectedAdmins.add(id); chip.classList.add("sel"); }
        });
      });
      $("calModal").classList.add("open");
    });

    $("btnGuardarReunion").addEventListener("click", async () => {
      const titulo = $("r_titulo").value.trim();
      const fecha = $("r_fecha").value;
      const hora = $("r_hora").value;
      if (!titulo) { $("calMsg").textContent = "Escribe un título."; return; }
      if (!fecha || !hora) { $("calMsg").textContent = "Pon la fecha y hora."; return; }
      $("btnGuardarReunion").disabled = true;
      $("calMsg").textContent = "Guardando…";

      const fecha_hora = new Date(`${fecha}T${hora}:00`).toISOString();
      const { data: reunion, error } = await sb.from("reuniones").insert({
        titulo,
        descripcion: $("r_desc").value.trim() || null,
        fecha_hora,
        duracion_min: +$("r_dur").value,
        creado_por: currentUser?.id,
      }).select().single();

      if (error) { $("calMsg").textContent = "Error: " + error.message; $("btnGuardarReunion").disabled = false; return; }

      if (selectedAdmins.size > 0) {
        const inserts = [...selectedAdmins].map(admin_id => ({ reunion_id: reunion.id, admin_id }));
        await sb.from("reuniones_admins").insert(inserts);
      }

      $("btnGuardarReunion").disabled = false;
      $("calModal").classList.remove("open");
      cargarCalendario();
    });

    $("btnCerrarModal").addEventListener("click", () => $("calModal").classList.remove("open"));
    $("btnCerrarDetalle").addEventListener("click", () => $("calDetalle").classList.remove("open"));
    $("calModal").addEventListener("click", e => { if (e.target === $("calModal")) $("calModal").classList.remove("open"); });
    $("calDetalle").addEventListener("click", e => { if (e.target === $("calDetalle")) $("calDetalle").classList.remove("open"); });
    // ── Fin Calendario ─────────────────────────────────────────────
```

- [ ] **Step 5: Verificar en el browser**

1. Abrir `condorai.cl/admin.html` → iniciar sesión
2. Confirmar que aparece la sección "📅 Calendario" al fondo del panel
3. Navegar meses con ← →
4. Click en "+ Nueva reunión" → completar título/fecha/hora → seleccionar participantes → Guardar
5. Confirmar que la reunión aparece en el día correcto del calendario
6. Click en el día → ver detalle de la reunión

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/reuniones.sql apps/web/admin.html
git commit -m "feat(calendario): calendario mensual en admin.html con Supabase"
```

---

## Push final

```bash
git push origin main
```

GitHub Pages se actualiza automáticamente. GitHub Actions corre en el próximo cron.

---

## Self-review — Cobertura del spec

| Requisito | Tarea |
|-----------|-------|
| Meta-analyzer 1×/día a las 9 PM Chile | Task 1 Step 1 |
| Silencio si no hay campaña activa | Task 1 Step 2 |
| Silencio si Claude falla/vacío | Task 1 Step 3 |
| News-bar amarilla en home | Task 2 |
| Nicolás semanal → Google Sheets | Task 3 Step 1 |
| Nicolás mensual → análisis Claude | Task 3 Step 1 |
| Telegram con link Google Sheets | Task 3 Step 1 |
| SQL tablas reuniones + reuniones_admins + admin_profiles | Task 4 Step 1 |
| Calendario mensual en admin.html | Task 4 Steps 2-4 |
| Crear reunión con multiselect admins | Task 4 Step 4 |
| Auto-aparece en calendarios de invitados | Task 4 Step 4 (RLS: cada admin ve sus reuniones) |
| Misma paleta visual que admin.html | Task 4 Step 2 (usa variables CSS del sistema) |
