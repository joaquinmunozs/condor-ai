import { Link } from "react-router-dom";

const PASOS = [
  {
    n: "01",
    titulo: "Responde 6 preguntas",
    desc: "Sobre tu negocio y tus objetivos. Dos minutos, sin tecnicismos.",
  },
  {
    n: "02",
    titulo: "La IA analiza tu caso",
    desc: "Cruza tus respuestas y detecta dónde estás perdiendo clientes y tiempo.",
  },
  {
    n: "03",
    titulo: "Recibes tu plan de despegue",
    desc: "Un diagnóstico claro con los próximos pasos concretos para crecer.",
  },
];

export default function Diagnostico() {
  return (
    <section className="section diagnostico" id="diagnostico">
      <div className="wrap" id="como">
        <div className="glass glass-block">
        <p className="mono-label eyebrow reveal">Cómo funciona</p>
        <h2 className="reveal">
          Descubre qué te está <span className="grad-tx">dejando atrás</span>.
        </h2>
        <p className="diag-lead reveal">
          No es un formulario más: una IA hace la radiografía de tu negocio y te
          muestra exactamente dónde tu competencia te está sacando ventaja — y cómo
          recuperarla. Gratis y en 2 minutos.
        </p>

        <ol className="pasos">
          {PASOS.map((p, i) => (
            <li className="paso reveal" key={p.n} style={{ transitionDelay: `${i * 0.09}s` }}>
              <span className="paso-n">{p.n}</span>
              <div>
                <h3>{p.titulo}</h3>
                <p>{p.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="diag-cta reveal">
          <Link className="btn-cta lg" to="/diagnostico">
            Empezar mi diagnóstico gratis <span aria-hidden="true">→</span>
          </Link>
          <p className="diag-note mono-label">Sin tarjeta · sin compromiso · 2 min</p>
        </div>
        </div>
      </div>
    </section>
  );
}
