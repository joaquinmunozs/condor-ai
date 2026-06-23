import Counter from "../components/Counter";

/**
 * Prueba social ANTES del CTA final (Fase 11). Métricas con contador animado.
 * ⚠️ NÚMEROS PLACEHOLDER — reemplazar por métricas reales de condor.ai antes de
 * producción (Fase 11 exige prueba social real, nada de cifras inventadas).
 */
export default function Prueba() {
  return (
    <section className="section prueba" id="prueba">
      <div className="wrap">
        <div className="glass sec-head">
          <p className="mono-label eyebrow reveal">Resultados</p>
          <h2 className="reveal">
            Mientras dudas, ellos ya <span className="grad-tx">tomaron la delantera</span>.
          </h2>
        </div>

        <div className="metricas reveal">
          <div className="metrica">
            <b><Counter to={120} suffix="+" /></b>
            <span>proyectos entregados</span>
          </div>
          <div className="metrica">
            <b><Counter to={72} suffix="h" /></b>
            <span>entrega promedio</span>
          </div>
          <div className="metrica">
            <b><Counter to={3} suffix="x" /></b>
            <span>más leads tras el rediseño</span>
          </div>
          <div className="metrica">
            <b>4.9<span className="met-star">★</span></b>
            <span>satisfacción de clientes</span>
          </div>
        </div>

        <blockquote className="testimonio glass reveal">
          <p>
            “En 3 días teníamos una web que de verdad vende. Lo que antes hacíamos a
            mano, ahora corre solo. Nos cambió el negocio.”
          </p>
          <footer>
            <span className="mono-label">— Cliente condor.ai · placeholder</span>
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
