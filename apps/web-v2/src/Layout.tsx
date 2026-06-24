import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useLenis } from "./lib/useLenis";
import Seo from "./components/Seo";
import SkyBackdrop from "./components/SkyBackdrop";
import FlowField from "./components/FlowField";
import Nav from "./components/Nav";
import Altimetro from "./components/Altimetro";
import WhatsAppFloat from "./components/WhatsAppFloat";
import Footer from "./sections/Footer";

/**
 * Chrome compartido por todas las rutas (home + sub-páginas).
 * - Mantiene el fondo/cielo, nav, altímetro y footer fijos entre navegaciones.
 * - Al cambiar de ruta: sube al top; si hay #hash, hace scroll a esa sección.
 */
export default function Layout() {
  useLenis();
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // espera a que la página destino monte y luego baja a la sección
      const id = hash.slice(1);
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [pathname, hash]);

  return (
    <>
      <Seo />
      <SkyBackdrop />
      <FlowField />
      <Nav />
      <Altimetro />
      <WhatsAppFloat />
      <Outlet />
      <Footer />
    </>
  );
}
