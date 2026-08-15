import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";

const password = process.argv[2];
if (!password) {
	console.error("Usage: node scripts/validate-private-collections.mjs PASSWORD");
	process.exit(1);
}

const bytes = (value) => Uint8Array.from(Buffer.from(value, "base64"));
const catalog = JSON.parse(await readFile("data/private/catalog.json", "utf8"));
let sharedSalt;
let total = 0;

for (const collection of catalog.collections) {
	const envelope = JSON.parse(await readFile(collection.file, "utf8"));
	if (sharedSalt && sharedSalt !== envelope.salt) throw new Error(`${collection.id}: salt differs from the collection set`);
	sharedSalt = envelope.salt;
	const material = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
	const key = await webcrypto.subtle.deriveKey(
		{ name: "PBKDF2", hash: "SHA-256", salt: bytes(envelope.salt), iterations: envelope.iterations }, material,
		{ name: "AES-GCM", length: 256 }, false, ["decrypt"],
	);
	const clear = await webcrypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(envelope.iv) }, key, bytes(envelope.ciphertext));
	const books = JSON.parse(new TextDecoder().decode(clear));
	const count = books.reduce((sum, book) => sum + (book.chapters?.length || 0), 0);
	if (count !== collection.readingCount) throw new Error(`${collection.id}: catalog says ${collection.readingCount}, decrypted ${count}`);
	for (const book of books) for (const chapter of book.chapters || []) {
		if (!chapter.lines?.length) throw new Error(`${chapter.id}: no reading lines`);
		for (const line of chapter.lines) if (!line.zh || !line.en || !line.es || !line.py) throw new Error(`${chapter.id}: incomplete line`);
	}
	total += count;
	console.log(`✓ ${collection.id}: ${count} readings`);
}

console.log(`Validated ${catalog.collections.length} collections and ${total} readings.`);
