// audio.js — síntesis de voz (TTS) y reproductor del lector línea a línea
import { settings } from "./store.js";

const MALE_NAMES = [
	"丁力波",
	"马大为",
	"宋华",
	"陆雨平",
	"大为",
	"力波",
	"王家明",
];

export function speak(text, onEnd, speaker) {
	if (!window.speechSynthesis) {
		if (onEnd) onEnd();
		return;
	}
	const u = new SpeechSynthesisUtterance(text);
	u.lang = "zh-CN";

	let isMale = false;
	if (speaker && MALE_NAMES.some((n) => speaker.includes(n))) isMale = true;

	u.rate = settings.voiceSpeed || 1.0;
	const voices = speechSynthesis.getVoices();

	// Tono por personaje (asumiendo voz base femenina)
	let pitch = 1.0;
	if (speaker) {
		if (speaker.includes("马大为")) pitch = 0.35;
		else if (speaker.includes("丁力波")) pitch = 0.55;
		else if (speaker.includes("宋华")) pitch = 0.45;
		else if (speaker.includes("王小云")) pitch = 1.3;
		else if (speaker.includes("林娜")) pitch = 1.1;
		else if (speaker.includes("陈老师")) pitch = 0.85;
		else if (isMale) pitch = 0.5;
	}

	const zhVoices = chineseVoices();
	if (settings.voiceURI) {
		const v = voices.find((v) => v.voiceURI === settings.voiceURI);
		if (v) u.voice = v;
		u.pitch = pitch;
	} else if (isMale) {
		// intenta una voz masculina nativa; si no, la mejor voz + pitch simulado
		const malePremium = zhVoices.find((v) =>
			/yunyang|yunxi|yunjian|kangkang|standard-[bc]/i.test(v.name),
		);
		if (malePremium) {
			u.voice = malePremium;
			if (speaker.includes("马大为")) u.pitch = 0.85;
			else if (speaker.includes("丁力波")) u.pitch = 1.05;
			else u.pitch = 0.95;
		} else {
			if (zhVoices[0]) u.voice = zhVoices[0];
			u.pitch = pitch;
		}
	} else {
		if (zhVoices[0]) u.voice = zhVoices[0]; // la mejor voz disponible (Google/mejorada primero)
		u.pitch = pitch;
	}

	if (onEnd) {
		u.onend = onEnd;
		u.onerror = onEnd;
	}
	speechSynthesis.cancel();
	speechSynthesis.speak(u);
}

// Todas las voces de mandarín disponibles, ordenadas por calidad (Google/mejoradas primero).
// Excluye cantonés (HK/yue). Se usa tanto para la selección automática como para el selector.
export function chineseVoices() {
	if (!window.speechSynthesis) return [];
	const voices = window.speechSynthesis.getVoices().filter((v) => {
		const lang = v.lang.toLowerCase();
		if (!lang.includes("zh")) return false;
		const n = v.name.toLowerCase();
		if (
			lang.includes("hk") ||
			n.includes("yue") ||
			n.includes("粤") ||
			n.includes("cantonese") ||
			/eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley/i.test(n)
		)
			return false;
		return true;
	});
	const rank = (v) => {
		const n = v.name.toLowerCase();
		let s = 0;
		if (n.includes("google")) s += 100; // Google (Chrome) primero
		if (/premium|enhanced|natural|neural|xiaoxiao|yunxi|yunyang/.test(n))
			s += 60; // voces mejoradas
		if (/tingting|meijia|sinji/.test(n)) s += 25; // buenas voces de Apple
		if (v.lang.toLowerCase() === "zh-cn") s += 15; // mandarín continental
		if (!v.localService) s += 8; // voces de red suelen ser mejores
		return -s;
	};
	return voices.sort((a, b) => rank(a) - rank(b));
}

// ---------- Reproductor del lector (líneas: {row, text, speaker}) ----------
export function createReaderPlayer() {
	let lines = [],
		index = 0,
		playing = false,
		onState = null;

	function stop() {
		if (window.speechSynthesis) window.speechSynthesis.cancel();
		playing = false;
		lines.forEach((l) => l.row.classList.remove("reading-active"));
		if (onState) onState(false);
	}
	function next() {
		if (!playing) return;
		if (index >= lines.length) {
			stop();
			return;
		}
		lines.forEach((l) => l.row.classList.remove("reading-active"));
		const cur = lines[index];
		cur.row.classList.add("reading-active");
		cur.row.scrollIntoView({ behavior: "smooth", block: "center" });
		speak(
			cur.text,
			() => {
				index++;
				if (playing) setTimeout(next, 600);
			},
			cur.speaker,
		);
	}
	function play(start = 0) {
		if (window.speechSynthesis) window.speechSynthesis.cancel();
		index = start;
		playing = true;
		if (onState) onState(true);
		next();
	}
	function toggle(start = 0) {
		if (playing && index === start) stop();
		else play(start);
	}
	return {
		setLines(l) {
			lines = l;
		},
		play,
		toggle,
		stop,
		isPlaying: () => playing,
		onStateChange(cb) {
			onState = cb;
		},
	};
}
