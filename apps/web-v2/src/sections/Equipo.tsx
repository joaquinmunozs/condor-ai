const EQUIPO = [
  { foto: "/assets/joaquin.jpg", nombre: "Joaquín Muñoz", rol: "Cofundador & CEO" },
  { foto: "/assets/alejandro.jpg", nombre: "Alejandro Tobar", rol: "Cofundador & Backend" },
  { foto: "/assets/maximiliano.jpg", nombre: "Maximiliano Pino", rol: "Cofundador & Desarrollo" },
  { foto: null, ini: "S", nombre: "Samuel Ospitia", rol: "Arquitecto de Software" },
];

export default function Equipo() {
  return (
    <section className="section equipo" id="nosotros">
      <div className="wrap">
        <div className="glass sec-head">
          <p className="mono-label eyebrow reveal">Nosotros</p>
          <h2 className="reveal">
            Personas reales <span className="grad-tx">detrás de la IA</span>.
          </h2>
          <p className="equipo-lead reveal" style={{ marginBottom: 0 }}>
            Un equipo cercano que habla tu idioma — sin call centers ni vueltas.
          </p>
        </div>
        <div className="equipo-grid">
          {EQUIPO.map((m, i) => (
            <article className="miembro reveal" key={m.nombre} style={{ transitionDelay: `${i * 0.07}s` }}>
              {m.foto ? (
                <img className="miembro-foto" src={m.foto} alt={m.nombre} loading="lazy" />
              ) : (
                <span className="miembro-foto miembro-ini" aria-hidden="true">{m.ini}</span>
              )}
              <h3>{m.nombre}</h3>
              <p className="mono-label">{m.rol}</p>
            </article>
          ))}
        </div>
        <div className="equipo-cta reveal">
          <a className="btn-ghost" href="/nosotros/">Conoce al equipo →</a>
        </div>
      </div>
    </section>
  );
}
