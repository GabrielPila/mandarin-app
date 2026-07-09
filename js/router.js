// router.js — despacho de pestañas sin dependencias circulares entre vistas
const routes = {};
export let current = "study";

export function register(tab, fn) {
	routes[tab] = fn;
}

export function nav(tab) {
	if (window.__stopReader) window.__stopReader();
	current = tab;
	["study", "texts", "vocab", "grammar", "settings"].forEach((t) => {
		const el = document.querySelector("#tab-" + t);
		if (el) el.classList.toggle("active", t === tab);
	});
	if (routes[tab]) routes[tab]();
}
