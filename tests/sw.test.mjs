import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("sw: todos los recursos locales precacheados en ASSETS existen en disco", () => {
	const swContent = fs.readFileSync("sw.js", "utf-8");
	const match = swContent.match(/const ASSETS = \[([\s\S]*?)\];/);
	assert.ok(match, "Debe definirse un array ASSETS en sw.js");

	const rawEntries = match[1]
		.split(",")
		.map((s) => s.trim().replace(/['"]/g, ""))
		.filter(
			(s) =>
				s.length > 0 &&
				s !== "." &&
				!s.startsWith("http://") &&
				!s.startsWith("https://"),
		);

	const missing = [];
	for (const entry of rawEntries) {
		const fullPath = path.resolve(entry);
		if (!fs.existsSync(fullPath)) {
			missing.push(entry);
		}
	}

	assert.deepEqual(
		missing,
		[],
		`Archivos referenciados en ASSETS que no existen: ${missing.join(", ")}`,
	);
});

