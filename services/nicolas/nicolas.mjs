// condor.ai · Nicolás — Reportes de ingresos semanales y mensuales
// Semanal (viernes): lee pagos de la semana → Google Sheets (Apps Script) → link a Telegram
// Mensual (día 30): consolida el mes → análisis Claude → Telegram
//
// Escribe en Google Sheets vía un Apps Script Web App (sin claves de servicio,
// evita la política iam.disableServiceAccountKeyCreation de la organización).
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
//          NICOLAS_SHEETS_URL, NICOLAS_SHEETS_TOKEN, ANTHROPIC_API_KEY

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TG = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;
const AK = process.env.ANTHROPIC_API_KEY;
const SHEETS_URL = (process.env.NICOLAS_SHEETS_URL || "").trim();
const SHEETS_TOKEN = (process.env.NICOLAS_SHEETS_TOKEN || "").trim();
const MODO = process.env.NICOLAS_MODO || "semanal"; // "semanal" | "mensual"

if (!SUPABASE_URL || !SERVICE) { console.error("Faltan SUPABASE_URL / SERVICE_ROLE_KEY"); process.exit(1); }
if (!TG || !CHAT) { console.error("Faltan TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID"); process.exit(1); }
if (!SHEETS_URL || !SHEETS_TOKEN) { console.error("Faltan NICOLAS_SHEETS_URL / NICOLAS_SHEETS_TOKEN"); process.exit(1); }

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

// ── Google Sheets vía Apps Script Web App ──────────────────────────
// Envía una matriz de filas; el Apps Script crea/limpia la pestaña y devuelve la URL.
async function escribirReporte(nombreHoja, filas) {
  const r = await fetch(SHEETS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: SHEETS_TOKEN, hoja: nombreHoja, filas }),
  });
  const d = await r.json().catch(() => ({}));
  if (!d.ok) throw new Error("Apps Script: " + (d.error || ("HTTP " + r.status)));
  return d.url || "https://docs.google.com/spreadsheets";
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
    `pagos?select=monto,estado,tipo,cliente_id,creado_en&creado_en=gte.${desde}T00:00:00&creado_en=lte.${hasta}T23:59:59&order=creado_en.desc`
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
async function reporteSemanal() {
  const { desde, hasta } = rangoFechas(7);
  const pagos = await obtenerPagos(desde, hasta);

  const pagados = pagos.filter(p => p.estado === "pagado");
  const pendientes = pagos.filter(p => p.estado === "pendiente");
  const totalCobrado = pagados.reduce((s, p) => s + (p.monto || 0), 0);
  const totalPend = pendientes.reduce((s, p) => s + (p.monto || 0), 0);

  const headers = ["Cliente", "Plan", "Tipo", "Monto", "Moneda", "Estado", "Fecha"];
  const filas = [
    headers,
    ...pagos.map(p => [
      p.negocio, p.plan, p.tipo || "—",
      String(p.monto || 0), p.moneda,
      p.estado === "pagado" ? "✅ Pagado" : "⏳ Pendiente",
      (p.creado_en || "").slice(0, 10),
    ]),
    [],
    ["RESUMEN"],
    ["Total cobrado", String(totalCobrado)],
    ["Total pendiente", String(totalPend)],
    ["Pagos confirmados", String(pagados.length)],
  ];

  const url = await escribirReporte(`Semana ${desde}`, filas);
  await tg(`📊 *Nicolás · Reporte semanal*\n_${desde} → ${hasta}_\n\n` +
    `✅ Cobrado: *${totalCobrado.toLocaleString()}* (${pagados.length} pagos)\n` +
    `⏳ Pendiente: ${totalPend.toLocaleString()} (${pendientes.length} cobros)\n\n` +
    `[Ver en Google Sheets →](${url})`);
}

// ── Informe mensual con análisis Claude ────────────────────────────
async function reporteMensual() {
  const { desde, hasta } = rangoFechas(30);
  const pagos = await obtenerPagos(desde, hasta);

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
  const filas = [
    headers,
    ...pagos.map(p => [
      p.negocio, p.plan, p.tipo || "—",
      String(p.monto || 0), p.moneda,
      p.estado === "pagado" ? "✅ Pagado" : "⏳ Pendiente",
      (p.creado_en || "").slice(0, 10),
    ]),
    [],
    ["RESUMEN DEL MES"],
    ["Total cobrado", String(totalCobrado)],
    ["Total pendiente", String(totalPend)],
    ["Clientes con cobros", String(new Set(pagos.map(p => p.cliente_id)).size)],
  ];

  const url = await escribirReporte(`Mes ${new Date().toISOString().slice(0, 7)}`, filas);

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
  if (MODO === "mensual") {
    await reporteMensual();
  } else {
    await reporteSemanal();
  }
  console.log("OK");
}

main().catch(async (e) => {
  console.error(e);
  try { await tg("⚠️ *Nicolás* falló: " + String(e).slice(0, 250)); } catch {}
  process.exit(1);
});
