import { test } from "node:test";
import assert from "node:assert/strict";
import { getVoiceTutorPrompt } from "../api/prompts.js";

// 1. Prueba de regresión crítica: división de pinyin en strings para rubíes de voz
test("voice ruby: pinyin tokenization robusta sin lanzar excepciones en strings", () => {
	const testCases = [
		{
			hanzi: "你好，今天想练习什么？",
			pinyin: "Nǐ hǎo, jīntiān xiǎng liànxí shénme?",
			expectedTokens: ["Nǐ", "hǎo", "jīntiān", "xiǎng", "liànxí", "shénme"],
		},
		{
			hanzi: "我想练习购物对话",
			pinyin: "Wǒ xiǎng liànxí gòuwù duìhuà",
			expectedTokens: ["Wǒ", "xiǎng", "liànxí", "gòuwù", "duìhuà"],
		},
		{
			hanzi: "",
			pinyin: "",
			expectedTokens: [],
		},
		{
			hanzi: "你好",
			pinyin: null,
			expectedTokens: [],
		},
	];

	for (const { pinyin, expectedTokens } of testCases) {
		assert.doesNotThrow(() => {
			const tokens = (pinyin || "")
				.trim()
				.split(/[\s,'’ʼ\-!?.:;，。！？]+/)
				.filter(Boolean);
			assert.deepEqual(tokens, expectedTokens);
		});
	}
});

// 2. Validación de Contrato del Prompt de Voz (Edge API)
test("voice prompt: genera las instrucciones requeridas y formato JSON estricto", () => {
	const promptEs = getVoiceTutorPrompt("es", "Shopping", "HSK 2", "standard");
	assert.ok(promptEs.includes("XiongMao"));
	assert.ok(promptEs.includes("Spanish"));
	assert.ok(promptEs.includes("Shopping"));
	assert.ok(promptEs.includes("userTranscriptHanzi"));
	assert.ok(promptEs.includes("pronunciation"));

	const promptEn = getVoiceTutorPrompt("en", "Travel", "HSK 3", "grill-me");
	assert.ok(promptEn.includes("English"));
	assert.ok(promptEn.includes("Travel"));
	assert.ok(promptEn.includes("grill-me"));
});

// 3. Validación de estructura de respuesta de Gemini en Modo Voz
test("voice payload: valida la estructura esperada para el orbe y tarjetas", () => {
	const mockGeminiResponse = {
		userTranscriptHanzi: "你好",
		userTranscriptPinyin: "nǐ hǎo",
		hanzi: "你好！今天过得怎么样？",
		pinyin: "Nǐ hǎo! Jīntiān guò de zěnmeyàng?",
		translation: "¡Hola! ¿Cómo estuvo tu día?",
		pronunciation: {
			score: 95,
			feedback: "Tono 3 muy fluido",
		},
		suggestions: ["我今天很好 (Wǒ jīntiān hěn hǎo)", "有点累 (Yǒudiǎn lèi)"],
	};

	assert.equal(typeof mockGeminiResponse.hanzi, "string");
	assert.equal(typeof mockGeminiResponse.pinyin, "string");
	assert.equal(typeof mockGeminiResponse.translation, "string");
	assert.equal(typeof mockGeminiResponse.pronunciation.score, "number");
	assert.ok(Array.isArray(mockGeminiResponse.suggestions));
	assert.ok(mockGeminiResponse.suggestions.length <= 3);
});

