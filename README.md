# Encuadernador

Convierte PDF a EPUB para Kindle, enteramente en el navegador — arrastra el PDF, ajusta saltos de línea e imágenes en vivo, revisa idiomas detectados, recorta la portada, descarga. Sin servidor: el PDF nunca sale de tu máquina.

## Estado

Este repositorio aún no tiene código — solo el diseño completo. Los dos documentos de abajo son lo único que necesita una sesión de Claude Code para construir el proyecto de cero, sin hacer preguntas.

- **[`BLUEPRINT.md`](./BLUEPRINT.md)** — arquitectura completa: stack, modelo de datos, las doce transforms del motor de ajustes, sistema de diseño, y el orden de build paso a paso (empezando por dejar una URL de GitHub Pages funcionando antes de escribir ninguna lógica).
- **[`CLAUDE.md`](./CLAUDE.md)** — el contexto que Claude Code lee automáticamente al abrir este repo.

## Cómo construirlo

Abre una sesión nueva de Claude Code con este repositorio (no la sesión de diseño — esa es otro repo, "The Architect"). El `CLAUDE.md` se carga solo; dile que empiece por el **Paso 1** de `BLUEPRINT.md`.

El primer entregable es deliberadamente pequeño: un `pnpm create vite` desplegado a `https://diegomiranda06.github.io/encuadernador/` vía GitHub Actions, antes de tocar una sola línea de lógica de negocio. Es la prueba de que "tener una dirección web para probar" funciona, y todo lo demás se construye encima con esa confianza ya ganada.

## Stack

React 19 + Vite 6 + TypeScript + Tailwind v4 + shadcn/ui · mupdf.js (WASM, en Web Worker) · fflate · IndexedDB · GitHub Pages. Sin backend, sin base de datos, sin Docker.
