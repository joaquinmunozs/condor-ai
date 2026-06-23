/**
 * Cóndor — placeholder vectorial de la firma.
 * Se reemplazará por el asset generado en Higgsfield (cóndor de luz/partículas,
 * estilo definido en el prompt-guía de Fase 6). Por ahora, silueta aerodinámica
 * con el gradiente de marca + un halo de "corriente".
 */
export default function Condor() {
  return (
    <svg viewBox="0 0 600 420" width="100%" height="100%" role="presentation">
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="600" y2="420" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2747ff" />
          <stop offset="0.5" stopColor="#7a5bff" />
          <stop offset="1" stopColor="#ff3b4e" />
        </linearGradient>
        <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#7a5bff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#7a5bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="300" cy="210" rx="300" ry="180" fill="url(#halo)" />
      {/* Alas extendidas, planeo */}
      <path
        d="M300 210
           C250 150 150 120 30 150
           C140 165 200 195 260 215
           C200 220 120 235 70 285
           C170 255 250 240 300 232
           C350 240 430 255 530 285
           C480 235 400 220 340 215
           C400 195 460 165 570 150
           C450 120 350 150 300 210 Z"
        fill="url(#cg)"
        opacity="0.92"
      />
      {/* Cuerpo/cuello */}
      <path d="M300 205 C292 230 296 270 300 300 C304 270 308 230 300 205 Z" fill="url(#cg)" />
    </svg>
  );
}
