// views/tutor.js — Smart Tutor Chat Interface
import { $, setView } from "../ui.js";
import { register } from "../router.js";
import { settings } from "../store.js";
import { T } from "../i18n.js";

let chatHistory = [];

export function renderTutor() {
	setView(`
		<div class="chat-container">
			<div class="chat-history" id="chat-history"></div>
			<div class="typing-indicator hidden" id="typing-indicator">El tutor está escribiendo...</div>
			<form class="chat-input-area" id="chat-form">
				<input type="text" id="chat-input" placeholder="Escribe en español, inglés, pinyin o hanzi..." autocomplete="off">
				<button type="submit" id="chat-submit"><i data-lucide="send"></i></button>
			</form>
		</div>
	`);

	const historyEl = $("#chat-history");
	const inputEl = $("#chat-input");
	const formEl = $("#chat-form");
	const submitBtn = $("#chat-submit");
	const typingEl = $("#typing-indicator");

	function addMessage(role, content) {
		const msg = document.createElement("div");
		msg.className = "chat-msg " + role;
		// Simple text rendering, could be expanded to parse markdown
		msg.textContent = content;
		historyEl.appendChild(msg);
		historyEl.scrollTop = historyEl.scrollHeight;
	}

	// Render existing history
	if (chatHistory.length === 0) {
		chatHistory.push({
			role: "agent",
			content: "¡Hola! Soy tu tutor de mandarín. ¿En qué puedo ayudarte hoy?"
		});
	}
	chatHistory.forEach(m => addMessage(m.role, m.content));

	formEl.addEventListener("submit", async (e) => {
		e.preventDefault();
		const text = inputEl.value.trim();
		if (!text) return;

		inputEl.value = "";
		submitBtn.disabled = true;
		
		addMessage("user", text);
		chatHistory.push({ role: "user", content: text });
		
		typingEl.classList.remove("hidden");
		historyEl.scrollTop = historyEl.scrollHeight;

		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: chatHistory,
					provider: settings.aiProvider || "gemini",
					lang: settings.lang
				})
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Error de red");

			addMessage("agent", data.reply);
			chatHistory.push({ role: "agent", content: data.reply });
		} catch (err) {
			addMessage("agent", "❌ Error: " + err.message);
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
