// js/views/voice.js — Vista Mandarin Voice (Live Conversational Voice Tutor 2A)
import { $, setView, renderTokens } from "../ui.js";
import { settings } from "../store.js";
import { T } from "../i18n.js";
import {
	AudioRecorder,
	VoiceActivityDetector,
	playBase64Audio,
	stopActiveAudio,
} from "../voice-audio.js";
import { renderTutor } from "./tutor.js";

let recorder = null;
let vad = null;
let isSessionActive = false;
let isMuted = false;
let currentTopic = "Daily Chat";
let mode = "standard"; // 'standard' | 'grill-me'

let state = {
	status: "idle", // 'idle' | 'listening' | 'thinking' | 'speaking'
	showHanzi: true,
	showPinyin: true,
	hanzi: "你好，今天想练习什么？",
	pinyin: "Nǐ hǎo, jīntiān xiǎng liànxí shénme?",
	translation: "¿Qué te gustaría practicar hoy?",
	pronunciation: { score: 95, feedback: "Tono 3 fluido" },
	suggestions: [
		"我想练习购物对话 (Wǒ xiǎng liànxí gòuwù duìhuà)",
		"去餐厅点餐 (Qù cāntīng diǎncān)",
		"自我介绍 (Zìwǒ jièshào)",
	],
	history: [],
};

export function renderVoice() {
	window.__refreshLanguage = renderVoice;

	setView(`
		<div class="voice-view">
			<!-- Barra Superior con Toggle de Modo -->
			<div class="voice-top-bar">
				<div class="voice-brand-title">
					<span class="zh-tag">中文</span>
					<span>Mandarin Voice</span>
				</div>
				<div class="voice-mode-capsule">
					<button class="voice-mode-btn active" id="btn-mode-voice" title="Modo llamada en vivo">
						<i data-lucide="mic" style="width:14px; height:14px;"></i> Voz
					</button>
					<button class="voice-mode-btn" id="btn-mode-chat" title="Modo chat clásico por texto">
						<i data-lucide="message-square" style="width:14px; height:14px;"></i> Chat
					</button>
				</div>
			</div>

			<!-- Tarjeta de Diálogo Centrada con Rubíes -->
			<div class="voice-card" id="voice-dialogue-card">
				<div class="ruby-container" id="voice-ruby-container"></div>
				<div class="voice-translation" id="voice-translation-txt">
					"${state.translation}"
				</div>
				<div class="voice-card-toggles">
					<button type="button" class="voice-tag-btn ${state.showHanzi ? "active" : ""}" id="toggle-hanzi">HANZI</button>
					<button type="button" class="voice-tag-btn ${state.showPinyin ? "active" : ""}" id="toggle-pinyin">PINYIN</button>
					<button type="button" class="voice-tag-btn" id="btn-replay-voice" title="Repetir audio">
						<i data-lucide="volume-2" style="width:13px; height:13px; vertical-align:middle;"></i>
					</button>
				</div>
			</div>

			<!-- Orbe Acústico Central con Ondas -->
			<div class="voice-orb-section">
				<div class="voice-orb-stage status-${state.status}" id="voice-orb-stage">
					<div class="orb-ripple"></div>
					<div class="orb-ripple"></div>
					<div class="orb-ripple"></div>
					<div class="voice-orb" id="voice-orb-btn" title="Toca para iniciar/pausar">
						<i data-lucide="mic" id="orb-icon" style="width:36px; height:36px; color:#ffffff;"></i>
					</div>
				</div>
				<!-- Píldora de Feedback Dinámico -->
				<div class="voice-feedback-pill" id="voice-feedback-pill">
					<span class="voice-status-dot"></span>
					<span id="voice-feedback-text">Pronunciación: ${state.pronunciation.score}% • ${state.pronunciation.feedback}</span>
				</div>
			</div>

			<!-- Chips de Temas / Respuestas Rápidas -->
			<div class="voice-topics-row" id="voice-topics-container"></div>
		</div>
	`);

	if (window.lucide) {
		lucide.createIcons({ root: $("#view") });
	}

	renderRubyDialogue();
	renderTopicChips();
	attachVoiceEvents();
}

/**
 * Renderiza los caracteres chinos con su pinyin alineado 1 a 1 centrado
 */
function renderRubyDialogue() {
	const container = $("#voice-ruby-container");
	const card = $("#voice-dialogue-card");
	const transEl = $("#voice-translation-txt");
	if (!container || !card || !transEl) return;

	if (state.showHanzi) card.classList.remove("hide-hanzi");
	else card.classList.add("hide-hanzi");

	if (state.showPinyin) card.classList.remove("hide-pinyin");
	else card.classList.add("hide-pinyin");

	transEl.textContent = `"${state.translation}"`;
	container.innerHTML = "";

	const mode = state.showPinyin ? "pinyin" : "none";
	container.appendChild(renderTokens(state.hanzi || "", mode));
}

/**
 * Renderiza los chips de temas y sugerencias rápidas
 */
function renderTopicChips() {
	const container = $("#voice-topics-container");
	if (!container) return;

	container.innerHTML = "";

	// Sugerencias de respuestas si existen
	if (state.suggestions && state.suggestions.length > 0) {
		state.suggestions.slice(0, 3).forEach((sug) => {
			const chip = document.createElement("button");
			chip.className = "voice-topic-chip";
			chip.textContent = sug;
			chip.addEventListener("click", () => {
				handleUserUtterance({ message: sug });
			});
			container.appendChild(chip);
		});
	} else {
		// Temas predeterminados
		const topics = ["Daily Chat", "Shopping", "Travel", "Restaurant"];
		topics.forEach((top) => {
			const chip = document.createElement("button");
			chip.className =
				"voice-topic-chip" + (currentTopic === top ? " active" : "");
			chip.textContent = top;
			chip.addEventListener("click", () => {
				currentTopic = top;
				renderTopicChips();
				handleUserUtterance({
					message: `Iniciemos la práctica sobre el tema ${top}`,
				});
			});
			container.appendChild(chip);
		});
	}
}

/**
 * Actualiza el estado visual del orbe y el pill de feedback
 */
function updateOrbStatus(newStatus, feedbackMsg = null) {
	state.status = newStatus;
	const stage = $("#voice-orb-stage");
	const feedbackText = $("#voice-feedback-text");
	const orbBtn = $("#voice-orb-btn");

	if (stage) {
		stage.className = `voice-orb-stage status-${newStatus}`;
	}

	if (feedbackText && feedbackMsg) {
		feedbackText.textContent = feedbackMsg;
	}

	if (orbBtn && window.lucide) {
		let iconName = "mic";
		if (newStatus === "thinking") {
			iconName = "loader-2";
		} else if (newStatus === "speaking") {
			iconName = "volume-2";
		}
		orbBtn.innerHTML = `<i data-lucide="${iconName}" id="orb-icon" style="width:36px; height:36px; color:#ffffff;"></i>`;
		lucide.createIcons({ root: orbBtn });
	}
}

/**
 * Inicia la sesión de escucha continua (Modo Live Hands-Free)
 */
async function startListeningLoop() {
	if (isMuted) return;

	try {
		updateOrbStatus("listening", "Escuchando tu voz...");
		isSessionActive = true;

		recorder = new AudioRecorder();
		const stream = await recorder.start();

		vad = new VoiceActivityDetector({
			stream,
			silenceDurationMs: 850,
			volumeThreshold: 0.025,
			onSpeechStart: () => {
				updateOrbStatus("listening", "Detectando voz...");
			},
			onSpeechEnd: async () => {
				// Pausa detectada -> auto-enviar a Gemini
				if (!isSessionActive) return;
				vad.stop();
				vad = null;

				updateOrbStatus("thinking", "Analizando pronunciación...");
				const { base64, mimeType } = await recorder.stop();
				recorder = null;

				if (base64) {
					await handleUserUtterance({
						audioData: base64,
						audioMimeType: mimeType,
					});
				} else {
					startListeningLoop();
				}
			},
		});

		await vad.start();
	} catch (err) {
		console.error("Error al acceder al micrófono:", err);
		updateOrbStatus("idle", "Permiso de micrófono requerido para el modo voz.");
		isSessionActive = false;
	}
}

/**
 * Detiene la escucha y la sesión de voz
 */
function stopListeningLoop() {
	isSessionActive = false;
	if (vad) {
		vad.stop();
		vad = null;
	}
	if (recorder) {
		recorder.cancel();
		recorder = null;
	}
	stopActiveAudio();
	updateOrbStatus("idle", `Sesión pausada • Toca el orbe para hablar`);
}

/**
 * Envía audio o texto a Gemini y procesa la respuesta en vivo
 */
async function handleUserUtterance({ audioData, audioMimeType, message }) {
	updateOrbStatus("thinking", "XiongMao está pensando...");

	try {
		const res = await fetch("/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				isVoice: true,
				audioData,
				audioMimeType,
				message,
				topic: currentTopic,
				mode,
				lang: settings.lang || "es",
				history: state.history,
			}),
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.error || "Error al conectar con el servidor.");
		}

		const json = await res.json();
		if (!json.success || !json.data) {
			throw new Error("Respuesta inválida del tutor.");
		}

		const data = json.data;

		// Actualizar estado con los datos recibidos
		state.hanzi = data.hanzi || state.hanzi;
		state.pinyin = data.pinyin || "";
		state.translation = data.translation || "";
		if (data.pronunciation) {
			state.pronunciation = data.pronunciation;
		}
		if (data.suggestions && data.suggestions.length > 0) {
			state.suggestions = data.suggestions;
		}

		// Guardar en historial
		if (data.userTranscriptHanzi) {
			state.history.push({
				role: "user",
				hanzi: data.userTranscriptHanzi,
			});
		}
		state.history.push({ role: "assistant", hanzi: state.hanzi });

		renderRubyDialogue();
		renderTopicChips();

		// Actualizar feedback
		const feedbackMsg = `Pronunciación: ${state.pronunciation.score || 95}% • ${state.pronunciation.feedback || "Fluido"}`;
		updateOrbStatus("speaking", feedbackMsg);

		// Reproducir audio y luego reactivar el loop de escucha automáticamente
		await playBase64Audio(
			data.audioBase64,
			settings.voiceSpeed || 1.0,
			state.hanzi,
			() => {
				updateOrbStatus("speaking", feedbackMsg);
			},
			() => {
				// Fin del audio: volver al modo escucha si la llamada sigue activa
				if (isSessionActive && !isMuted) {
					startListeningLoop();
				} else {
					updateOrbStatus("idle", feedbackMsg);
				}
			},
		);
	} catch (err) {
		console.error("Error en comunicación con tutor de voz:", err);
		updateOrbStatus("idle", `❌ ${err.message}`);
	}
}

/**
 * Conecta los eventos interactivos
 */
function attachVoiceEvents() {
	// Toggle a modo chat clásico
	$("#btn-mode-chat")?.addEventListener("click", () => {
		stopListeningLoop();
		renderTutor();
	});

	// Toggles Hanzi y Pinyin
	$("#toggle-hanzi")?.addEventListener("click", (e) => {
		state.showHanzi = !state.showHanzi;
		e.currentTarget.classList.toggle("active", state.showHanzi);
		renderRubyDialogue();
	});

	$("#toggle-pinyin")?.addEventListener("click", (e) => {
		state.showPinyin = !state.showPinyin;
		e.currentTarget.classList.toggle("active", state.showPinyin);
		renderRubyDialogue();
	});

	// Replay audio
	$("#btn-replay-voice")?.addEventListener("click", () => {
		playBase64Audio(null, settings.voiceSpeed || 1.0, state.hanzi);
	});

	// Tocar el orbe: alternar hablar / pausar
	const toggleVoiceSession = () => {
		if (isSessionActive) {
			stopListeningLoop();
		} else {
			startListeningLoop();
		}
	};
	$("#voice-orb-btn")?.addEventListener("click", (e) => {
		e.stopPropagation();
		toggleVoiceSession();
	});
	$("#voice-orb-stage")?.addEventListener("click", () => {
		toggleVoiceSession();
	});
}

export function openVoiceMode() {
	renderVoice();
}
