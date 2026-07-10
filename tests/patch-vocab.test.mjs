import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
	appendEntry,
	formatVocabEntry,
	scanArrayObjects,
	upsertFields,
} from "../scripts/lib/patch-vocab.mjs";

const SRC = `// comentario con { llaves } y "comillas"
export const DEMO = [
	{
		h: "谁",
		p: "shéi",
		es: "quién {con llave}",
		en: "who // no es comentario",
		l: 3,
		tags: ["npcr", "hsk1"],
	},
	{
		h: "的",
		p: "de",
		es: "partícula",
		en: "particle",
		l: 3,
		sec: 1,
		ord: 9,
	},
];
`;

async function evalModule(src) {
	const url = `data:text/javascript,${encodeURIComponent(src)}`;
	return import(url);
}

test("scanArrayObjects cuenta objetos ignorando strings y comentarios", () => {
	const { objects } = scanArrayObjects(SRC, "DEMO");
	assert.equal(objects.length, 2);
	assert.match(SRC.slice(objects[0].start, objects[0].end), /h: "谁"/);
});

test("upsertFields inserta sec/ord sin tocar nada más", async () => {
	const out = upsertFields(SRC, "DEMO", 0, { sec: 2, ord: 5 });
	const mod = await evalModule(out);
	assert.equal(mod.DEMO.length, 2);
	assert.deepEqual(mod.DEMO[0], {
		h: "谁",
		p: "shéi",
		es: "quién {con llave}",
		en: "who // no es comentario",
		l: 3,
		tags: ["npcr", "hsk1"],
		sec: 2,
		ord: 5,
	});
	assert.equal(mod.DEMO[1].ord, 9); // el vecino no cambia
});

test("upsertFields actualiza sec/ord existentes en vez de duplicar", async () => {
	const out = upsertFields(SRC, "DEMO", 1, { sec: 2, ord: 1 });
	const mod = await evalModule(out);
	assert.equal(mod.DEMO[1].sec, 2);
	assert.equal(mod.DEMO[1].ord, 1);
	assert.equal((out.match(/sec:/g) || []).length, 1);
});

test("appendEntry añade al final sin mover los existentes", async () => {
	const entry = formatVocabEntry({
		h: "猫",
		p: "māo",
		pos: "S",
		es: "gato",
		en: "cat",
		l: 3,
		tags: ["npcr"],
		sec: 3,
		ord: 1,
	});
	const out = appendEntry(SRC, "DEMO", entry);
	const mod = await evalModule(out);
	assert.equal(mod.DEMO.length, 3);
	assert.equal(mod.DEMO[0].h, "谁");
	assert.equal(mod.DEMO[2].h, "猫");
	assert.equal(mod.DEMO[2].sec, 3);
});

test("scanner coincide con los arrays reales (invariante de ids SRS)", async () => {
	const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
	const data = await import(join(ROOT, "data/index.js"));
	for (const [file, name, arr] of [
		["data/book1-vocab.js", "B1_VOCAB", data.B1_VOCAB],
		["data/book1-sup.js", "B1_SUP", data.B1_SUP],
		["data/book2-vocab.js", "B2_VOCAB", data.B2_VOCAB],
		["data/book2-sup.js", "B2_SUP", data.B2_SUP],
	]) {
		const src = readFileSync(join(ROOT, file), "utf8");
		const { objects } = scanArrayObjects(src, name);
		assert.equal(
			objects.length,
			arr.length,
			`${file}: el escáner ve ${objects.length} objetos, el array tiene ${arr.length}`,
		);
	}
});
