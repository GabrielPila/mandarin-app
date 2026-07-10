// parse-lesson.mjs — chequeo estructural de un archivo de extracción cruda.
// Uso: node scripts/parse-lesson.mjs extraction/book1_lessons/L01.md
// Sale con código 1 si hay errores. Correr tras escribir cada archivo crudo.
import { readFileSync } from "node:fs";
import { parseRawLesson } from "./lib/lesson-raw.mjs";

const file = process.argv[2];
if (!file) {
	console.error("Uso: node scripts/parse-lesson.mjs <archivo .md>");
	process.exit(2);
}

const out = parseRawLesson(readFileSync(file, "utf8"));

console.log(`Book ${out.book} — Lección ${out.lesson} ${out.titleRest}`);
for (const b of out.vocabBlocks)
	console.log(`  vocab sec=${b.sec} '${b.header}': ${b.items.length} palabras`);
console.log(`  notas: ${out.notas.length}`);
console.log(`  gramática: ${out.gramatica.length}`);
console.log(`  fonética: ${out.fonetica.length} líneas`);
console.log(
	`  ejercicios: ${out.ejercicios.length}` +
		(out.ejercicios.length
			? ` (${out.ejercicios
					.map((e) => `${e.n}${e.audio ? "·audio" : ""}`)
					.join(", ")})`
			: ""),
);
console.log(`  lecturas: ${out.lecturas.length}`);
if (out.extras.length)
	console.log(`  extras: ${out.extras.map((x) => x.header).join(" / ")}`);

if (out.warnings.length) {
	console.log(`\n⚠️  ${out.warnings.length} avisos:`);
	for (const w of out.warnings) console.log("  - " + w);
}
if (out.errors.length) {
	console.error(`\n❌ ${out.errors.length} errores:`);
	for (const e of out.errors) console.error("  - " + e);
	process.exit(1);
}
console.log("\n✅ estructura válida");
