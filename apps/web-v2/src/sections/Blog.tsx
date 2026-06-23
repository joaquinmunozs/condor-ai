const POSTS = [
  {
    href: "/blog/web-profesional-2026/",
    img: "/assets/blog/web.jpg",
    tag: "Páginas web",
    titulo: "Por qué tu negocio necesita una web en 2026",
    desc: "Tus clientes te buscan en Google antes de comprarte. Si no te encuentran, le compran a otro.",
  },
  {
    href: "/blog/videos-ia/",
    img: "/assets/blog/videos.jpg",
    tag: "Videos con IA",
    titulo: "Videos con IA: vende sin grabar nada",
    desc: "Cómo crear videos 4K de tus productos y anuncios con presentadores realistas, sin cámaras.",
  },
  {
    href: "/blog/google-maps/",
    img: "/assets/blog/maps.jpg",
    tag: "Google Maps",
    titulo: "Aparece primero en Google Maps",
    desc: "La guía simple para que los clientes de tu zona te encuentren antes que a tu competencia.",
  },
];

export default function Blog() {
  return (
    <section className="section blog" id="blog">
      <div className="wrap">
        <div className="port-head glass head-bar">
          <div>
            <p className="mono-label eyebrow reveal">Blog</p>
            <h2 className="reveal">
              Ideas para <span className="grad-tx">vender más</span>.
            </h2>
          </div>
          <a className="btn-ghost reveal" href="/blog/">
            Ver el blog →
          </a>
        </div>
        <div className="blog-grid">
          {POSTS.map((p, i) => (
            <a
              className="blog-post reveal"
              key={p.href}
              href={p.href}
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <div className="blog-ph">
                <img src={p.img} alt="" loading="lazy" />
                <span className="blog-tag mono-label">{p.tag}</span>
              </div>
              <div className="blog-body">
                <h3>{p.titulo}</h3>
                <p>{p.desc}</p>
                <span className="serv-link">Leer artículo →</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
