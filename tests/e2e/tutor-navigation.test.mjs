import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

let server;
let baseUrl;
let browser;

function createStaticServer(root = ".") {
	return http.createServer((req, res) => {
		let filePath = path.join(
			root,
			req.url === "/" ? "index.html" : req.url.split("?")[0],
		);
		if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
			filePath = path.join(filePath, "index.html");
		}
		if (!fs.existsSync(filePath)) {
			res.writeHead(404);
			return res.end("Not Found");
		}
		const ext = path.extname(filePath);
		const mimeTypes = {
			".html": "text/html",
			".js": "application/javascript",
			".css": "text/css",
			".json": "application/json",
			".png": "image/png",
			".jpg": "image/jpeg",
			".svg": "image/svg+xml",
		};
		res.writeHead(200, {
			"Content-Type": mimeTypes[ext] || "application/octet-stream",
		});
		fs.createReadStream(filePath).pipe(res);
	});
}

before(async () => {
	// 1. Levantar servidor estático efímero
	server = createStaticServer(".");
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const port = server.address().port;
	baseUrl = `http://127.0.0.1:${port}`;

	// 2. Iniciar Google Chrome headless
	browser = await chromium.launch({
		channel: "chrome",
		headless: true,
	});

	// Crear directorio para screenshots si no existe
	if (!fs.existsSync("tests/screenshots")) {
		fs.mkdirSync("tests/screenshots", { recursive: true });
	}
});

after(async () => {
	if (browser) await browser.close();
	if (server) await new Promise((resolve) => server.close(resolve));
});

test("E2E: Carga inicial y navegación a pestaña Tutor", async () => {
	const page = await browser.newPage({
		viewport: { width: 390, height: 844 }, // Simulación iPhone 14
	});

	await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

	// Verificar título
	const title = await page.title();
	assert.ok(title.includes("中文"), "El título de la página debe incluir 中文");

	// Verificar que las 5 pestañas existen
	const tabs = ["tab-texts", "tab-vocab", "tab-grammar", "tab-study", "tab-tutor"];
	for (const tabId of tabs) {
		const exists = await page.$(`#${tabId}`);
		assert.ok(exists, `La pestaña #${tabId} debe existir en el DOM`);
	}

	// 1. Hacer clic en Tutor
	await page.click("#tab-tutor");
	await page.waitForTimeout(300);

	// Verificar que #tab-tutor tiene la clase active
	const isTutorActive = await page.$eval("#tab-tutor", (el) =>
		el.classList.contains("active"),
	);
	assert.ok(isTutorActive, "La pestaña #tab-tutor debe tener clase .active");

	// Verificar que el Chat por defecto está montado
	const chatContainer = await page.$(".chat-container");
	assert.ok(chatContainer, "Debe renderizarse el contenedor de Chat");

	// Tomar captura de pantalla de modo Chat
	await page.screenshot({ path: "tests/screenshots/01_tutor_chat.png" });

	// 2. Cambiar a Modo Voz mediante la cápsula superior
	await page.click("#btn-switch-voice");
	await page.waitForTimeout(300);

	// Verificar que la vista de voz está activa
	const voiceView = await page.$(".voice-view");
	assert.ok(voiceView, "Debe renderizarse la vista .voice-view");

	const voiceOrb = await page.$("#voice-orb-btn");
	assert.ok(voiceOrb, "El orbe acústico (#voice-orb-btn) debe estar presente");

	const rubyDialogue = await page.$("#voice-ruby-container");
	assert.ok(rubyDialogue, "El contenedor de rubíes debe estar presente");

	// Tomar captura de pantalla de modo Voz
	await page.screenshot({ path: "tests/screenshots/02_tutor_voice.png" });

	// 3. Volver al Modo Chat desde la cápsula
	await page.click("#btn-mode-chat");
	await page.waitForTimeout(300);

	const chatReturned = await page.$(".chat-container");
	assert.ok(chatReturned, "Debe retornar a .chat-container al pulsar Chat");

	await page.close();
});

test("E2E: Navegación entre pestañas principales no arroja errores en consola", async () => {
	const page = await browser.newPage();
	const errors = [];
	page.on("pageerror", (err) => errors.push(err.message));

	await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

	const flow = ["tab-vocab", "tab-grammar", "tab-study", "tab-texts", "tab-tutor"];
	for (const tab of flow) {
		await page.click(`#${tab}`);
		await page.waitForTimeout(150);
	}

	assert.deepEqual(errors, [], `Errores de JavaScript en consola: ${errors.join("; ")}`);
	await page.close();
});

