import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

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

const TABS = ["tab-texts", "tab-vocab", "tab-grammar", "tab-study", "tab-tutor"];

async function main() {
	const server = createStaticServer(".");
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const port = server.address().port;
	const baseUrl = `http://127.0.0.1:${port}`;

	const browser = await chromium.launch({ channel: "chrome", headless: true });
	const page = await browser.newPage({ viewport: { width: 375, height: 667 } }); // Medición en móvil compacto

	await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(400);

	const report = {
		inspectedAt: new Date().toISOString(),
		viewport: "375x667",
		smallTouchTargets: [],
		horizontalOverflows: [],
	};

	// 1. Verificar header y nav
	const headerOverflow = await page.evaluate(() => {
		const h = document.querySelector("header");
		return h ? h.scrollWidth > h.clientWidth : false;
	});
	if (headerOverflow) report.horizontalOverflows.push("header");

	// 2. Medir cada pestaña
	for (const tabId of TABS) {
		await page.click(`#${tabId}`);
		await page.waitForTimeout(300);

		// Si es Tutor, inspeccionar Chat y Voz
		const subViews = tabId === "tab-tutor" ? ["chat", "voice"] : ["default"];

		for (const sub of subViews) {
			if (sub === "voice") {
				const switchBtn = await page.$("#btn-switch-voice");
				if (switchBtn) {
					await switchBtn.click();
					await page.waitForTimeout(300);
				}
			}

			// Medir elementos interactivos
			const elements = await page.evaluate((viewName) => {
				const targets = [];
				const interactive = document.querySelectorAll(
					"button, a, input, select, [role='button'], .pop-tab-btn, .voice-tag-btn, .voice-topic-chip",
				);

				interactive.forEach((el) => {
					// Ignorar elementos ocultos
					const rect = el.getBoundingClientRect();
					if (rect.width === 0 || rect.height === 0) return;
					const style = window.getComputedStyle(el);
					if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return;

					const text = (el.textContent || el.getAttribute("aria-label") || el.id || el.className).trim().slice(0, 30);
					if (rect.width < 44 || rect.height < 44) {
						const isDenseHeaderOrList = el.closest("header") || el.closest(".text-list") || el.closest(".chat-input-area");
						targets.push({
							view: viewName,
							tag: el.tagName.toLowerCase(),
							id: el.id || null,
							class: el.className || null,
							text,
							width: Math.round(rect.width),
							height: Math.round(rect.height),
							suggestedFix: isDenseHeaderOrList
								? "Expand virtual hit-box (::after / transparent padding) — do NOT increase visual size"
								: "Increase interactive touch padding",
						});
					}
				});
				return targets;
			}, `${tabId}:${sub}`);

			report.smallTouchTargets.push(...elements);
		}
	}

	await browser.close();
	server.close();

	console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
	console.error("[UI Reviewer] Error:", err);
	process.exit(1);
});
