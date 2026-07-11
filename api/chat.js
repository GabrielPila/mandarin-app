export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { messages, provider, lang } = req.body;
		
		if (!messages || messages.length === 0) {
			return res.status(400).json({ error: "Messages are required" });
		}

		const systemPrompt = `You are a collaborative, direct Mandarin tutor. Keep responses brief. 
Translate words or phrases the user provides to ${lang === "en" ? "English" : "Spanish"}. 
If applicable, briefly explain any grammatical concepts. Provide Pinyin and Hanzi for all Chinese words.`;

		let reply = "";

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
				contents: geminiMessages
			};

			const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});

			const data = await resp.json();
			if (data.error) throw new Error(data.error.message);
			reply = data.candidates[0].content.parts[0].text;

		return res.status(200).json({ reply });
		
	} catch (error) {
		console.error("Chat API Error:", error);
		return res.status(500).json({ error: error.message || "Internal server error" });
	}
}
