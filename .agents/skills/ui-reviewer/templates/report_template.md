# Reporte de Auditoría UI/UX: [Nombre de la Pantalla / Flujo]

**Fecha:** YYYY-MM-DD  
**Auditor:** UI/UX Reviewer Skill  
**Viewports Evaluados:** iPhone SE (375px), iPhone 14 (390px), Tablet (768px), Desktop (1280px)  
**Temas:** Claro y Oscuro  

---

## 1. Evidencia Visual Comparativa (Carrusel Antes vs. Después)

````carousel
![Antes - Móvil](/ruta/a/screenshot_antes_mobile.png)
<!-- slide -->
![Después - Móvil](/ruta/a/screenshot_despues_mobile.png)
<!-- slide -->
![Antes - Desktop](/ruta/a/screenshot_antes_desktop.png)
<!-- slide -->
![Después - Desktop](/ruta/a/screenshot_despues_desktop.png)
````

---

## 2. Hallazgos por Severidad

### 🔴 P0 / P1 — Defectos Críticos & Ergonomía
- **[Elemento / Selector]:** Descripción del defecto.
  - *Heurística violada:* (ej. Touch Target < 44px, Contraste < 3:1).
  - *Impacto:* Dificultad para pulsar con el pulgar o texto ilegible.
  - *Solución sugerida:* Código CSS propuesto.

### 🟡 P2 — Ritmo Visual y Espaciado (8-pt Grid)
- **[Elemento / Selector]:** Descripción de elementos comprimidos o asimétricos.
  - *Solución sugerida:* Ajuste de márgenes o gaps.

### 🟢 P3 — Pulido y Micro-interacciones
- **[Elemento / Selector]:** Transición, sombra o feedback visual ausente.

---

## 3. Pruebas y Verificación Automatizada

- [ ] Matriz de capturas generada sin errores de JavaScript.
- [ ] 100% de touch targets >= 44×44 px en flujos clave.
- [ ] Pruebas unitarias de regresión en verde (`npm test`).
