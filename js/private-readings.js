const CATALOG_URL = "data/private/catalog.json";
const DB = "mandarin-private-content";
const STORE = "keys";
const KEY_ID = "private-readings-v1";
const bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
let sessionKey = null;

async function catalog() {
	const response = await fetch(CATALOG_URL, { cache: "no-store" });
	if (!response.ok) throw new Error(`Private reading catalog unavailable (${response.status})`);
	const parsed = await response.json();
	if (!Array.isArray(parsed.collections) || !parsed.collections.length) throw new Error("Invalid reading catalog");
	return parsed.collections;
}

async function envelope(url) {
	const response = await fetch(url, { cache: "no-store" });
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
	const collections = await catalog();
	const env = await envelope(collections[0].file);
	const key = await derive(password, env);
	await decrypt(env, key);
	sessionKey = { salt: env.salt, key };
	if (remember) await storedKey("put", { salt: env.salt, key });
	return collections;
}

export async function rememberedPrivateReadings() {
	try {
		const collections = await catalog();
		const [env, saved] = await Promise.all([envelope(collections[0].file), storedKey("get")]);
		if (!saved || saved.salt !== env.salt) return null;
		await decrypt(env, saved.key);
		sessionKey = saved;
		return collections;
	} catch (_error) {
		return null;
	}
}

export async function loadPrivateReadingCollection(collection) {
	const env = await envelope(collection.file);
	const saved = sessionKey || await storedKey("get");
	if (!saved || saved.salt !== env.salt) throw new Error("Private readings are locked");
	return decrypt(env, saved.key);
}

export async function forgetPrivateReadings() {
	sessionKey = null;
	await storedKey("delete");
}
