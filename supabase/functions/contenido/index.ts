// condor.ai · Edge Function "contenido"
// -------------------------------------------------------------
// Genera ideas/posts para redes sociales con Claude Haiku y los
// guarda en la tabla public.contenido (listos para revisar/publicar).
//
// Uso:  POST  { "tema": "opcional", "cantidad": 3 }
// Secreto reutilizado: ANTHROPIC_API_KEY (ya configurado en el proyecto)
// Deploy: supabase functions deploy contenido --project-ref <ref> --no-verify-jwt
// -------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "claude-haiku-4-5";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ ok: true, servicio: "condor.ai contenido" });

  let body: any = {};
  try { body = await req.json(); } catch { /* sin body, usa defaults */ }
  const tema = (body.tema ?? "").toString().slice(0, 300);
  const cantidad = Math.min(Math.max(parseInt(body.cantidad ?? "3", 10) || 3, 1), 6);

  const system = `Eres el social media manager de condor.ai, una agencia peruana que crea páginas web profesionales para negocios locales (entrega 24–72h, precios accesibles, con videos de IA y conexión a WhatsApp/Google).

Tu trabajo: crear publicaciones para redes sociales (Instagram, Facebook, TikTok) que atraigan a dueños de negocios en Perú a pedir su página web. Tono: cercano, peruano, persuasivo, con ganchos fuertes. Mezcla formatos (post, reel, historia). Cada idea debe ser concreta y lista para grabar/diseñar.

Responde SOLO con el JSON pedido, en español peruano.`;

  const userMsg = `Genera ${cantidad} ideas de contenido${tema ? ` sobre: "${tema}"` : " variadas (mezcla educativo, antes/después, testimonio, oferta)"}.`;

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      posts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            plataforma: { type: "string", enum: ["Instagram", "Facebook", "TikTok"] },
            formato: { type: "string", enum: ["Post", "Reel", "Historia"] },
            titulo: { type: "string", description: "Gancho/hook corto" },
            copy: { type: "string", description: "Texto de la publicación listo para usar" },
            hashtags: { type: "string", description: "5-8 hashtags relevantes en Perú" },
          },
          required: ["plataforma", "formato", "titulo", "copy", "hashtags"],
        },
      },
    },
    required: ["posts"],
  };

  let out: any;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL, max_tokens: 2000, system,
        output_config: { format: { type: "json_schema", schema } },
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!resp.ok) return json({ error: "IA no disponible", detalle: (await resp.text()).slice(0, 300) }, 502);
    const data = await resp.json();
    const texto = (data.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    out = JSON.parse(texto);
  } catch (e) {
    return json({ error: "Fallo generando contenido", detalle: String(e).slice(0, 200) }, 500);
  }

  // Guardar en la base de datos
  try {
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const filas = (out.posts ?? []).map((p: any) => ({
      plataforma: p.plataforma, formato: p.formato, titulo: p.titulo, copy: p.copy, hashtags: p.hashtags,
    }));
    if (filas.length) await supa.from("contenido").insert(filas);
  } catch (e) {
    console.error("Error guardando contenido:", e);
  }

  return json(out);
});
