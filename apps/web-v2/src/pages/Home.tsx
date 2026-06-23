import { useLocation } from "react-router-dom";
import { useReveal } from "../lib/useReveal";
import Hero from "../sections/Hero";
import Servicios from "../sections/Servicios";
import Portafolio from "../sections/Portafolio";
import Diagnostico from "../sections/Diagnostico";
import Prueba from "../sections/Prueba";
import Blog from "../sections/Blog";
import Equipo from "../sections/Equipo";
import Climax from "../sections/Climax";

export default function Home() {
  useReveal(useLocation().pathname);
  return (
    <main className="page">
      <Hero />
      <Servicios />
      <Portafolio />
      <Diagnostico />
      <Prueba />
      <Blog />
      <Equipo />
      <Climax />
    </main>
  );
}
