// views/cards.js — runner de flashcards (SRS, cram, cartas inversas) + resumen
import { ALL, DICT, isHan } from "../dict.js";
import { settings } from "../store.js";
import * as SRS from "../srs.js";
import { T, gloss, exGloss } from "../i18n.js";
import { speak } from "../audio.js";
import {
	$,
	setView,
	cardPool,
	renderTokens,
	startQuiz,
	popupEntry,
} from "../ui.js";
import { nav } from "../router.js";

export function shuffle(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

// Un id 'rev:<baseId>' es una carta de producción (significado → hanzi)
function baseEntry(id) {
	const bid = id.startsWith("rev:") ? id.slice(4) : id;
	return ALL.find((e) => e.id === bid);
}

export function startSRS() {
	const pool = cardPool(ALL);
	// ids normales
	let dueIds = SRS.dueCards(pool).map((e) => e.id);
	let newIds = SRS.newCards(pool).map((e) => e.id);
	// cartas inversas comparten estado en el mismo store con prefijo rev:
	if (settings.reverseCards) {
		const revPool = pool.map((e) => ({ id: "rev:" + e.id }));
		dueIds = dueIds.concat(SRS.dueCards(revPool).map((c) => c.id));
		newIds = newIds.concat(SRS.newCards(revPool).map((c) => c.id));
	}
	const fresh = shuffle(newIds).slice(0, settings.newPerDay);
	const queue = shuffle(dueIds.concat(fresh));
	if (!queue.length) {
		setView(`<p class="empty">${T("noDue")}</p>`);
		return;
	}
	runCards(
		queue.map((id) => ({ id })),
		true,
	);
}

export function startCram(cards, randomize = true) {
	const mapped = cards.map((e) => ({ id: e.id }));
	runCards(randomize ? shuffle(mapped) : mapped, false, randomize);
}

// items: [{id}]  (id puede ser normal o 'rev:<id>')
export function runCards(items, srsMode, isRandom = true) {
	const total = items.length,
		startTime = Date.now();
	let idx = 0,
		firstCorrect = 0,
		answered = 0;
	const gradeCounts = { 0: 0, 3: 0, 4: 0, 5: 0 };
	const failed = new Set();
	const gradedIdx = new Set();

	if (window._cardKeydownHandler) {
		document.removeEventListener("keydown", window._cardKeydownHandler);
	}
	window._cardKeydownHandler = (e) => {
		const cardEl = document.getElementById("card");
		if (!cardEl) return;

		if (e.key === "ArrowLeft" && idx > 0) {
			idx--;
			show();
		} else if (e.key === "ArrowRight" && idx < items.length - 1) {
			idx++;
			show();
		} else if (e.key === " ") {
			e.preventDefault(); // Prevent page scrolling
			cardEl.click();
		} else if (
			e.key === "Backspace" ||
			e.key === "Delete" ||
			e.key === "Escape"
		) {
			nav("study");
		}
	};
	document.addEventListener("keydown", window._cardKeydownHandler);

	function finish() {
		const secs = Math.round((Date.now() - startTime) / 1000);
		const mm = Math.floor(secs / 60),
			ss = secs % 60;
		const acc = answered ? Math.round((100 * firstCorrect) / answered) : 0;
		const failedList = [...failed].map(baseEntry).filter(Boolean);
		let html = `<div class="summary">
      <h2>${T("sessionSummary")} 🎉</h2>
      <div class="stats">
        <div class="stat"><b>${answered}</b><span>${T("cardsLeft")}</span></div>
        <div class="stat"><b>${acc}%</b><span>${T("accuracy")}</span></div>
        <div class="stat"><b>${mm}:${String(ss).padStart(2, "0")}</b><span>${T("time")}</span></div>
      </div>`;
		if (failedList.length) {
			html += `<h3>${T("failedWords")}</h3><div id="fail-list" class="vlist"></div>
               <button id="retry-failed" class="big-btn">${T("reviewFailed")}</button>`;
		}
		html += `<button id="back-study" class="big-btn secondary">${T("back")}</button></div>`;
		const v = setView(html);
		if (failedList.length) {
			const fl = $("#fail-list");
			failedList.forEach((e) => {
				const d = document.createElement("div");
				d.className = "vrow";
				d.innerHTML = `<span class="vh">${e.h}</span><span class="vp">${e.p}</span><span class="vg">${gloss(e)}</span><span class="vl">${e.l === 0 ? "✦" : e.l}</span>`;
				d.addEventListener("click", () => popupEntry(e.h));
				fl.appendChild(d);
			});
			$("#retry-failed").addEventListener("click", () =>
				runCards(shuffle(failedList.map((e) => ({ id: e.id }))), false),
			);
		}
		$("#back-study").addEventListener("click", () => nav("study"));
	}

	function show() {
		if (idx >= items.length) {
			finish();
			return;
		}
		const item = items[idx];
		const reverse = item.id.startsWith("rev:");
		const e = baseEntry(item.id);
		if (!e) {
			idx++;
			show();
			return;
		}

		const front = reverse
			? `<div class="card-g rev-front">${gloss(e)}</div><div class="card-pos">${e.pos || ""}</div>`
			: `<div class="card-h-row"><div class="card-h">${e.h}</div>
          <button class="spk-btn large card-spk">🔊</button>
          <button class="spk-btn large card-quiz">✍️</button></div>`;
		const back = reverse
			? `<div class="card-h">${e.h}</div><div class="card-p">${e.p}</div>
         <button class="spk-btn card-spk">🔊</button>
         <div class="hw-container center card-hw"></div>`
			: `<div class="card-p">${e.p}</div><div class="card-pos">${e.pos || ""}</div>
         <div class="card-g">${gloss(e)}</div><div class="hw-container center card-hw"></div>
         <div class="card-ex"></div>`;

		const orderHint = isRandom ? "🔀" : "⬇️";
		const v = setView(`
      <div class="card-progress">
        <div style="flex:1; text-align:left;"><button id="nav-quit" class="nav-arrow" title="${T("back")}">✕</button></div>
        <div style="display:flex; align-items:center;">
          <button id="nav-prev" class="nav-arrow" ${idx === 0 ? "disabled" : ""}>❮</button>
          <span>${idx + 1} ${T("of")} ${total}${reverse ? " · ⇄" : ""} <span style="opacity: 0.5; margin-left: 4px;" title="${isRandom ? T("randomOrder") : T("ordered")}">${orderHint}</span></span>
          <button id="nav-next" class="nav-arrow" ${idx >= items.length - 1 ? "disabled" : ""}>❯</button>
        </div>
        <div style="flex:1;"></div>
      </div>
      <div id="card" class="card">
        ${front}
        <div class="card-back hidden">${back}</div>
        <div class="flip-hint">${T("flipHint")}</div>
      </div>
      <div id="grade" class="grade hidden">
        ${
					srsMode
						? `<button data-g="0" class="g-again">${T("again")}</button>
             <button data-g="3" class="g-hard">${T("hard")}</button>
             <button data-g="4" class="g-good">${T("good")}</button>
             <button data-g="5" class="g-easy">${T("easy")}</button>`
						: `<button data-g="0" class="g-again">${T("again")}</button>
             <button data-g="4" class="g-good">${T("good")}</button>`
				}
      </div>`);

		v.querySelectorAll(".card-spk").forEach((b) =>
			b.addEventListener("click", (ev) => {
				ev.stopPropagation();
				speak(e.h);
			}),
		);
		const quizBtn = v.querySelector(".card-quiz");
		if (quizBtn)
			quizBtn.addEventListener("click", (ev) => {
				ev.stopPropagation();
				startQuiz(e.h);
			});

		if (!reverse && e.ex) {
			const exd = v.querySelector(".card-ex");
			const zh = document.createElement("div");
			zh.className = "pop-ex-zh";
			zh.appendChild(renderTokens(e.ex[0], "none"));
			const tr = document.createElement("div");
			tr.className = "pop-ex-tr";
			tr.textContent = exGloss(e.ex);
			exd.appendChild(zh);
			exd.appendChild(tr);
		}

		$("#card").addEventListener("click", () => {
			const backEl = v.querySelector(".card-back");
			const hintEl = v.querySelector(".flip-hint");
			const gradeEl = $("#grade");

			if (backEl.classList.contains("hidden")) {
				backEl.classList.remove("hidden");
				hintEl.classList.add("hidden");
				if (!gradedIdx.has(idx)) {
					gradeEl.classList.remove("hidden");
				}

				const hwCont = v.querySelector(".card-hw");
				if (window.HanziWriter && hwCont && hwCont.innerHTML === "") {
					for (const ch of e.h) {
						if (!isHan(ch)) continue;
						const box = document.createElement("div");
						box.className = "hw-box";
						hwCont.appendChild(box);
						const writer = window.HanziWriter.create(box, ch, {
							width: 44,
							height: 44,
							padding: 2,
							strokeColor: document.body.classList.contains("theme-dark")
								? "#e53935"
								: "#d32f2f",
						});
						setTimeout(() => writer.animateCharacter(), 200);
					}
				}
			} else {
				backEl.classList.add("hidden");
				hintEl.classList.remove("hidden");
				gradeEl.classList.add("hidden");
			}
		});

		$("#nav-quit")?.addEventListener("click", () => nav("study"));

		$("#nav-prev")?.addEventListener("click", () => {
			if (idx > 0) {
				idx--;
				show();
			}
		});
		$("#nav-next")?.addEventListener("click", () => {
			if (idx < items.length - 1) {
				idx++;
				show();
			}
		});

		$("#grade")
			.querySelectorAll("button")
			.forEach((b) => {
				b.addEventListener("click", () => {
					const g = +b.dataset.g;
					answered++;
					gradeCounts[g]++;
					if (g >= 4) firstCorrect++;
					else failed.add(item.id);
					if (srsMode) SRS.review(item.id, g);
					if (g === 0) items.push(item); // repetir al final
					gradedIdx.add(idx); // mark this specific index as graded
					idx++;
					show();
				});
			});
	}
	show();
}
