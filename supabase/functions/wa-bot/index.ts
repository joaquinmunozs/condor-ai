// condor.ai · Edge Function "wa-bot" — Bot de WhatsApp entrante (WhatsApp Cloud API)
// Recibe los mensajes de los leads y responde con Claude sonando 100% humano, con el
// objetivo de AGENDAR UNA REUNIÓN o avanzar el cierre. Cruza el número con la tabla
// 'leads'. Puede agendar la reunión en el portal (tabla reuniones) y avisar al equipo.
//
// GET  -> verificación del webhook de Meta (hub.verify_token == WHATSAPP_VERIFY_TOKEN)
// POST -> mensaje entrante: identifica lead, responde con Claude (tool-use), envía por Cloud API.
//
// Secrets en Supabase: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN,
//   ANTHROPIC_API_KEY, SANDRA_TELEGRAM_BOT_TOKEN, SANDRA_TELEGRAM_CHAT_ID
//   (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solo)
// Deploy: supabase functions deploy wa-bot --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH = "https://graph.facebook.com/v21.0";
const AK = () => Deno.env.get("ANTHROPIC_API_KEY")!;
const WA_TOKEN = () => Deno.env.get("WHATSAPP_TOKEN")!;
const WA_PHONE = () => Deno.env.get("WHATSAPP_PHONE_ID")!;
const supa = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Solo dígitos; para cruzar números aunque vengan con/ sin prefijo o con +
const soloDigitos = (s: string) => (s || "").replace(/\D/g, "");

async function enviarWhatsApp(to: string, texto: string) {
  try {
    await fetch(`${GRAPH}/${WA_PHONE()}/messages`, {
      method: "POST",
      headers: { "Authorization": "Bearer " + WA_TOKEN(), "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: texto.slice(0, 4000) } }),
    });
  } catch (e) { console.error("enviarWhatsApp:", String(e).slice(0, 120)); }
}

async function telegramEquipo(texto: string) {
  const TG = Deno.env.get("SANDRA_TELEGRAM_BOT_TOKEN");
  const CHAT = Deno.env.get("SANDRA_TELEGRAM_CHAT_ID");
  if (!TG || !CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT, text: texto, parse_mode: "Markdown" }),
    });
  } catch (e) { console.error("telegramEquipo:", String(e).slice(0, 120)); }
}

async function claude(body: unknown) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": AK(), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("Claude " + r.status + ": " + (await r.text()).slice(0, 200));
  return r.json();
}

// ── Tools que Claude puede usar ──
const TOOLS = [
  {
    name: "agendar_reunion",
    description: "Agenda una reunión en el portal del equipo cuando el lead ACEPTA un día y hora concretos. Úsala solo cuando ya confirmaste fecha y hora con el lead.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Título corto, ej: 'Reunión con [negocio]'." },
        fecha_hora_iso: { type: "string", description: "Fecha y hora en ISO 8601 con offset, ej '2026-06-25T15:00:00-05:00' (Perú) o '-04:00' (Chile). Confirma el país/hora con el lead antes." },
        duracion_min: { type: "number", description: "Duración en minutos (default 30)." },
        resumen: { type: "string", description: "1-2 frases: qué quiere el lead / contexto para el equipo." },
      },
      required: ["titulo", "fecha_hora_iso", "resumen"],
    },
  },
  {
    name: "avisar_equipo",
    description: "Avisa a una persona del equipo y le pasa la conversación (handoff). Úsala si el lead pide hablar con un humano, quiere pagar/cerrar ya, se enoja, o pide algo que no puedes resolver.",
    input_schema: {
      type: "object",
      properties: {
        motivo: { type: "string", description: "Por qué necesita un humano." },
        resumen: { type: "string", description: "Resumen de la conversación para que el humano se ponga al día." },
      },
      required: ["motivo", "resumen"],
    },
  },
];

const SYSTEM = `Eres un asesor comercial de condor.ai, una agencia que crea páginas web profesionales e implementa inteligencia artificial para negocios de Perú y Chile (webs conectadas a WhatsApp y Google, videos con IA de productos, automatizaciones y agentes que contestan solos).

Hablas por WhatsApp con un lead. REGLAS:
- Suenas 100% HUMANO. Jamás digas que eres un bot, una IA o un asistente automático. Si te preguntan, eres parte del equipo de condor.ai.
- Mensajes CORTOS y naturales de WhatsApp (1-3 frases), cálidos, tuteas, español neutro/local. Puedes usar 1 emoji ocasional, sin exagerar.
- Tu OBJETIVO #1 es agendar una reunión corta (videollamada de ~30 min) para "entender bien su proyecto y poder darle un precio especial". Es tu técnica de cierre: el precio se ve en la reunión, no lo cierres por chat.
- Si ya tienes el contexto del diagnóstico del lead (su negocio y problema), úsalo para personalizar y mostrar que entiendes su rubro.
- Para agendar: ofrece 2-3 opciones de día/hora hábiles (lun-vie), confirma el país y la hora local del lead, y cuando acepte una, usa la herramienta agendar_reunion con la fecha/hora en ISO con el offset correcto (Perú -05:00, Chile -04:00).
- Si el lead pide hablar con una persona, quiere pagar/cerrar de inmediato, o se molesta, usa avisar_equipo (eso le pasa la conversación a un humano) y dile que en un momento lo contacta alguien del equipo.
- No inventes precios cerrados ni plazos imposibles. Sé honesto y útil.
- Si el lead solo saluda, responde cálido y lleva la conversación hacia su negocio y la reunión.`;

// ── Ejecuta una tool y devuelve el resultado para Claude ──
async function ejecutarTool(name: string, input: any, lead: any, waId: string) {
  if (name === "agendar_reunion") {
    const dur = input.duracion_min || 30;
    const sb = supa();
    const { data: reunion, error } = await sb.from("reuniones").insert({
      titulo: input.titulo || "Reunión con lead",
      descripcion: input.resumen || null,
      cliente: lead?.negocio || null,
      fecha_hora: new Date(input.fecha_hora_iso).toISOString(),
      duracion_min: dur,
      creado_por: null,
    }).select().single();
    if (error) return { ok: false, error: error.message };

    // Agrega a todos los admins como participantes (para que la vean/les notifique)
    const { data: admins } = await sb.from("admin_profiles").select("id");
    const inserts = (admins || []).map((a: any) => ({ reunion_id: reunion.id, admin_id: a.id }));
    if (inserts.length) await sb.from("reuniones_admins").insert(inserts);

    const f = new Date(input.fecha_hora_iso).toLocaleString("es-CL", { timeZone: "America/Lima", dateStyle: "full", timeStyle: "short" });
    await telegramEquipo(`🤖🔥 *El bot agendó una reunión*\n\n*${input.titulo}*\n🗓️ ${f} (${dur} min)\n📱 ${waId}${lead?.negocio ? `\n🏢 ${lead.negocio}` : ""}\n\n📝 ${input.resumen || ""}\n\n_Está en el calendario del portal. Conéctense._ 🦅`);
    return { ok: true, confirmada: true, fecha_legible: f };
  }

  if (name === "avisar_equipo") {
    await supa().from("leads").update({ wa_handoff: true }).eq("id", lead?.id);
    await telegramEquipo(`🤝 *Un lead pide atención humana en WhatsApp*\n\n📱 ${waId}${lead?.negocio ? `\n🏢 ${lead.negocio}` : ""}\n⚠️ Motivo: ${input.motivo}\n\n📝 ${input.resumen || ""}\n\n_El bot dejó de responder este chat. Tómenlo desde WhatsApp._ 🦅`);
    return { ok: true, handoff: true };
  }

  return { ok: false, error: "tool desconocida" };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // 1) Verificación del webhook (GET de Meta)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === Deno.env.get("WHATSAPP_VERIFY_TOKEN")) {
      return new Response(challenge || "", { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return new Response("forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("ok", { status: 200 });

  // 2) Mensaje entrante
  let payload: any;
  try { payload = await req.json(); } catch { return new Response("ok", { status: 200 }); }

  try {
    const value = payload?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    // Ignora callbacks que no son mensajes de texto entrantes (status, etc.)
    if (!msg || msg.type !== "text") return new Response("ok", { status: 200 });

    const waId = soloDigitos(msg.from);
    const texto = msg.text?.body?.trim() || "";
    const messageId = msg.id;
    const sb = supa();

    // 2a) Dedup por message_id (Meta reintenta si tardas)
    if (messageId) {
      const { data: ya } = await sb.from("wa_mensajes").select("id").eq("message_id", messageId).maybeSingle();
      if (ya) return new Response("ok", { status: 200 });
    }

    // 2b) Identifica el lead por número (match por terminación de 8-9 dígitos)
    const cola = waId.slice(-9);
    let { data: lead } = await sb.from("leads").select("*").ilike("whatsapp", `%${cola}%`).limit(1).maybeSingle();
    if (!lead) {
      const { data: nuevo } = await sb.from("leads")
        .insert({ whatsapp: waId, origen: "whatsapp-bot", estado: "activo" }).select().single();
      lead = nuevo;
    }

    // Guarda el mensaje entrante
    await sb.from("wa_mensajes").insert({ lead_id: lead?.id, wa_id: waId, message_id: messageId, rol: "in", texto });
    await sb.from("leads").update({ wa_ultimo: new Date().toISOString() }).eq("id", lead?.id);

    // 2c) Handoff: si un humano tomó la conversación, el bot no responde
    if (lead?.wa_handoff) return new Response("ok", { status: 200 });

    // 2d) Historial reciente (orden cronológico)
    const { data: hist } = await sb.from("wa_mensajes").select("rol,texto")
      .eq("wa_id", waId).order("creado_en", { ascending: false }).limit(20);
    const mensajes = (hist || []).reverse().map((m: any) => ({
      role: m.rol === "in" ? "user" : "assistant", content: m.texto || "",
    }));

    const contexto = `\n\n--- Contexto de ESTE lead (úsalo si sirve, no lo recites literal) ---
- Negocio: ${lead?.negocio || "desconocido"}
- Rubro: ${lead?.tipo || "—"}
- Problema detectado: ${lead?.problema || "—"}
- Categoría: ${lead?.categoria || "—"}${lead?.como_cerrar ? `\n- Cómo cerrarlo: ${lead.como_cerrar}` : ""}`;
    const sysFinal = SYSTEM + contexto;

    // 2e) Loop de Claude con tool-use (el historial ya incluye el mensaje actual)
    const convo: any[] = [...mensajes];
    let respuestaFinal = "";
    for (let paso = 0; paso < 4; paso++) {
      const r = await claude({
        model: "claude-sonnet-4-6", max_tokens: 800, system: sysFinal, tools: TOOLS, messages: convo,
      });
      const toolUses = (r.content || []).filter((b: any) => b.type === "tool_use");
      const textos = (r.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join(" ").trim();

      if (!toolUses.length) { respuestaFinal = textos; break; }

      // Ejecuta las tools y devuelve resultados a Claude
      convo.push({ role: "assistant", content: r.content });
      const results = [];
      for (const tu of toolUses) {
        const out = await ejecutarTool(tu.name, tu.input, lead, waId);
        results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(out) });
      }
      convo.push({ role: "user", content: results });
      if (textos) respuestaFinal = textos; // si ya dijo algo junto al tool, lo guardamos
    }

    if (!respuestaFinal) respuestaFinal = "¡Gracias por escribir! En un momento te respondo 🙌";

    // 2f) Envía la respuesta y la guarda
    await enviarWhatsApp(waId, respuestaFinal);
    await sb.from("wa_mensajes").insert({ lead_id: lead?.id, wa_id: waId, rol: "out", texto: respuestaFinal });
  } catch (e) {
    console.error("wa-bot error:", String(e).slice(0, 200));
  }

  // Siempre 200 para que Meta no reintente
  return new Response("ok", { status: 200 });
});
