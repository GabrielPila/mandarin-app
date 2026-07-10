import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRawLesson } from "../scripts/lib/lesson-raw.mjs";

const FIXTURE = `# Book 1 — Lección 3 (printed pp. 88-112, PDF 116-140)

## Palabras Nuevas 1
1. 谁 | shéi | Pron. | quién
2. 的 | de | Pt. | (partícula estructural)
3. 图书馆 | tú shū guǎn | S | biblioteca

## Palabras Nuevas 2
1. 进 | jìn | V | entrar
2. 玩儿 | wánr | V | divertirse

## Palabras Suplementarias
1. 猫 | māo | S | gato

## Notas
### N1 你好吗
Texto de la nota uno.

### N2 贵姓
Texto de la nota dos.

## Gramática
### G1 Oraciones con predicado adjetival
Explicación.
他很忙。

## Ejercicio de Fonética
b p / d t
mā má mǎ mà

## Ejercicios
### Ejercicio I — Escucha y repite (audio)
### Ejercicio II — Completa las frases
他__忙。
我__学生。

## Comprensión de Lectura
### 我的家
我家有四口人。
`;

test("parsea encabezado, bloques y secciones", () => {
	const out = parseRawLesson(FIXTURE);
	assert.equal(out.errors.length, 0, out.errors.join("; "));
	assert.equal(out.book, 1);
	assert.equal(out.lesson, 3);
	assert.equal(out.vocabBlocks.length, 3);
	assert.deepEqual(
		out.vocabBlocks.map((b) => b.sec),
		[1, 2, 3],
	);
	const pn1 = out.vocabBlocks[0];
	assert.equal(pn1.items.length, 3);
	assert.deepEqual(pn1.items[0], {
		n: 1,
		h: "谁",
		p: "shéi",
		pos: "Pron.",
		gloss: "quién",
		lineNo: pn1.items[0].lineNo,
	});
	assert.equal(out.notas.length, 2);
	assert.equal(out.notas[0].n, 1);
	assert.equal(out.notas[0].rest, "你好吗");
	assert.equal(out.gramatica.length, 1);
	assert.equal(out.fonetica.length, 2);
	assert.equal(out.ejercicios.length, 2);
	assert.equal(out.ejercicios[0].audio, true);
	assert.equal(out.ejercicios[0].lines.length, 0);
	assert.equal(out.ejercicios[1].audio, false);
	assert.equal(out.ejercicios[1].lines.length, 2);
	assert.equal(out.lecturas.length, 1);
	assert.equal(out.lecturas[0].title, "我的家");
});

test("acepta erhua y multi-sílaba; rechaza pinyin desalineado", () => {
	const ok = parseRawLesson(
		"# Book 1 — Lección 3\n\n## Palabras Nuevas 1\n1. 玩儿 | wánr | V | jugar\n",
	);
	assert.equal(ok.errors.length, 0, ok.errors.join("; "));
	const bad = parseRawLesson(
		"# Book 1 — Lección 3\n\n## Palabras Nuevas 1\n1. 图书馆 | túshū | S | biblioteca\n",
	);
	assert.equal(bad.errors.length, 1);
	assert.match(bad.errors[0], /sílabas no alineadas|sílaba vacía/);
});

test("detecta título faltante, formato de item y numeración", () => {
	const out = parseRawLesson(
		"# Book 2 — Lección 11\n\n## Palabras Nuevas 1\n1. 从 | cóng | Prep. | desde\n3. 查 | chá | V | consultar\nesto no es un item\n",
	);
	assert.equal(out.book, 2);
	assert.ok(out.warnings.some((w) => /numeración 3 tras 1/.test(w)));
	assert.ok(out.errors.some((e) => /no coincide/.test(e)));
	const noTitle = parseRawLesson(
		"## Palabras Nuevas 1\n1. 从 | cóng | P | de\n",
	);
	assert.ok(noTitle.errors.some((e) => /falta título/.test(e)));
});

test("lección fuera de rango del libro es error", () => {
	const out = parseRawLesson("# Book 1 — Lección 12\n");
	assert.ok(out.errors.some((e) => /fuera de rango/.test(e)));
});

test("sección desconocida se conserva como extra con aviso", () => {
	const out = parseRawLesson(
		"# Book 1 — Lección 3\n\n## Caligrafía\ntrazo a trazo\n",
	);
	assert.equal(out.extras.length, 1);
	assert.equal(out.extras[0].header, "Caligrafía");
	assert.ok(out.warnings.some((w) => /no prevista/.test(w)));
});

test("(车)次: los paréntesis no rompen la alineación", () => {
	const out = parseRawLesson(
		"# Book 2 — Lección 13\n\n## Palabras Nuevas 1\n1. (车)次 | (chē) cì | | número de tren\n",
	);
	assert.equal(out.errors.length, 0, out.errors.join("; "));
});
