// store.js — persistencia (localStorage) de estado SRS, ajustes y racha
const SRS_KEY = "mandarin.srs.v1";
const SETTINGS_KEY = "mandarin.settings.v1";

let state = {};
try {
	state = JSON.parse(localStorage.getItem(SRS_KEY) || "{}");
} catch (e) {
	state = {};
}

export function getState() {
	return state;
}
export function getCard(id) {
	return state[id];
}
export function putCard(id, card) {
	state[id] = card;
	saveState();
}
export function saveState() {
	localStorage.setItem(SRS_KEY, JSON.stringify(state));
}
export function resetAll() {
	state = {};
	saveState();
}

export const settings = {
	lang: "es",
	includeSup: false,
	newPerDay: 10,
	maxLesson: 20,
	textSize: "medium",
	theme: "system",
	history: {},
	voiceSpeed: 1.0,
	voiceURI: "",
	reverseCards: false,
	pairsBest: {},
};
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"),
	);
} catch (e) {}
if (!settings.history) settings.history = {};
if (!settings.pairsBest) settings.pairsBest = {};

export function saveSettings() {
	localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function recordActivity() {
	const today = new Date().toISOString().slice(0, 10);
	settings.history[today] = (settings.history[today] || 0) + 1;
	saveSettings();
}

export function exportData() {
	return JSON.stringify({
		v: 1,
		exported: new Date().toISOString(),
		srs: state,
		settings,
	});
}
export function importData(json) {
	const d = JSON.parse(json);
	if (!d || typeof d.srs !== "object") throw new Error("formato inválido");
	state = d.srs;
	saveState();
	if (d.settings) {
		Object.assign(settings, d.settings);
		saveSettings();
	}
}
