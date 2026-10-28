# UI Mockups & Image Generation Rule

Cada vez que el agente utilice la herramienta `generate_image` (o cualquier
herramienta visual de generación) para proponer interfaces de usuario, mockups
o componentes para **MandarinApp**, DEBE seguir obligatoriamente este blueprint
para garantizar fidelidad y replicabilidad total con el producto real:

---

## 1. Paleta de Color Oficial (Tokens de css/theme.css)

No utilizar colores genéricos ni gradientes estridentes. Usar estrictamente:
- **Fondo base (Dark Mode):** `#0f172a` (Slate 900) con micro-trama de puntos o
  cuadrícula sutil.
- **Tarjetas / Contenedores:** `#1f2937` (Gray 800 con 95% de opacidad) y borde
  fino de 1px `rgba(255, 255, 255, 0.1)`.
- **Acento Primario de Marca:** `#3b82f6` (Electric / Royal Blue).
- **Acento Secundario / Pinyin:** `#38bdf8` (Sky Blue).
- **Texto Principal (Ink):** `#f8fafc` (blanco nítido de alto contraste).
- **Texto Secundario (Muted):** `#94a3b8` (gris slate).
- **Acciones Destructivas / Fin de Llamada:** `#ef4444` (Rojo).

---

## 2. Barra de Navegación Inferior Oficial (Fija, 5 Pestañas)

Toda pantalla completa que muestre la navegación DEBE incluir los 5 tabs reales
de la aplicación en el orden exacto con sus etiquetas e iconos de Lucide:

1. **文 Reading** (icono `book-open`)
2. **词 Vocabulary** (icono `library`)
3. **法 Grammar** (icono `pencil`)
4. **练 Practice** (icono `graduation-cap`)
5. **师 Tutor** (icono `bot` robot)

*Regla de estado activo:* La pestaña activa debe estar destacada con
`#3b82f6` y un desplazamiento vertical sutil (`translateY(-2px)`).

---

## 3. Cabecera Oficial (<header>)

- Título oficial: **中文 Practical Chinese** (con el carácter `中文` en azul
  `#3b82f6` y el subtítulo en blanco/gris).
- Para la vista de voz en vivo, incluir el toggle superior derecho:
  `[ 🎙️ Voice | 💬 Chat ]`.

---

## 4. Tipografía y Alineación de Chino

- **Centrado:** Todo el contenido de diálogo (Hanzi, Pinyin y traducción) debe
  estar centrado horizontalmente en la tarjeta.
- **Alineación 1 a 1 de Pinyin:** Cada carácter chino debe tener su sílaba
  correspondiente con marca de tono colocada directamente encima (formato
  `<ruby>`), sin desfases de espacio.
- **Tipografías:** `Plus Jakarta Sans` para textos latinos e interfaz;
  `Noto Sans SC` para caracteres chinos.

---

## 5. Directiva de Generación

- Generar **únicamente la interfaz**, sin marcos de dispositivos (sin bordes
  de iPhone, carcasas de teléfonos ni escritorios).
- Aspect ratio recomendado para vistas completas: `9:16`.

---

## 6. Capturas de Referencia (Golden Ground Truth)

El directorio `docs/screens/` almacena capturas y maquetas de referencia
oficiales. Al generar nuevas pantallas o variantes, pasar estas rutas en el
parámetro `ImagePaths` de `generate_image` para mantener fidelidad exacta:
- `docs/screens/05_tutor_voice.jpg`: Maqueta oficial validada de Mandarin Voice
  (Modo Live Tutor, Slate 900, 5 tabs, tarjeta centrada con rubíes).

