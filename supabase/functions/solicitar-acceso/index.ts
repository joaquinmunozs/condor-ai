// condor.ai · Edge Function "solicitar-acceso"
// Cierra el agujero de seguridad: SOLO los correos registrados por un admin
// (en la tabla admins o clientes) reciben el código. Un correo ajeno NUNCA recibe nada.
// Genera el código nosotros (admin.generateLink) y lo enviamos con Resend, con un
// diseño bonito propio (dice "condor AI", sin convertirse en enlace a un dominio .ai).
// Además limita los intentos por IP (anti-bot).
//
// Deploy: supabase functions deploy solicitar-acceso --project-ref <ref> --no-verify-jwt
// Secretos: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto), RESEND_API_KEY, EMAIL_FROM

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", ...CORS } });
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "condor AI <onboarding@resend.dev>";
const LIMITE = 5, VENTANA_MIN = 15;

function emailCodigo(codigo: string) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 14px 40px -18px rgba(20,20,40,.25)">
      <tr><td style="background:linear-gradient(115deg,#2747ff 0%,#7a5bff 48%,#ff3b4e 100%);padding:32px;text-align:center">
        <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:.5px">condor&nbsp;AI</div>
        <div style="color:rgba(255,255,255,.9);font-size:14px;margin-top:4px">Acceso a tu portal</div>
      </td></tr>
      <tr><td style="padding:36px 32px;text-align:center">
        <p style="font-size:15px;color:#444;margin:0 0 18px">Tu código de acceso es:</p>
        <div style="display:inline-block;background:#f3f4ff;border:1px solid #dfe3ff;border-radius:14px;padding:16px 28px;font-size:34px;font-weight:700;letter-spacing:.32em;color:#2747ff">${codigo}</div>
        <p style="font-size:13px;color:#888;margin:22px 0 0;line-height:1.6">Escríbelo en la página para entrar.<br>Vence en 1 hora. Si no fuiste tú, ignora este correo.</p>
      </td></tr>
      <tr><td style="background:#fafafa;padding:16px;text-align:center;font-size:12px;color:#999">condor&nbsp;AI · Inteligencia artificial para hacer crecer tu negocio</td></tr>
    </table></td></tr></table></body></html>`;
}

async function enviarResend(to: string, codigo: string) {
  const KEY = Deno.env.get("RESEND_API_KEY");
  if (!KEY) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject: "Tu código de acceso · condor AI", html: emailCodigo(codigo) }),
    });
    return r.ok;
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "método no permitido" }, 405);

  let email = "";
  try { const b = await req.json(); email = String(b?.email || "").trim().toLowerCase(); } catch { /* */ }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: "correo inválido" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // 1) Rate limit por IP
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "desconocida";
  const clave = "otp:" + ip, ahora = new Date();
  const { data: rl } = await sb.from("rate_limits").select("*").eq("clave", clave).maybeSingle();
  if (rl && rl.reinicia_en && new Date(rl.reinicia_en) > ahora) {
    if ((rl.conteo ?? 0) >= LIMITE) return json({ ok: false, error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." }, 429);
    await sb.from("rate_limits").update({ conteo: (rl.conteo ?? 0) + 1 }).eq("clave", clave);
  } else {
    await sb.from("rate_limits").upsert({ clave, conteo: 1, reinicia_en: new Date(ahora.getTime() + VENTANA_MIN * 60000).toISOString() });
  }

  // 2) ¿Correo autorizado? (admin o cliente activo)
  const { data: autorizado } = await sb.rpc("correo_autorizado", { p_email: email });

  // V5 · Registrar el intento (para detectar abuso). Nunca bloquea si la tabla no existe.
  try { await sb.from("acceso_log").insert({ email, ip, autorizado: !!autorizado }); } catch { /* */ }

  const generica = { ok: true, mensaje: "Si tu correo está registrado, te enviamos un código." };
  if (!autorizado) return json(generica);

  // V4 · Límite extra por CORREO (anti-bombing a una víctima concreta): máx 3 códigos / 15 min
  try {
    const cKey = "otpmail:" + email;
    const { data: rlm } = await sb.from("rate_limits").select("*").eq("clave", cKey).maybeSingle();
    if (rlm && rlm.reinicia_en && new Date(rlm.reinicia_en) > ahora) {
      if ((rlm.conteo ?? 0) >= 3) return json(generica); // silencioso: ya se enviaron suficientes
      await sb.from("rate_limits").update({ conteo: (rlm.conteo ?? 0) + 1 }).eq("clave", cKey);
    } else {
      await sb.from("rate_limits").upsert({ clave: cKey, conteo: 1, reinicia_en: new Date(ahora.getTime() + VENTANA_MIN * 60000).toISOString() });
    }
  } catch { /* */ }

  // 3) Crear usuario de auth si es su primera vez, generar el código y enviarlo con Resend
  try {
    await sb.auth.admin.createUser({ email, email_confirm: true }).catch(() => {}); // si ya existe, no pasa nada
    const { data: link } = await sb.auth.admin.generateLink({ type: "magiclink", email });
    const codigo = (link?.properties as any)?.email_otp;
    if (codigo) await enviarResend(email, codigo);
  } catch (_e) { /* no revelamos errores internos */ }

  return json(generica);
});
