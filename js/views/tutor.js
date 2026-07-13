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
			<div class="agent-row typing-row hidden" id="typing-indicator">
				<img src="./icons/panda-bot.png" class="agent-avatar">
				<div class="typing-indicator-bubble">
					<span class="typing-dot"></span>
					<span class="typing-dot"></span>
					<span class="typing-dot"></span>
				</div>
			</div>
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

	function parseMarkdown(text) {
		if (!text) return "";
		let html = text
			.replace(/### (.*)/g, '<h3>$1</h3>')
			.replace(/## (.*)/g, '<h2>$1</h2>')
			.replace(/# (.*)/g, '<h1>$1</h1>')
			.replace(/^(?:[\*\-]\s)(.*)/gm, '<li>$1</li>')
			.replace(/([\u4e00-\u9fa5]+)\[([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>')
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			.replace(/\n/g, '<br>');

		html = html.replace(/(<li>.*<\/li>(?:<br>)*)+/g, match => {
			return `<ul style="margin: 4px 0 4px 20px; padding: 0;">${match.replace(/<br>/g, '')}</ul>`;
		});
		return html;
	}

	function addMessage(role, content) {
		const msg = document.createElement("div");
		msg.className = "chat-msg " + role;
		msg.innerHTML = parseMarkdown(content);

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
			content: "¡Hola! Soy XiongMao (熊猫), tu tutor de mandarín. ¿En qué puedo ayudarte hoy?"
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

			if (!res.ok) {
				const errorData = await res.json();
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
				const lines = buffer.split('\n');
				
				buffer = lines.pop() || "";
				
				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const dataStr = line.slice(6);
						if (dataStr === '[DONE]') continue;
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
			if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === "user") {
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
