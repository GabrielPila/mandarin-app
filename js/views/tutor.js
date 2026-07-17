// views/tutor.js — Smart Tutor Chat Interface
import { $, setView } from "../ui.js";
import { register } from "../router.js";
import { settings } from "../store.js";
import { T } from "../i18n.js";

let chatHistory = [];

export function renderTutor() {
	setView(`
		<style>
			@keyframes wave {
				0%, 100% { transform: scaleY(0.5); }
				50% { transform: scaleY(1); }
			}
		</style>
		<div class="chat-container">
			<div class="chat-history" id="chat-history"></div>
			<div class="agent-row typing-row hidden" id="typing-indicator">
				<img src="./icons/panda-bot.png" class="agent-avatar">
				<div class="typing-indicator-bubble">
					<span class="typing-dot"></span>
					<span class="typing-dot"></span>
					<span class="typing-dot"></span>
				</div>
			</div>
			<div id="attachment-preview" class="hidden" style="padding: 8px; border-top: 1px solid var(--line); display: flex; gap: 8px; align-items: center; font-size: 13px; color: var(--primary);"></div>
			<form class="chat-input-area" id="chat-form">
				<button type="button" id="attach-img-btn" style="color: var(--muted);"><i data-lucide="image"></i></button>
				<input type="file" id="image-upload" accept="image/*" style="display: none;">
				<button type="button" id="record-audio-btn" style="color: var(--muted);"><i data-lucide="mic"></i></button>
				<input type="text" id="chat-input" placeholder="Escribe o envía una foto/audio..." autocomplete="off">
				<button type="submit" id="chat-submit"><i data-lucide="send"></i></button>
			</form>
		</div>
	`);

	const historyEl = $("#chat-history");
	const inputEl = $("#chat-input");
	const formEl = $("#chat-form");
	const submitBtn = $("#chat-submit");
	const typingEl = $("#typing-indicator");
	const attachImgBtn = $("#attach-img-btn");
	const imageUpload = $("#image-upload");
	const recordAudioBtn = $("#record-audio-btn");
	const attachmentPreview = $("#attachment-preview");

	let currentAttachment = null; // { mimeType, data }
	let mediaRecorder = null;
	let audioChunks = [];
	let recordingTimer = null;
	let recordingSeconds = 0;

	function formatTime(s) {
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${m}:${sec.toString().padStart(2, "0")}`;
	}

	function parseMarkdown(text) {
		if (!text) return "";
		let html = text
			.replace(/### (.*)/g, "<h3>$1</h3>")
			.replace(/## (.*)/g, "<h2>$1</h2>")
			.replace(/# (.*)/g, "<h1>$1</h1>")
			.replace(/^(?:[\*\-]\s)(.*)/gm, "<li>$1</li>")
			.replace(/([\u4e00-\u9fa5]+)\[([^\]]+)\]/g, "<ruby>$1<rt>$2</rt></ruby>")
			.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.*?)\*/g, "<em>$1</em>")
			.replace(/\n/g, "<br>");

		html = html.replace(/(<li>.*<\/li>(?:<br>)*)+/g, (match) => {
			return `<ul style="margin: 4px 0 4px 20px; padding: 0;">${match.replace(/<br>/g, "")}</ul>`;
		});
		return html;
	}

	function addMessage(role, contentOrParts) {
		const msg = document.createElement("div");
		msg.className = "chat-msg " + role;
		
		if (typeof contentOrParts === "string") {
			msg.innerHTML = parseMarkdown(contentOrParts);
		} else if (Array.isArray(contentOrParts)) {
			let html = "";
			for (const part of contentOrParts) {
				if (part.text) {
					html += parseMarkdown(part.text);
				} else if (part.inlineData) {
					const { mimeType, data } = part.inlineData;
					if (mimeType.startsWith("image/")) {
						html += `<img src="data:${mimeType};base64,${data}" style="max-width: 100%; border-radius: 8px; margin-top: 8px;" />`;
					} else if (mimeType.startsWith("audio/")) {
						html += `<audio controls src="data:${mimeType};base64,${data}" style="max-width: 100%; margin-top: 8px; outline: none;"></audio>`;
					}
				}
			}
			msg.innerHTML = html;
		}

		if (role === "agent") {
			const row = document.createElement("div");
			row.className = "agent-row";

			const avatar = document.createElement("img");
			avatar.src = "./icons/panda-bot.png";
			avatar.className = "agent-avatar";

			row.appendChild(avatar);
			row.appendChild(msg);

			historyEl.appendChild(row);
		} else {
			historyEl.appendChild(msg);
		}

		historyEl.scrollTop = historyEl.scrollHeight;
		return msg;
	}

	// Render existing history
	if (chatHistory.length === 0) {
		chatHistory.push({
			role: "agent",
			content:
				"¡Hola! Soy XiongMao (熊猫), tu tutor de mandarín. ¿En qué puedo ayudarte hoy?",
		});
	}
	chatHistory.forEach((m) => addMessage(m.role, m.parts ? m.parts : m.content));

	// Image upload handler
	attachImgBtn.addEventListener("click", () => imageUpload.click());
	imageUpload.addEventListener("change", (e) => {
		const file = e.target.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			const base64 = ev.target.result.split(",")[1];
			currentAttachment = { mimeType: file.type, data: base64 };
			attachmentPreview.innerHTML = `<i data-lucide="image" style="width: 16px; height: 16px;"></i> Imagen adjunta <button type="button" id="clear-attach" style="margin-left:auto; color:var(--danger); padding: 4px;"><i data-lucide="x" style="width: 16px; height: 16px;"></i></button>`;
			attachmentPreview.classList.remove("hidden");
			if (window.lucide) lucide.createIcons({ root: attachmentPreview });
			
			$("#clear-attach").addEventListener("click", () => {
				currentAttachment = null;
				attachmentPreview.classList.add("hidden");
				imageUpload.value = "";
			});
		};
		reader.readAsDataURL(file);
	});

	// Audio recording handler
	recordAudioBtn.addEventListener("click", async () => {
		if (mediaRecorder && mediaRecorder.state === "recording") {
			mediaRecorder.stop();
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorder = new MediaRecorder(stream);
			audioChunks = [];

			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) audioChunks.push(e.data);
			};

			mediaRecorder.onstop = () => {
				if (recordingTimer) clearInterval(recordingTimer);
				recordAudioBtn.innerHTML = '<i data-lucide="mic"></i>';
				recordAudioBtn.style.color = "var(--muted)";
				if (window.lucide) lucide.createIcons({ root: recordAudioBtn });

				const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
				const reader = new FileReader();
				reader.onload = (ev) => {
					const base64 = ev.target.result.split(",")[1];
					currentAttachment = { mimeType: "audio/webm", data: base64 };
					attachmentPreview.innerHTML = `<i data-lucide="mic" style="width: 16px; height: 16px;"></i> Audio adjunto <button type="button" id="clear-attach" style="margin-left:auto; color:var(--danger); padding: 4px;"><i data-lucide="x" style="width: 16px; height: 16px;"></i></button>`;
					attachmentPreview.classList.remove("hidden");
					if (window.lucide) lucide.createIcons({ root: attachmentPreview });

					$("#clear-attach").addEventListener("click", () => {
						currentAttachment = null;
						attachmentPreview.classList.add("hidden");
					});
				};
				reader.readAsDataURL(audioBlob);
				stream.getTracks().forEach(track => track.stop());
			};

			mediaRecorder.onstart = () => {
				recordingSeconds = 0;
				attachmentPreview.innerHTML = `
					<div style="display: flex; gap: 3px; align-items: center; height: 16px;">
						<div style="width: 3px; height: 100%; background: var(--danger); animation: wave 1s infinite ease-in-out; border-radius: 2px;"></div>
						<div style="width: 3px; height: 60%; background: var(--danger); animation: wave 1s infinite ease-in-out 0.2s; border-radius: 2px;"></div>
						<div style="width: 3px; height: 80%; background: var(--danger); animation: wave 1s infinite ease-in-out 0.4s; border-radius: 2px;"></div>
						<div style="width: 3px; height: 50%; background: var(--danger); animation: wave 1s infinite ease-in-out 0.1s; border-radius: 2px;"></div>
					</div>
					<span id="recording-timer" style="color: var(--danger); font-weight: 600; margin-left: 4px; font-variant-numeric: tabular-nums;">0:00</span>
					<span style="color: var(--danger); margin-left: 4px;">Grabando...</span>
				`;
				attachmentPreview.classList.remove("hidden");

				recordAudioBtn.innerHTML = '<i data-lucide="square"></i>';
				recordAudioBtn.style.color = "var(--danger)";
				if (window.lucide) lucide.createIcons({ root: recordAudioBtn });

				recordingTimer = setInterval(() => {
					recordingSeconds++;
					const timerEl = $("#recording-timer");
					if (timerEl) timerEl.textContent = formatTime(recordingSeconds);
				}, 1000);
			};

			mediaRecorder.start();
		} catch (err) {
			console.error("Error accessing mic:", err);
			alert("No se pudo acceder al micrófono. Por favor, verifica los permisos.");
		}
	});

	formEl.addEventListener("submit", async (e) => {
		e.preventDefault();
		const text = inputEl.value.trim();
		if (!text && !currentAttachment) return;

		inputEl.value = "";
		submitBtn.disabled = true;

		let messageData;
		if (currentAttachment) {
			const parts = [];
			if (text) parts.push({ text });
			parts.push({ inlineData: currentAttachment });
			messageData = { role: "user", parts };
			
			currentAttachment = null;
			attachmentPreview.classList.add("hidden");
			imageUpload.value = "";
		} else {
			messageData = { role: "user", content: text };
		}

		addMessage("user", messageData.parts ? messageData.parts : messageData.content);
		chatHistory.push(messageData);

		typingEl.classList.remove("hidden");
		historyEl.scrollTop = historyEl.scrollHeight;

		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: chatHistory,
					provider: settings.aiProvider || "gemini",
					lang: settings.lang,
				}),
			});

			if (!res.ok) {
				let errorData;
				try {
					errorData = await res.json();
				} catch (e) {
					throw new Error(`Error HTTP ${res.status}: La API no está disponible en este servidor local.`);
				}
				throw new Error(errorData.error || "Error de red");
			}

			typingEl.classList.add("hidden");
			const agentMsgEl = addMessage("agent", "");
			let fullResponse = "";

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");

				buffer = lines.pop() || "";

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const dataStr = line.slice(6);
						if (dataStr === "[DONE]") continue;
						try {
							const data = JSON.parse(dataStr);
							const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
							if (textChunk) {
								fullResponse += textChunk;
								agentMsgEl.innerHTML = parseMarkdown(fullResponse);
								historyEl.scrollTop = historyEl.scrollHeight;
							}
						} catch (e) {
							// Ignorar errores de parseo por chunks incompletos
						}
					}
				}
			}

			chatHistory.push({ role: "agent", content: fullResponse });
		} catch (err) {
			typingEl.classList.add("hidden");
			addMessage("agent", "❌ " + err.message);
			// Remove the failed user message from history so they can try again without breaking the strict user/model alternation required by Gemini
			if (
				chatHistory.length > 0 &&
				chatHistory[chatHistory.length - 1].role === "user"
			) {
				chatHistory.pop();
			}
			submitBtn.disabled = false;
		} finally {
			typingEl.classList.add("hidden");
			submitBtn.disabled = false;
			inputEl.focus();
		}
	});

	if (window.lucide) {
		lucide.createIcons({ root: $("#chat-form") });
	}
}

register("tutor", renderTutor);
