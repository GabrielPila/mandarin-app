import { getTutorPrompt, getVoiceTutorPrompt } from "./prompts.js";

export const config = {
	runtime: "edge",
};

export default async function handler(req) {
	if (req.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
		});
	}

	try {
		const body = await req.json();
		const apiKey = process.env.GEMINI_API_KEY;
		if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");

		const MODEL_NAME = "gemini-3.1-flash-lite";

		// ==========================================
		// MODO VOZ: Mandarin Voice (JSON Estructurado)
		// ==========================================
		if (body.audioData || body.isVoice || body.mode === "grill-me") {
			const {
				audioData,
				audioMimeType = "audio/webm",
				message = "",
				topic = "Daily Chat",
				hskLevel = "HSK 2-3",
				mode = "standard",
				lang = "es",
				history = [],
			} = body;

			const voiceSystemPrompt = getVoiceTutorPrompt(
				lang,
				topic,
				hskLevel,
				mode,
			);

			const contents = [];

			// Añadir últimos turnos del historial para contexto
			if (Array.isArray(history) && history.length > 0) {
				const recent = history.slice(-6); // últimos 3 turnos
				for (const h of recent) {
					if (h.role === "user") {
						contents.push({
							role: "user",
							parts: [{ text: h.hanzi || h.text || h.content || "你好" }],
						});
					} else if (h.role === "assistant" || h.role === "model") {
						contents.push({
							role: "model",
							parts: [{ text: h.hanzi || h.content || "你好！" }],
						});
					}
				}
			}

			// Turno actual del usuario
			const currentParts = [];
			if (message && message.trim()) {
				currentParts.push({ text: message.trim() });
			}
			if (audioData) {
				currentParts.push({
					inlineData: {
						mimeType: audioMimeType,
						data: audioData,
					},
				});
			}

			if (currentParts.length === 0) {
				currentParts.push({
					text: "Hola, iniciemos la conversación de práctica sobre " + topic,
				});
			}

			contents.push({ role: "user", parts: currentParts });

			const payload = {
				systemInstruction: {
					parts: [{ text: voiceSystemPrompt }],
				},
				contents,
				generationConfig: {
					responseMimeType: "application/json",
					temperature: 0.3,
					maxOutputTokens: 600,
					topP: 0.95,
				},
			};

			const resp = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				},
			);

			if (!resp.ok) {
				const errText = await resp.text();
				throw new Error(errText);
			}

			const geminiData = await resp.json();
			const textResult = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

			if (!textResult) {
				throw new Error("Respuesta vacía de Gemini.");
			}

			let parsedJson;
			try {
				parsedJson = JSON.parse(textResult);
			} catch (parseErr) {
				parsedJson = {
					hanzi: textResult,
					pinyin: "",
					translation: "",
					pronunciation: { score: 90, feedback: "Fluido" },
					suggestions: [],
				};
			}

			return new Response(
				JSON.stringify({
					success: true,
					data: parsedJson,
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// ==========================================
		// MODO TEXTO: Chat Tradicional (SSE Streaming)
		// ==========================================
		const { messages, lang } = body;

		if (!messages || messages.length === 0) {
			return new Response(JSON.stringify({ error: "Messages are required" }), {
				status: 400,
			});
		}

		const systemPrompt = getTutorPrompt(lang);

		const geminiMessages = messages.map((m) => ({
			role: m.role === "agent" ? "model" : "user",
			parts: m.parts ? m.parts : [{ text: m.content }],
		}));

		const payload = {
			systemInstruction: {
				role: "system",
				parts: [{ text: systemPrompt }],
			},
			contents: geminiMessages,
			generationConfig: {
				temperature: 0.3,
				maxOutputTokens: 800,
				topP: 0.95,
				topK: 40,
			},
		};

		const resp = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:streamGenerateContent?alt=sse&key=${apiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			},
		);

		if (!resp.ok) {
			const errorText = await resp.text();
			throw new Error(errorText);
		}

		return new Response(resp.body, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Chat API Error:", error.message);
		return new Response(
			JSON.stringify({ error: error.message || "Internal server error" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}
