import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const ctx = gsap.context(() => {
      // Parallax de profundidad (Fase 5-A): la copy se aleja al salir del hero.
      gsap.to(".hero-copy", {
        yPercent: -16,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <header className="hero" id="top" ref={root}>
      <div className="wrap hero-copy glass">
        <p className="mono-label hero-eyebrow reveal in">
          ALT 0000m · La nueva era de la IA · LATAM
        </p>
        <h1 className="hero-title reveal in">
          La IA ya despegó.
          <br />¿Te quedas en <span className="grad-tx">tierra</span>?
        </h1>
        <p className="hero-lead reveal in">
          Cada día que esperas, tu competencia vende más rápido, atiende mejor y
          gasta menos — con IA. Webs, videos y automatizaciones que ponen a tu
          negocio adelante. Descubre en 2 minutos qué te está dejando atrás.
        </p>
        <div className="hero-cta reveal in">
          <Link className="btn-cta" to="/diagnostico">
            Quiero adelantarme <span aria-hidden="true">→</span>
          </Link>
          <a className="btn-ghost" href="#servicios">
            Ver cómo lo hacemos
          </a>
        </div>
      </div>
      <a className="scroll-hint" href="#servicios" aria-label="Bajar">
        <span className="mono-label">despega</span>
        <span className="scroll-dot" />
      </a>
    </header>
  );
}
