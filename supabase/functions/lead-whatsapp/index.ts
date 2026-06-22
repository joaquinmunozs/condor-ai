// condor.ai · Edge Function "lead-whatsapp"
// La llama el funnel (diagnostico-regalo) cuando un lead TOCA el botón de WhatsApp.
// 1) marca el lead como fue_whatsapp = true (para separarlo de los "abandonados")
// 2) Sandra avisa al grupo de Telegram con la chuleta de cómo cerrarlo
//
// Secrets en Supabase: SANDRA_TELEGRAM_BOT_TOKEN, SANDRA_TELEGRAM_CHAT_ID
// (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solo)
// Deploy:  supabase functions deploy lead-whatsapp --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...CORS } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ ok: true, servicio: "lead-whatsapp" });

  let b: Record<string, any>;
  try { b = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const leadId = b.lead_id;
  if (!leadId) return json({ error: "falta lead_id" }, 400);

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Marca solo si NO estaba ya marcado (evita avisar dos veces si hace doble click)
  const { data: lead } = await supa.from("leads")
    .update({ fue_whatsapp: true, whatsapp_en: new Date().toISOString() })
    .eq("id", leadId).eq("fue_whatsapp", false)
    .select("*").single();

  if (!lead) return json({ ok: true, nota: "ya estaba marcado o no existe" });

  // Sandra avisa al grupo
  const TG = Deno.env.get("SANDRA_TELEGRAM_BOT_TOKEN");
  const CHAT = Deno.env.get("SANDRA_TELEGRAM_CHAT_ID");
  if (TG && CHAT) {
    const msg = `🔥 *Lead caliente — probablemente te escriba*\n\n` +
      `*${lead.negocio || lead.tipo || "Lead"}*${lead.tipo ? ` · ${lead.tipo}` : ""}\n` +
      `📱 ${lead.whatsapp || "—"}   ✉️ ${lead.email || "—"}\n` +
      (lead.categoria ? `🌡️ ${lead.categoria}${lead.prioridad ? ` · prioridad ${lead.prioridad}` : ""}\n` : "") +
      (lead.problema ? `\n📝 Su problema: ${lead.problema}\n` : "") +
      `\n🎯 *Cómo cerrarlo:* ${lead.como_cerrar || "—"}\n\n` +
      `_Completó el diagnóstico y tocó WhatsApp. Respóndele rápido._ 🦅`;
    try {
      await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT, text: msg, parse_mode: "Markdown" }),
      });
    } catch (e) { console.error("Sandra falló:", String(e).slice(0, 100)); }
  }

  return json({ ok: true });
});
