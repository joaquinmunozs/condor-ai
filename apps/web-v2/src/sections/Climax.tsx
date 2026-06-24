import { Link } from "react-router-dom";

export default function Climax() {
  return (
    <section className="section climax" id="climax">
      <div className="wrap climax-in glass glass-block narrow">
        <p className="mono-label eyebrow reveal">ALT 5000m · techo de vuelo</p>
        <h2 className="climax-title reveal">
          El futuro no espera.
          <br />
          <span className="grad-tx">¿Despegas o te quedas?</span>
        </h2>
        <p className="climax-lead reveal">
          Cada mes sin IA es terreno que le regalas a tu competencia. El diagnóstico
          es gratis y toma 2 minutos — y lo que descubras puede cambiar el rumbo de
          tu negocio este año.
        </p>
        <div className="reveal">
          <Link className="btn-cta xl" to="/diagnostico">
            Haz tu diagnóstico gratis <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
