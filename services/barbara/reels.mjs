// condor.ai · "Barbara Reels" — videos para redes (GitHub Actions)
// TIPO=trailer  → Reel 12s estilo trailer startup ofreciendo servicios (web, videos, automatización IA).
// TIPO=ugc      → Reel ~24s estilo creador hablando de lo poderosa que es la IA para negocios.
// Video con HIGGSFIELD (seedance1_5). Memoria anti-repetición compartida (content-log.json).
// Manda a Telegram para revisar antes de subir.
//
// Secrets: ANTHROPIC_API_KEY, HIGGSFIELD_ACCESS_TOKEN/REFRESH_TOKEN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// Variables: TIPO (trailer|ugc|test) · RETRY=1

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const AK = process.env.ANTHROPIC_API_KEY;
const TG = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;
const isRetry = process.env.RETRY === "1";
const LOG = "barbara/content-log.json";

let TIPO = (process.env.TIPO || "").trim().toLowerCase();
const isTest = TIPO === "test" || process.env.TEST === "1";
if (!["trailer", "ugc"].includes(TIPO)) {
  // por día: martes=trailer, jueves=ugc
  TIPO = new Date().getUTCDay() === 4 ? "ugc" : "trailer";
}

const TEMAS = {
  trailer: {
    titulo: "🎬 Reel — Trailer condor.ai",
    duracion: 12, nClips: 1,
    instruccion: "Reel de 12s estilo TRAILER de startup tecnológica, épico y moderno, presentando los servicios de condor.ai (páginas web con IA, videos 4K, automatizaciones y agentes IA). Energía aspiracional, ritmo rápido.",
    look: "Cinematic startup trailer, dark premium aesthetic with electric blue 2747ff / violet 7a5bff / coral red ff3b4e gradient accents, sleek 3D motion graphics, fast dynamic camera, glossy futuristic, high-end tech brand vibe. NO logos, NO text watermark.",
  },
  ugc: {
    titulo: "🎤 Reel — UGC sobre IA",
    duracion: 24, nClips: 2,
    instruccion: "Reel ~24s estilo UGC (creador de contenido auténtico) hablando de lo PODEROSA que es la IA para hacer crecer un negocio hoy. Cercano, real, inspirador, que enganche en los primeros 3 segundos.",
    look: "Authentic UGC vertical video, a real-looking person/scene in a natural modern setting (home office, cafe, phone-recorded feel), warm natural lighting, relatable not corporate, subtle motion. NO logos, NO watermark.",
  },
};
const tema = TEMAS[TIPO];

async function tg(method, payload, isForm = false) {
  const opt = { method: "POST" };
  if (isForm) opt.body = payload;
  else { opt.headers = { "Content-Type": "application/json" }; opt.body = JSON.stringify(payload); }
  return fetch(`https://api.telegram.org/bot${TG}/${method}`, opt);
}
async function claude(body) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": AK, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("Claude " + r.status + ": " + (await r.text()).slice(0, 200));
  return r.json();
}
const textOf = (d) => (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
const leerLog = () => { try { return JSON.parse(readFileSync(LOG, "utf8")); } catch { return []; } };
function guardarEnLog(entry) { const log = leerLog(); log.push(entry); writeFileSync(LOG, JSON.stringify(log.slice(-100), null, 2) + "\n"); }

const schema = {
  type: "object", additionalProperties: false,
  properties: {
    angulo: { type: "string", description: "Idea/ángulo único de este reel en una frase (para no repetir)." },
    clips: { type: "array", description: "Una entrada por clip de 12s (en orden). Cada prompt en inglés, art-directed, con el look del día.", items: { type: "string" } },
    caption: { type: "string", description: "Caption para Instagram/TikTok con hook fuerte + valor + invita a seguir/escribir + 5-8 hashtags." },
    texto_en_pantalla: { type: "string", description: "El texto corto que iría sobreimpreso en el reel (hook), en español." },
  },
  required: ["angulo", "clips", "caption", "texto_en_pantalla"],
};

function genVideo(prompt, idx, dur) {
  const safe = prompt.replace(/"/g, "'").slice(0, 1500);
  const out = execSync(
    `higgsfield generate create seedance1_5 --prompt "${safe}" --aspect_ratio 9:16 --duration ${dur} --resolution 720p --wait --wait-timeout 14m`,
    { encoding: "utf8", timeout: 15 * 60 * 1000, stdio: ["ignore", "pipe", "pipe"] }
  );
  const url = (out.trim().split("\n").pop() || "").trim();
  if (!/^https?:\/\//.test(url)) throw new Error("Higgsfield sin URL (clip " + (idx + 1) + "): " + out.slice(-160));
  return url;
}

async function main() {
  console.log("Reels |", TIPO, "| retry:", isRetry);
  if (isTest) { const j = await (await tg("sendMessage", { chat_id: CHAT, text: "✅ Barbara Reels: conexión OK" })).json(); if (!j.ok) throw new Error("TG: " + j.description); return; }

  const recientes = leerLog().slice(-15).map(e => `- [${e.fecha} ${e.tipo}] ${e.angulo}`).join("\n") || "(sin historial)";
  const extra = isRetry ? "\n\n⚠️ REINTENTO: el reel anterior fue rechazado. Haz uno claramente mejor y distinto." : "";

  const dir = await claude({
    model: "claude-sonnet-4-6", max_tokens: 2000,
    system: `Eres Barbara, directora creativa de condor.ai. Diseñas reels verticales 9:16 de alto impacto. Sigues el look del día. NUNCA repites ángulos ni protagonistas de las piezas recientes (te las paso). Innova siempre. Responde SOLO con el JSON. El reel debe tener ${tema.nClips} clip(s) de 12s.`,
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: `Reel de hoy (${TIPO}): ${tema.instruccion}\n\nLOOK OBLIGATORIO:\n${tema.look}\n\nPIEZAS RECIENTES (no repitas):\n${recientes}${extra}\n\nDevuelve ${tema.nClips} prompt(s) de clip en orden.` }],
  });
  const plan = JSON.parse(textOf(dir));
  const clips = (plan.clips || []).slice(0, tema.nClips);

  // Generar clips y unir si son varios
  const urls = [];
  for (let i = 0; i < clips.length; i++) urls.push(genVideo(clips[i] + "\n\n" + tema.look, i, 12));

  let videoBuf;
  if (urls.length === 1) {
    videoBuf = Buffer.from(await (await fetch(urls[0])).arrayBuffer());
  } else {
    // descargar y concatenar con ffmpeg
    const { writeFileSync: wf } = await import("node:fs");
    for (let i = 0; i < urls.length; i++) wf(`/tmp/c${i}.mp4`, Buffer.from(await (await fetch(urls[i])).arrayBuffer()));
    const list = urls.map((_, i) => `file '/tmp/c${i}.mp4'`).join("\n");
    wf("/tmp/list.txt", list);
    execSync(`ffmpeg -y -f concat -safe 0 -i /tmp/list.txt -c copy /tmp/final.mp4`, { stdio: "ignore" });
    videoBuf = readFileSync("/tmp/final.mp4");
  }

  // Enviar a Telegram
  const fd = new FormData();
  fd.append("chat_id", CHAT);
  fd.append("caption", `${tema.titulo}\n\n💬 Texto en pantalla: ${plan.texto_en_pantalla || ""}`);
  fd.append("video", new Blob([videoBuf], { type: "video/mp4" }), "reel.mp4");
  const j = await (await tg("sendVideo", fd, true)).json();
  if (!j.ok) throw new Error("Telegram sendVideo: " + (j.description || ""));
  await tg("sendMessage", { chat_id: CHAT, text: `🎬 *${tema.titulo}* — listo para revisar.\n\n📝 *Caption:*\n${plan.caption || ""}\n\n_Si quedó mal, responde "Denuevo barbara" en el grupo._`, parse_mode: "Markdown" });

  guardarEnLog({ fecha: new Date().toISOString().slice(0, 10), tipo: "reel-" + TIPO, angulo: plan.angulo || "" });
  console.log("OK reel", TIPO, "| ángulo:", plan.angulo);
}

main().catch(async (e) => {
  console.error(e);
  try { await tg("sendMessage", { chat_id: CHAT, text: "⚠️ Barbara Reels falló (" + TIPO + "): " + String(e).slice(0, 300) }); } catch {}
  process.exit(1);
});
