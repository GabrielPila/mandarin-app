const URL = "data/private/readings.enc.json";
const DB = "mandarin-private-content";
const STORE = "keys";
const KEY_ID = "private-readings-v1";
const bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function envelope() {
	const response = await fetch(URL, { cache: "no-store" });
	if (!response.ok) throw new Error(`Private readings unavailable (${response.status})`);
	return response.json();
}

function database() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB, 1);
		request.onupgradeneeded = () => request.result.createObjectStore(STORE);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function storedKey(mode, value) {
	const db = await database();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, mode === "get" ? "readonly" : "readwrite");
		const store = tx.objectStore(STORE);
		const request = mode === "get" ? store.get(KEY_ID) : mode === "put" ? store.put(value, KEY_ID) : store.delete(KEY_ID);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function derive(password, env) {
	const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
	return crypto.subtle.deriveKey(
		{ name: "PBKDF2", hash: "SHA-256", salt: bytes(env.salt), iterations: env.iterations }, material,
		{ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
	);
}

async function decrypt(env, key) {
	const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(env.iv) }, key, bytes(env.ciphertext));
	const parsed = JSON.parse(new TextDecoder().decode(clear));
	if (!Array.isArray(parsed)) throw new Error("Invalid reading data");
	return parsed;
}

export async function unlockPrivateReadings(password, remember = true) {
	const env = await envelope();
	const key = await derive(password, env);
	const books = await decrypt(env, key);
	if (remember) await storedKey("put", { salt: env.salt, key });
	return books;
}

export async function rememberedPrivateReadings() {
	try {
		const [env, saved] = await Promise.all([envelope(), storedKey("get")]);
		if (!saved || saved.salt !== env.salt) return null;
		return await decrypt(env, saved.key);
	} catch (_error) {
		return null;
	}
}

export async function forgetPrivateReadings() {
	await storedKey("delete");
}
