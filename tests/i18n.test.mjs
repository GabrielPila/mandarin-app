import { test, before } from "node:test";
import assert from "node:assert/strict";

const mem = {};
globalThis.localStorage = {
	getItem: (k) => (k in mem ? mem[k] : null),
	setItem: (k, v) => {
		mem[k] = String(v);
	},
	removeItem: (k) => {
		delete mem[k];
	},
};

let UI;
before(async () => {
	const mod = await import("../js/i18n.js");
	UI = mod.UI;
});

test("i18n: paridad completa de claves entre español e inglés", () => {
	const esKeys = Object.keys(UI.es);
	const enKeys = Object.keys(UI.en);

	const missingInEn = esKeys.filter((k) => !(k in UI.en));
	const missingInEs = enKeys.filter((k) => !(k in UI.es));

	assert.deepEqual(
		missingInEn,
		[],
		`Claves presentes en 'es' pero ausentes en 'en': ${missingInEn.join(", ")}`,
	);
	assert.deepEqual(
		missingInEs,
		[],
		`Claves presentes en 'en' pero ausentes en 'es': ${missingInEs.join(", ")}`,
	);
});

test("i18n: cadenas fundamentales no están vacías", () => {
	const coreKeys = ["appTitle", "study", "texts", "vocab", "grammar", "tutor"];
	for (const key of coreKeys) {
		assert.ok(UI.es[key], `Clave 'es.${key}' no debe estar vacía`);
		assert.ok(UI.en[key], `Clave 'en.${key}' no debe estar vacía`);
	}
});

