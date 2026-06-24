import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getSeo, SITE } from "../lib/seo";

/**
 * Mantiene el <head> sincronizado con la ruta al navegar dentro del SPA.
 * (El OG estático para crawlers lo genera el plugin de build; esto es para
 * Google y la UX de pestañas.) No renderiza nada.
 */
function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = getSeo(pathname);
    const url = SITE.url + (pathname === "/" ? "" : pathname);
    const img = seo.image.startsWith("http") ? seo.image : SITE.url + seo.image;

    document.title = seo.title;
    setMeta("name", "description", seo.description);
    setLink("canonical", url);

    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", SITE.name);
    setMeta("property", "og:title", seo.title);
    setMeta("property", "og:description", seo.description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", img);

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", seo.title);
    setMeta("name", "twitter:description", seo.description);
    setMeta("name", "twitter:image", img);
  }, [pathname]);

  return null;
}
