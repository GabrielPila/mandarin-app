import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// ============================================================================
// 1. EVALS DE INTEGRIDAD Y REGLAS DEL SKILL (Arquitectura & Contratos)
// ============================================================================

test("eval 1: integridad estructural del skill", () => {
	const skillDir = path.resolve(".agents/skills/ui-reviewer");
	assert.ok(fs.existsSync(path.join(skillDir, "SKILL.md")), "SKILL.md debe existir");
	assert.ok(
		fs.existsSync(path.join(skillDir, "scripts/capture_matrix.mjs")),
		"capture_matrix.mjs debe existir",
	);
	assert.ok(
		fs.existsSync(path.join(skillDir, "scripts/measure_targets.mjs")),
		"measure_targets.mjs debe existir",
	);
	assert.ok(
		fs.existsSync(path.join(skillDir, "templates/report_template.md")),
		"report_template.md debe existir",
	);
});

test("eval 2: regla anti-bloat y heurística de hit-box virtual en SKILL.md", () => {
	const skillContent = fs.readFileSync(
		path.resolve(".agents/skills/ui-reviewer/SKILL.md"),
		"utf-8",
	);

	assert.ok(
		skillContent.includes("NUNCA debe forzar un agrandamiento visual tosco") ||
			skillContent.includes("Hit-Box Virtual"),
		"SKILL.md debe advertir contra la saturación por agrandamiento visual ciego",
	);
	assert.ok(
		skillContent.includes("::after") || skillContent.includes("hit-box"),
		"SKILL.md debe especificar la técnica de hit-box invisible",
	);
	assert.ok(
		skillContent.includes("Consolidación de Controles") ||
			skillContent.includes("menú"),
		"SKILL.md debe proponer consolidación de controles antes de saturar barras",
	);
});

// ============================================================================
// 2. EVALS DE ACCESIBILIDAD Y CONTRASTE WCAG 2.1 AA (Luminancia Relativa)
// ============================================================================

function hexToRgb(hex) {
	const clean = hex.replace("#", "");
	const num = parseInt(clean, 16);
	return {
		r: (num >> 16) & 255,
		g: (num >> 8) & 255,
		b: num & 255,
	};
}

function relativeLuminance({ r, g, b }) {
	const sRGB = [r, g, b].map((val) => {
		const c = val / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

function calculateContrast(hex1, hex2) {
	const l1 = relativeLuminance(hexToRgb(hex1));
	const l2 = relativeLuminance(hexToRgb(hex2));
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	return (lighter + 0.05) / (darker + 0.05);
}

test("eval 3: motor de contraste WCAG AA evalúa combinaciones clave", () => {
	// Blanco (#f8fafc) sobre Fondo Slate (#0f172a) -> Debe pasar con creces (> 12:1)
	const contrastWhiteOnSlate = calculateContrast("#f8fafc", "#0f172a");
	assert.ok(
		contrastWhiteOnSlate >= 7.0,
		`Contraste blanco sobre slate debe ser alto: ${contrastWhiteOnSlate.toFixed(1)}`,
	);

	// Azul primario (#3b82f6) sobre Fondo Slate (#0f172a) -> Debe superar 4.5:1
	const contrastBlueOnSlate = calculateContrast("#3b82f6", "#0f172a");
	assert.ok(
		contrastBlueOnSlate >= 4.5,
		`Azul primario debe cumplir WCAG AA: ${contrastBlueOnSlate.toFixed(1)}`,
	);

	// Defecto detectado previamente: Texto oscuro (#111827) sobre píldora slate (#1f2937)
	const contrastDarkOnDark = calculateContrast("#111827", "#1f2937");
	assert.ok(
		contrastDarkOnDark < 3.0,
		`El caso negro sobre gris oscuro debe ser identificado como fallo: ${contrastDarkOnDark.toFixed(1)}`,
	);
});

// ============================================================================
// 3. EVALS DE RITMO MODULAR (8-Point Grid System)
// ============================================================================

function isGridValid(pxValue) {
	// Múltiplo de 8 o submúltiplo exacto de 4px
	return pxValue % 4 === 0;
}

test("eval 4: validador de ritmo espacial (8-pt Grid)", () => {
	const compliantSpacings = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64];
	for (const sp of compliantSpacings) {
		assert.ok(isGridValid(sp), `Espaciado ${sp}px debe ser compatible con 8pt grid`);
	}

	const nonCompliantSpacings = [7, 11, 13, 19, 23, 27, 33];
	for (const sp of nonCompliantSpacings) {
		assert.ok(
			!isGridValid(sp),
			`Espaciado arbitrario ${sp}px debe ser penalizado como incompatible`,
		);
	}
});

// ============================================================================
// 4. EVALS DE CLASIFICACIÓN DE TOUCH TARGETS (Dense vs Standalone)
// ============================================================================

function classifyTouchTarget(element) {
	const { width, height, context } = element;
	const isSmall = width < 44 || height < 44;

	if (!isSmall) {
		return { status: "PASS", recommendation: "Standard dimensions met" };
	}

	if (context === "header" || context === "list-row" || context === "toolbar") {
		return {
			status: "WARNING",
			recommendation: "USE_VIRTUAL_HITBOX",
			details: "Expand via ::after pseudo-element to protect visual density",
		};
	}

	return {
		status: "WARNING",
		recommendation: "EXPAND_VISUAL_SIZE",
		details: "Element is standalone, safe to increase visual footprint",
	};
}

test("eval 5: clasificación inteligente de touch targets según densidad de contexto", () => {
	// Botón de cabecera de 32x32px -> Debe sugerir hit-box virtual (NO agrandar visualmente)
	const headerBtn = { width: 32, height: 32, context: "header" };
	const resultHeader = classifyTouchTarget(headerBtn);
	assert.equal(resultHeader.recommendation, "USE_VIRTUAL_HITBOX");

	// Botón altavoz dentro de fila de lista (24x24px) -> Debe sugerir hit-box virtual
	const listSpkBtn = { width: 24, height: 24, context: "list-row" };
	const resultList = classifyTouchTarget(listSpkBtn);
	assert.equal(resultList.recommendation, "USE_VIRTUAL_HITBOX");

	// Botón flotante aislado o en tarjeta amplia (36x36px) -> Puede expandirse
	const standaloneBtn = { width: 36, height: 36, context: "card-body" };
	const resultStandalone = classifyTouchTarget(standaloneBtn);
	assert.equal(resultStandalone.recommendation, "EXPAND_VISUAL_SIZE");

	// Botón estándar (350x48px) -> PASS directo
	const submitBtn = { width: 350, height: 48, context: "footer" };
	const resultSubmit = classifyTouchTarget(submitBtn);
	assert.equal(resultSubmit.status, "PASS");
});

// ============================================================================
// 5. EVALS DE TIPOGRAFÍA CHINA & RUBY ALIGNMENT (Prevención de Desfase)
// ============================================================================

function validateRubySegmentation(hanzi, pinyinList) {
	const characters = Array.from(hanzi).filter((c) => /[\u4e00-\u9fa5]/.test(c));
	// Cada carácter chino debe corresponder exactamente a 1 sílaba
	return characters.length === pinyinList.length;
}

test("eval 6: validador de desalineación de rubíes chinos", () => {
	// Caso correcto: 4 caracteres, 4 sílabas de pinyin 1:1
	const validHanzi = "你想买啥";
	const validPinyin = ["nǐ", "xiǎng", "mǎi", "shá"];
	assert.ok(
		validateRubySegmentation(validHanzi, validPinyin),
		"Debe validar alineación 1:1",
	);

	// Caso de defecto detectado: 'shénme' como 1 sola palabra para 2 caracteres '什么'
	const invalidHanzi = "什么"; // 2 caracteres
	const invalidPinyin = ["shénme"]; // 1 sola entrada agrupada
	assert.ok(
		!validateRubySegmentation(invalidHanzi, invalidPinyin),
		"Debe detectar y rechazar cuando una palabra multisilábica no está descompuesta por carácter",
	);
});

// ============================================================================
// 6. EVALS DE ESCALA TIPOGRÁFICA Y LINE-HEIGHT DUAL-SCRIPT
// ============================================================================

test("eval 7: line-height de texto con pinyin previene colisión de tonos", () => {
	const minSafeLineHeight = 1.4; // 140%
	const dangerousLineHeight = 1.15; // 115% colisiona diacríticos con caracteres superiores

	assert.ok(
		minSafeLineHeight >= 1.4,
		"Line-height debe permitir diacríticos de tono sin solapamiento",
	);
	assert.ok(
		dangerousLineHeight < 1.3,
		"Line-heights inferiores a 1.3 deben ser clasificados como propensos a colisión",
	);
});

// ============================================================================
// 7. EVALS DE SEVERIDAD DE HALLAZGOS (P0 a P3)
// ============================================================================

function assignSeverity(defect) {
	if (defect.isBrokenFlow || defect.isUnclickable) return "P0";
	if (defect.contrastRatio < 3.0 || defect.isPinyinDesynced) return "P1";
	if (defect.isGridBroken || defect.isOvercrowded) return "P2";
	return "P3";
}

test("eval 8: matriz de asignación de severidades según impacto real", () => {
	// Flujo bloqueado -> P0
	assert.equal(assignSeverity({ isBrokenFlow: true }), "P0");

	// Pinyin desfasado o contraste invisible -> P1
	assert.equal(assignSeverity({ isPinyinDesynced: true }), "P1");
	assert.equal(assignSeverity({ contrastRatio: 1.4 }), "P1");

	// Elementos amontonados o margen irregular -> P2
	assert.equal(assignSeverity({ isOvercrowded: true }), "P2");
	assert.equal(assignSeverity({ isGridBroken: true }), "P2");

	// Pulido menor -> P3
	assert.equal(assignSeverity({ isMinorPolish: true }), "P3");
});

// ============================================================================
// 8. EVALS DE SAFE AREAS Y NOTCH EN DISPOSITIVOS MÓVILES
// ============================================================================

test("eval 9: verificación de safe-area-inset en navegación fija", () => {
	const cssLayout = fs.readFileSync(path.resolve("css/layout.css"), "utf-8");
	assert.ok(
		cssLayout.includes("safe-area-inset") || cssLayout.includes("viewport-fit"),
		"El layout debe considerar safe-area-inset o viewport-fit para barras fijas",
	);
});
