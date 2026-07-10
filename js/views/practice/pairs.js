// practice/pairs.js — emparejar hanzi con significado o pinyin
import { ALL } from "../../dict.js";
import { settings, saveSettings, recordActivity } from "../../store.js";
import { T, gloss } from "../../i18n.js";
import { $, setView } from "../../ui.js";
import { nav } from "../../router.js";
import { sample } from "./corpus.js";

const PER = 6;

export function renderPairs() {
	// selector de lección
	const v = setView(`<h3>${T("pairs")} · ${T("chooseLesson")}</h3>
    <div class="seg" id="mode-sel"><button id="m-mean" class="on">中→意</button><button id="m-pin">中→pīn</button></div>
    <div id="lgrid" class="lesson-grid"></div>
    <button id="back" class="back-btn">← ${T("back")}</button>`);
	let mode = "mean";
	$("#m-mean").addEventListener("click", () => {
		mode = "mean";
		$("#m-mean").classList.add("on");
		$("#m-pin").classList.remove("on");
	});
	$("#m-pin").addEventListener("click", () => {
		mode = "pin";
		$("#m-pin").classList.add("on");
		$("#m-mean").classList.remove("on");
	});
	const grid = $("#lgrid");
	for (let l = 0; l <= settings.maxLesson; l++) {
		const cards = ALL.filter((e) => e.l === l && !e.sup);
		if (cards.length < PER) continue;
		const b = document.createElement("button");
		b.className = "lesson-btn";
		const best = settings.pairsBest[l + mode];
		b.innerHTML = `<b>${l === 0 ? "✦" : l}</b><span>${cards.length}</span>`;
		b.addEventListener("click", () => play(cards, mode, l));
		grid.appendChild(b);
	}
	$("#back").addEventListener("click", () => nav("study"));
}

function play(cards, mode, lesson) {
	let queue = sample(cards, cards.length),
		matched = 0,
		start = Date.now();
	const total = queue.length;

	function round() {
		if (!queue.length) {
			const secs = Math.round((Date.now() - start) / 1000);
			const key = lesson + mode;
			const prev = settings.pairsBest[key];
			if (!prev || secs < prev) {
				settings.pairsBest[key] = secs;
				saveSettings();
			}
			recordActivity();
			setView(`<div class="summary"><h2>${T("pairs")} 🎉</h2>
        <div class="stats"><div class="stat"><b>${secs}s</b><span>${T("time")}</span></div>
        <div class="stat"><b>${settings.pairsBest[key]}s</b><span>${T("best")}</span></div></div>
        <button id="again" class="big-btn">${T("restart")}</button>
        <button id="back" class="big-btn secondary">${T("back")}</button></div>`);
			$("#again").addEventListener("click", renderPairs);
			$("#back").addEventListener("click", () => nav("study"));
			return;
		}
		const group = queue.slice(0, PER);
		queue = queue.slice(PER);
		const left = sample(group, group.length);
		const right = sample(group, group.length);
		setView(`<div class="card-progress">${matched}/${total}</div>
      <div class="pairs-grid">
        <div id="col-l" class="pairs-col"></div>
        <div id="col-r" class="pairs-col"></div>
      </div>
      <button id="back" class="back-btn">← ${T("back")}</button>`);
		let sel = null,
			done = 0;
		const rightText = (e) => (mode === "pin" ? e.p : gloss(e));
		left.forEach((e) => {
			const b = document.createElement("button");
			b.className = "pair-tile";
			b.textContent = e.h;
			b.dataset.id = e.id;
			b.addEventListener("click", () => choose(b, e, "l"));
			$("#col-l").appendChild(b);
		});
		right.forEach((e) => {
			const b = document.createElement("button");
			b.className = "pair-tile";
			b.textContent = rightText(e);
			b.dataset.id = e.id;
			b.addEventListener("click", () => choose(b, e, "r"));
			$("#col-r").appendChild(b);
		});
		function choose(btn, e, side) {
			if (btn.classList.contains("gone")) return;
			if (!sel) {
				sel = { btn, e, side };
				btn.classList.add("sel");
				return;
			}
			if (sel.side === side) {
				sel.btn.classList.remove("sel");
				sel = { btn, e, side };
				btn.classList.add("sel");
				return;
			}
			if (sel.e.id === e.id) {
				sel.btn.classList.add("gone");
				btn.classList.add("gone");
				sel.btn.classList.remove("sel");
				sel = null;
				done++;
				matched++;
				if (navigator.vibrate) navigator.vibrate(50);
				if (done === group.length) setTimeout(round, 400);
			} else {
				const bad = sel.btn;
				btn.classList.add("bad");
				bad.classList.add("bad");
				if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
				setTimeout(() => {
					btn.classList.remove("bad");
					bad.classList.remove("bad", "sel");
				}, 500);
				sel = null;
			}
		}
		$("#back").addEventListener("click", () => nav("study"));
	}
	round();
}
