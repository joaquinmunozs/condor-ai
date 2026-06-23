import { useLocation, Link } from "react-router-dom";
import { useReveal } from "../lib/useReveal";

const WSP = "https://wa.me/56988989824?text=";

const PLANES = [
  {
    tag: "Esencial",
    alt: "+1200m",
    titulo: "Tu web lista",
    desc: "Ideal para empezar a vender online y verte profesional.",
    feats: [
      "Landing profesional de 1 página",
      "WhatsApp y Google integrados",
      "Entrega en 48–72 h",
      "Hosting y dominio incluidos",
    ],
    cta: "Cotizar Esencial",
    msg: "Hola condor.ai, quiero cotizar el plan Esencial",
    pop: false,
  },
  {
    tag: "★ Más elegido",
    alt: "+2400m",
    titulo: "Restaurante / Pro",
    desc: "Para negocios que quieren destacar y vender más.",
    feats: [
      "Web + carta / catálogo digital",
      "Videos 4K con IA de tus productos",
      "QR y WhatsApp integrados",
      "Soporte prioritario",
    ],
    cta: "Cotizar Pro",
    msg: "Hola condor.ai, quiero cotizar el plan Pro",
    pop: true,
  },
  {
    tag: "Premium IA",
    alt: "+3600m",
    titulo: "Web + Automatización",
    desc: "El ecosistema completo, potenciado con IA.",
    feats: [
      "Todo lo del plan Pro",
      "Agentes IA (contenido, email, leads)",
      "Diagnóstico con IA integrado",
      "Anuncios UGC con IA",
    ],
    cta: "Cotizar Premium IA",
    msg: "Hola condor.ai, quiero cotizar el plan Premium IA",
    pop: false,
  },
];

const FAQ = [
  ["¿En cuánto tiempo entregan?", "Entre 48 y 72 horas hábiles, según el plan y la información que nos entregues."],
  ["¿Hay permanencia o contrato?", "No. La mensualidad cubre hosting, mantenimiento y cambios; puedes cancelar cuando quieras."],
  ["¿Cómo pago?", "Con tarjeta de crédito/débito por Mercado Pago, o con PayPal. Tienes un portal de cliente donde ves tu plan, pagas con un clic y descargas tu comprobante al instante."],
  ["¿Cuánto cuesta?", "Depende de lo que tu negocio necesite. Te hacemos una cotización clara y a tu medida, sin compromiso: escríbenos por WhatsApp y en minutos te respondemos."],
  ["¿Puedo cambiar de plan después?", "Sí, subes o bajas de plan cuando lo necesites."],
];

export default function Planes() {
  useReveal(useLocation().pathname);

  return (
    <main className="page subpage">
      <header className="pg-hero">
        <div className="wrap">
          <div className="glass glass-block narrow">
          <p className="crumbs reveal">
            <Link to="/">Inicio</Link> <span aria-hidden="true">/</span> Planes
          </p>
          <p className="mono-label eyebrow reveal">Planes</p>
          <h1 className="pg-title reveal">
            El plan ideal <span className="grad-tx">para tu negocio</span>
          </h1>
          <p className="pg-lead reveal">
            Cada negocio es único. Te armamos una cotización a tu medida, sin compromiso.
          </p>
          </div>
        </div>
      </header>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="plan-grid">
            {PLANES.map((p, i) => (
              <article
                className={p.pop ? "plan-card glass pop reveal" : "plan-card glass reveal"}
                key={p.tag}
                style={{ transitionDelay: `${i * 0.07}s` }}
              >
                <div className="plan-top">
                  <span className="plan-tag">{p.tag}</span>
                  <span className="mono-label serv-alt">{p.alt}</span>
                </div>
                <h3>{p.titulo}</h3>
                <p className="plan-desc">{p.desc}</p>
                <ul className="tick">
                  {p.feats.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <a
                  className={p.pop ? "btn-cta" : "btn-ghost"}
                  href={WSP + encodeURIComponent(p.msg)}
                  target="_blank"
                  rel="noopener"
                >
                  {p.cta} <span aria-hidden="true">→</span>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="glass glass-block narrow">
            <p className="mono-label eyebrow reveal" style={{ textAlign: "center" }}>Dudas</p>
            <h2 className="reveal" style={{ textAlign: "center", maxWidth: "none" }}>
              Preguntas frecuentes
            </h2>
            <div className="faq reveal">
              {FAQ.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
