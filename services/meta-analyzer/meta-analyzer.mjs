// condor.ai · Analizador de campañas Meta (2x/día → Telegram)
// Lee las campañas activas de la cuenta publicitaria vía Meta Marketing API,
// las analiza con Claude usando la metodología "3 Q's" (¿Qué pasó? ¿Por qué? ¿Qué hacemos?)
// y manda un reporte accionable al grupo de Telegram.
//
// Secrets requeridos (GitHub Actions):
//   META_ACCESS_TOKEN    → System User token (largo, no expira)
//   META_AD_ACCOUNT_ID   → act_XXXXXXXXX
//   ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID  (ya existen)

const META_TOKEN = process.env.META_ACCESS_TOKEN;
// Normaliza el ID: acepta "123...", "act_123...", con espacios o "act_act_..." por error
let AD_ACCOUNT = (process.env.META_AD_ACCOUNT_ID || "").trim().replace(/^act_/i, "").replace(/[^0-9]/g, "");
if (AD_ACCOUNT) AD_ACCOUNT = "act_" + AD_ACCOUNT;
const AK = process.env.ANTHROPIC_API_KEY;
const TG = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;
const API = "https://graph.facebook.com/v21.0";

const tg = (text) => fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ chat_id: CHAT, text, parse_mode: "Markdown" }),
}).then(r => r.json());

async function metaGet(path, params = {}) {
  const url = new URL(`${API}/${path}`);
  url.searchParams.set("access_token", META_TOKEN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // Reintenta hasta 4 veces ante fallos de red de GitHub↔Meta (ETIMEDOUT/fetch failed)
  let lastErr;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
      const j = await r.json();
      if (j.error) throw new Error("Meta API: " + (j.error.message || JSON.stringify(j.error)));
      return j;
    } catch (e) {
      lastErr = e;
      const msg = String(e);
      // Si es error real de Meta (no de red), no reintentar
      if (msg.includes("Meta API:")) throw e;
      await new Promise(res => setTimeout(res, 3000 * (i + 1)));
    }
  }
  throw lastErr;
}

const INSIGHTS = ["impressions", "reach", "frequency", "spend", "cpm", "ctr",
  "cpc", "clicks", "actions", "cost_per_action_type", "quality_ranking",
  "engagement_rate_ranking", "conversion_rate_ranking"].join(",");

async function main() {
  if (!META_TOKEN || !AD_ACCOUNT) {
    await tg("⚠️ *Analizador Meta*: faltan los secrets META_ACCESS_TOKEN o META_AD_ACCOUNT_ID. Configúralos en GitHub para activar el análisis.");
    console.log("Faltan secrets Meta"); return;
  }

  // 0) Moneda de la cuenta (para no confundir soles/pesos)
  const cuenta = await metaGet(`${AD_ACCOUNT}`, { fields: "currency,name" });

  // 1) Campañas activas + sus insights de los últimos 7 días
  const camps = await metaGet(`${AD_ACCOUNT}/campaigns`, { fields: "name,status,objective", limit: 25 });
  const activas = (camps.data || []).filter(c => c.status === "ACTIVE");

  if (!activas.length) {
    await tg("📊 *Analizador Meta* — Aún no hay campañas activas. Cuando lances la campaña, te empiezo a reportar 2 veces al día. 🦅");
    console.log("Sin campañas activas"); return;
  }

  const resumen = [];
  for (const c of activas) {
    try {
      const ins = await metaGet(`${c.id}/insights`, { fields: INSIGHTS, date_preset: "last_7d", level: "campaign" });
      const d = (ins.data || [])[0] || {};
      // Leads / conversaciones de WhatsApp / formularios
      const acc = d.actions || [];
      const get = (t) => Number((acc.find(a => a.action_type === t) || {}).value || 0);
      // Conversaciones de WhatsApp iniciadas = la métrica real de una campaña CTWA
      const convWA = get("onsite_conversion.messaging_conversation_started_7d") + get("onsite_conversion.total_messaging_connection");
      const leadsForm = get("lead") + get("offsite_conversion.fb_pixel_lead");
      const resultados = convWA > 0 ? convWA : leadsForm;
      const tipoResultado = convWA > 0 ? "conversaciones de WhatsApp" : "leads";
      const spend = Number(d.spend || 0);
      resumen.push({
        campaña: c.name, objetivo: c.objective, moneda: cuenta.currency || "?",
        gasto: +spend.toFixed(0), impresiones: Number(d.impressions || 0), alcance: Number(d.reach || 0),
        frecuencia: +Number(d.frequency || 0).toFixed(2), cpm: +Number(d.cpm || 0).toFixed(0),
        ctr: +Number(d.ctr || 0).toFixed(2), clics: Number(d.clicks || 0),
        resultados, tipo_resultado: tipoResultado,
        costo_por_resultado: resultados > 0 ? +(spend / resultados).toFixed(0) : null,
        calidad_creativo: d.quality_ranking,
      });
    } catch (e) { resumen.push({ nombre: c.name, error: String(e).slice(0, 120) }); }
  }

  // 2) Claude analiza como un socio cercano (humano, corto, sin tecnicismos)
  const horaCL = new Date(Date.now() - 4 * 3600000).toISOString().slice(11, 16); // UTC-4 Chile
  const sys = `Eres el socio de marketing de condor.ai (agencia que vende páginas web y videos con IA a restaurantes/negocios de Perú). Le escribes a Joaquín por Telegram para contarle cómo va su campaña de Meta Ads. Hablas como una PERSONA REAL, cercano y simple, como un amigo que sabe de esto — NO como un robot ni un reporte corporativo.

REGLAS DE ESTILO (muy importante):
- Mensaje CORTO (máx ~120 palabras). Nada de textos largos.
- NADA de títulos con "#", ni "ANÁLISIS CRÍTICO", ni secciones rígidas, ni mayúsculas gritando.
- Tono humano y motivador: "Oye Joaco, vamos bien…" / "Ojo con esto…".
- Usa 1-2 emojis máximo, naturales.
- Habla en la moneda que te paso (no inventes USD si es PEN o CLP).
- Lo más importante en campañas de WhatsApp (CTWA) es: cuántas CONVERSACIONES se iniciaron y a qué costo. Esa es la métrica que importa, NO el "CPL" de pixel.

QUÉ DECIR (en lenguaje simple, fluido, sin listas numeradas rígidas):
- Cómo viene hoy (resultados y costo por conversación, con un 🟢/🟡/🔴 según qué tan bien va).
- Una observación de por qué (creativo, audiencia o respuesta rápida en WhatsApp).
- 1 o 2 consejos concretos y fáciles. Si el costo por conversación es bajo y hay buen volumen, FELICÍTALO y dile que escale; no lo asustes.

Benchmarks reales para WhatsApp en Perú: una conversación iniciada a menos de ~S/5 es EXCELENTE, hasta ~S/15 es buena. Lo que importa es que esas conversaciones se conviertan en clientes (responder rápido). Si el gasto total aún es bajo, está aprendiendo, tranquilo.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": AK, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5", max_tokens: 700, system: sys,
      messages: [{ role: "user", content: "Datos de la campaña (últimos 7 días):\n" + JSON.stringify(resumen, null, 2) + "\n\nEscríbele a Joaquín el mensaje corto y humano por Telegram." }],
    }),
  });
  const data = await resp.json();
  const analisis = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("") || "Sin análisis.";

  await tg(`📊 *Campaña condor.ai* · ${horaCL} hrs\n\n${analisis}`);
  console.log("OK análisis enviado");
}

main().catch(async (e) => {
  console.error(e);
  try { await tg("⚠️ *Analizador Meta* falló: " + String(e).slice(0, 250)); } catch {}
  process.exit(1);
});
