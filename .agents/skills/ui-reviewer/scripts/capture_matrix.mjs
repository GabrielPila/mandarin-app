import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const VIEWPORTS = [
	{ name: "375_iphone_se", width: 375, height: 667 },
	{ name: "390_iphone_14", width: 390, height: 844 },
	{ name: "768_tablet", width: 768, height: 1024 },
	{ name: "1280_desktop", width: 1280, height: 800 },
];

const TABS = [
	{ id: "tab-texts", name: "01_reading" },
	{ id: "tab-vocab", name: "02_vocabulary" },
	{ id: "tab-grammar", name: "03_grammar" },
	{ id: "tab-study", name: "04_practice" },
	{ id: "tab-tutor", name: "05_tutor_chat" },
];

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

async function main() {
	const outDir = path.resolve("tests/screenshots/audit");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	const server = createStaticServer(".");
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const port = server.address().port;
	const baseUrl = `http://127.0.0.1:${port}`;

	console.log(`[UI Reviewer] Servidor efímero listo en ${baseUrl}`);
	const browser = await chromium.launch({ channel: "chrome", headless: true });

	for (const vp of VIEWPORTS) {
		console.log(`[UI Reviewer] Capturando viewport ${vp.name} (${vp.width}x${vp.height})...`);
		const page = await browser.newPage({
			viewport: { width: vp.width, height: vp.height },
		});

		await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(400);

		for (const tab of TABS) {
			await page.click(`#${tab.id}`);
			await page.waitForTimeout(350);

			const filename = `${vp.name}_${tab.name}.png`;
			await page.screenshot({ path: path.join(outDir, filename) });

			// Si es la pestaña Tutor, capturar también el Modo Voz
			if (tab.id === "tab-tutor") {
				const switchBtn = await page.$("#btn-switch-voice");
				if (switchBtn) {
					await switchBtn.click();
					await page.waitForTimeout(350);
					const voiceFilename = `${vp.name}_06_tutor_voice.png`;
					await page.screenshot({ path: path.join(outDir, voiceFilename) });

					// Regresar a Chat
					const chatBtn = await page.$("#btn-mode-chat");
					if (chatBtn) await chatBtn.click();
					await page.waitForTimeout(200);
				}
			}
		}

		await page.close();
	}

	await browser.close();
	server.close();
	console.log(`[UI Reviewer] Matriz de capturas completada en ${outDir}`);
}

main().catch((err) => {
	console.error("[UI Reviewer] Error:", err);
	process.exit(1);
});
