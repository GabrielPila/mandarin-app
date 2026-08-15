import { readFile, writeFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";

const [input, output, password] = process.argv.slice(2);
if (!input || !output || !password) {
	console.error("Usage: node scripts/encrypt-private-readings.mjs INPUT OUTPUT PASSWORD");
	process.exit(1);
}

const enc = new TextEncoder();
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const iv = webcrypto.getRandomValues(new Uint8Array(12));
const iterations = 310000;
const material = await webcrypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
const key = await webcrypto.subtle.deriveKey(
	{ name: "PBKDF2", hash: "SHA-256", salt, iterations }, material,
	{ name: "AES-GCM", length: 256 }, false, ["encrypt"],
);
const plaintext = await readFile(input);
const ciphertext = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
const b64 = (bytes) => Buffer.from(bytes).toString("base64");
await writeFile(output, JSON.stringify({ v: 1, algorithm: "AES-256-GCM", kdf: "PBKDF2-SHA-256", iterations, salt: b64(salt), iv: b64(iv), ciphertext: b64(ciphertext) }));
console.log(`Encrypted ${input} -> ${output}`);
