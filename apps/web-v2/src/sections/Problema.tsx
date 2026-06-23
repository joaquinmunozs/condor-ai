export default function Problema() {
  return (
    <section className="section problema" id="problema">
      <div className="wrap">
        <p className="mono-label eyebrow reveal">El problema</p>
        <h2 className="reveal">
          Mientras lo piensas,
          <br />
          <span className="grad-tx">tu competencia ya despegó.</span>
        </h2>
        <div className="problema-grid">
          <div className="prob-card reveal">
            <span className="prob-n mono-label">01</span>
            <p>
              Tu web —si la tienes— no convierte: el cliente entra, no entiende qué
              haces y se va a comprarle a otro.
            </p>
          </div>
          <div className="prob-card reveal" style={{ transitionDelay: "0.08s" }}>
            <span className="prob-n mono-label">02</span>
            <p>
              Pierdes horas en tareas repetitivas que una automatización resolvería
              sola, mientras tu negocio no crece.
            </p>
          </div>
          <div className="prob-card reveal" style={{ transitionDelay: "0.16s" }}>
            <span className="prob-n mono-label">03</span>
            <p>
              Ves a otros usando IA para vender más y no sabes por dónde empezar —
              ni en quién confiar.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
