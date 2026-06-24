import { useEffect, useRef } from "react";

/**
 * THEME SHIFT NARRATIVO — "Altitud" (Fase 5-G #47, v2 imágenes).
 *
 * Fondo fijo que ASCIENDE de día a noche según el scroll:
 *   capa base  = degradado azul→noche (respaldo si faltan imágenes)
 *   capa cielo = foto del cielo andino  (/assets/sky/cielo-andino.webp)
 *   capa espacio = foto del espacio      (/assets/sky/espacio.webp)
 *
 * La transición se concentra en una BANDA corta de scroll [BAND_A, BAND_B]
 * con curva smoothstep, para que el cruce por el "tono medio" (donde ningún
 * color de texto contrasta bien) dure poco. El tema día/noche se voltea en el
 * CENTRO de esa banda, así el texto cambia justo cuando el fondo ya es oscuro.
 */
const DAY: [number, number, number] = [246, 249, 254];
const NIGHT: [number, number, number] = [11, 20, 55];

// Banda de transición (fracción de scroll 0..1). El día domina antes de A,
// la noche después de B; el crossfade ocurre entre ambas.
const BAND_A = 0.4;
const BAND_B = 0.66;
const FLIP = (BAND_A + BAND_B) / 2; // centro: aquí se voltea texto/tarjetas

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
// smoothstep: 0→1 con arranque y final suaves (acelera el cruce por el medio)
const smooth = (t: number) => t * t * (3 - 2 * t);

export default function SkyBackdrop() {
  const baseRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const spaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const base = baseRef.current!;
    const sky = skyRef.current!;
    const space = spaceRef.current!;
    const root = document.documentElement;
    let night = false;

    const onScroll = () => {
      const max = root.scrollHeight - window.innerHeight;
      const p = max > 0 ? clamp01(window.scrollY / max) : 0;

      // progreso DENTRO de la banda de transición (0 antes de A, 1 después de B)
      const band = smooth(clamp01((p - BAND_A) / (BAND_B - BAND_A)));

      // Degradado de respaldo (sigue el mismo progreso de banda)
      const r = lerp(DAY[0], NIGHT[0], band);
      const g = lerp(DAY[1], NIGHT[1], band);
      const b = lerp(DAY[2], NIGHT[2], band);
      base.style.background = `radial-gradient(120% 90% at 50% -10%, rgb(${(r + 6) | 0},${(g + 8) | 0},${(b + 22) | 0}) 0%, rgb(${r | 0},${g | 0},${b | 0}) 70%)`;

      // Crossfade de imágenes: cielo se desvanece, espacio aparece
      sky.style.opacity = String(1 - band);
      space.style.opacity = String(band);

      // Voltea el tema en el centro de la banda (fondo ya oscuro)
      const wantNight = p > FLIP;
      if (wantNight !== night) {
        night = wantNight;
        root.setAttribute("data-theme", night ? "night" : "day");
        (document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null)?.setAttribute(
          "content",
          night ? "#0b1437" : "#f6f9fe"
        );
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const layer: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    willChange: "opacity",
  };

  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: -1, overflow: "hidden" }}>
      {/* respaldo: degradado */}
      <div ref={baseRef} style={{ position: "absolute", inset: 0 }} />
      {/* foto cielo andino (altitud baja) */}
      <div
        ref={skyRef}
        style={{ ...layer, backgroundImage: "url(/assets/sky/cielo-andino.webp)", opacity: 1 }}
      />
      {/* foto espacio (altitud alta) — blur suave para legibilidad nocturna.
          El scale leve evita que el desenfoque deje bordes transparentes. */}
      <div
        ref={spaceRef}
        style={{
          ...layer,
          backgroundImage: "url(/assets/sky/espacio.webp)",
          opacity: 0,
          filter: "blur(3px)",
          transform: "scale(1.06)",
        }}
      />
    </div>
  );
}
