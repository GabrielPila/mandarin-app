// main.js — arranque de la aplicación
import { settings, saveSettings } from "./store.js";
import { T, UI } from "./i18n.js";
import { $, applyTheme } from "./ui.js";
import { nav, current } from "./router.js";
import { chineseVoices } from "./audio.js";
import { ALL } from "./dict.js";
import * as DATA from "../data/index.js";
// las vistas se registran a sí mismas al importarse:
import "./views/study.js";
import "./views/texts.js";
import "./views/vocab.js";
import "./views/grammar.js";
import "./views/tutor.js";
const TABS = ["texts", "vocab", "grammar", "study", "tutor"];

function renderTabs() {
	$("#tab-study .tab-label").textContent = T("study");
	$("#tab-texts .tab-label").textContent = T("texts");
	$("#tab-vocab .tab-label").textContent = T("vocab");
	$("#tab-grammar .tab-label").textContent = T("grammar");
	$("#tab-tutor .tab-label").textContent = T("tutor");
}

const updateLangIcon = () => {
	const txt = settings.lang === "es" ? "ES" : "EN";
	$("#lang-toggle .lang-txt").textContent = txt;
};

function languagePairs(from, to) {
	const pairs = new Map();
	const fragments = [];
	const add = (source, target) => {
		if (typeof source === "string" && typeof target === "string" && source && target && source !== target)
			pairs.set(source, target);
	};
	for (const key of Object.keys(UI[from])) {
		add(UI[from][key], UI[to][key]);
		if (UI[from][key]?.length >= 3 && UI[to][key]) fragments.push([UI[from][key], UI[to][key]]);
	}
	const seen = new Set();
	const visit = (value) => {
		if (!value || typeof value !== "object" || seen.has(value)) return;
		seen.add(value);
		if (Array.isArray(value)) {
			if (value.length === 3 && typeof value[1] === "string" && typeof value[2] === "string")
				add(from === "en" ? value[2] : value[1], to === "en" ? value[2] : value[1]);
			value.forEach(visit);
			return;
		}
		add(value[from], value[to]);
		add(value[`t${from}`], value[`t${to}`]);
		add(value[`i${from}`], value[`i${to}`]);
		Object.values(value).forEach(visit);
	};
	Object.values(DATA).forEach(visit);
	visit(ALL);
	visit(window.__languageData);
	return { pairs: [...pairs], fragments: fragments.sort((a, b) => b[0].length - a[0].length) };
}

function translateCurrentScreen(from, to) {
	const { pairs, fragments } = languagePairs(from, to);
	const exact = new Map(pairs);
	const translate = (text) => {
		if (!text) return text;
		const leading = text.match(/^\s*/)[0];
		const trailing = text.match(/\s*$/)[0];
		const end = trailing.length ? text.length - trailing.length : text.length;
		const core = text.slice(leading.length, end);
		if (exact.has(core)) return leading + exact.get(core) + trailing;
		let result = core;
		for (const [source, target] of fragments)
			if (result.includes(source)) result = result.split(source).join(target);
		return leading + result + trailing;
	};
	const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
	const nodes = [];
	while (walker.nextNode()) nodes.push(walker.currentNode);
	for (const node of nodes) {
		if (!node.parentElement?.closest("script,style")) node.nodeValue = translate(node.nodeValue);
	}
	document.querySelectorAll("[placeholder], [title], [aria-label]").forEach((element) => {
		for (const attr of ["placeholder", "title", "aria-label"])
			if (element.hasAttribute(attr)) element.setAttribute(attr, translate(element.getAttribute(attr)));
	});
}

$("#lang-toggle").addEventListener("click", () => {
	const previousLanguage = settings.lang;
	settings.lang = settings.lang === "es" ? "en" : "es";
	saveSettings();
	updateLangIcon();
	translateCurrentScreen(previousLanguage, settings.lang);
});

$("#ts-toggle").addEventListener("click", () => {
	const sizes = ["small", "medium", "large", "xlarge", "xxlarge"];
	let idx = sizes.indexOf(settings.textSize);
	if (idx === -1) idx = 1;
	settings.textSize = sizes[(idx + 1) % sizes.length];
	saveSettings();
	applyTheme();
});

const updateButton = $("#update-toggle");
function markUpdateReady(ready = true) {
	const dot = updateButton?.querySelector(".update-dot");
	if (dot) dot.hidden = !ready;
	if (updateButton) {
		const label = T(ready ? "updateReady" : "checkUpdates");
		updateButton.title = label;
		updateButton.setAttribute("aria-label", label);
	}
}

async function refreshInstalledApp() {
	if (!updateButton || updateButton.disabled) return;
	updateButton.disabled = true;
	updateButton.classList.add("checking");
	updateButton.title = T("updatingApp");
	try {
		if ("serviceWorker" in navigator) {
			const registrations = await navigator.serviceWorker.getRegistrations();
			await Promise.all(registrations.map((registration) => registration.unregister()));
		}
		if ("caches" in window) {
			const keys = await caches.keys();
			await Promise.all(keys.map((key) => caches.delete(key)));
		}
		location.reload();
	} catch (_error) {
		updateButton.disabled = false;
		updateButton.classList.remove("checking");
		markUpdateReady(false);
	}
}
updateButton?.addEventListener("click", refreshInstalledApp);
markUpdateReady(false);

TABS.forEach((t) => $("#tab-" + t).addEventListener("click", () => nav(t)));

// popup: cerrar al tocar fondo o botón
document.addEventListener("click", (e) => {
	if (e.target.id === "popup") $("#popup").classList.remove("open");
});
$("#popup-close").addEventListener("click", () =>
	$("#popup").classList.remove("open"),
);
$("#quiz-close").addEventListener("click", () =>
	$("#quiz-modal").classList.add("hidden"),
);

const updateThemeIcon = () => {
	const isDark =
		document.body.classList.contains("theme-dark") ||
		(settings.theme === "system" &&
			window.matchMedia("(prefers-color-scheme: dark)").matches);
	const icon = isDark ? "sun" : "moon";
	$("#theme-toggle").innerHTML = `<i data-lucide="${icon}"></i>`;
	if (window.lucide) lucide.createIcons({ root: $("#theme-toggle") });
};

$("#theme-toggle").addEventListener("click", () => {
	const isDark =
		document.body.classList.contains("theme-dark") ||
		(settings.theme === "system" &&
			window.matchMedia("(prefers-color-scheme: dark)").matches);
	settings.theme = isDark ? "light" : "dark";
	saveSettings();
	applyTheme();
	updateThemeIcon();
});

// tema + reacción al esquema del sistema
applyTheme();
updateThemeIcon();
updateLangIcon();

// audio settings
const initAudioSettings = () => {
	const vBtn = $("#voice-btn");
	const vMenu = $("#voice-menu");
	const spdBtn = $("#speed-btn");
	const spdMenu = $("#speed-menu");
	if (!vBtn || !spdBtn) return;

	const speeds = [1.5, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4];
	const renderSpeed = () => {
		spdBtn.textContent = (settings.voiceSpeed || 1.0).toFixed(1) + "x";
		spdMenu.innerHTML = speeds
			.map(
				(s) =>
					`<button style="padding:8px 12px; text-align:right; border-radius:8px; font-weight:600; color:${settings.voiceSpeed === s ? "var(--primary)" : "var(--ink)"}; background:${settings.voiceSpeed === s ? "rgba(128,128,128,0.1)" : "transparent"}; border:none; cursor:pointer;" data-val="${s}">${s.toFixed(1)}x</button>`,
			)
			.join("");
		spdMenu.querySelectorAll("button").forEach((b) =>
			b.addEventListener("click", (e) => {
				settings.voiceSpeed = +e.target.dataset.val;
				saveSettings();
				renderSpeed();
				spdMenu.classList.add("hidden");
			}),
		);
	};
	renderSpeed();

	const pop = () => {
		const voices = chineseVoices();
		let html = `<button style="padding:8px 12px; text-align:left; border-radius:8px; font-size:13px; color:${!settings.voiceURI ? "var(--primary)" : "var(--ink)"}; background:${!settings.voiceURI ? "rgba(128,128,128,0.1)" : "transparent"}; border:none; cursor:pointer;" data-val="">${T("autoVoice")}</button>`;
		let currName = T("autoVoice");

		html += [...voices]
			.reverse()
			.map((v) => {
				let source = "Local";
				const uri = (v.voiceURI || "").toLowerCase(),
					nm = v.name.toLowerCase();
				if (nm.includes("google")) source = "Google";
				else if (
					uri.includes("microsoft") ||
					nm.includes("xiaoxiao") ||
					nm.includes("yunxi") ||
					nm.includes("yunyang")
				)
					source = "Microsoft";
				else if (uri.includes("apple") || nm.includes("tingting"))
					source = "Apple";
				else if (!v.localService) source = "Cloud";

				const cleanName = v.name
					.replace(/\s*\(Chinese[\s\S]*$/i, "")
					.replace(/\s*（[^）]*）\s*$/, "")
					.trim();
				if (settings.voiceURI === v.voiceURI) currName = cleanName;

				return `<button style="padding:8px 12px; text-align:left; border-radius:8px; font-size:13px; color:${settings.voiceURI === v.voiceURI ? "var(--primary)" : "var(--ink)"}; background:${settings.voiceURI === v.voiceURI ? "rgba(128,128,128,0.1)" : "transparent"}; border:none; cursor:pointer;" data-val="${v.voiceURI}">${cleanName} <span style="opacity:0.5; font-size:11px;">(${source})</span></button>`;
			})
			.join("");

		vBtn.textContent = currName;
		vMenu.innerHTML = html;
		vMenu.querySelectorAll("button").forEach((b) =>
			b.addEventListener("click", (e) => {
				settings.voiceURI = e.currentTarget.dataset.val;
				saveSettings();
				pop();
				vMenu.classList.add("hidden");
			}),
		);
	};
	pop();
	if (
		window.speechSynthesis &&
		window.speechSynthesis.onvoiceschanged !== undefined
	)
		window.speechSynthesis.onvoiceschanged = pop;

	spdBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		spdMenu.classList.toggle("hidden");
		vMenu.classList.add("hidden");
	});
	vBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		vMenu.classList.toggle("hidden");
		spdMenu.classList.add("hidden");
	});
	document.addEventListener("click", () => {
		spdMenu.classList.add("hidden");
		vMenu.classList.add("hidden");
	});
};
initAudioSettings();
window
	.matchMedia("(prefers-color-scheme: dark)")
	.addEventListener("change", () => {
		if (settings.theme === "system") {
			applyTheme();
			updateThemeIcon();
		}
	});

renderTabs();
nav("texts");
if (window.lucide) {
	lucide.createIcons();
}

if ("serviceWorker" in navigator) {
	if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
		// Local previews must always use the files currently on disk. Remove both
		// registrations and their caches; an old controlling worker otherwise keeps
		// serving stale navigation code until the tab is closed.
		Promise.all([
			navigator.serviceWorker.getRegistrations().then((registrations) =>
				Promise.all(registrations.map((registration) => registration.unregister())),
			),
			"caches" in window
				? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
				: Promise.resolve(),
		]).then(() => {
			if (navigator.serviceWorker.controller && !sessionStorage.getItem("local-cache-reset")) {
				sessionStorage.setItem("local-cache-reset", "1");
				location.reload();
			}
		});
	} else {
		navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((registration) => {
			if (registration.waiting) markUpdateReady(true);
			registration.addEventListener("updatefound", () => {
				const worker = registration.installing;
				worker?.addEventListener("statechange", () => {
					if (worker.state === "installed" && navigator.serviceWorker.controller)
						markUpdateReady(true);
				});
			});
			registration.update().catch(() => {});
		});
	}
}
