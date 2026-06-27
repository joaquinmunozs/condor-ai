const PASOS = [
  {
    n: "01",
    titulo: "Eliges día y hora",
    desc: "De lunes a sábado, de 9:00 a 21:00 (hora Chile). En un par de clics.",
  },
  {
    n: "02",
    titulo: "Conversamos de tu negocio",
    desc: "30 minutos por videollamada. Revisamos tu caso, sin tecnicismos ni presión.",
  },
  {
    n: "03",
    titulo: "Te damos un plan claro",
    desc: "Próximos pasos concretos para crecer con IA: webs, videos y automatización.",
  },
];

export default function Diagnostico() {
  return (
    <section className="section diagnostico" id="diagnostico">
      <div className="wrap" id="como">
        <div className="glass glass-block">
        <p className="mono-label eyebrow reveal">Cómo funciona</p>
        <h2 className="reveal">
          Conversemos y <span className="grad-tx">hagamos despegar</span> tu negocio.
        </h2>
        <p className="diag-lead reveal">
          Agenda una reunión gratis con nuestro equipo. Revisamos tu caso y te
          mostramos exactamente cómo la IA puede hacerte crecer — sin compromiso
          y sin tecnicismos.
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
          <a className="btn-cta lg" href="/agendar/">
            Agendar mi reunión gratis <span aria-hidden="true">→</span>
          </a>
          <p className="diag-note mono-label">Lun a sáb · 9-21h Chile · sin compromiso</p>
        </div>
        </div>
      </div>
    </section>
  );
}
