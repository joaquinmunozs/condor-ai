import { useEffect, useRef } from "react";

/**
 * FIRMA VISUAL (Fase 1/4) — "Corriente".
 * Campo de flujo de partículas en el gradiente de marca que cabalgan corrientes
 * de viento hacia arriba (metáfora de ascenso). Reacciona al cursor (repulsión)
 * y a la velocidad de scroll (aceleran). Se enciende a medida que la página
 * "asciende" a la noche. Una sola animación compleja por página (regla de oro).
 *
 * Canvas2D sin dependencias, DPR-aware y desactivado en prefers-reduced-motion
 * (degrada a un campo estático tenue).
 */

const STOPS: [number, number, number][] = [
  [39, 71, 255], // #2747ff
  [122, 91, 255], // #7a5bff
  [255, 59, 78], // #ff3b4e
];

function gradColor(t: number): [number, number, number] {
  const x = Math.min(0.9999, Math.max(0, t)) * (STOPS.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = STOPS[i];
  const b = STOPS[i + 1] ?? STOPS[i];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// Banda de transición sincronizada con SkyBackdrop (cielo→espacio).
const BAND_A = 0.4;
const BAND_B = 0.66;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (t: number) => t * t * (3 - 2 * t);
/** 0 = sobre el cielo (partículas blancas) · 1 = en el espacio (color de marca) */
const nightFrom = (prog: number) => smooth(clamp01((prog - BAND_A) / (BAND_B - BAND_A)));

type P = { x: number; y: number; vx: number; vy: number; c: number; w: number };

export default function FlowField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let particles: P[] = [];
    const mouse = { x: -9999, y: -9999, active: false };
    let scrollProg = 0;
    let scrollVel = 0;
    let lastScroll = window.scrollY;
    let raf = 0;
    let t = 0;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Densidad muy alta: campo denso de partículas, capado por área.
      const count = Math.round(Math.min(2400, (w * h) / 720));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: 0,
        vy: 0,
        c: Math.random(),
        w: 0.6 + Math.random() * 1.8,
      }));
    };

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const onLeave = () => (mouse.active = false);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollProg = max > 0 ? window.scrollY / max : 0;
      scrollVel = Math.min(4, Math.abs(window.scrollY - lastScroll) * 0.05);
      lastScroll = window.scrollY;
    };

    // Campo de flujo: ruido barato por capas de senos (orgánico, sin libs)
    const scl = 0.0016;
    const flow = (x: number, y: number, time: number) =>
      Math.PI *
      (Math.sin(x * scl + time) +
        Math.cos(y * scl * 1.3 - time * 0.8) +
        Math.sin((x + y) * scl * 0.6 + time * 0.5));

    const step = () => {
      t += 0.0016;
      scrollVel *= 0.9;
      const speed = 1 + scrollVel * 1.4;
      const nightness = nightFrom(scrollProg); // 0 cielo (blanco) · 1 espacio (color)
      const dayness = 1 - nightness;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = nightness > 0.45 ? "lighter" : "source-over";
      ctx.lineCap = "round";

      for (const p of particles) {
        const ang = flow(p.x, p.y, t);
        // Dirección más suave = menos corrientes/agrupamiento, partículas más dispersas
        p.vx += Math.cos(ang) * 0.03;
        p.vy += Math.sin(ang) * 0.03 - 0.015; // leve sesgo hacia arriba = ascenso

        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 30000) {
            const f = (1 - d2 / 30000) * 1.0;
            const d = Math.sqrt(d2) || 1;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
        }

        p.vx *= 0.93;
        p.vy *= 0.93;
        const px = p.x;
        const py = p.y;
        p.x += p.vx * speed;
        p.y += p.vy * speed;

        // Envolver bordes SIN dibujar el segmento que cruzaría la pantalla
        // (este era el bug de las "líneas verticales/horizontales").
        let wrapped = false;
        if (p.x < -10) { p.x = w + 10; wrapped = true; }
        else if (p.x > w + 10) { p.x = -10; wrapped = true; }
        if (p.y < -10) { p.y = h + 10; wrapped = true; }
        else if (p.y > h + 10) { p.y = -10; wrapped = true; }
        if (wrapped) continue; // saltar el trazo este frame

        // Color: blanco sobre el cielo → color de marca en el espacio
        const [gr, gg, gb] = gradColor(p.c);
        const r = gr + (255 - gr) * dayness;
        const g = gg + (255 - gg) * dayness;
        const b = gb + (255 - gb) * dayness;
        const alpha = Math.min(0.92, (0.4 + nightness * 0.45) * (0.85 + scrollVel * 0.1));
        ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
        ctx.lineWidth = p.w * (1 + nightness * 0.5);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      raf = requestAnimationFrame(step);
    };

    const drawStatic = () => {
      const nightness = nightFrom(scrollProg);
      const dayness = 1 - nightness;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        const [gr, gg, gb] = gradColor(p.c);
        const r = gr + (255 - gr) * dayness;
        const g = gg + (255 - gg) * dayness;
        const b = gb + (255 - gb) * dayness;
        ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${0.35 + nightness * 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.w, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    resize();
    onScroll();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });

    if (reduce) drawStatic();
    else raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
