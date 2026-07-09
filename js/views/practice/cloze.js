// practice/cloze.js — rellenar el hueco eligiendo entre 4 opciones
import { ALL } from "../../dict.js";
import * as SRS from "../../srs.js";
import { T } from "../../i18n.js";
import { settings } from "../../store.js";
import { speak } from "../../audio.js";
import { $, setView, renderTokens } from "../../ui.js";
import { nav } from "../../router.js";
import { corpusLines, wordTokens, sample, pick } from "./corpus.js";

const SKIP_POS = /^(NP|Pt|Interj|Conj)/;
const ROUND = 10;

function candidates(line) {
	return wordTokens(line.zh).filter(
		(t) => t.e && !SKIP_POS.test(t.e.pos || "") && t.e.id,
	);
}

export function renderCloze() {
	const lines = corpusLines().filter((l) => candidates(l).length);
	if (!lines.length) {
		setView(`<p class="empty">${T("noDue")}</p>`);
		return;
	}
	let n = 0,
		correct = 0;

	function round() {
		if (n >= ROUND) {
			setView(`<div class="summary"><h2>${T("cloze")}</h2>
        <div class="stats"><div class="stat"><b>${correct}/${ROUND}</b><span>${T("score")}</span></div></div>
        <button id="again" class="big-btn">${T("restart")}</button>
        <button id="back" class="big-btn secondary">${T("back")}</button></div>`);
			$("#again").addEventListener("click", renderCloze);
			$("#back").addEventListener("click", () => nav("study"));
			return;
		}
		const line = pick(lines);
		const cands = candidates(line);
		const target = pick(cands);
		// distractores: misma lección → mismo pos → cualquiera
		const sameLes = ALL.filter(
			(e) => e.l === target.e.l && e.h !== target.h && e.pos === target.e.pos,
		);
		const samePos = ALL.filter(
			(e) => e.pos === target.e.pos && e.h !== target.h,
		);
		let distr = sample(sameLes.length >= 3 ? sameLes : samePos, 3);
		if (distr.length < 3)
			distr = distr.concat(
				sample(
					ALL.filter((e) => e.h !== target.h),
					3 - distr.length,
				),
			);
		const opts = sample([target.e, ...distr.slice(0, 3)], 4);

		const v = setView(`
      <div class="card-progress">${n + 1} ${T("of")} ${ROUND}</div>
      <div class="cloze-sentence" id="sent"></div>
      <div class="cloze-tr">${settings.lang === "en" ? line.en : line.es}</div>
      <div id="opts" class="cloze-opts"></div>
      <button id="back" class="back-btn">← ${T("back")}</button>`);
		// frase con hueco
		const sent = $("#sent");
		const blanked = line.zh.replace(target.h, "＿＿");
		sent.appendChild(renderTokens(blanked, "none"));
		const optsEl = $("#opts");
		opts.forEach((o) => {
			const b = document.createElement("button");
			b.className = "cloze-opt";
			b.textContent = o.h;
			b.addEventListener("click", () => {
				const ok = o.h === target.h;
				optsEl.querySelectorAll("button").forEach((x) => {
					x.disabled = true;
					if (x.textContent === target.h) x.classList.add("opt-correct");
					else if (x === b) x.classList.add("opt-wrong");
				});
				if (ok) correct++;
				SRS.review(target.e.id, ok ? 4 : 0);
				sent.innerHTML = "";
				sent.appendChild(renderTokens(line.zh, "pinyin"));
				speak(line.zh, null, line.s);
				const nx = document.createElement("button");
				nx.className = "big-btn";
				nx.textContent = T("next");
				nx.addEventListener("click", () => {
					n++;
					round();
				});
				optsEl.appendChild(nx);
			});
			optsEl.appendChild(b);
		});
		$("#back").addEventListener("click", () => nav("study"));
	}
	round();
}
