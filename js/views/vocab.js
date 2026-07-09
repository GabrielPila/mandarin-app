// views/vocab.js — explorador de vocabulario con búsqueda y concordancia
import { ALL, normPinyin } from "../dict.js";
import { settings } from "../store.js";
import { T, gloss } from "../i18n.js";
import { speak } from "../audio.js";
import { $, setView, popupEntry, renderTokens } from "../ui.js";
import { register } from "../router.js";
import { search as textSearch } from "../concordance.js";
import { B1_TEXTS, B2_TEXTS } from "../../data/index.js";

export function renderVocab() {
	const v = setView(`
    <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
      <div style="display:flex; gap:10px;">
        <input id="vsearch" class="search" placeholder="${T("search")}" style="flex:1;">
        <div class="filter-wrap">
          <select id="vfilter" class="filter-select"></select>
        </div>
      </div>
      <div style="display:flex; gap:20px; align-items:center; padding: 0 4px;">
        <label class="vocab-chk"><input type="checkbox" id="chk-core" checked> CORE</label>
        <label class="vocab-chk"><input type="checkbox" id="chk-sup" checked> SUP</label>
      </div>
    </div>
    <div id="vlist" class="vlist"></div>
    <div id="vtext"></div>`);
	let activeFilter = "all";
	let showCore = true;
	let showSup = true;
	const sel = $("#vfilter");
	const filters = [
		"all",
		"hsk1",
		"hsk2",
		"hsk3",
		0,
		1,
		2,
		3,
		4,
		5,
		6,
		7,
		8,
		9,
		10,
		11,
		12,
		13,
		14,
		15,
		16,
		17,
		18,
		19,
		20,
	];
	const texts = B1_TEXTS.concat(B2_TEXTS);
	filters.forEach((f) => {
		const opt = document.createElement("option");
		opt.value = f;
		if (f === "all") opt.textContent = T("all");
		else if (typeof f === "string") opt.textContent = f.toUpperCase();
		else {
			const txt = texts.find((t) => t.l === f);
			opt.textContent = `L${f === 0 ? "✦" : f}${txt ? " — " + txt.t : ""}`;
		}
		sel.appendChild(opt);
	});
	sel.addEventListener("change", (ev) => {
		activeFilter =
			ev.target.value === "all"
				? "all"
				: isNaN(ev.target.value)
					? ev.target.value
					: parseInt(ev.target.value);
		draw();
	});
	$("#chk-core").addEventListener("change", (e) => {
		showCore = e.target.checked;
		draw();
	});
	$("#chk-sup").addEventListener("change", (e) => {
		showSup = e.target.checked;
		draw();
	});
	$("#vsearch").addEventListener("input", draw);

	function draw() {
		const q = $("#vsearch").value.trim().toLowerCase();
		const list = $("#vlist");
		list.innerHTML = "";
		let items = ALL.filter((e) => {
			if (!showCore && !e.sup) return false;
			if (!showSup && e.sup) return false;
			if (activeFilter === "all") return true;
			if (typeof activeFilter === "string")
				return e.tags && e.tags.includes(activeFilter);
			return e.l === activeFilter;
		});
		if (q) {
			const qp = normPinyin(q);
			items = items.filter(
				(e) =>
					e.h.includes(q) ||
					(qp && normPinyin(e.p).includes(qp)) ||
					(e.es && e.es.toLowerCase().includes(q)) ||
					(e.en && e.en.toLowerCase().includes(q)),
			);
		}
		items.slice(0, 400).forEach((e) => {
			const d = document.createElement("div");
			d.className = "vrow" + (e.sup ? " sup" : "");
			const tag = e.sup
				? `<span class="vtag sup-tag">SUP</span>`
				: `<span class="vtag core-tag">CORE</span>`;
			d.innerHTML = `<span class="vh">${e.h}</span><span class="vp">${e.p}</span>
        <span class="vg">${gloss(e)}</span>
        <div style="display:flex; gap:6px; align-items:center;">
          ${tag}
          <span class="vl">L${e.l === 0 ? "✦" : e.l}</span>
        </div>`;
			d.addEventListener("click", () => popupEntry(e.h));
			list.appendChild(d);
		});
		// concordancia: si la búsqueda es hanzi, mostrar líneas de los textos
		const vt = $("#vtext");
		vt.innerHTML = "";
		if (q && /[㐀-鿿]/.test(q)) {
			const lines = textSearch(q, 20);
			if (lines.length) {
				const h = document.createElement("h3");
				h.textContent = `${T("inTexts")} (${lines.length})`;
				vt.appendChild(h);
				lines.forEach((ln) => {
					const row = document.createElement("div");
					row.className = "use-line";
					const zh = document.createElement("div");
					zh.className = "use-zh";
					zh.appendChild(renderTokens(ln.zh, "none"));
					const spk = document.createElement("button");
					spk.className = "spk-btn";
					spk.textContent = "🔊";
					spk.addEventListener("click", () => speak(ln.zh));
					zh.appendChild(spk);
					const tr = document.createElement("div");
					tr.className = "use-tr";
					tr.textContent = settings.lang === "en" ? ln.en : ln.es;
					row.appendChild(zh);
					row.appendChild(tr);
					vt.appendChild(row);
				});
			}
		}
	}
	draw();
}

register("vocab", renderVocab);
