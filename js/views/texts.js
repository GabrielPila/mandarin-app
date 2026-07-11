// views/texts.js — lista de textos y lector con audio
import {
	B1_TEXTS,
	B2_TEXTS,
	B1_READINGS,
	B2_READINGS,
} from "../../data/index.js";
import { settings } from "../store.js";
import { T } from "../i18n.js";
import { $, setView, renderTokens } from "../ui.js";
import { createReaderPlayer } from "../audio.js";
import { register, nav } from "../router.js";

const player = createReaderPlayer();
window.__stopReader = () => player.stop(); // el router lo llama al cambiar de pestaña

export function renderTextList() {
	player.stop();
	const v = setView(`
    <div class="reader-toggles" style="margin-bottom: 16px;">
      <button id="tab-d" class="on">${T("dialogs")}</button>
      <button id="tab-r">${T("readings")}</button>
    </div>
    <div id="view-d">
      <p class="section-desc">${T("dialogsDesc")}</p>
      <div id="list-d" class="text-list"></div>
    </div>
    <div id="view-r" style="display: none;">
      <p class="section-desc">${T("readingsDesc")}</p>
      <div id="list-r" class="text-list"></div>
    </div>
  `);
	$("#tab-d").addEventListener("click", () => {
		$("#tab-d").classList.add("on");
		$("#tab-r").classList.remove("on");
		$("#view-d").style.display = "block";
		$("#view-r").style.display = "none";
	});
	$("#tab-r").addEventListener("click", () => {
		$("#tab-r").classList.add("on");
		$("#tab-d").classList.remove("on");
		$("#view-r").style.display = "block";
		$("#view-d").style.display = "none";
	});
	const ld = $("#list-d"),
		lr = $("#list-r");
	B1_TEXTS.concat(B2_TEXTS).forEach((t) => {
		const b = document.createElement("button");
		b.className = "text-item";
		b.innerHTML = `<b>${T("lesson")} ${t.l}</b><span class="ti-zh">${t.t}</span>
      <span class="ti-tr">${settings.lang === "en" ? t.ten : t.tes}</span>`;
		b.addEventListener("click", () => renderReader(t, "dialog"));
		ld.appendChild(b);
	});
	B1_READINGS.concat(B2_READINGS).forEach((t) => {
		const b = document.createElement("button");
		b.className = "text-item reading";
		b.innerHTML = `<b>${T("lesson")} ${t.l}</b><span class="ti-zh">${t.t}</span>
      <span class="ti-tr">${settings.lang === "en" ? t.ten : t.tes}</span>`;
		b.addEventListener("click", () => renderReader(t, "reading"));
		lr.appendChild(b);
	});
}

let readerMode = "none",
	readerTrans = false;

function renderReader(t, kind) {
	player.stop();
	let activePart = 0;
	const v = setView(`
    <button id="back" class="back-btn">← ${T("back")}</button>
    <h2 class="reader-title">${t.t}</h2>
    <p class="reader-sub">${settings.lang === "en" ? t.ten : t.tes} · ${T("lesson")} ${t.l}</p>
    <div id="part-tabs" class="reader-toggles" style="margin-top:12px; margin-bottom:12px; display:none;"></div>
    <div class="reader-toggles">
      <button id="tg-pinyin">${T("pinyin")}</button>
      <button id="tg-tones">${T("tones")}</button>
      <button id="tg-trans">${T("trans")}</button>
      <button id="tg-audio" class="action-btn">🔊</button>
    </div>
    <div id="reader"></div>`);
	$("#back").addEventListener("click", renderTextList);
	
	if (kind === "dialog" && t.parts && t.parts.length > 1) {
		const pt = $("#part-tabs");
		pt.style.display = "flex";
		t.parts.forEach((p, i) => {
			const btn = document.createElement("button");
			btn.textContent = `${T("text1")} ${i + 1}`;
			if (i === activePart) btn.classList.add("on");
			btn.addEventListener("click", () => {
				pt.querySelectorAll("button").forEach(b => b.classList.remove("on"));
				btn.classList.add("on");
				activePart = i;
				player.stop();
				update();
			});
			pt.appendChild(btn);
		});
	}

	player.onStateChange((playing) => {
		const b = $("#tg-audio");
		if (b) b.textContent = playing ? "⏹️" : "🔊";
	});
	$("#tg-audio").addEventListener("click", () => {
		if (player.isPlaying()) player.stop();
		else player.play(0);
	});
	const update = () => {
		$("#tg-pinyin").classList.toggle("on", readerMode === "pinyin");
		$("#tg-tones").classList.toggle("on", readerMode === "tones");
		$("#tg-trans").classList.toggle("on", readerTrans);
		drawReader(t, kind, activePart);
	};
	$("#tg-pinyin").addEventListener("click", () => {
		readerMode = readerMode === "pinyin" ? "none" : "pinyin";
		update();
	});
	$("#tg-tones").addEventListener("click", () => {
		readerMode = readerMode === "tones" ? "none" : "tones";
		update();
	});
	$("#tg-trans").addEventListener("click", () => {
		readerTrans = !readerTrans;
		update();
	});
	update();
}

function drawReader(t, kind, activePart = 0) {
	const r = $("#reader");
	r.innerHTML = "";
	const lineObjs = [];
	
	let partsToRender = [];
	if (kind === "dialog") {
		if (t.parts && t.parts.length > 1) {
			partsToRender = [t.parts[activePart]];
		} else {
			partsToRender = t.parts;
		}
	} else {
		partsToRender = [{ lines: t.lines }];
	}
	
	partsToRender.forEach((p, pi) => {
		if (kind === "dialog") {
			const h = document.createElement("div");
			h.className = "part-head";
			const partNum = (t.parts && t.parts.length > 1) ? activePart + 1 : pi + 1;
			h.textContent = `${T("text1")} ${partNum} — ${settings.lang === "en" ? p.ien : p.ies}`;
			r.appendChild(h);
		}
		for (const line of p.lines) {
			const row = document.createElement("div");
			row.className = "line";
			if (line.s) {
				const sp = document.createElement("div");
				sp.className = "speaker";
				sp.appendChild(renderTokens(line.s, readerMode));
				row.appendChild(sp);
			}
			const zh = document.createElement("div");
			zh.className = "line-zh";
			zh.appendChild(renderTokens(line.zh, readerMode));
			row.appendChild(zh);
			if (readerTrans) {
				const tr = document.createElement("div");
				tr.className = "line-tr";
				tr.textContent = settings.lang === "en" ? line.en : line.es;
				row.appendChild(tr);
			}
			r.appendChild(row);
			const obj = { row, text: line.zh, speaker: line.s };
			lineObjs.push(obj);
			row.addEventListener("click", () => player.play(lineObjs.indexOf(obj)));
		}
	});
	player.setLines(lineObjs);
}

register("texts", renderTextList);
