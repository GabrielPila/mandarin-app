import {
	segment,
	syllables,
	toneOf,
	TONE_MARK,
	isHan,
	DICT,
	normPinyin,
} from "./dict.js";
import { settings, hasMyVocabulary, toggleMyVocabulary } from "./store.js";
import { T, gloss, exGloss } from "./i18n.js";
import { speak } from "./audio.js";
import { usesOf } from "./concordance.js";

export const $ = (sel) => document.querySelector(sel);
export function setView(html) {
	const v = $("#view");
	v.innerHTML = html;
	v.scrollTop = 0;
	if (window.lucide) {
		lucide.createIcons({ root: v });
	}
	return v;
}

export function cardPool(ALL) {
	return ALL.filter((e) => !e._deleted && e.l <= settings.maxLesson);
}

// ---------- render de texto chino con ruby ----------
// mode: 'none' | 'pinyin' | 'tones'
export function renderTokens(
	zh,
	mode,
	explicitPinyin = "",
	localDictionary,
	contextualMeanings = [],
) {
	const frag = document.createDocumentFragment();
	const provided = explicitPinyin.trim()
		? explicitPinyin.trim().split(/\s+/)
		: null;
	let providedIndex = 0,
		hanOffset = 0;
	for (const tok of segment(zh, localDictionary)) {
		const tokenOffset = hanOffset;
		hanOffset += Array.from(tok.t).filter(isHan).length;
		if (tok.plain) {
			if (provided && Array.from(tok.t).some(isHan)) {
				const w = document.createElement("span");
				w.className = "w unknown-word";
				Array.from(tok.t).forEach((ch) => {
					const cs = document.createElement("span");
					cs.className = "ch";
					const ruby = document.createElement("span");
					ruby.className = "ruby";
					const py = isHan(ch) ? provided[providedIndex++] || "" : "";
					const tone = py ? TONE_MARK[toneOf(py)] : "";
					ruby.innerHTML = `<span class="py-txt">${py}</span><span class="tone-txt">${tone}</span>`;
					if (mode === "none") ruby.style.display = "none";
					else if (mode === "tones") ruby.classList.add("tones-only");
					const base = document.createElement("span");
					base.className = "base";
					base.textContent = ch;
					cs.appendChild(ruby);
					cs.appendChild(base);
					w.appendChild(cs);
				});
				w.addEventListener("click", (ev) => ev.stopPropagation());
				frag.appendChild(w);
				continue;
			}
			const sp = document.createElement("span");
			sp.className = "plain";
			const ruby = document.createElement("span");
			ruby.className = "ruby";
			ruby.innerHTML = "&nbsp;";
			if (mode === "none") ruby.style.display = "none";
			const base = document.createElement("span");
			base.className = "base";
			base.textContent = tok.t;
			sp.appendChild(ruby);
			sp.appendChild(base);
			frag.appendChild(sp);
			continue;
		}
		const e = tok.entries[0];
		const syls = provided
			? Array.from(tok.t).map(() => provided[providedIndex++] || "")
			: syllables(e);
		const w = document.createElement("span");
		w.className = "w";
		w.dataset.h = tok.t;
		Array.from(tok.t).forEach((ch, i) => {
			const cs = document.createElement("span");
			cs.className = "ch";
			const ruby = document.createElement("span");
			ruby.className = "ruby";
			const py = syls[i] || "";
			const tone = py ? TONE_MARK[toneOf(py)] : "";
			ruby.innerHTML = `<span class="py-txt">${py}</span><span class="tone-txt">${tone}</span>`;
			if (mode === "none") ruby.style.display = "none";
			else if (mode === "tones") ruby.classList.add("tones-only");
			const base = document.createElement("span");
			base.className = "base";
			base.textContent = ch;
			cs.appendChild(ruby);
			cs.appendChild(base);
			w.appendChild(cs);
		});
		w.addEventListener("click", (ev) => {
			ev.stopPropagation();
			const contextualGloss = contextualMeanings.find(
				(meaning) => meaning.at === tokenOffset && meaning.h === tok.t,
			);
			showPopup(tok, localDictionary, { contextualGloss });
		});
		frag.appendChild(w);
	}
	return frag;
}

// ---------- popup de palabra ----------
export function showPopup(tok, localDictionary, options = {}) {
	const {
		parentTok = null,
		parentContext = null,
		contextualGloss = null,
		initialId = null,
	} = options;
	const pop = $("#popup"),
		body = $("#popup-body");
	body.innerHTML = "";

	if (parentTok) {
		const back = document.createElement("button");
		back.className = "component-back";
		back.textContent = `← ${T("backToWord")} ${parentTok.t}`;
		back.addEventListener("click", (event) => {
			event.stopPropagation();
			showPopup(parentTok, localDictionary, { contextualGloss: parentContext });
		});
		body.appendChild(back);
	}

	const allEntries =
		tok.entries && tok.entries.length
			? tok.entries
			: (localDictionary?.get(tok.t) || DICT.get(tok.t) || []);

	const seenDefs = new Set();
	const uniqueEntries = allEntries.filter((e) => {
		const k = `${normPinyin(e.p)}|${e.pos || ""}|${gloss(e)}`;
		if (seenDefs.has(k)) return false;
		seenDefs.add(k);
		return true;
	});

	if (uniqueEntries.length === 0) {
		uniqueEntries.push({
			id: `custom_${tok.t}`,
			h: tok.t,
			p: "",
			es: "",
			en: "",
			custom: true,
		});
	}

	// 1. Header con Hanzi y botón de audio
	const headerDiv = document.createElement("div");
	headerDiv.className = "pop-header";

	const headRow = document.createElement("div");
	headRow.className = "pop-head";

	const hanziSpan = document.createElement("span");
	hanziSpan.className = "pop-h";
	hanziSpan.textContent = tok.t;
	headRow.appendChild(hanziSpan);

	const mainSpk = document.createElement("button");
	mainSpk.className = "spk-btn pop-main-spk";
	mainSpk.textContent = "🔊";
	mainSpk.title = "Play audio";
	mainSpk.addEventListener("click", () => speak(tok.t));
	headRow.appendChild(mainSpk);

	if (uniqueEntries.length === 1 && uniqueEntries[0].p) {
		const singlePinyin = document.createElement("span");
		singlePinyin.className = "pop-p";
		singlePinyin.textContent = uniqueEntries[0].p;
		headRow.appendChild(singlePinyin);
	}

	headerDiv.appendChild(headRow);

	const hwCont = document.createElement("div");
	hwCont.className = "hw-container";
	headerDiv.appendChild(hwCont);
	body.appendChild(headerDiv);

	// Animación de trazo única por carácter
	if (window.HanziWriter) {
		for (const ch of tok.t) {
			if (!isHan(ch)) continue;
			const box = document.createElement("div");
			box.className = "hw-box";
			hwCont.appendChild(box);
			const writer = window.HanziWriter.create(box, ch, {
				width: 50,
				height: 50,
				padding: 2,
				strokeColor: document.body.classList.contains("theme-dark")
					? "#e53935"
					: "#d32f2f",
				delayBetweenStrokes: 100,
				strokeAnimationSpeed: 1.5,
			});
			box.addEventListener("click", () => writer.animateCharacter());
		}
	}

	// 2. Componentes de palabras compuestas
	const characters = Array.from(tok.t).filter(isHan);
	if (characters.length > 1) {
		const components = document.createElement("div");
		components.className = "pop-components";
		components.innerHTML = `<div class="pop-ex-label">${T("wordComponents")}</div>`;
		const list = document.createElement("div");
		list.className = "pop-component-list";
		characters.forEach((character) => {
			const charEntries = localDictionary?.get(character) || DICT.get(character);
			if (!charEntries?.length) return;
			const component = charEntries[0];
			const button = document.createElement("button");
			button.className = "pop-component";
			button.innerHTML = `<span class="pop-component-h">${character}</span><span class="pop-component-p">${component.p}</span><span class="pop-component-g">${gloss(component)}</span>`;
			button.addEventListener("click", (event) => {
				event.stopPropagation();
				showPopup({ t: character, entries: charEntries }, localDictionary, {
					parentTok: tok,
					parentContext: contextualGloss,
				});
			});
			list.appendChild(button);
		});
		if (list.children.length) {
			components.appendChild(list);
			body.appendChild(components);
		}
	}

	// 3. Determinar pestaña activa
	let activeIdx = 0;
	if (initialId) {
		const found = uniqueEntries.findIndex((e) => e.id === initialId);
		if (found !== -1) activeIdx = found;
	} else if (contextualGloss) {
		const targetGloss =
			(settings.lang === "en" ? contextualGloss.en : contextualGloss.es) || "";
		const found = uniqueEntries.findIndex((e) => {
			const g = gloss(e);
			return (
				g &&
				targetGloss &&
				(g.toLowerCase().includes(targetGloss.toLowerCase()) ||
					targetGloss.toLowerCase().includes(g.toLowerCase()))
			);
		});
		if (found !== -1) activeIdx = found;
	}

	// 4. Barra de pestañas (cuando hay más de 1 significado)
	const panesWrapper = document.createElement("div");
	panesWrapper.className = "pop-panes";

	if (uniqueEntries.length > 1) {
		const tabsNav = document.createElement("div");
		tabsNav.className = "pop-tabs-nav";

		uniqueEntries.forEach((e, idx) => {
			const tabBtn = document.createElement("button");
			tabBtn.className = `pop-tab-btn ${idx === activeIdx ? "active" : ""}`;
			tabBtn.type = "button";

			const lessonLabel = e.custom
				? e.source || T("generalVocabulary")
				: `L${e.l === 0 ? "✦" : (e.l || "?")}`;
			const pinyinLabel = e.p ? `${e.p}` : "";
			const posLabel = e.pos ? ` · ${e.pos}` : "";

			tabBtn.innerHTML = `<span class="pop-tab-num">${idx + 1}</span><span class="pop-tab-p">${pinyinLabel}</span><span class="pop-tab-tag">${lessonLabel}${posLabel}</span>`;

			tabBtn.addEventListener("click", () => {
				tabsNav
					.querySelectorAll(".pop-tab-btn")
					.forEach((b) => b.classList.remove("active"));
				tabBtn.classList.add("active");
				panesWrapper.querySelectorAll(".pop-pane").forEach((p, pIdx) => {
					p.classList.toggle("active", pIdx === idx);
				});
			});
			tabsNav.appendChild(tabBtn);
		});
		body.appendChild(tabsNav);
	}

	// 5. Paneles de contenido para cada significado
	uniqueEntries.forEach((e, idx) => {
		const pane = document.createElement("div");
		pane.className = `pop-pane ${idx === activeIdx ? "active" : ""}`;

		const meta = e.custom
			? `${T("generalVocabulary")} · ${e.source || T("myReadings")}`
			: `${e.pos ? e.pos + " · " : ""}${T("lesson")} ${e.l}${e.sup ? " · " + T("supTag") : ""}`;

		const isContextMatch =
			contextualGloss &&
			(idx === activeIdx ||
				(settings.lang === "en" ? contextualGloss.en : contextualGloss.es) ===
					gloss(e));

		const meaningHere = isContextMatch
			? `<div class="pop-context"><div class="pop-ex-label">${T("meaningHere")}</div><div>${settings.lang === "en" ? contextualGloss.en : contextualGloss.es}</div></div>`
			: "";

		const pinyinRow =
			uniqueEntries.length > 1
				? `<div class="pop-entry-pinyin-row">
						<span class="pop-p">${e.p}</span>
						<button class="spk-btn pop-spk" title="Play audio">🔊</button>
						<span class="pop-meta">${meta}</span>
				   </div>`
				: `<div class="pop-meta">${meta}</div>`;

		pane.innerHTML = `
			${pinyinRow}
			${meaningHere}
			<div class="pop-g">${gloss(e)}</div>
		`;

		const save = document.createElement("button");
		save.className = "btn small pop-save-btn";
		const updateSave = () => {
			save.textContent = hasMyVocabulary(e.id)
				? `✓ ${T("inStudyList")}`
				: `＋ ${T("addStudyList")}`;
		};
		updateSave();
		save.addEventListener("click", () => {
			toggleMyVocabulary(e.id);
			updateSave();
		});
		pane.appendChild(save);

		const spkBtn = pane.querySelector(".pop-spk");
		if (spkBtn) {
			spkBtn.addEventListener("click", () => speak(e.h));
		}

		if (e.ex) {
			const exd = document.createElement("div");
			exd.className = "pop-ex";
			exd.innerHTML = `<div class="pop-ex-label">${T("example")}</div>`;
			const zh = document.createElement("div");
			zh.className = "pop-ex-zh";
			zh.appendChild(renderTokens(e.ex[0], "pinyin"));
			const spk = document.createElement("button");
			spk.className = "spk-btn";
			spk.textContent = "🔊";
			spk.addEventListener("click", (ev) => {
				ev.stopPropagation();
				speak(e.ex[0]);
			});
			zh.appendChild(spk);
			const tr = document.createElement("div");
			tr.className = "pop-ex-tr";
			tr.textContent = exGloss(e.ex);
			exd.appendChild(zh);
			exd.appendChild(tr);
			pane.appendChild(exd);
		}

		if (e.cols && e.cols.length) {
			const cold = document.createElement("div");
			cold.className = "pop-cols";
			cold.innerHTML = `<div class="pop-ex-label">${T("collocations")}</div>`;
			const list = document.createElement("div");
			list.className = "pop-cols-list";
			e.cols.forEach((col) => {
				const item = document.createElement("div");
				item.className = "pop-col-item";
				const zh = document.createElement("div");
				zh.className = "pop-col-zh";
				zh.appendChild(renderTokens(col, "pinyin"));
				const spk = document.createElement("button");
				spk.className = "spk-btn";
				spk.textContent = "🔊";
				spk.addEventListener("click", (ev) => {
					ev.stopPropagation();
					speak(col);
				});
				item.appendChild(zh);
				item.appendChild(spk);
				list.appendChild(item);
			});
			cold.appendChild(list);
			pane.appendChild(cold);
		}

		panesWrapper.appendChild(pane);
	});

	body.appendChild(panesWrapper);

	// 6. Concordancia: usos en los textos (renderizado una sola vez abajo)
	const uses = usesOf(tok.t, 5);
	if (uses.length) {
		const box = document.createElement("div");
		box.className = "pop-uses";
		box.innerHTML = `<div class="pop-ex-label">${T("usesInTexts")} (${uses.length})</div>`;
		uses.forEach((u) => {
			const row = document.createElement("div");
			row.className = "use-line";
			const zh = document.createElement("div");
			zh.className = "use-zh";
			zh.appendChild(renderTokens(u.zh, "none"));
			const spk = document.createElement("button");
			spk.className = "spk-btn";
			spk.textContent = "🔊";
			spk.addEventListener("click", (ev) => {
				ev.stopPropagation();
				speak(u.zh);
			});
			zh.appendChild(spk);
			const tr = document.createElement("div");
			tr.className = "use-tr";
			tr.textContent = settings.lang === "en" ? u.en : u.es;
			row.appendChild(zh);
			row.appendChild(tr);
			box.appendChild(row);
		});
		body.appendChild(box);
	}

	pop.classList.add("open");
	pop.querySelector(".popup-sheet")?.scrollTo({ top: 0 });
}

// popup de una entrada concreta (usado por vocab)
export function popupEntry(hanzi, initialEntry = null) {
	const initialId =
		typeof initialEntry === "string" ? initialEntry : initialEntry?.id;
	showPopup({ t: hanzi, entries: DICT.get(hanzi) }, null, { initialId });
}

// ---------- quiz de trazado ----------
export function startQuiz(word) {
	const modal = $("#quiz-modal"),
		hwCont = $("#quiz-hw"),
		status = $(".quiz-status");
	modal.classList.remove("hidden");
	hwCont.innerHTML = "";
	status.textContent = "Traza el carácter (" + word + ")";
	const chars = Array.from(word).filter((c) => isHan(c));
	if (!chars.length) return;
	function renderChar(idx) {
		hwCont.innerHTML = "";
		const box = document.createElement("div");
		box.className = "hw-quiz-box";
		hwCont.appendChild(box);
		const writer = window.HanziWriter.create(box, chars[idx], {
			width: 250,
			height: 250,
			padding: 10,
			showOutline: true,
			strokeAnimationSpeed: 2,
			delayBetweenStrokes: 50,
			strokeColor: document.body.classList.contains("theme-dark")
				? "#e53935"
				: "#d32f2f",
		});
		writer.quiz({
			onComplete: () => {
				if (idx + 1 < chars.length) {
					status.textContent = "¡Bien! Siguiente...";
					setTimeout(() => renderChar(idx + 1), 800);
				} else {
					status.textContent = "¡Excelente! Terminado 🎉";
					setTimeout(() => modal.classList.add("hidden"), 1500);
				}
			},
		});
	}
	renderChar(0);
}

// ---------- tema y tamaño de texto ----------
export function applyTheme() {
	document.body.className = document.body.className
		.replace(/text-(small|medium|large|xlarge|xxlarge)/, "")
		.trim();
	if (!settings.textSize) settings.textSize = "medium";
	document.body.classList.add("text-" + settings.textSize);
	document.body.classList.remove("theme-light", "theme-dark");
	if (!settings.theme) settings.theme = "system";
	if (settings.theme === "light") document.body.classList.add("theme-light");
	else if (settings.theme === "dark") document.body.classList.add("theme-dark");
}
