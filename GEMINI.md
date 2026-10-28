# GEMINI.md — Antigravity & Gemini Workspace Instructions

Este archivo configura las reglas y directrices de desarrollo para Antigravity
y modelos Gemini en este repositorio.

---

## 1. Reglas Generales y Arquitectura del Proyecto

Este proyecto se rige por las directrices descritas en [CLAUDE.md](file:///Users/gabrielpila/ClaudeProjects/MandarinApp/CLAUDE.md):
- **Stack:** Vanilla JS PWA (ES Modules nativos, sin bundler, sin npm build).
- **Despliegue:** Vercel auto-deploy desde `main` (archivos estáticos + Edge
  functions en `/api/`).
- **Invariantes Críticas:**
  - Incrementar `CACHE` en `sw.js` en cada cambio que deba invalidar caché.
  - Los IDs de tarjetas SRS son posiciones fijas de array (`b1:<i>`, `b2:<i>`).
    **Nunca reordenar ni eliminar entradas**, solo append o `_deleted: true`.
  - El renderizado de caracteres chinos siempre pasa por `renderTokens()` en
    `js/ui.js` para asegurar segmentación y rubíes alineados.
- **Formateo de código:** Líneas de 80 caracteres en JS/CSS/Markdown. Ejecutar
  Biome (`npx @biomejs/biome format --write .`) tras ediciones.

---

## 2. Reglas Modulares de Workspace

El directorio [.agents/rules/](file:///Users/gabrielpila/ClaudeProjects/MandarinApp/.agents/rules)
contiene reglas especializadas por dominio:

- [ui-mockups.md](file:///Users/gabrielpila/ClaudeProjects/MandarinApp/.agents/rules/ui-mockups.md):
  Directiva obligatoria para la generación de imágenes y mockups con
  `generate_image` (paleta oficial Slate `#0f172a`, los 5 tabs exactos de
  navegación, alineación 1:1 de rubíes chinos y centrado).
