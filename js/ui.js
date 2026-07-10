// ui.js — primitivas de interfaz compartidas por las vistas
import { segment, syllables, toneOf, TONE_MARK, isHan, DICT } from "./dict.js";
import { settings } from "./store.js";
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

// Conjunto de tarjetas activas según ajustes
export function cardPool(ALL) {
	return ALL.filter(
		(e) =>
			!e._deleted &&
			e.l <= settings.maxLesson &&
			(settings.includeSup || !e.sup),
	);
}

// ---------- render de texto chino con ruby ----------
// mode: 'none' | 'pinyin' | 'tones'
export function renderTokens(zh, mode) {
	const frag = document.createDocumentFragment();
	for (const tok of segment(zh)) {
		if (tok.plain) {
			const sp = document.createElement("span");
			sp.className = "plain";
			const ruby = document.createElement("span");
			ruby.className = "ruby";
			ruby.innerHTML = "&nbsp;";
			ruby.style.visibility = "hidden";
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
		const syls = syllables(e);
		const w = document.createElement("span");
		w.className = "w";
		w.dataset.h = tok.t;
		Array.from(tok.t).forEach((ch, i) => {
			const cs = document.createElement("span");
			cs.className = "ch";
			const ruby = document.createElement("span");
			ruby.className = "ruby";
			if (mode === "pinyin") ruby.textContent = syls[i] || " ";
			else if (mode === "tones") {
				ruby.textContent = syls[i] ? TONE_MARK[toneOf(syls[i])] : " ";
				ruby.classList.add("tones-only");
			} else ruby.textContent = "";
			if (mode === "none") ruby.style.display = "none";
			const base = document.createElement("span");
			base.className = "base";
			base.textContent = ch;
			cs.appendChild(ruby);
			cs.appendChild(base);
			w.appendChild(cs);
		});
		w.addEventListener("click", (ev) => {
			ev.stopPropagation();
			showPopup(tok);
		});
		frag.appendChild(w);
	}
	return frag;
}

// ---------- popup de palabra ----------
export function showPopup(tok) {
	const pop = $("#popup"),
		body = $("#popup-body");
	body.innerHTML = "";
	tok.entries.forEach((e, idx) => {
		const div = document.createElement("div");
		div.className = "pop-entry";
		const meta = `${e.pos ? e.pos + " · " : ""}${T("lesson")} ${e.l}${e.sup ? " · " + T("supTag") : ""}`;
		div.innerHTML = `<div class="pop-head"><span class="pop-h">${e.h}</span>
      <button class="spk-btn pop-spk">🔊</button>
      <span class="pop-p">${e.p}</span></div>
      <div class="hw-container"></div>
      <div class="pop-meta">${meta}</div>
      <div class="pop-g">${gloss(e)}</div>`;
		div.querySelector(".pop-spk").addEventListener("click", () => speak(e.h));
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
			div.appendChild(exd);
		}
		// concordancia: usos en los textos
		const uses = usesOf(e.h, 5);
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
			div.appendChild(box);
		}
		body.appendChild(div);
		// animaciones de trazo
		if (window.HanziWriter) {
			const hwCont = div.querySelector(".hw-container");
			for (const ch of e.h) {
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
	});
	pop.classList.add("open");
}

// popup de una entrada concreta (usado por vocab)
export function popupEntry(hanzi) {
	showPopup({ t: hanzi, entries: DICT.get(hanzi) });
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
		.replace(/text-(small|medium|large)/, "")
		.trim();
	if (!settings.textSize) settings.textSize = "medium";
	document.body.classList.add("text-" + settings.textSize);
	document.body.classList.remove("theme-light", "theme-dark");
	if (!settings.theme) settings.theme = "system";
	if (settings.theme === "light") document.body.classList.add("theme-light");
	else if (settings.theme === "dark") document.body.classList.add("theme-dark");
}
