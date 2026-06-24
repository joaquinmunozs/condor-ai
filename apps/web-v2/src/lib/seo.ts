/**
 * SEO — fuente ÚNICA de verdad de los meta por ruta.
 *
 * Lo consumen dos lados:
 *  - El componente <Seo /> (cliente): actualiza el <head> al navegar en el SPA
 *    (bueno para Google y para la UX de pestañas/historial).
 *  - El plugin `prerender-seo` de vite.config.ts (build): emite un index.html
 *    estático por ruta con estos meta ya escritos, para que los crawlers sociales
 *    (WhatsApp, Facebook, X) —que NO ejecutan JS— lean el OG correcto.
 *
 * Módulo sin dependencias de React/navegador a propósito, para poder importarlo
 * también desde la config de Vite (Node).
 */
export const SITE = {
  url: "https://condorai.cl",
  name: "condor.ai",
  defaultImage: "/assets/og.jpg", // 1200×630
};

export type SeoEntry = { title: string; description: string; image?: string };

export const ROUTES_SEO: Record<string, SeoEntry> = {
  "/": {
    title: "condor.ai · La IA ya despegó. ¿Te quedas en tierra?",
    description:
      "Tu competencia ya usa IA. condor.ai: webs, videos con IA y automatizaciones que ponen a tu negocio adelante en LATAM. Diagnóstico con IA gratis en 2 minutos.",
  },
  "/planes": {
    title: "Planes · condor.ai",
    description:
      "El plan ideal para tu negocio: web profesional, videos 4K con IA y automatizaciones con agentes. Cotización a tu medida, sin compromiso ni permanencia.",
  },
  "/diagnostico": {
    title: "Diagnóstico con IA gratis · condor.ai",
    description:
      "Responde 7 preguntas y una IA hace la radiografía de tu negocio: dónde estás perdiendo clientes y cómo recuperarlos. Gratis y en 2 minutos.",
  },
};

/** Devuelve los meta de una ruta (con imagen por defecto resuelta). */
export function getSeo(path: string): Required<SeoEntry> {
  const e = ROUTES_SEO[path] ?? ROUTES_SEO["/"];
  return { title: e.title, description: e.description, image: e.image ?? SITE.defaultImage };
}

/** Rutas a prerenderizar como HTML estático (todas menos el home, que ya es index.html). */
export const SEO_PATHS = Object.keys(ROUTES_SEO).filter((p) => p !== "/");
