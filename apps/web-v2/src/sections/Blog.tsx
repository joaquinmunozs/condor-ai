import { useEffect, useState } from "react";

// Posts perennes de respaldo (si aún no hay noticias generadas o falla la carga).
const FALLBACK = [
  { href: "/blog/web-profesional-2026/", tag: "Páginas web", titulo: "Por qué tu negocio necesita una web en 2026", desc: "Tus clientes te buscan en Google antes de comprarte. Si no te encuentran, le compran a otro." },
  { href: "/blog/videos-ia/", tag: "Videos con IA", titulo: "Videos con IA: vende sin grabar nada", desc: "Cómo crear videos 4K de tus productos y anuncios con presentadores realistas, sin cámaras." },
  { href: "/blog/google-maps/", tag: "Google Maps", titulo: "Aparece primero en Google Maps", desc: "La guía simple para que los clientes de tu zona te encuentren antes que a tu competencia." },
];

type Post = { href: string; tag: string; titulo: string; desc: string };

export default function Blog() {
  const [posts, setPosts] = useState<Post[]>(FALLBACK);
  const [esNoticia, setEsNoticia] = useState(false);

  // Carga las noticias IA de la semana (auto-generadas cada lunes). Si hay, las muestra.
  useEffect(() => {
    fetch("/assets/noticias-ia.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const arr = d?.noticias;
        if (Array.isArray(arr) && arr.length) {
          setPosts(arr.slice(0, 3).map((n: { titular: string; url?: string }) => ({
            href: n.url || "/noticias-ia/",
            tag: "Noticias IA · esta semana",
            titulo: n.titular,
            desc: "Lo último en inteligencia artificial, explicado para tu negocio.",
          })));
          setEsNoticia(true);
        }
      })
      .catch(() => { /* deja el fallback */ });
  }, []);

  return (
    <section className="section blog" id="blog">
      <div className="wrap">
        <div className="port-head glass head-bar">
          <div>
            <p className="mono-label eyebrow reveal">{esNoticia ? "Noticias IA" : "Blog"}</p>
            <h2 className="reveal">
              {esNoticia ? <>La semana en <span className="grad-tx">inteligencia artificial</span>.</> : <>Ideas para <span className="grad-tx">vender más</span>.</>}
            </h2>
          </div>
          <a className="btn-ghost reveal" href={esNoticia ? "/noticias-ia/" : "/blog/"}>
            {esNoticia ? "Ver todas las noticias →" : "Ver el blog →"}
          </a>
        </div>
        <div className="blog-grid">
          {posts.map((p, i) => (
            <a
              className="blog-post reveal"
              key={p.href + i}
              href={p.href}
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <div className="blog-ph" style={esNoticia ? { background: "linear-gradient(135deg,#1a2547,#2347E0)" } : undefined}>
                <span className="blog-tag mono-label">{p.tag}</span>
              </div>
              <div className="blog-body">
                <h3>{p.titulo}</h3>
                <p>{p.desc}</p>
                <span className="serv-link">{esNoticia ? "Leer noticia →" : "Leer artículo →"}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
