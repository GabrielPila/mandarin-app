---
name: ui-reviewer
description: >-
  Senior UI/UX Researcher & Design Auditor. Automates visual regression testing,
  multi-viewport screenshot matrix captures, touch target verification (Apple HIG
  & Material 3), typography hierarchy, contrast audit (WCAG AA), and 8-point grid
  rhythm checks. Evaluates holistic density and invisible hit-boxes to prevent
  visual overcrowding.
---

# UI/UX Reviewer Skill

Este skill capacita al agente para actuar como un **Senior UI/UX Researcher &
Staff Design Engineer**, ejecutando auditorías heurísticas y automatizadas sobre
interfaces web móviles y de escritorio.

---

## 1. Principios de Diseño: Densidad, Ergonomía y Anti-Saturación

### A. Touch Targets Inteligentes: Hit-Box Virtual vs. Tamaño Visual
- **Principio Fundamental (Anti-Clutter):** Cumplir con los estándares de
  **44×44 pt (iOS)** o **48×48 dp (Android)** **NUNCA debe forzar un
  agrandamiento visual tosco** que rompa la densidad, amontone botones o sature
  la pantalla.
- **Técnica Obligatoria (Hit-Box Invisible):** Para controles en barras densas
  (cabeceras, listas compactas), mantener el glifo/ícono visualmente pequeño y
  elegante (ej. 24px-32px) y expandir el área táctil a 44px mediante pseudo-
  elementos (`::after` con `inset: -6px`) o padding transparente.
- **Consolidación de Controles:** Si una barra tiene más de 4 controles en móvil,
  la recomendación prioritaria debe ser **agrupar acciones secundarias en un menú
  o popover**, en lugar de apretar botones gigantes.

### B. Tipografía Dual-Script y Jerarquía
- **Line-Height generoso:** Entre **140% y 160%** para evitar colisiones entre
  diacríticos de tonos (ā, á, ǎ, à) y caracteres Hanzi.
- **Segmentación 1:1:** Cada carácter chino debe mapear exactamente con su
  sílaba correspondiente; nunca agrupar palabras multisilábicas sobre un solo
  glifo.
- **Resiliencia al zoom (`Aa`):** El layout debe adaptarse flexiblemente sin
  cortar palabras ni desbordar contenedores.

### C. Ritmo Modular (8-Point Grid) y Espacio Negativo
- Todo margen, padding y gap debe usar múltiplos de 8px (o 4px para micro-
  espaciados).
- **El espacio negativo (respiro visual) es prioritario:** No llenar huecos
  innecesariamente si eso genera sobrecarga cognitiva.

### D. Accesibilidad y Contraste (WCAG 2.1 AA)
- Ratio de contraste mínimo de **4.5:1** para texto normal y **3.0:1** para
  elementos destacados/íconos.
- Verificar paridad estricta entre tema claro y tema oscuro.

---

## 2. Herramientas Automatizadas del Skill

Ubicadas en `scripts/`:
1. **`scripts/capture_matrix.mjs`:** Captura las vistas en 4 viewports
   (375px, 390px, 768px, 1280px) en modo claro y oscuro.
2. **`scripts/measure_targets.mjs`:** Identifica controles con área efectiva
   reducida y evalúa si requieren expansión por hit-box virtual.

---

## 3. Matriz de Severidad y Criterio de Auditoría

Al clasificar hallazgos:
- **P0 (Bloqueante):** Flujos rotos, solapamiento total o funciones inaccesibles.
- **P1 (Ergonomía Grave):** Contraste ilegible (< 3:1) o controles en zonas
  densas sin hit-box expandida.
- **P2 (Visual / Densidad):** Controles apiñados, falta de respiro visual o
  márgenes que rompen la cuadrícula de 8pt.
- **P3 (Micro-interacción / Pulido):** Sombras, transiciones o estados activos.

---

## 4. Evaluaciones del Skill (Evals)

El skill incluye una suite de pruebas y evaluaciones en `tests/evals.test.mjs`
que valida:
1. Que los scripts del skill no fallen ni lancen excepciones.
2. Que las recomendaciones no sugieran agrandamientos visuales dogmáticos que
   saturen la interfaz (*anti-bloat check*).
3. Que se priorice la técnica de hit-box virtual (`::after`) frente al aumento
   físico de dimensiones.
