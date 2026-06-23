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
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProg(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
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
