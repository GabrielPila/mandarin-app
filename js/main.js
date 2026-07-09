// main.js — arranque de la aplicación
import { settings } from "./store.js";
import { T } from "./i18n.js";
import { $, applyTheme } from "./ui.js";
import { nav, current } from "./router.js";
// las vistas se registran a sí mismas al importarse:
import "./views/study.js";
import "./views/texts.js";
import "./views/vocab.js";
import "./views/grammar.js";
import { setLangChangeHandler } from "./views/settings.js";

const TABS = ["study", "texts", "vocab", "grammar", "settings"];

function renderTabs() {
	$("#tab-study .tab-label").textContent = T("study");
	$("#tab-texts .tab-label").textContent = T("texts");
	$("#tab-vocab .tab-label").textContent = T("vocab");
	$("#tab-grammar .tab-label").textContent = T("grammar");
	$("#tab-settings .tab-label").textContent = T("settings");
	nav(current);
}

// cambiar idioma re-renderiza todas las etiquetas
setLangChangeHandler(() => {
	renderTabs();
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

// tema + reacción al esquema del sistema
applyTheme();
window
	.matchMedia("(prefers-color-scheme: dark)")
	.addEventListener("change", () => {
		if (settings.theme === "system") applyTheme();
	});

renderTabs();
nav("study");

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
