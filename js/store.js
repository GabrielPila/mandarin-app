// store.js — persistencia (localStorage) de estado SRS, ajustes y racha
const SRS_KEY = "mandarin.srs.v1";
const SETTINGS_KEY = "mandarin.settings.v1";
const MY_VOCAB_KEY = "mandarin.myVocabulary.v1";
const READING_HISTORY_KEY = "mandarin.readingHistory.v1";
let readingHistory = JSON.parse(localStorage.getItem(READING_HISTORY_KEY) || "{}");
const saveReadingHistory = () => localStorage.setItem(READING_HISTORY_KEY, JSON.stringify(readingHistory));
export const getReadingHistory = (id) => readingHistory[id] || {};
export function recordReadingOpened(id) {
	const now = new Date().toISOString(), previous = readingHistory[id] || {};
	readingHistory[id] = { ...previous, firstOpenedAt: previous.firstOpenedAt || now, lastOpenedAt: now, status: previous.status === "read" ? "read" : "in-progress" };
	saveReadingHistory();
}
export function markReadingComplete(id) {
	const now = new Date().toISOString(), previous = readingHistory[id] || {};
	readingHistory[id] = { ...previous, status: "read", lastCompletedAt: now, readCount: (previous.readCount || 0) + 1 };
	saveReadingHistory();
	return readingHistory[id];
}
export function toggleReadingFavorite(id) {
	const previous = readingHistory[id] || {};
	readingHistory[id] = { ...previous, favorite: !previous.favorite };
	saveReadingHistory();
	return readingHistory[id].favorite;
}
let myVocabulary = new Set(JSON.parse(localStorage.getItem(MY_VOCAB_KEY) || "[]"));
export const getMyVocabularyIds = () => new Set(myVocabulary);
export const hasMyVocabulary = (id) => myVocabulary.has(id);
export function toggleMyVocabulary(id) {
	if (myVocabulary.has(id)) myVocabulary.delete(id); else myVocabulary.add(id);
	localStorage.setItem(MY_VOCAB_KEY, JSON.stringify([...myVocabulary]));
	return myVocabulary.has(id);
}

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
	lang: "en",
	includeSup: false,
	newPerDay: 10,
	maxLesson: 20,
	textSize: "medium",
	theme: "system",
	history: {},
	voiceSpeed: 0.7,
	voiceURI: "",
	reverseCards: false,
	listeningMode: false,
	pairsBest: {},
	aiProvider: "gemini",
	customBlocks: [],
};
try {
	const local = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
	if (!local._v2) {
		local.voiceSpeed = 0.7;
		local._v2 = true;
	}
	Object.assign(settings, local);
	saveSettings();
} catch (e) {}
if (!settings.history) settings.history = {};
if (!settings.pairsBest) settings.pairsBest = {};
if (!settings.customBlocks) settings.customBlocks = [];

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
		myVocabulary: [...myVocabulary],
		readingHistory,
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
	if (Array.isArray(d.myVocabulary)) {
		myVocabulary = new Set(d.myVocabulary);
		localStorage.setItem(MY_VOCAB_KEY, JSON.stringify([...myVocabulary]));
	}
	if (d.readingHistory && typeof d.readingHistory === "object") {
		readingHistory = d.readingHistory;
		saveReadingHistory();
	}
}
