import { useEffect, useState } from "react";

/**
 * Indicador de progreso de scroll personalizado (Fase 5-G #46) tematizado como
 * ALTÍMETRO — refuerza la firma del vuelo/ascenso. Micro-elemento de soporte.
 * 0m al inicio → 5000m (techo de vuelo del cóndor) al final.
 */
const TECHO = 5000;

export default function Altimetro() {
  const [prog, setProg] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = -1;
    const medir = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      // Coalesce a 1 medición por frame y solo re-render si cambió la altitud
      // visible (~1m) — antes hacía setState en cada evento de scroll.
      if (Math.abs(p - last) > 0.0002) {
        last = p;
        setProg(p);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(medir);
    };
    raf = requestAnimationFrame(medir); // medición inicial (diferida)
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const alt = Math.round(prog * TECHO);
  return (
    <aside className="altimetro" aria-hidden="true">
      <span className="alt-label">ALT</span>
      <div className="alt-track">
        <div className="alt-fill" style={{ height: `${prog * 100}%` }} />
      </div>
      <span className="alt-val">{alt.toString().padStart(4, "0")}m</span>
    </aside>
  );
}
