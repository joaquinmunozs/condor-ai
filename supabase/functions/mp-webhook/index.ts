// condor.ai · Edge Function "mp-webhook"
// Recibe las notificaciones de Mercado Pago, marca el pago como pagado,
// actualiza la ficha del cliente Y AVISA POR CORREO (a ti y al cliente).
//
// Secretos: MP_ACCESS_TOKEN, RESEND_API_KEY, EMAIL_FROM (ej: condor.ai <contacto@teamcondorcl.com>)
//           ADMIN_NOTIFY (opcional, correo donde te llegan los avisos; por defecto contacto@teamcondorcl.com)
// Deploy:  supabase functions deploy mp-webhook --project-ref <ref> --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_NOTIFY = Deno.env.get("ADMIN_NOTIFY") || "contacto@teamcondorcl.com";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "condor.ai <onboarding@resend.dev>";

async function enviarCorreo(to: string, subject: string, html: string) {
  const KEY = Deno.env.get("RESEND_API_KEY");
  if (!KEY || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
    });
  } catch (e) { console.error("email error:", e); }
}

async function avisarPago(sb: any, clienteId: string, tipo: string) {
  const { data: c } = await sb.from("clientes").select("*").eq("id", clienteId).maybeSingle();
  if (!c) return;
  const mon = c.moneda || "CLP";
  const monto = (tipo === "mensual" ? c.mensual_monto : c.setup_monto) || 0;
  const concepto = tipo === "mensual" ? "Mensualidad" : "Pago inicial (setup)";
  // Aviso para el equipo
  await enviarCorreo(ADMIN_NOTIFY, `💰 Pago recibido · ${c.negocio || c.email}`,
    `<h2>Nuevo pago confirmado</h2>
     <p><b>Cliente:</b> ${c.negocio || ""} (${c.email})<br>
     <b>Concepto:</b> ${concepto}<br>
     <b>Monto:</b> ${mon} ${Number(monto).toLocaleString()}</p>
     <p>La ficha del cliente ya se actualizó en el portal.</p>`);
  // Aviso/recibo para el cliente
  await enviarCorreo(c.email, `✅ Recibimos tu pago · condor.ai`,
    `<h2>¡Gracias por tu pago! 🎉</h2>
     <p>Confirmamos tu <b>${concepto.toLowerCase()}</b> por <b>${mon} ${Number(monto).toLocaleString()}</b>.</p>
     <p>Puedes ver el estado y descargar tu comprobante en tu portal:</p>
     <p><a href="https://condorai.cl/portal.html">Abrir mi portal →</a></p>
     <p>— El equipo de condor.ai</p>`);
}

Deno.serve(async (req) => {
  const MP = Deno.env.get("MP_ACCESS_TOKEN") || "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const url = new URL(req.url);

  let type = url.searchParams.get("type") || url.searchParams.get("topic") || "";
  let id = url.searchParams.get("data.id") || url.searchParams.get("id") || "";
  try { const b = await req.json(); type = b.type || b.topic || type; id = (b.data && b.data.id) || b.id || id; } catch { /* sin body */ }

  try {
    if (type.includes("payment") && id) {
      const r = await fetch("https://api.mercadopago.com/v1/payments/" + id, { headers: { Authorization: "Bearer " + MP } });
      const p = await r.json();
      if (p.status === "approved" && p.external_reference) {
        await sb.from("pagos").update({ estado: "pagado", mp_id: String(id) }).eq("id", p.external_reference);
        const { data: pago } = await sb.from("pagos").select("cliente_id,tipo").eq("id", p.external_reference).maybeSingle();
        if (pago) {
          const limpiar = { irresponsable: false, dias_sin_pagar: 0, alerta_admin_en: null };
          if (pago.tipo === "setup") await sb.from("clientes").update({ setup_estado: "pagado", ...limpiar }).eq("id", pago.cliente_id);
          else { const prox = new Date(); prox.setMonth(prox.getMonth() + 1); await sb.from("clientes").update({ mensual_estado: "al_dia", proximo_cobro: prox.toISOString().slice(0, 10), ...limpiar }).eq("id", pago.cliente_id); }
          await avisarPago(sb, pago.cliente_id, pago.tipo);
        }
      }
    } else if (type.includes("preapproval") && id) {
      const r = await fetch("https://api.mercadopago.com/preapproval/" + id, { headers: { Authorization: "Bearer " + MP } });
      const pa = await r.json();
      if ((pa.status === "authorized") && pa.external_reference) {
        await sb.from("pagos").update({ estado: "pagado", mp_id: String(id) }).eq("id", pa.external_reference);
        const { data: pago } = await sb.from("pagos").select("cliente_id").eq("id", pa.external_reference).maybeSingle();
        if (pago) {
          const prox = new Date(); prox.setMonth(prox.getMonth() + 1);
          await sb.from("clientes").update({ mensual_estado: "al_dia", proximo_cobro: prox.toISOString().slice(0, 10), irresponsable: false, dias_sin_pagar: 0, alerta_admin_en: null }).eq("id", pago.cliente_id);
          await avisarPago(sb, pago.cliente_id, "mensual");
        }
      }
    }
  } catch (e) { console.error("webhook error:", e); }

  return new Response("ok", { status: 200 }); // siempre 200 para que MP no reintente sin fin
});
