import { useEffect, useRef } from "react";

const TILES = [
  { v: "/assets/svc/web.mp4", tag: "Páginas web" },
  { v: "/assets/svc/videos.mp4", tag: "Videos con IA" },
  { v: "/assets/svc/automatizacion.mp4", tag: "Automatización" },
];

/**
 * Autoplay robusto: React NO setea la propiedad DOM `muted` desde el atributo
 * JSX, y sin `muted` el navegador bloquea el autoplay. Lo forzamos por ref y
 * llamamos play() (silenciando el rechazo si el navegador lo difiere).
 */
function AutoVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    const tryPlay = () => el.play().catch(() => {});
    tryPlay();
    el.addEventListener("canplay", tryPlay, { once: true });
    return () => el.removeEventListener("canplay", tryPlay);
  }, []);
  return (
    <video
      ref={ref}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
    />
  );
}

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
              <AutoVideo src={t.v} />
              <span className="port-tag mono-label">{t.tag}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
