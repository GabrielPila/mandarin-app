// js/voice-audio.js — Grabación, VAD (manos libres) y reproductor de audio
import { speak } from "./audio.js";

/**
 * Graba audio del micrófono y lo codifica en Base64.
 */
export class AudioRecorder {
	constructor() {
		this.stream = null;
		this.mediaRecorder = null;
		this.chunks = [];
	}

	async start() {
		this.chunks = [];
		this.stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				channelCount: 1,
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
			},
		});

		// Detectar el formato soportado preferido
		let mimeType = "audio/webm;codecs=opus";
		if (!MediaRecorder.isTypeSupported(mimeType)) {
			mimeType = MediaRecorder.isTypeSupported("audio/webm")
				? "audio/webm"
				: "audio/mp4";
		}

		this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
		this.mediaRecorder.ondataavailable = (e) => {
			if (e.data && e.data.size > 0) {
				this.chunks.push(e.data);
			}
		};

		this.mediaRecorder.start(100); // chunks cada 100ms
		return this.stream;
	}

	stop() {
		return new Promise((resolve, reject) => {
			if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
				return resolve({ base64: null, mimeType: null });
			}

			this.mediaRecorder.onstop = () => {
				const mimeType = this.mediaRecorder.mimeType || "audio/webm";
				const blob = new Blob(this.chunks, { type: mimeType });

				const reader = new FileReader();
				reader.onloadend = () => {
					const result = reader.result;
					const base64 = typeof result === "string" ? result.split(",")[1] : "";
					resolve({ base64, mimeType });
				};
				reader.onerror = reject;
				reader.readAsDataURL(blob);

				// Detener tracks del micrófono
				if (this.stream) {
					this.stream.getTracks().forEach((track) => track.stop());
					this.stream = null;
				}
			};

			this.mediaRecorder.stop();
		});
	}

	cancel() {
		if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
			this.mediaRecorder.stop();
		}
		if (this.stream) {
			this.stream.getTracks().forEach((track) => track.stop());
			this.stream = null;
		}
		this.chunks = [];
	}
}

/**
 * Detector de Actividad de Voz (VAD) para el modo manos libres tipo Pingo AI.
 * Analiza el volumen en tiempo real y detecta pausas de silencio.
 */
export class VoiceActivityDetector {
	constructor({
		stream,
		silenceDurationMs = 850,
		volumeThreshold = 0.025,
		minSpeechDurationMs = 400,
		onSpeechStart,
		onSpeechEnd,
		onVolumeChange,
	}) {
		this.stream = stream;
		this.silenceDurationMs = silenceDurationMs;
		this.volumeThreshold = volumeThreshold;
		this.minSpeechDurationMs = minSpeechDurationMs;

		this.onSpeechStart = onSpeechStart;
		this.onSpeechEnd = onSpeechEnd;
		this.onVolumeChange = onVolumeChange;

		this.audioContext = null;
		this.analyser = null;
		this.source = null;
		this.animFrameId = null;

		this.isSpeaking = false;
		this.speechStartTime = 0;
		this.lastSpeechTime = 0;
		this.isRunning = false;
	}

	start() {
		if (!this.stream) return;
		this.audioContext = new (
			window.AudioContext || window.webkitAudioContext
		)();
		this.analyser = this.audioContext.createAnalyser();
		this.analyser.fftSize = 512;
		this.analyser.smoothingTimeConstant = 0.2;

		this.source = this.audioContext.createMediaStreamSource(this.stream);
		this.source.connect(this.analyser);

		this.isRunning = true;
		this.isSpeaking = false;
		this.lastSpeechTime = 0;
		this.speechStartTime = 0;

		const buffer = new Uint8Array(this.analyser.frequencyBinCount);

		const checkAudio = () => {
			if (!this.isRunning) return;

			this.analyser.getByteFrequencyData(buffer);

			// Calcular volumen RMS promedio (0.0 a 1.0)
			let sum = 0;
			for (let i = 0; i < buffer.length; i++) {
				sum += buffer[i];
			}
			const avg = sum / buffer.length;
			const volume = Math.min(1.0, avg / 128.0);

			if (this.onVolumeChange) {
				this.onVolumeChange(volume);
			}

			const now = Date.now();

			if (volume > this.volumeThreshold) {
				if (!this.isSpeaking) {
					this.isSpeaking = true;
					this.speechStartTime = now;
					if (this.onSpeechStart) this.onSpeechStart();
				}
				this.lastSpeechTime = now;
			} else if (this.isSpeaking) {
				const silenceElapsed = now - this.lastSpeechTime;
				const totalSpeechDuration = now - this.speechStartTime;

				if (
					silenceElapsed >= this.silenceDurationMs &&
					totalSpeechDuration >= this.minSpeechDurationMs
				) {
					// Fin de frase detectado tras silencio continuo
					this.isSpeaking = false;
					if (this.onSpeechEnd) this.onSpeechEnd();
				}
			}

			this.animFrameId = requestAnimationFrame(checkAudio);
		};

		checkAudio();
	}

	stop() {
		this.isRunning = false;
		if (this.animFrameId) {
			cancelAnimationFrame(this.animFrameId);
			this.animFrameId = null;
		}
		if (this.source) {
			this.source.disconnect();
			this.source = null;
		}
		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}
	}
}

let activeAudioEl = null;

/**
 * Reproduce audio en Base64 con control de velocidad y fallback automático a Web Speech.
 */
export function playBase64Audio(
	base64Audio,
	speed = 1.0,
	fallbackText = "",
	onStart,
	onEnd,
) {
	if (activeAudioEl) {
		activeAudioEl.pause();
		activeAudioEl = null;
	}

	if (base64Audio) {
		return new Promise((resolve) => {
			const src = base64Audio.startsWith("data:")
				? base64Audio
				: `data:audio/mp3;base64,${base64Audio}`;

			const audio = new Audio(src);
			audio.playbackRate = speed;
			activeAudioEl = audio;

			if (onStart) onStart();

			audio.onended = () => {
				activeAudioEl = null;
				if (onEnd) onEnd();
				resolve();
			};

			audio.onerror = (e) => {
				console.warn("Fallo al reproducir audio base64, usando fallback:", e);
				activeAudioEl = null;
				// Fallback a speech synthesis nativo
				if (fallbackText) {
					speak(fallbackText, () => {
						if (onEnd) onEnd();
						resolve();
					});
				} else {
					if (onEnd) onEnd();
					resolve();
				}
			};

			audio.play().catch((err) => {
				console.warn("Error al llamar audio.play():", err);
				if (fallbackText) {
					speak(fallbackText, () => {
						if (onEnd) onEnd();
						resolve();
					});
				} else {
					if (onEnd) onEnd();
					resolve();
				}
			});
		});
	}

	// Si no hay base64, usar síntesis Web Speech directa
	return new Promise((resolve) => {
		if (!fallbackText) {
			if (onEnd) onEnd();
			return resolve();
		}
		if (onStart) onStart();
		speak(fallbackText, () => {
			if (onEnd) onEnd();
			resolve();
		});
	});
}

export function stopActiveAudio() {
	if (activeAudioEl) {
		activeAudioEl.pause();
		activeAudioEl = null;
	}
	if (window.speechSynthesis) {
		window.speechSynthesis.cancel();
	}
}
