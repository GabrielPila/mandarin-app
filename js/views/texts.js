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
import { forgetPrivateReadings, rememberedPrivateReadings, unlockPrivateReadings } from "../private-readings.js";

const player = createReaderPlayer();
window.__stopReader = () => player.stop(); // el router lo llama al cambiar de pestaña

let privateBooks;

async function loadPrivateBooks() {
	if (privateBooks !== undefined) return privateBooks;
	privateBooks = await rememberedPrivateReadings();
	if (privateBooks) window.__languageData = privateBooks;
	return privateBooks;
}

export async function renderTextList(initialList = "d") {
	player.stop();
	const personal = await loadPrivateBooks();
	const v = setView(`
    <div class="reader-toggles" style="margin-bottom: 16px;">
      <button id="tab-d" class="on">${T("dialogs")}</button>
      <button id="tab-r">${T("readings")}</button>
	  <button id="tab-m">${T("myReadings")}</button>
    </div>
    <div id="view-d">
      <p class="section-desc">${T("dialogsDesc")}</p>
      <div id="list-d" class="text-list"></div>
    </div>
    <div id="view-r" style="display: none;">
      <p class="section-desc">${T("readingsDesc")}</p>
      <div id="list-r" class="text-list"></div>
    </div>
	<div id="view-m" style="display: none;">
	  <p class="section-desc">${T("myReadingsDesc")}</p>
	  <div id="list-m" class="text-list"></div>
	</div>
  `);
	const selectList = (selected) => {
		["d", "r", "m"].forEach((key) => {
			$("#tab-" + key).classList.toggle("on", key === selected);
			$("#view-" + key).style.display = key === selected ? "block" : "none";
		});
	};
	$("#tab-d").addEventListener("click", () => {
		selectList("d");
	});
	$("#tab-r").addEventListener("click", () => {
		selectList("r");
	});
	$("#tab-m").addEventListener("click", () => selectList("m"));
	const ld = $("#list-d"),
		lr = $("#list-r"),
		lm = $("#list-m");
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
	if (!personal) {
		lm.innerHTML = `<form id="unlock-readings" class="settings-card" style="max-width:420px">
			<h3>${T("unlockReadings")}</h3><p class="section-desc">${T("unlockReadingsDesc")}</p>
			<input id="reading-password" class="search" type="password" autocomplete="current-password" required placeholder="${T("password")}">
			<label class="vocab-chk"><input id="remember-reading" type="checkbox" checked> ${T("rememberDevice")}</label>
			<button class="btn primary" type="submit">${T("unlock")}</button><p id="unlock-error" class="section-desc"></p>
		</form>`;
		$("#unlock-readings").addEventListener("submit", async (event) => {
			event.preventDefault();
			const button = event.currentTarget.querySelector("button");
			button.disabled = true;
			try {
				privateBooks = await unlockPrivateReadings($("#reading-password").value, $("#remember-reading").checked);
				window.__languageData = privateBooks;
				await renderTextList("m");
			} catch (_error) {
				$("#unlock-error").textContent = T("wrongPassword");
				button.disabled = false;
			}
		});
	} else {
		const forget = document.createElement("button");
		forget.className = "back-btn";
		forget.textContent = T("forgetDevice");
		forget.addEventListener("click", async () => { await forgetPrivateReadings(); privateBooks = undefined; await renderTextList("m"); });
		lm.appendChild(forget);
		personal.forEach((book) => {
			const b = document.createElement("button");
			b.className = "text-item personal-reading";
			b.innerHTML = `<b>${book.source || T("myReadings")}</b>
			  <span class="ti-zh">${book.titleZh}</span>
			  <span class="ti-tr">${settings.lang === "en" ? book.titleEn : book.titleEs}</span>`;
			b.addEventListener("click", () => renderPrivateBook(book));
			lm.appendChild(b);
		});
	}
	selectList(initialList);
	window.__refreshLanguage = () => renderTextList(initialList);
}

function renderPrivateBook(book) {
	player.stop();
	setView(`
		<button id="back" class="back-btn">← ${T("back")}</button>
		<h2 class="reader-title">${book.titleZh}</h2>
		<p class="reader-sub">${settings.lang === "en" ? book.titleEn : book.titleEs} · ${book.source || T("myReadings")}</p>
		<div id="private-chapters" class="text-list"></div>
	`);
	$("#back").addEventListener("click", renderTextList);
	const list = $("#private-chapters");
	book.chapters.forEach((chapter) => {
		const b = document.createElement("button");
		b.className = "text-item personal-reading";
		b.innerHTML = `<b>${T("chapter")} ${chapter.number}</b>
			<span class="ti-zh">${chapter.titleZh}</span>
			<span class="ti-tr">${settings.lang === "en" ? chapter.titleEn : chapter.titleEs}</span>`;
		b.addEventListener("click", () =>
			renderReader(
				{
					t: chapter.titleZh,
					ten: chapter.titleEn,
					tes: chapter.titleEs,
					l: chapter.number,
					lines: chapter.lines,
					privateBook: book,
				},
				"private",
				() => renderPrivateBook(book),
			),
		);
		list.appendChild(b);
	});
	window.__refreshLanguage = () => renderPrivateBook(book);
}

let readerMode = "none",
	readerTrans = false;

function renderReader(t, kind, onBack = renderTextList) {
	player.stop();
	let activePart = 0;
	const v = setView(`
    <button id="back" class="back-btn">← ${T("back")}</button>
    <h2 class="reader-title">${t.t}</h2>
    <p id="active-reader-sub" class="reader-sub">${settings.lang === "en" ? t.ten : t.tes} · ${kind === "private" ? `${T("chapter")} ${t.l}` : `${T("lesson")} ${t.l}`}</p>
    <div id="part-tabs" class="reader-toggles" style="margin-top:12px; margin-bottom:12px; display:none;"></div>
    <div class="reader-toggles">
      <button id="tg-pinyin">${T("pinyin")}</button>
      <button id="tg-tones">${T("tones")}</button>
      <button id="tg-trans">${T("trans")}</button>
      <button id="tg-audio" class="action-btn">🔊</button>
    </div>
    <div id="reader"></div>`);
	$("#back").addEventListener("click", onBack);

	if (kind === "dialog" && t.parts && t.parts.length > 1) {
		const pt = $("#part-tabs");
		pt.style.display = "flex";
		t.parts.forEach((p, i) => {
			const btn = document.createElement("button");
			btn.textContent = `${T("text1")} ${i + 1}`;
			if (i === activePart) btn.classList.add("on");
			btn.addEventListener("click", () => {
				pt.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
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
	window.__refreshLanguage = () => {
		const view = $("#view");
		const scrollTop = view?.scrollTop || 0;
		$("#back").textContent = `← ${T("back")}`;
		$("#active-reader-sub").textContent = `${settings.lang === "en" ? t.ten : t.tes} · ${kind === "private" ? `${T("chapter")} ${t.l}` : `${T("lesson")} ${t.l}`}`;
		$("#tg-pinyin").textContent = T("pinyin");
		$("#tg-tones").textContent = T("tones");
		$("#tg-trans").textContent = T("trans");
		drawReader(t, kind, activePart);
		if (view) view.scrollTop = scrollTop;
	};
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
			const partNum = t.parts && t.parts.length > 1 ? activePart + 1 : pi + 1;
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
			zh.appendChild(renderTokens(line.zh, readerMode, line.py || ""));
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
