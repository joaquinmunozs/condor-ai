# Demos de páginas web por nicho (Colombia) para el portafolio condor.ai

Fecha: 2026-06-24

## Objetivo
Crear 3 sitios demo multipágina, premium y vendibles (>2000 USD), para los 3 rubros
de mayor demanda de web en Colombia, y enlazarlos desde el portafolio del portal.
Deben verse "a medida" (no template de freelancer) y traer un diferenciador de IA.

## Rubros (orden de ejecución)
1. **E-commerce** (rubro #1, se duplica a USD 35MM al 2030) — PRIMERO (piloto).
2. **Inmobiliario**.
3. **Servicios profesionales**.

Se construye e-commerce completo, se valida con el usuario, y se replican los otros 2
reutilizando el sistema de diseño.

## Tecnología
- HTML + Tailwind CSS (CDN) + JS puro. Sin build. Autocontenido por demo.
- Cada demo en `apps/web-v2/public/demos/<nicho>/` → se publica en
  `condorai.cl/demos/<nicho>/` (Vite copia public/ a dist).
- Imágenes: stock premium (Unsplash vía URL) en el MVP; opción de reemplazar por
  imágenes generadas con IA después.

## Cada demo incluye
- Marca ficticia colombiana propia (nombre, logo SVG, identidad).
- Multipágina real con navegación:
  - E-commerce: Inicio · Catálogo · Detalle de producto · Carrito/Contacto.
  - Inmobiliario: Inicio · Propiedades · Detalle · Contacto.
  - Servicios: Inicio · Servicios · Equipo · Agenda/Contacto.
- **Asistente IA flotante** (chat del rubro): SIMULADO con respuestas inteligentes
  predefinidas (sin backend = gratis, nadie gasta tokens). Al venderlo se conecta a Claude.
- Sistema de diseño ÚNICO por nicho (paleta, tipografía, hero, microinteracciones)
  para que ningún cliente reconozca un template.
- Responsive, microanimaciones, detalles premium (sticky nav, hover, transiciones).

## Marcas ficticias (propuestas)
- E-commerce: **"CUMBRE · Café de Origen"** (café de especialidad colombiano, premium,
  fotogénico, calza ecommerce con productos/suscripción/carrito).
- Inmobiliario: por definir al llegar (ej. "Hábitat Bogotá" / "Terrazas").
- Servicios: por definir (ej. estudio jurídico o clínica dental "Vértice").

## Integración al portal
Agregar 3 tarjetas con preview + botón "Ver demo en vivo" a la sección de portafolio /
servicios de páginas web (web-v2 o /portafolio/).

## Fuera de alcance (YAGNI)
- Carrito funcional real con pago (es demo; el carrito es visual).
- Backend del chat (simulado).
- CMS / panel de administración.
