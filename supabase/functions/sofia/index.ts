// condor.ai · Empleada IA "Sofia" — Email marketing
// -------------------------------------------------------------
// Secuencia de seguimiento de varias semanas para los leads del
// diagnóstico. Corre 1 vez al día (cron) y envía el email que toque
// a cada lead activo. Cuando cierras al cliente, lo marcas y deja
// de recibir ofertas.
//
// Acciones:
//   POST {}                              -> (cron) envía los emails que toquen hoy
//   POST {"accion":"cliente","email":"x@y.com","key":"ADMIN_KEY"}  -> marca cliente (deja de recibir)
//   GET  ?baja=<id>                      -> link de "darse de baja" del pie del email
//
// Secretos: RESEND_API_KEY, ADMIN_KEY, EMAIL_FROM (ej. "condor.ai <hola@tudominio.com>")
//           + SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (automáticos)
// Deploy: supabase functions deploy sofia --project-ref <ref> --no-verify-jwt
// Requiere columnas en leads: estado (default 'activo'), email_paso (default 0)
// -------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

// =========================================================
// LA SECUENCIA (edítala libremente: día relativo + asunto + cuerpo)
// {{negocio}} se reemplaza por el nombre del negocio del lead.
// =========================================================
const SECUENCIA = [
  { dia: 0,  asunto: "Tu diagnóstico de {{negocio}} (y el siguiente paso)",
    cuerpo: "Hola 👋 Vimos el diagnóstico de {{negocio}}. El problema #1 que detectamos tiene solución más rápida de lo que crees: una página web profesional conectada a WhatsApp y Google. ¿Te muestro cómo se vería la tuya?" },
  { dia: 3,  asunto: "Lo que tu competencia ya está haciendo",
    cuerpo: "La mayoría de tus competidores ya aparecen en Google y tienen su carta/catálogo online. Cada día sin web es un cliente que se va con ellos. En condor.ai te la entregamos en 24–72h." },
  { dia: 7,  asunto: "Caso real: de Instagram a vender en serio",
    cuerpo: "Negocios como {{negocio}} que pasaron de depender solo de Instagram a tener su web profesional, empezaron a recibir pedidos directos por WhatsApp. ¿Lo intentamos contigo esta semana?" },
  { dia: 14, asunto: "Tu web lista esta semana 🚀",
    cuerpo: "Tengo un espacio para entregar una web nueva esta semana. Diseño profesional, videos con IA de tus productos, y conexión a WhatsApp. ¿La tuya?" },
  { dia: 21, asunto: "Una pregunta rápida sobre {{negocio}}",
    cuerpo: "¿Qué te detiene para tener tu página web? Si es el precio, tenemos planes desde accesibles con pago mensual. Respóndeme y vemos el que te calce." },
  { dia: 35, asunto: "Oferta para {{negocio}} (tiempo limitado)",
    cuerpo: "Esta quincena tenemos un descuento en el setup para nuevos negocios. Si querías tu web, este es el momento. ¿Te paso el detalle?" },
  { dia: 49, asunto: "¿Cerramos esto?",
    cuerpo: "No quiero llenarte el correo 🙏. Si en algún momento quieres tu página web para {{negocio}}, aquí estaré. Un último: ¿lo vemos esta semana o lo dejamos para más adelante?" },
];

const html = (cuerpo: string, idBaja: string, fnUrl: string) =>
  `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;line-height:1.6;max-width:520px">
    <p>${cuerpo}</p>
    <p style="margin-top:24px"><a href="https://wa.me/56988989824" style="background:#1f2bff;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Hablar por WhatsApp</a></p>
    <p style="color:#999;font-size:12px;margin-top:30px">condor.ai · Páginas web para negocios<br>
    Si no quieres más correos, <a href="${fnUrl}?baja=${idBaja}" style="color:#999">date de baja aquí</a>.</p>
  </div>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const url = new URL(req.url);
  const fnUrl = url.origin + url.pathname;

  // ----- Darse de baja (link del email) -----
  if (req.method === "GET" && url.searchParams.has("baja")) {
    const id = url.searchParams.get("baja");
    await supa.from("leads").update({ estado: "baja" }).eq("id", id);
    return new Response("<h2>Listo, no recibirás más correos. 🙏</h2>", { headers: { "Content-Type": "text/html" } });
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* cron sin body */ }

  // ----- Marcar como CLIENTE (deja de recibir ofertas) -----
  if (body.accion === "cliente") {
    if (body.key !== Deno.env.get("ADMIN_KEY")) return json({ error: "no autorizado" }, 401);
    const { error } = await supa.from("leads").update({ estado: "cliente" }).eq("email", body.email);
    return error ? json({ error: error.message }, 500) : json({ ok: true, marcado: body.email });
  }

  // ----- CRON: enviar el email que toque a cada lead activo -----
  const { data: leads } = await supa.from("leads").select("*").eq("estado", "activo");
  const ahora = Date.now();
  let enviados = 0;

  for (const lead of leads ?? []) {
    const paso = lead.email_paso ?? 0;
    if (paso >= SECUENCIA.length) continue;            // ya terminó la secuencia
    const dias = (ahora - new Date(lead.creado_en).getTime()) / 86400000;
    const sig = SECUENCIA[paso];
    if (dias < sig.dia) continue;                      // todavía no toca el siguiente
    if (!lead.email) { await supa.from("leads").update({ email_paso: paso + 1 }).eq("id", lead.id); continue; }

    const cuerpo = sig.cuerpo.replaceAll("{{negocio}}", lead.negocio || "tu negocio");
    const asunto = sig.asunto.replaceAll("{{negocio}}", lead.negocio || "tu negocio");
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + (Deno.env.get("RESEND_API_KEY") ?? ""), "Content-Type": "application/json" },
        body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM") ?? "condor.ai <onboarding@resend.dev>", to: lead.email, subject: asunto, html: html(cuerpo, String(lead.id), fnUrl) }),
      });
      if (r.ok) { await supa.from("leads").update({ email_paso: paso + 1 }).eq("id", lead.id); enviados++; }
    } catch (_e) { /* reintenta mañana */ }
  }
  return json({ ok: true, enviados });
});
