// condor.ai · Edge Function "reunion-notificar"
// Sandra avisa en su grupo de Telegram cuando un admin agenda una reunión.
// La llama el panel admin (admin.html) al guardar una reunión.
//
// Seguridad: solo usuarios ADMIN autenticados pueden dispararla (verifica es_admin
// con el token de sesión del usuario). Así nadie externo puede spamear el grupo.
//
// Secrets en Supabase: SANDRA_TELEGRAM_BOT_TOKEN, SANDRA_TELEGRAM_CHAT_ID
// (SUPABASE_URL y SUPABASE_ANON_KEY los inyecta Supabase solo)
// Deploy:  supabase functions deploy reunion-notificar --no-verify-jwt

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
  if (req.method !== "POST") return json({ ok: true, servicio: "Sandra · notificar reunión" });

  // 1) Verificar que quien llama es un admin autenticado
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  if (!token) return json({ error: "sin token" }, 401);
  try {
    const supaUser = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: "Bearer " + token } } },
    );
    const { data: esAdmin } = await supaUser.rpc("es_admin");
    if (!esAdmin) return json({ error: "no autorizado" }, 403);
  } catch (_e) {
    return json({ error: "no autorizado" }, 403);
  }

  // 2) Datos de la reunión
  let b: Record<string, any>;
  try { b = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  // 3) Mandar el mensaje al grupo de Sandra
  const TG = Deno.env.get("SANDRA_TELEGRAM_BOT_TOKEN");
  const CHAT = Deno.env.get("SANDRA_TELEGRAM_CHAT_ID");
  if (!TG || !CHAT) return json({ ok: false, motivo: "Sandra aún no configurada (faltan secrets)" });

  const dt = new Date(b.fecha_hora);
  const fecha = dt.toLocaleString("es-CL", { timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const dur = b.duracion_min >= 60 ? `${b.duracion_min / 60}h` : `${b.duracion_min} min`;
  const invitados = Array.isArray(b.invitados) ? b.invitados.filter(Boolean) : [];

  const msg = `📅 *Nueva reunión agendada*\n\n*${b.titulo || "Reunión"}*\n🗓️ ${fecha} (${dur})` +
    (b.cliente ? `\n👤 Cliente: ${b.cliente}` : "") +
    (invitados.length ? `\n👥 Invitados: ${invitados.join(", ")}` : "") +
    (b.descripcion ? `\n\n📝 ${b.descripcion}` : "") +
    `\n\n_Cada invitado la verá en su calendario del portal. ¡No la olviden!_ 🦅`;

  try {
    const r = await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT, text: msg, parse_mode: "Markdown" }),
    });
    const j = await r.json();
    if (!j.ok) return json({ ok: false, error: j.description || "Telegram falló" });
  } catch (e) {
    return json({ ok: false, error: String(e).slice(0, 120) });
  }

  return json({ ok: true });
});
