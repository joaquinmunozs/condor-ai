/**
 * Cliente del diagnóstico con IA (Edge Function de Supabase, ya en producción).
 * El frontend nativo (DiagnosticoQuiz) consume esto; antes la landing saltaba a
 * la página estática /diagnostico-gratis/ — ahora todo vive dentro del SPA.
 *
 * La ANON_KEY es la clave pública de Supabase: es segura de exponer en el front
 * (sin permisos de escritura directa; la función valida y guarda el lead).
 */
const FUNCTION_URL = "https://ogmvdthxwcmvqjlxhpsr.supabase.co/functions/v1/diagnostico";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbXZkdGh4d2NtdnFqbHhocHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NDEwMTksImV4cCI6MjA5NzIxNzAxOX0.wo6zSUlMejjYu1hSweZcWEBBdCvBgVNWg3xtLzFTIrI";

export const WHATSAPP = "56988989824"; // WhatsApp Business condor.ai
export const USOS_KEY = "condor_diag_usos"; // anti-spam por navegador (máx 2)

export type Diagnostico = {
  saludo?: string;
  diagnostico?: string;
  problemas?: string[];
  recomendacion?: string;
  urgencia?: string;
  categoria?: string;
  prioridad?: string;
  lead_id?: string;
  bloqueado?: boolean;
};

export type Resultado =
  | { ok: true; data: Diagnostico }
  | { ok: false; motivo: "contacto" | "error" };

/** Identificador único para deduplicar el evento de conversión con Meta (pixel ↔ CAPI). */
export function nuevoEventId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Valida que haya AL MENOS un canal de contacto real (mismo criterio que la función). */
export function contactoValido(email = "", whatsapp = ""): boolean {
  const emailOk = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email.trim());
  const dig = (whatsapp.match(/\d/g) || []).length;
  return emailOk || (dig >= 8 && dig <= 15);
}

/** Envía las respuestas a la IA y devuelve el diagnóstico (o el motivo de error). */
export async function enviarDiagnostico(datos: Record<string, string>): Promise<Resultado> {
  try {
    const r = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(datos),
    });
    if (r.status === 422) return { ok: false, motivo: "contacto" };
    if (!r.ok) return { ok: false, motivo: "error" };
    return { ok: true, data: (await r.json()) as Diagnostico };
  } catch {
    return { ok: false, motivo: "error" };
  }
}
