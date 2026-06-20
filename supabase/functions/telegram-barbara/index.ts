// condor.ai · Edge Function "telegram-barbara"
// Webhook de Telegram: escucha el grupo y, si alguien escribe "Denuevo barbara",
// dispara un REINTENTO del último contenido que Barbara generó (mejorándolo).
//
// Cómo sabe qué reintentar: lee barbara/content-log.json del repo (último registro)
// y dispara el workflow correspondiente (barbara.yml o reels.yml) con retry=1.
//
// Deploy: supabase functions deploy telegram-barbara --no-verify-jwt
// Secretos: GH_TOKEN (PAT con permiso 'actions:write' sobre el repo), TELEGRAM_BOT_TOKEN
// Luego registrar el webhook (ver PASOS abajo en el repo).

const REPO = "joaquinmunozs/condorweb-diagnostico";
const GH = Deno.env.get("GH_TOKEN");
const TG = Deno.env.get("TELEGRAM_BOT_TOKEN");

async function tgSend(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// Lee el último registro del content-log para saber qué tipo reintentar
async function ultimoContenido(): Promise<{ workflow: string; input: Record<string, string> } | null> {
  try {
    const r = await fetch(`https://raw.githubusercontent.com/${REPO}/main/barbara/content-log.json?t=${Date.now()}`);
    const log = await r.json();
    const last = (log || [])[log.length - 1];
    if (!last) return null;
    const tipo = String(last.tipo || "");
    if (tipo.startsWith("reel-")) {
      return { workflow: "reels.yml", input: { tipo: tipo.replace("reel-", ""), retry: "1" } };
    }
    return { workflow: "barbara.yml", input: { dia: tipo, retry: "1" } };
  } catch { return null; }
}

async function dispararWorkflow(workflow: string, inputs: Record<string, string>) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${workflow}/dispatches`, {
    method: "POST",
    headers: { Authorization: "Bearer " + GH, Accept: "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "condor-barbara" },
    body: JSON.stringify({ ref: "main", inputs }),
  });
  return r.ok;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  let update: any;
  try { update = await req.json(); } catch { return new Response("ok"); }

  const msg = update?.message || update?.channel_post;
  const texto = (msg?.text || "").trim().toLowerCase();
  const chatId = msg?.chat?.id;
  if (!chatId) return new Response("ok");

  if (texto === "denuevo barbara" || texto === "de nuevo barbara") {
    const ultimo = await ultimoContenido();
    if (!ultimo) { await tgSend(chatId, "🤔 No encuentro el último contenido para reintentar. Genera uno primero."); return new Response("ok"); }
    const ok = await dispararWorkflow(ultimo.workflow, ultimo.input);
    await tgSend(chatId, ok
      ? "🔄 Dale, Barbara está rehaciendo el último contenido mejorado. En unos minutos te lo mando de nuevo. 🦅"
      : "⚠️ No pude disparar el reintento (revisa el GH_TOKEN).");
  }
  return new Response("ok");
});
