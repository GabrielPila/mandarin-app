// main.js — arranque de la aplicación
import { settings, saveSettings } from "./store.js";
import { T } from "./i18n.js";
import { $, applyTheme } from "./ui.js";
import { nav, current } from "./router.js";
// las vistas se registran a sí mismas al importarse:
import "./views/study.js";
import "./views/texts.js";
import "./views/vocab.js";
import "./views/grammar.js";
import "./views/tutor.js";
import "./views/settings.js";
const TABS = ["texts", "vocab", "grammar", "study", "tutor", "settings"];

function renderTabs() {
	$("#tab-study .tab-label").textContent = T("study");
	$("#tab-texts .tab-label").textContent = T("texts");
	$("#tab-vocab .tab-label").textContent = T("vocab");
	$("#tab-grammar .tab-label").textContent = T("grammar");
	$("#tab-tutor .tab-label").textContent = T("tutor");
	$("#tab-settings .tab-label").textContent = T("settings");
	nav(current);
}

const updateLangIcon = () => {
	const txt = settings.lang === "es" ? "ES" : "EN";
	$("#lang-toggle .lang-txt").textContent = txt;
};

$("#lang-toggle").addEventListener("click", () => {
	settings.lang = settings.lang === "es" ? "en" : "es";
	saveSettings();
	updateLangIcon();
	renderTabs(); // This naturally acts as the old LangChangeHandler
});

$("#ts-toggle").addEventListener("click", () => {
	const sizes = ["small", "medium", "large"];
	let idx = sizes.indexOf(settings.textSize);
	if (idx === -1) idx = 1;
	settings.textSize = sizes[(idx + 1) % sizes.length];
	saveSettings();
	applyTheme();
});

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
	const isDark = document.body.classList.contains("theme-dark") || (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
	const icon = isDark ? "sun" : "moon";
	$("#theme-toggle").innerHTML = `<i data-lucide="${icon}"></i>`;
	if (window.lucide) lucide.createIcons({ root: $("#theme-toggle") });
};

$("#theme-toggle").addEventListener("click", () => {
	const isDark = document.body.classList.contains("theme-dark") || (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
	settings.theme = isDark ? "light" : "dark";
	saveSettings();
	applyTheme();
	updateThemeIcon();
});

// tema + reacción al esquema del sistema
applyTheme();
updateThemeIcon();
updateLangIcon();
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
		// Disable caching during local development to prevent getting "stuck"
		navigator.serviceWorker.getRegistrations().then((registrations) => {
			for (const registration of registrations) {
				registration.unregister();
			}
		});
	} else {
		navigator.serviceWorker.register("sw.js");
	}
}
