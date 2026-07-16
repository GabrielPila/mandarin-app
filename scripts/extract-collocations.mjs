import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseRawLesson } from "./lib/lesson-raw.mjs";
import { upsertColsField } from "./lib/patch-vocab.mjs";
import { isHan, normPinyin } from "../js/dict.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Helper to check if string has Han characters
const hasHan = (s) => Array.from(s).some(isHan);

async function run() {
	const data = await import(join(ROOT, "data/index.js"));

	for (const b of [1, 2]) {
		const vocabPath = join(ROOT, `data/book${b}-vocab.js`);
		const supPath = join(ROOT, `data/book${b}-sup.js`);

		let vocabText = readFileSync(vocabPath, "utf8");
		let supText = readFileSync(supPath, "utf8");

		const entries = [];
		const vocabArr = b === 1 ? data.B1_VOCAB : data.B2_VOCAB;
		const supArr = b === 1 ? data.B1_SUP : data.B2_SUP;

		vocabArr.forEach((e, idx) => {
			entries.push({
				srcName: b === 1 ? "B1_VOCAB" : "B2_VOCAB",
				path: vocabPath,
				idx,
				e,
			});
		});

		supArr.forEach((e, idx) => {
			entries.push({
				srcName: b === 1 ? "B1_SUP" : "B2_SUP",
				path: supPath,
				idx,
				e,
			});
		});

		const dir = join(ROOT, `extraction/book${b}_lessons`);
		const files = readdirSync(dir)
			.filter((f) => f.endsWith(".md"))
			.sort();

		let patchedCount = 0;

		for (const file of files) {
			const filePath = join(dir, file);
			const raw = parseRawLesson(readFileSync(filePath, "utf8"));
			if (raw.errors.length) {
				console.error(`Error parsing ${file}:`, raw.errors);
				continue;
			}

			for (const block of raw.vocabBlocks) {
				for (const item of block.items) {
					// Separate translation and collocations
					const parts = item.gloss.split(/\s+/).filter(Boolean);
					const cols = parts.filter(hasHan);
					if (cols.length === 0) continue;

					// Match item with DB entry
					let cands = entries.filter((c) => c.e.h === item.h);
					if (cands.length > 1) {
						cands = cands.filter((c) => c.e.l === raw.lesson);
					}
					if (cands.length > 1) {
						cands = cands.filter(
							(c) => normPinyin(c.e.p) === normPinyin(item.p),
						);
					}

					if (cands.length === 1) {
						const match = cands[0];
						if (match.path === vocabPath) {
							vocabText = upsertColsField(
								vocabText,
								match.srcName,
								match.idx,
								cols,
							);
						} else {
							supText = upsertColsField(
								supText,
								match.srcName,
								match.idx,
								cols,
							);
						}
						patchedCount++;
					} else if (cands.length > 1) {
						console.warn(
							`Ambiguity matching ${item.h} in L${raw.lesson}: ` +
								`${cands.length} candidates found. Skipping.`,
						);
					}
				}
			}
		}

		writeFileSync(vocabPath, vocabText);
		writeFileSync(supPath, supText);
		console.log(
			`Book ${b}: Patched ${patchedCount} entries with collocations.`,
		);
	}
}

run().catch(console.error);
