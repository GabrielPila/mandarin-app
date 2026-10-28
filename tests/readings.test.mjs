import { test } from "node:test";
import assert from "node:assert/strict";
import {
	B1_TEXTS,
	B2_TEXTS,
	B1_READINGS,
	B2_READINGS,
} from "../data/index.js";

test("readings: B1_TEXTS y B2_TEXTS contienen diálogos estructurados", () => {
	assert.ok(B1_TEXTS.length > 0, "B1_TEXTS no debe estar vacío");
	assert.ok(B2_TEXTS.length > 0, "B2_TEXTS no debe estar vacío");

	for (const book of [B1_TEXTS, B2_TEXTS]) {
		for (const item of book) {
			assert.ok(item.l >= 1, `Lección inválida en item: ${item.t}`);
			assert.ok(item.t && item.t.length > 0, "El título en Hanzi es requerido");

			if (item.parts) {
				assert.ok(Array.isArray(item.parts), `Parts debe ser arreglo en ${item.t}`);
				assert.ok(item.parts.length > 0, `Parts no debe estar vacío en ${item.t}`);
				for (const part of item.parts) {
					assert.ok(
						Array.isArray(part.lines) && part.lines.length > 0,
						`Cada parte debe contener líneas: ${item.t}`,
					);
				}
			} else {
				assert.ok(
					Array.isArray(item.lines) && item.lines.length > 0,
					`Diálogo debe contener líneas: ${item.t}`,
				);
			}
		}
	}
});

test("readings: B1_READINGS y B2_READINGS contienen lecturas graduadas válidas", () => {
	assert.ok(B1_READINGS.length > 0, "B1_READINGS no debe estar vacío");
	assert.ok(B2_READINGS.length > 0, "B2_READINGS no debe estar vacío");

	for (const coll of [B1_READINGS, B2_READINGS]) {
		for (const reading of coll) {
			assert.ok(reading.l >= 1, `Lección inválida en lectura: ${reading.t}`);
			assert.ok(reading.t, "Título requerido");
			assert.ok(
				Array.isArray(reading.lines) && reading.lines.length > 0,
				`Lectura debe tener arreglo de líneas: ${reading.t}`,
			);
		}
	}
});

