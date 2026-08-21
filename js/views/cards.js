// views/cards.js — runner de flashcards (SRS, cram, cartas inversas) + resumen
import { ALL, DICT, isHan } from "../dict.js";
import { settings, getMyVocabularyIds } from "../store.js";
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
	const saved = getMyVocabularyIds();
	const pool = cardPool(ALL.filter((e) => !e.custom || saved.has(e.id)));
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
	let mapped = cards.map((e) => ({ id: e.id }));
	if (settings.reverseCards) {
		mapped = mapped.concat(cards.map((e) => ({ id: "rev:" + e.id })));
	}
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
				const ordText = e.ord != null ? `${e.ord}.` : "";
				d.innerHTML = `<span class="vord">${ordText}</span><span class="vh">${e.h}</span><span class="vp">${e.p}</span><span class="vg">${gloss(e)}</span><span class="vl">${e.l === 0 ? "✦" : e.l}</span>`;
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

		const listening = settings.listeningMode;
		const front = listening
			? `<div class="card-h-row listening-front" style="justify-content:center; padding: 40px 0;"><button class="spk-btn large card-spk">🔊</button></div>`
			: reverse
				? `<div class="card-g rev-front">${gloss(e)}</div><div class="card-pos">${e.pos || ""}</div>`
				: `<div class="card-h-row"><div class="card-h">${e.h}</div>
          <button class="spk-btn large card-spk">🔊</button>
          <div class="hw-container card-hw" style="display:flex; gap: 4px; cursor: pointer;" title="${T("drawHint") || "Animate stroke order"}"></div></div>`;
		const back = listening
			? `<div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:12px;">
                 <button class="spk-btn large card-spk">🔊</button>
                 <div class="card-h" style="font-size:var(--font-xl);">${e.h}</div>
                 <div class="hw-container card-hw" style="display:flex; gap: 4px; cursor: pointer;" title="${T("drawHint") || "Animate stroke order"}"></div>
                 <div class="card-p" style="margin:0;">${e.p}</div>
                 <div class="card-pos" style="margin:0;">${e.pos || ""}</div>
                 <div class="card-g" style="margin:0;">${gloss(e)}</div>
               </div>
               <div class="card-ex"></div>`
			: reverse
				? `<div class="card-h-row"><div class="card-h">${e.h}</div>
          <button class="spk-btn large card-spk">🔊</button>
          <div class="hw-container card-hw" style="display:flex; gap: 4px; cursor: pointer;" title="${T("drawHint") || "Animate stroke order"}"></div></div>
          <div class="card-p">${e.p}</div>`
				: `<div class="card-p">${e.p}</div><div class="card-pos">${e.pos || ""}</div>
         <div class="card-g">${gloss(e)}</div>
         <div class="card-ex"></div>`;

		const orderHint = isRandom ? "🔀" : "⬇️";
		const modeHint = listening ? " · 🎧" : reverse ? " · ⇄" : "";
		const v = setView(`
      <div class="card-progress">
        <div style="flex:1; text-align:left;"><button id="nav-quit" class="nav-arrow" title="${T("back")}">✕</button></div>
        <div style="display:flex; align-items:center;">
          <button id="nav-prev" class="nav-arrow" ${idx === 0 ? "disabled" : ""}>❮</button>
          <span>${idx + 1} ${T("of")} ${total}${modeHint} <span style="opacity: 0.5; margin-left: 4px;" title="${isRandom ? T("randomOrder") : T("ordered")}">${orderHint}</span></span>
          <button id="nav-next" class="nav-arrow" ${idx >= items.length - 1 ? "disabled" : ""}>❯</button>
        </div>
        <div style="flex:1;"></div>
      </div>
      <div id="card" class="card" style="flex-shrink: 1; min-height: 240px;">
        ${front}
        <div class="card-back hidden">${back}</div>
        <div class="flip-hint">${T("flipHint")}</div>
      </div>
      <div class="inline-drawing-section" style="min-height: 0;">
        <div class="inline-hw-container" id="inline-drawing-area" style="position:relative; width: 100%; flex: 1; min-height: 0; display: flex; flex-direction: column;">
            <div id="draw-placeholder" style="position:absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.3; pointer-events: none; text-align: center; font-size: 16px; font-weight: 600;">
                ${T("drawHere") || "You can draw here to practice!"}
            </div>
        </div>
        <div id="draw-toolbar" class="draw-toolbar hidden">
            <div class="draw-tool-group">
                <button class="draw-btn active" data-color="default" style="background: #ef4444;"></button>
                <button class="draw-btn" data-color="#3b82f6" style="background: #3b82f6;"></button>
                <button class="draw-btn" data-color="#10b981" style="background: #10b981;"></button>
                <button class="draw-btn" data-color="#f59e0b" style="background: #f59e0b;"></button>
                <button class="draw-btn" id="draw-erase-tool" title="Eraser Tool" style="color: var(--ink);"><i data-lucide="eraser"></i></button>
            </div>
            <div class="draw-divider"></div>
            <div class="draw-tool-group" style="position:relative;">
                <button class="draw-btn" id="draw-size-tool" title="Pencil Size">
                    <div id="current-size-indicator" style="width:8px; height:8px; background:var(--ink); border-radius:50%;"></div>
                </button>
                <div id="size-slider-popup" class="size-popup">
                    <div style="width:4px; height:4px; background:var(--ink); border-radius:50%;"></div>
                    <input type="range" id="draw-size-slider" min="2" max="24" value="6" style="width: 100px;">
                    <div style="width:24px; height:24px; background:var(--ink); border-radius:50%;"></div>
                </div>
            </div>
            <div class="draw-divider"></div>
            <button id="erase-drawing" class="hw-erase-btn" title="Erase">🗑️</button>
        </div>
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

		const hwCont = v.querySelector(".card-hw");
		if (window.HanziWriter && hwCont && hwCont.innerHTML === "") {
			const writers = [];
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
				writers.push(writer);
			}
			hwCont.addEventListener("click", (ev) => {
				ev.stopPropagation();
				writers.forEach((w) => w.animateCharacter());
			});
			if (!reverse && !listening) {
				setTimeout(() => writers.forEach((w) => w.animateCharacter()), 200);
			}
		}

		if (!reverse && e.ex) {
			const exd = v.querySelector(".card-ex");
			if (exd) {
				const zh = document.createElement("div");
				zh.className = "pop-ex-zh";
				zh.appendChild(renderTokens(e.ex[0], "none"));
				const tr = document.createElement("div");
				tr.className = "pop-ex-tr";
				tr.textContent = exGloss(e.ex);
				exd.appendChild(zh);
				exd.appendChild(tr);
			}
		}

		const inlineArea = v.querySelector("#inline-drawing-area");
		const drawToolbar = v.querySelector("#draw-toolbar");
		const eraseBtn = v.querySelector("#erase-drawing");
		const placeholder = v.querySelector("#draw-placeholder");

		if (inlineArea) {
			drawToolbar.classList.remove("hidden");
			const canvas = document.createElement("canvas");
			canvas.style.width = "100%";
			canvas.style.height = "100%";
			canvas.style.flex = "1";
			canvas.style.background = "transparent";
			canvas.style.border = "2px dashed var(--line)";
			canvas.style.borderRadius = "16px";
			canvas.style.touchAction = "none";
			inlineArea.appendChild(canvas);

			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			const defaultColor = document.body.classList.contains("theme-dark")
				? "#e53935"
				: "#d32f2f";

			// Setup ResizeObserver to fix canvas stretching
			let canvasState = null;
			const ro = new ResizeObserver(() => {
				const rect = canvas.getBoundingClientRect();
				if (rect.width === 0 || rect.height === 0) return;
				const dpr = window.devicePixelRatio || 1;

				if (canvas.width > 0 && canvas.height > 0) {
					canvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
				}

				canvas.width = rect.width * dpr;
				canvas.height = rect.height * dpr;
				ctx.scale(dpr, dpr);

				const activeColorBtn = v.querySelector(".draw-btn[data-color].active");
				const activeEraseBtn = v.querySelector("#draw-erase-tool.active");
				const sizeSlider = v.querySelector("#draw-size-slider");

				ctx.strokeStyle =
					activeColorBtn?.dataset.color === "default"
						? defaultColor
						: activeColorBtn?.dataset.color || defaultColor;
				ctx.lineWidth = parseInt(sizeSlider?.value || "6");
				ctx.lineCap = "round";
				ctx.lineJoin = "round";
				ctx.globalCompositeOperation = activeEraseBtn
					? "destination-out"
					: "source-over";

				if (canvasState) {
					ctx.putImageData(canvasState, 0, 0);
				}
			});
			ro.observe(canvas);

			const colorBtns = v.querySelectorAll(".draw-btn[data-color]");
			const eraseToolBtn = v.querySelector("#draw-erase-tool");

			const resetTools = () => {
				colorBtns.forEach((b) => b.classList.remove("active"));
				if (eraseToolBtn) eraseToolBtn.classList.remove("active");
			};

			colorBtns.forEach((btn) => {
				btn.addEventListener("click", (ev) => {
					ev.stopPropagation();
					resetTools();
					btn.classList.add("active");
					ctx.globalCompositeOperation = "source-over";
					const color = btn.dataset.color;
					ctx.strokeStyle = color === "default" ? defaultColor : color;
				});
			});

			if (eraseToolBtn) {
				eraseToolBtn.addEventListener("click", (ev) => {
					ev.stopPropagation();
					resetTools();
					eraseToolBtn.classList.add("active");
					ctx.globalCompositeOperation = "destination-out";
				});
			}

			const sizeToolBtn = v.querySelector("#draw-size-tool");
			const sizePopup = v.querySelector("#size-slider-popup");
			const sizeSlider = v.querySelector("#draw-size-slider");
			const sizeIndicator = v.querySelector("#current-size-indicator");

			if (sizeToolBtn && sizePopup) {
				sizeToolBtn.addEventListener("click", (ev) => {
					ev.stopPropagation();
					sizePopup.classList.toggle("open");
				});
				document.addEventListener("click", (ev) => {
					if (
						!sizePopup.contains(ev.target) &&
						!sizeToolBtn.contains(ev.target)
					) {
						sizePopup.classList.remove("open");
					}
				});
			}

			if (sizeSlider) {
				sizeSlider.addEventListener("input", (e) => {
					const size = parseInt(e.target.value);
					ctx.lineWidth = size;
					if (sizeIndicator) {
						sizeIndicator.style.width = size + "px";
						sizeIndicator.style.height = size + "px";
					}
				});
			}
			let drawing = false;
			const pos = (e) => {
				const rect = canvas.getBoundingClientRect();
				const clientX = e.touches ? e.touches[0].clientX : e.clientX;
				const clientY = e.touches ? e.touches[0].clientY : e.clientY;
				return [clientX - rect.left, clientY - rect.top];
			};

			const start = (e) => {
				if (settings.stylusOnly && e.pointerType === "touch") return;
				if (placeholder) placeholder.style.display = "none";
				drawing = true;
				ctx.beginPath();
				ctx.moveTo(...pos(e));
			};

			const move = (e) => {
				if (!drawing) return;
				ctx.lineTo(...pos(e));
				ctx.stroke();
			};

			const end = () => {
				drawing = false;
			};

			canvas.addEventListener("pointerdown", start);
			canvas.addEventListener("pointermove", move);
			canvas.addEventListener("pointerup", end);
			canvas.addEventListener("pointercancel", end);
			canvas.addEventListener("pointerout", end);

			eraseBtn.addEventListener("click", (ev) => {
				ev.stopPropagation();
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				if (placeholder) placeholder.style.display = "block";
			});
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

				if (reverse || listening) {
					v.querySelector(".card-hw")?.click();
				}
				const lf = v.querySelector(".listening-front");
				if (lf) lf.classList.add("hidden");
			} else {
				backEl.classList.add("hidden");
				hintEl.classList.remove("hidden");
				gradeEl.classList.add("hidden");
				const lf = v.querySelector(".listening-front");
				if (lf) lf.classList.remove("hidden");
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
