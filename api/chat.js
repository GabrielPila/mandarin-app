import { getTutorPrompt } from './prompts.js';

export const config = {
	runtime: 'edge',
};

export default async function handler(req) {
	if (req.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
	}

	try {
		const { messages, provider, lang } = await req.json();

		if (!messages || messages.length === 0) {
			return new Response(JSON.stringify({ error: "Messages are required" }), { status: 400 });
		}

		const systemPrompt = getTutorPrompt(lang);

		const apiKey = process.env.GEMINI_API_KEY;
		if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");

		// Format for Gemini API
		const geminiMessages = messages.map(m => ({
			role: m.role === "agent" ? "model" : "user",
			parts: [{ text: m.content }]
		}));

		// Inject system prompt as first message if possible or in contents
		const payload = {
			systemInstruction: {
				role: "system",
				parts: [{ text: systemPrompt }]
			},
			contents: geminiMessages,
			generationConfig: {
				temperature: 0.3, // Lowered for high accuracy in grammar and translations
				maxOutputTokens: 800, // Caps the maximum length of the response
				topP: 0.95,
				topK: 40
			}
		};

		// You can easily swap this out for other Gemini models
		const MODEL_NAME = "gemini-3.1-flash-lite";

		const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:streamGenerateContent?alt=sse&key=${apiKey}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});

		if (!resp.ok) {
			const errorText = await resp.text();
			throw new Error(errorText);
		}

		// Return the SSE stream directly to the client
		return new Response(resp.body, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				"Connection": "keep-alive"
			}
		});

	} catch (error) {
		console.error("Chat API Error:", error.message);
		return new Response(JSON.stringify({ error: error.message || "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
	}
}
