const TILES = [
  { v: "/assets/svc/web.mp4", tag: "Páginas web" },
  { v: "/assets/svc/videos.mp4", tag: "Videos con IA" },
  { v: "/assets/svc/automatizacion.mp4", tag: "Automatización" },
];

export default function Portafolio() {
  return (
    <section className="section portafolio" id="portafolio">
      <div className="wrap">
        <div className="port-head glass head-bar">
          <div>
            <p className="mono-label eyebrow reveal">Portafolio</p>
            <h2 className="reveal">
              Trabajo real, <span className="grad-tx">resultados reales</span>.
            </h2>
          </div>
          <a className="btn-ghost reveal" href="/portafolio/">
            Ver todo el portafolio →
          </a>
        </div>
        <div className="port-grid">
          {TILES.map((t, i) => (
            <a
              className="port-tile reveal"
              key={t.tag}
              href="/portafolio/"
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <video src={t.v} autoPlay muted loop playsInline />
              <span className="port-tag mono-label">{t.tag}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
