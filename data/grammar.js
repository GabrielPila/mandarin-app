export const GRAMMAR = [
	{
		id: "g-adj-pred",
		tags: ["hsk1", "npcr1"],
		title: "L1: Oraciones con predicado adjetival",
		desc: "En chino, los adjetivos actúan como verbos. No se usa el verbo 'ser' (是). Para unir un sujeto y un adjetivo, se suele usar 很 (muy) como enlace neutro.",
		examples: [
			{
				zh: "我很好。",
				es: "Estoy bien.",
				en: "I am fine.",
				s: "林娜",
			},
			{
				zh: "我很忙。",
				es: "Estoy muy ocupado.",
				en: "I am very busy.",
				s: "丁力波",
			},
		],
	},
	{
		id: "g-ma-question",
		tags: ["hsk1", "npcr2"],
		title: "L2: Preguntas de Sí/No con 吗 (ma)",
		desc: "Para transformar cualquier oración afirmativa en una pregunta de sí/no, simplemente se añade la partícula 吗 al final de la oración.",
		examples: [
			{
				zh: "你忙吗？",
				es: "¿Estás ocupado?",
				en: "Are you busy?",
				s: "丁力波",
			},
			{
				zh: "这是饺子吗？",
				es: "¿Esto es jiaozi?",
				en: "Are these dumplings?",
				s: "马大为",
			},
		],
	},
	{
		id: "g-question-pronouns",
		tags: ["hsk1", "npcr2", "npcr3"],
		title: "L2-L3: Pronombres interrogativos (哪, 什么, 谁)",
		desc: "En chino, el orden de las palabras en una pregunta es exactamente el mismo que en la respuesta. El pronombre interrogativo reemplaza la información que se desconoce.",
		examples: [
			{
				zh: "你是哪国人？",
				es: "¿De qué país eres?",
				en: "Which country are you from?",
				s: "陈老师",
			},
			{
				zh: "这是什么？",
				es: "¿Qué es esto?",
				en: "What is this?",
				s: "马大为",
			},
			{
				zh: "贝贝是谁？",
				es: "¿Quién es Beibei?",
				en: "Who is Beibei?",
				s: "王小云",
			},
		],
	},
	{
		id: "g-verb-shi",
		tags: ["hsk1", "npcr3"],
		title: "L3: Oraciones con el verbo 是 (shì)",
		desc: "El verbo 是 (ser) se utiliza exclusivamente para conectar dos sustantivos o pronombres (A es B). Nunca se usa con adjetivos.",
		examples: [
			{
				zh: "我爸爸是医生，妈妈是老师。",
				es: "Mi papá es médico y mi mamá es profesora.",
				en: "My dad is a doctor and my mom is a teacher.",
				s: "王小云",
			},
			{
				zh: "这是我女儿。",
				es: "Esta es mi hija.",
				en: "This is my daughter.",
				s: "陆雨平",
			},
		],
	},
	{
		id: "g-verb-you",
		tags: ["hsk1", "npcr3"],
		title: "L3: El verbo 有 (yǒu) y su negación",
		desc: "El verbo 有 (tener / haber) se niega siempre con 没 (méi) para formar 没有. Nunca se puede decir 不有.",
		examples: [
			{
				zh: "你们家有几口人？",
				es: "¿Cuántas personas hay en tu familia?",
				en: "How many people are in your family?",
				s: "林娜",
			},
			{
				zh: "我没有妹妹。",
				es: "No tengo hermana menor.",
				en: "I don't have a younger sister.",
				s: "林娜",
			},
		],
	},
	{
		id: "g-time-placement",
		tags: ["hsk1", "npcr4"],
		title: "L4: Posición de las palabras de tiempo",
		desc: "Las palabras que indican tiempo (hoy, mañana, a las 8:00) SIEMPRE se colocan al principio de la oración, antes o inmediatamente después del sujeto. ¡Nunca al final!",
		examples: [
			{
				zh: "你明天做什么？",
				es: "¿Qué haces mañana?",
				en: "What are you doing tomorrow?",
				s: "宋华",
			},
			{
				zh: "我明天上午八点半有语法课。",
				es: "Mañana a las 8:30 am tengo clase de gramática.",
				en: "Tomorrow at 8:30 am I have grammar class.",
				s: "林娜",
			},
		],
	},
	{
		id: "g-zai-location",
		tags: ["hsk1", "npcr5"],
		title: "L5: Ubicación con 在 (zài)",
		desc: "El verbo 在 significa 'estar situado en'. Se usa frecuentemente con 哪儿 (dónde) para preguntar por lugares.",
		examples: [
			{
				zh: "请问，林娜在吗？",
				es: "Disculpe, ¿está Lin Na?",
				en: "Excuse me, is Lin Na in?",
				s: "丁力波",
			},
			{
				zh: "今天她有钢琴课，不在家。",
				es: "Hoy tiene clase de piano, no está en casa.",
				en: "Today she has piano class, she's not home.",
				s: "陆雨平",
			},
		],
	},
	{
		id: "g-de-modifier",
		tags: ["hsk1", "npcr6"],
		title: "L6: Modificadores con 的 (de)",
		desc: "La partícula estructural 的 conecta un sustantivo con su modificador (posesión o descripción). Sin embargo, suele omitirse cuando se habla de familiares cercanos o grupos.",
		examples: [
			{
				zh: "贝贝是我的小狗。",
				es: "Beibei es mi perrito.",
				en: "Beibei is my puppy.",
				s: "林娜",
			},
			{
				zh: "我们班只有四个男生。",
				es: "Nuestra clase solo tiene cuatro chicos. (Se omite 的)",
				en: "Our class only has four boys.",
				s: "王小云",
			},
		],
	},
	{
		id: "g-measure-words",
		tags: ["hsk1", "npcr8"],
		title: "L8: Clasificadores (Measure Words)",
		desc: "En chino, no se puede unir un número directamente a un sustantivo. Siempre se requiere un clasificador en medio (Número + Clasificador + Sustantivo). El más común es 个.",
		examples: [
			{
				zh: "我们家一共有六口人。",
				es: "En mi familia somos en total seis personas. (口 para familia)",
				en: "There are six people in my family.",
				s: "林娜",
			},
			{
				zh: "这儿有两个汉堡包。",
				es: "Aquí hay dos hamburguesas. (个 genérico)",
				en: "There are two hamburgers here.",
				s: "马大为",
			},
		],
	},
	{
		id: "g-modal-verbs",
		tags: ["hsk1", "hsk2", "npcr9"],
		title: "L9: Verbos optativos (想, 要, 能, 会)",
		desc: "Los verbos auxiliares o optativos se colocan justo antes del verbo principal para expresar deseo, necesidad o capacidad.",
		examples: [
			{
				zh: "我要饺子，也要包子。",
				es: "Quiero jiaozi, y también quiero baozi.",
				en: "I want dumplings, and also baozi.",
				s: "马大为",
			},
			{
				zh: "我想喝茶。",
				es: "Me gustaría beber té.",
				en: "I'd like to drink tea.",
				s: "宋华",
			},
		],
	},
	{
		id: "g-zhengzai",
		tags: ["hsk2", "npcr11"],
		title: "L11: Acción en progreso 正在 (zhèngzài)",
		desc: "Colocar 正在 o 在 antes de un verbo indica que la acción está ocurriendo en este momento (gerundio). A menudo termina con la partícula 呢.",
		examples: [
			{
				zh: "大为正在看书。",
				es: "Dawei está leyendo.",
				en: "Dawei is reading.",
				s: "丁力波",
			},
			{
				zh: "我们正在上课呢。",
				es: "Estamos en clase ahora mismo.",
				en: "We are having class right now.",
				s: "陈老师",
			},
		],
	},
	{
		id: "g-verb-reduplication",
		tags: ["hsk2", "npcr12"],
		title: "L12: Reduplicación de verbos",
		desc: "Los verbos se reduplican (ej. 看看, 听听) para indicar que la acción es breve, casual o un intento relajado (echar un vistazo, escuchar un poco).",
		examples: [
			{
				zh: "你看看这件毛衣怎么样？",
				es: "Echa un vistazo, ¿qué te parece este suéter?",
				en: "Take a look, how is this sweater?",
				s: "林娜",
			},
			{
				zh: "我想休息休息。",
				es: "Me gustaría descansar un poco.",
				en: "I'd like to rest a bit.",
				s: "宋华",
			},
		],
	},
	{
		id: "g-le-completion",
		tags: ["hsk1", "hsk2", "npcr13"],
		title: "L13: Partícula 了 (le) - Finalización",
		desc: "La partícula 了 se coloca después de un verbo para indicar que una acción ya ha sido completada (aspecto perfectivo).",
		examples: [
			{
				zh: "我买了一些橘子。",
				es: "Compré algunas mandarinas.",
				en: "I bought some tangerines.",
				s: "宋华",
			},
			{
				zh: "昨天我看了一个电影。",
				es: "Ayer vi una película.",
				en: "Yesterday I watched a movie.",
				s: "马大为",
			},
		],
	},
	{
		id: "g-shide",
		tags: ["hsk3", "npcr14"],
		title: "L14: La estructura 是...的 (shì...de)",
		desc: "Se usa para enfatizar el tiempo, lugar o manera de una acción que sabemos que ya ocurrió. El detalle enfatizado va entre 是 y 的.",
		examples: [
			{
				zh: "我是在北京学习汉语的。",
				es: "Fue en Beijing donde estudié chino (énfasis en lugar).",
				en: "It was in Beijing that I studied Chinese.",
				s: "林娜",
			},
			{
				zh: "他是昨天来的。",
				es: "Fue ayer cuando él vino (énfasis en tiempo).",
				en: "It was yesterday that he came.",
				s: "马大为",
			},
		],
	},
	{
		id: "g-bi-comparison",
		tags: ["hsk2", "npcr15"],
		title: "L15: Oraciones comparativas con 比 (bǐ)",
		desc: "Para comparar dos cosas, se usa la estructura A + 比 (más que) + B + Adjetivo.",
		examples: [
			{
				zh: "今天比昨天冷。",
				es: "Hoy hace más frío que ayer.",
				en: "Today is colder than yesterday.",
				s: "林娜",
			},
			{
				zh: "他比我高。",
				es: "Él es más alto que yo.",
				en: "He is taller than me.",
				s: "马大为",
			},
		],
	},
	{
		id: "g-de-complement",
		tags: ["hsk3", "npcr16"],
		title: "L16: Complemento de grado con 得 (de)",
		desc: "Se usa para describir CÓMO se realiza una acción. La estructura es: Verbo + 得 + Adjetivo.",
		examples: [
			{
				zh: "他跑得很快。",
				es: "Él corre muy rápido.",
				en: "He runs very fast.",
				s: "宋华",
			},
			{
				zh: "你汉语说得真好。",
				es: "Hablas chino muy bien.",
				en: "You speak Chinese really well.",
				s: "营业员",
			},
		],
	},
	{
		id: "g-ba-sentence",
		tags: ["hsk3", "npcr17"],
		title: "L17: Oraciones con 把 (bǎ)",
		desc: "Se usa para enfatizar el resultado o la influencia de una acción sobre un objeto específico. Estructura: Sujeto + 把 + Objeto + Verbo + Resultado.",
		examples: [
			{
				zh: "请您把驾照交给我。",
				es: "Por favor entrégueme su licencia.",
				en: "Please hand me your license.",
				s: "营业员",
			},
			{
				zh: "我把书放在桌子上了。",
				es: "He puesto el libro sobre la mesa.",
				en: "I put the book on the table.",
				s: "丁力波",
			},
		],
	},
	{
		id: "g-direction-complement",
		tags: ["hsk3", "npcr18"],
		title: "L18: Complemento de dirección simple",
		desc: "Se añade 来 (venir, hacia el hablante) o 去 (ir, alejándose) después de un verbo para indicar la dirección de la acción.",
		examples: [
			{
				zh: "你快上来吧。",
				es: "Sube rápido (hacia donde estoy yo).",
				en: "Come up quickly.",
				s: "林娜",
			},
			{
				zh: "他下去了。",
				es: "Él bajó (alejándose de mí).",
				en: "He went down.",
				s: "丁力波",
			},
		],
	},
	{
		id: "g-bei-passive",
		tags: ["hsk3", "hsk4", "npcr19"],
		title: "L19: Oraciones pasivas con 被 (bèi)",
		desc: "Se utiliza para construir oraciones pasivas, generalmente para describir un evento desafortunado. Estructura: Receptor + 被 + Agente + Verbo + Complemento.",
		examples: [
			{
				zh: "我的钱包被小偷摸走了。",
				es: "Mi cartera fue robada por un ladrón.",
				en: "My wallet was stolen by a thief.",
				s: "林娜",
			},
			{
				zh: "那个苹果被我吃了。",
				es: "Esa manzana fue comida por mí.",
				en: "That apple was eaten by me.",
				s: "马大为",
			},
		],
	},
	{
		id: "g-time-duration",
		tags: ["hsk3", "npcr20"],
		title: "L20: Expresión de duración de tiempo",
		desc: "Para indicar cuánto tiempo dura una acción, se coloca la duración después del verbo (y su partícula 了).",
		examples: [
			{
				zh: "我学了一年汉语。",
				es: "Estudié chino durante un año.",
				en: "I studied Chinese for a year.",
				s: "丁力波",
			},
			{
				zh: "他在北京住了三个月。",
				es: "Él vivió en Beijing durante tres meses.",
				en: "He lived in Beijing for three months.",
				s: "王小云",
			},
		],
	},
];
