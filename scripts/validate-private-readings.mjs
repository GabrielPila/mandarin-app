#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const path = process.argv[2] || "private-source/readings.json";
const books = JSON.parse(await readFile(path, "utf8"));
const han = /[\u3400-\u9fff\uf900-\ufaff]/g;
const errors = [];
let chapterCount = 0;
let lineCount = 0;

if (!Array.isArray(books) || !books.length) errors.push("no books found");
for (const book of books) {
	if (!book.titleZh || !Array.isArray(book.chapters)) {
		errors.push("invalid book entry");
		continue;
	}
	chapterCount += book.chapters.length;
	for (const chapter of book.chapters) {
		if (!chapter.titleZh || !Array.isArray(chapter.lines)) {
			errors.push(`${book.titleZh}: invalid chapter ${chapter.number}`);
			continue;
		}
		for (const [index, line] of chapter.lines.entries()) {
			lineCount++;
			if (!line.zh || !line.en || !line.es || !line.py) {
				errors.push(`chapter ${chapter.number}, line ${index + 1}: missing field`);
				continue;
			}
			const characters = line.zh.match(han)?.length || 0;
			const syllables = line.py.trim().split(/\s+/).length;
			if (characters !== syllables) {
				errors.push(
					`chapter ${chapter.number}, line ${index + 1}: ${characters} characters / ${syllables} pinyin syllables`,
				);
			}
		}
	}
}

if (errors.length) {
	console.error(errors.join("\n"));
	process.exit(1);
}

console.log(`Validated ${books.length} book, ${chapterCount} chapters, ${lineCount} lines.`);
