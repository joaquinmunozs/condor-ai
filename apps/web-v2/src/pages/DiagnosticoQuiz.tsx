import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  enviarDiagnostico,
  contactoValido,
  nuevoEventId,
  WHATSAPP,
  USOS_KEY,
  type Diagnostico,
} from "../lib/diagnostico";

/* =========================================================
   Diagnóstico con IA — quiz nativo del SPA (antes saltaba a
   la página estática /diagnostico-gratis/). Firma de marca:
   ASCENSO — cada paso "sube de altitud" (600m → 5000m), igual
   que el altímetro del sitio. Al terminar, la IA calcula tu
   "plan de despegue".
   ========================================================= */

type Paso =
  | { name: string; alt: number; kicker: string; q: string; help: string; tipo: "opciones"; opciones: string[] }
  | { name: string; alt: number; kicker: string; q: string; help: string; tipo: "problema" }
  | { name: string; alt: number; kicker: string; q: string; help: string; tipo: "identidad" }
  | { name: string; alt: number; kicker: string; q: string; help: string; tipo: "contacto" };

const PASOS: Paso[] = [
  {
    name: "tipo", alt: 600, kicker: "01 — Tu negocio",
    q: "¿Qué tipo de negocio tienes?", help: "Para adaptar el análisis a tu rubro.",
    tipo: "opciones",
    opciones: ["Restaurante o comida", "Tienda o venta de productos", "Servicios (salón, taller, clínica…)", "Otro"],
  },
  {
    name: "web", alt: 1400, kicker: "02 — Presencia",
    q: "¿Tienes página web hoy?", help: "No te preocupes si no — para eso estamos.",
    tipo: "opciones",
    opciones: ["No tengo página web", "Solo redes sociales", "Tengo una, pero no me trae clientes", "Tengo una que funciona bien"],
  },
  {
    name: "clientes_mes", alt: 2200, kicker: "03 — Volumen",
    q: "¿Cuántos clientes nuevos consigues al mes?", help: "Un estimado está bien.",
    tipo: "opciones",
    opciones: ["Menos de 10", "Entre 10 y 50", "Entre 50 y 200", "Más de 200"],
  },
  {
    name: "origen", alt: 3000, kicker: "04 — Origen",
    q: "¿De dónde vienen tus clientes ahora?", help: "Lo que más peso tiene hoy.",
    tipo: "opciones",
    opciones: ["Recomendación / boca a boca", "Instagram / Facebook", "Gente que pasa por el local", "Casi no llegan clientes nuevos"],
  },
  {
    name: "problema", alt: 3800, kicker: "05 — El problema",
    q: "¿Cuál es tu mayor problema ahora?", help: "Con tus palabras. Mientras más detalle, mejor el diagnóstico.",
    tipo: "problema",
  },
  {
    name: "negocio", alt: 4400, kicker: "06 — Identidad",
    q: "¿Cómo se llama tu negocio?", help: "Para personalizar tu diagnóstico.",
    tipo: "identidad",
  },
  {
    name: "contacto", alt: 5000, kicker: "07 — Envío",
    q: "¿A dónde te enviamos los resultados?", help: "Recibes el diagnóstico y te escribimos por WhatsApp.",
    tipo: "contacto",
  },
];

const TOTAL = PASOS.length;
const TECHO = 5000; // mismo techo de vuelo que el altímetro del sitio

const PROC_LINEAS = [
  "Escaneando tu presencia digital…",
  "Cruzando datos de tu rubro…",
  "Detectando dónde pierdes clientes…",
  "Redactando tu plan de despegue…",
];

type Fase = "quiz" | "cargando" | "resultado";

export default function DiagnosticoQuiz() {
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState<Record<string, string>>({ modo: "general" });
  const [fase, setFase] = useState<Fase>("quiz");
  const [out, setOut] = useState<Diagnostico | null>(null);
  const [error, setError] = useState("");
  const [procPaso, setProcPaso] = useState(0);
  const honeypot = useRef(""); // campo trampa anti-bot (website_url)
  const eventId = useRef(nuevoEventId());
  const headingRef = useRef<HTMLHeadingElement>(null);

  const def = PASOS[paso];
  const altMostrada = fase === "resultado" ? TECHO : def.alt;

  // Al cambiar de paso: llevar el foco al título (accesibilidad + lectores de pantalla)
  useEffect(() => {
    if (fase === "quiz") headingRef.current?.focus();
  }, [paso, fase]);

  // Animación de "procesando": enciende una línea de consola cada 750ms
  useEffect(() => {
    if (fase !== "cargando") return;
    const t = setInterval(() => setProcPaso((i) => Math.min(i + 1, PROC_LINEAS.length - 1)), 750);
    return () => clearInterval(t);
  }, [fase]);

  function set(name: string, value: string) {
    setDatos((d) => ({ ...d, [name]: value }));
  }

  function validar(): string | null {
    if (def.tipo === "opciones" && !datos[def.name]) return "Elige una opción.";
    if (def.tipo === "problema" && !(datos.problema || "").trim()) return "Cuéntanos tu problema, aunque sea breve.";
    if (def.tipo === "identidad" && !(datos.negocio || "").trim()) return "Pon el nombre de tu negocio.";
    if (def.tipo === "contacto" && !contactoValido(datos.email, datos.whatsapp))
      return "Pon un correo o WhatsApp real para enviarte tu diagnóstico.";
    return null;
  }

  function avanzar() {
    const e = validar();
    if (e) return setError(e);
    setError("");
    if (paso < TOTAL - 1) setPaso((p) => p + 1);
    else enviar();
  }

  function retroceder() {
    setError("");
    if (paso > 0) setPaso((p) => p - 1);
  }

  // Selección de opción: registra y auto-avanza (UX rápida, como el quiz original)
  function elegir(name: string, valor: string) {
    set(name, valor);
    setError("");
    setTimeout(() => setPaso((p) => Math.min(p + 1, TOTAL - 1)), 240);
  }

  async function enviar() {
    // Anti-spam por navegador (la función además limita por IP)
    const usos = +(localStorage.getItem(USOS_KEY) || 0);
    if (usos >= 2) {
      setOut({
        saludo: "Ya hiciste tu diagnóstico 👋",
        diagnostico:
          "Para cuidar la calidad lo limitamos a 2 por persona. Pero no te quedes con la duda: escríbenos por WhatsApp y te ayudamos personalmente con tu caso, sin límite.",
        problemas: [],
        recomendacion: "Hablemos directo por WhatsApp.",
        bloqueado: true,
      });
      setFase("resultado");
      return;
    }

    setProcPaso(0);
    setFase("cargando");
    const payload = { ...datos, website_url: honeypot.current, event_id: eventId.current };
    const r = await enviarDiagnostico(payload);

    if (!r.ok) {
      setFase("quiz");
      setPaso(TOTAL - 1);
      setError(
        r.motivo === "contacto"
          ? "Pon un correo o WhatsApp real para enviarte tu diagnóstico."
          : "No pudimos generar tu diagnóstico. Reintenta o escríbenos por WhatsApp."
      );
      return;
    }

    if (!r.data.bloqueado) {
      localStorage.setItem(USOS_KEY, String(usos + 1));
      // Conversión a Meta (browser pixel) si está cargado; dedup con la CAPI server-side
      const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
      fbq?.("track", "CompleteRegistration", {}, { eventID: eventId.current });
    }
    // Pequeño respiro para que termine la animación de consola
    setTimeout(() => {
      setOut(r.data);
      setFase("resultado");
    }, 700);
  }

  return (
    <main className="page subpage">
      <section className="section dq-section">
        <div className="wrap">
          <p className="crumbs reveal in">
            <Link to="/">Inicio</Link> <span aria-hidden="true">/</span> Diagnóstico
          </p>

          <div className="dq glass glass-block narrow">
            {/* Cabecera con altímetro de progreso (firma de marca: ascenso) */}
            <div className="dq-head">
              <span className="mono-label dq-kicker">
                {fase === "resultado" ? "Diagnóstico generado" : fase === "cargando" ? "Analizando" : def.kicker}
              </span>
              <span className="mono-label dq-alt" aria-hidden="true">
                ALT {String(altMostrada).padStart(4, "0")}m ▲
              </span>
            </div>
            <div className="dq-bar" aria-hidden="true">
              <span className="dq-bar-fill" style={{ width: `${(altMostrada / TECHO) * 100}%` }} />
            </div>

            {/* -------- QUIZ -------- */}
            {fase === "quiz" && (
              <div className="dq-body" key={paso}>
                <h1 className="dq-q" tabIndex={-1} ref={headingRef}>
                  {def.q}
                </h1>
                <p className="dq-help">{def.help}</p>

                {def.tipo === "opciones" && (
                  <div className="dq-opts">
                    {def.opciones.map((op, i) => {
                      const sel = datos[def.name] === op;
                      return (
                        <button
                          key={op}
                          type="button"
                          className={sel ? "dq-opt sel" : "dq-opt"}
                          onClick={() => elegir(def.name, op)}
                        >
                          <span className="dq-ix">{String.fromCharCode(65 + i)}</span>
                          {op}
                        </button>
                      );
                    })}
                  </div>
                )}

                {def.tipo === "problema" && (
                  <textarea
                    className="dq-textarea"
                    value={datos.problema || ""}
                    onChange={(e) => set("problema", e.target.value)}
                    placeholder="Ej: la gente no me encuentra en Google, dependo solo de Instagram, no tengo dónde mostrar mis precios, pierdo clientes que preguntan y no alcanzo a responder…"
                    rows={4}
                  />
                )}

                {def.tipo === "identidad" && (
                  <div className="dq-fields">
                    <label className="dq-lbl">Nombre del negocio</label>
                    <input
                      className="dq-input"
                      value={datos.negocio || ""}
                      onChange={(e) => set("negocio", e.target.value)}
                      placeholder="Ej: Lavandería Express Milagros"
                    />
                    <label className="dq-lbl">Instagram (opcional)</label>
                    <input
                      className="dq-input"
                      value={datos.instagram || ""}
                      onChange={(e) => set("instagram", e.target.value)}
                      placeholder="@tunegocio"
                    />
                  </div>
                )}

                {def.tipo === "contacto" && (
                  <div className="dq-fields">
                    <label className="dq-lbl">WhatsApp</label>
                    <input
                      className="dq-input"
                      inputMode="tel"
                      value={datos.whatsapp || ""}
                      onChange={(e) => set("whatsapp", e.target.value)}
                      placeholder="+56 9 8765 4321"
                    />
                    <label className="dq-lbl">Correo electrónico</label>
                    <input
                      className="dq-input"
                      type="email"
                      value={datos.email || ""}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                    />
                    {/* Honeypot anti-bot: invisible y fuera del tab-order */}
                    <input
                      type="text"
                      name="website_url"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      onChange={(e) => (honeypot.current = e.target.value)}
                      style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
                    />
                  </div>
                )}

                {error && (
                  <p className="dq-err" role="alert">
                    ✕ {error}
                  </p>
                )}

                <div className="dq-nav">
                  {paso > 0 ? (
                    <button type="button" className="btn-ghost dq-back" onClick={retroceder}>
                      <span aria-hidden="true">‹</span> Atrás
                    </button>
                  ) : (
                    <span />
                  )}
                  {(def.tipo !== "opciones") && (
                    <button type="button" className="btn-cta" onClick={avanzar}>
                      {paso === TOTAL - 1 ? "Ver mi diagnóstico" : "Siguiente"}{" "}
                      <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* -------- PROCESANDO -------- */}
            {fase === "cargando" && (
              <div className="dq-proc" aria-live="polite">
                <div className="dq-radar" aria-hidden="true">
                  <span className="dq-radar-sweep" />
                </div>
                <ul className="dq-proc-lines">
                  {PROC_LINEAS.map((l, i) => (
                    <li key={l} className={i <= procPaso ? "on" : ""}>
                      <span className="dq-proc-tick" aria-hidden="true">
                        {i < procPaso ? "✓" : "›"}
                      </span>
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* -------- RESULTADO -------- */}
            {fase === "resultado" && out && (
              <div className="dq-res" aria-live="polite">
                <h1 className="dq-q">{out.saludo || `Diagnóstico para ${datos.negocio || "tu negocio"}`}</h1>
                {out.diagnostico && <p className="dq-res-diag">{out.diagnostico}</p>}

                {!!out.problemas?.length && (
                  <>
                    <p className="mono-label dq-res-sub">Lo que te está costando clientes</p>
                    <ul className="dq-res-probs">
                      {out.problemas.map((p, i) => (
                        <li key={i}>
                          <span className="dq-res-pn">{String(i + 1).padStart(2, "0")}</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {out.recomendacion && (
                  <div className="dq-res-reco glass">
                    <p className="mono-label dq-res-sub">Recomendación</p>
                    <p>{out.recomendacion}</p>
                  </div>
                )}

                <a
                  className="btn-cta lg dq-res-cta"
                  target="_blank"
                  rel="noopener"
                  href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
                    `Hola condor.ai, hice el diagnóstico para "${datos.negocio || "mi negocio"}" y quiero avanzar.`
                  )}`}
                >
                  Hablemos por WhatsApp <span aria-hidden="true">→</span>
                </a>
                <p className="dq-note mono-label">Te respondemos en minutos · sin compromiso</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
