import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

function createStaticServer(root = ".") {
	return http.createServer((req, res) => {
		// Mock local API si la prueba envía mensaje
		if (req.url === "/api/chat" && req.method === "POST") {
			let body = "";
			req.on("data", (chunk) => (body += chunk));
			req.on("end", () => {
				const parsed = JSON.parse(body || "{}");
				if (parsed.isVoice) {
					res.writeHead(200, { "Content-Type": "application/json" });
					return res.end(
						JSON.stringify({
							success: true,
							data: {
								hanzi: "你想买什么东西？",
								pinyin: "Nǐ xiǎng mǎi shénme dōngxi?",
								translation: "¿Qué cosas te gustaría comprar?",
								pronunciation: { score: 98, feedback: "Pronunciación excelente" },
								suggestions: ["我想买苹果 (Wǒ xiǎng mǎi píngguǒ)", "多少钱？ (Duōshao qián?)"],
							},
						}),
					);
				}

				// SSE Streaming mock para chat
				res.writeHead(200, {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
				});
				const chunk = {
					candidates: [
						{
							content: {
								parts: [
									{
										text: "你好！我[wǒ] 是[shì] 熊[xióng] 猫[māo]。\n- **我[wǒ]**: Yo\n- **是[shì]**: Ser\n¡Mucho gusto en practicar contigo!",
									},
								],
							},
						},
					],
				};
				res.write(`data: ${JSON.stringify(chunk)}\n\n`);
				res.write("data: [DONE]\n\n");
				return res.end();
			});
			return;
		}

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
		const mimes = {
			".html": "text/html",
			".js": "application/javascript",
			".css": "text/css",
			".json": "application/json",
			".png": "image/png",
		};
		res.writeHead(200, {
			"Content-Type": mimes[ext] || "application/octet-stream",
		});
		fs.createReadStream(filePath).pipe(res);
	});
}

async function runAudit() {
	const server = createStaticServer(".");
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const port = server.address().port;
	const baseUrl = `http://127.0.0.1:${port}`;

	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
	});

	const page = await browser.newPage({
		viewport: { width: 390, height: 844 },
	});

	const logs = [];
	const errors = [];
	page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
	page.on("pageerror", (err) => errors.push(err.message));

	await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
	await page.click("#tab-tutor");
	await page.waitForTimeout(300);

	// 1. Escribir y enviar mensaje
	await page.fill("#chat-input", "你好！¿Cómo se dice 'amigo'?");
	await page.screenshot({ path: "tests/screenshots/03_chat_typing.png" });

	await page.click("#chat-submit");
	await page.waitForTimeout(1000);
	await page.screenshot({ path: "tests/screenshots/04_chat_response.png" });

	// 2. Conmutar a Voz
	await page.click("#btn-switch-voice");
	await page.waitForTimeout(400);
	await page.screenshot({ path: "tests/screenshots/05_voice_loaded.png" });

	// 3. Probar clic en chip de tema
	const chip = await page.$(".voice-topic-chip");
	if (chip) {
		await chip.click();
		await page.waitForTimeout(800);
		await page.screenshot({ path: "tests/screenshots/06_voice_dialogue_updated.png" });
	}

	// 4. Probar clic en HANZI / PINYIN toggles
	await page.click("#toggle-pinyin");
	await page.waitForTimeout(200);
	await page.screenshot({ path: "tests/screenshots/07_voice_hide_pinyin.png" });

	console.log("AUDIT_COMPLETE");
	console.log("ERRORS_RECORDED:", JSON.stringify(errors));
	console.log("LOGS_COUNT:", logs.length);

	await browser.close();
	server.close();
}

runAudit().catch((err) => {
	console.error("AUDIT_FAILED:", err);
	process.exit(1);
});

