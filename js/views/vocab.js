// views/vocab.js — explorador de vocabulario con búsqueda y concordancia
import { ALL, normPinyin } from "../dict.js";
import { settings, saveSettings, getMyVocabularyIds } from "../store.js";
import { T, gloss } from "../i18n.js";
import { speak } from "../audio.js";
import { $, setView, popupEntry, renderTokens } from "../ui.js";
import { register } from "../router.js";
import { search as textSearch } from "../concordance.js";
import { B1_TEXTS, B2_TEXTS } from "../../data/index.js";

export function renderVocab() {
	const v = setView(`
    <div style="
      display: flex; 
      flex-direction: column; 
      gap: 12px; 
      margin: -16px -16px 16px -16px; 
      padding: 16px 16px 12px 16px; 
      position: sticky; 
      top: -16px; 
      background-color: var(--bg-base); 
      background-image: var(--bg-pattern); 
      background-size: 8px 8px; 
      z-index: 10; 
      border-bottom: 1px solid var(--line);
    ">
      <div style="display:flex; gap:10px;">
        <input id="vsearch" class="search" placeholder="${T("search")}" 
               style="flex:1;">
        <div class="filter-wrap">
          <select id="vfilter" class="filter-select"></select>
        </div>
		<select id="vscope" class="filter-select"><option value="all">${T("allVocabulary")}</option><option value="book">${T("bookVocabulary")}</option><option value="general">${T("generalVocabulary")}</option><option value="mine">${T("myStudyList")}</option></select>
      </div>
      <div style="
        display: flex; 
        gap: 20px; 
        align-items: center; 
        padding: 0 4px; 
        flex-wrap: wrap;
      ">
        <div style="display:flex; gap:10px; align-items:center;">
          <span style="font-size:12px; color:var(--text-light);">
            ${T("sortBy")}:
          </span>
          <select id="vsort" class="filter-select" 
                  style="min-width:auto; padding:4px 24px 4px 8px; font-size:13px;">
            <option value="book">${T("sortBook")}</option>
            <option value="alpha">${T("sortAlpha")}</option>
          </select>
        </div>
        <div style="display:flex; gap:10px; margin-left:auto; align-items:center;">
          <button id="btn-select-mode" class="lesson-chip" 
                  style="margin-right: 10px;">Select</button>
          <label class="vocab-chk">
            <input type="checkbox" id="chk-core1" checked> CORE 1
          </label>
          <label class="vocab-chk">
            <input type="checkbox" id="chk-core2" checked> CORE 2
          </label>
          <label class="vocab-chk">
            <input type="checkbox" id="chk-sup" checked> SUP
          </label>
          <label class="vocab-chk">
            <input type="checkbox" id="chk-extra" checked> EXTRA
          </label>
        </div>
      </div>
    </div>
    <div id="vlist" class="vlist"></div>
    <div id="vtext"></div>
    <div id="floating-bar" class="floating-bar hidden">
      <span id="floating-count">0 words selected</span>
      <div style="margin-left:auto; display:flex; gap: 8px;">
        <button id="btn-select-all" class="btn small" 
                style="background: rgba(255,255,255,0.1); border: 1px solid var(--line);">
          Select All Visible
        </button>
        <button id="btn-save-block" class="btn primary small">
          Save Block
        </button>
      </div>
    </div>`);
	let activeFilter = "all";
	let scope = "all";
	let showCore1 = true;
	let showCore2 = true;
	let showSup = true;
	let showExtra = true;
	let sortMode = "book";
	let selectMode = false;
	const selectedIds = new Set();
	let filteredItems = [];

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
	const filterToggles = [
		{ id: "chk-core1", set: (v) => (showCore1 = v) },
		{ id: "chk-core2", set: (v) => (showCore2 = v) },
		{ id: "chk-sup", set: (v) => (showSup = v) },
		{ id: "chk-extra", set: (v) => (showExtra = v) },
	];

	filterToggles.forEach((t) => {
		const el = $(`#${t.id}`);
		el.addEventListener("change", (e) => {
			t.set(e.target.checked);
			draw();
		});
		el.parentElement.addEventListener("dblclick", (e) => {
			e.preventDefault();
			filterToggles.forEach((other) => {
				const isTarget = other.id === t.id;
				$(`#${other.id}`).checked = isTarget;
				other.set(isTarget);
			});
			draw();
		});
	});
	$("#vsort").addEventListener("change", (e) => {
		sortMode = e.target.value;
		draw();
	});
	$("#vsearch").addEventListener("input", draw);
	$("#vscope").addEventListener("change", (e) => {
		scope = e.target.value;
		draw();
	});

	function updateFloatingBar() {
		const bar = $("#floating-bar");
		if (selectMode) {
			bar.classList.remove("hidden");
			$("#floating-count").textContent = `${selectedIds.size} words selected`;
		} else {
			bar.classList.add("hidden");
		}
	}

	$("#btn-select-mode").addEventListener("click", (e) => {
		selectMode = !selectMode;
		e.target.classList.toggle("active", selectMode);
		if (!selectMode) {
			selectedIds.clear();
		}
		updateFloatingBar();
		draw();
	});

	$("#btn-select-all").addEventListener("click", () => {
		// If everything visible is selected, then unselect them. Otherwise, select all.
		const allVisibleSelected = filteredItems.every((e) =>
			selectedIds.has(e.id),
		);
		if (allVisibleSelected) {
			filteredItems.forEach((e) => selectedIds.delete(e.id));
		} else {
			filteredItems.forEach((e) => selectedIds.add(e.id));
		}
		updateFloatingBar();
		draw();
	});

	$("#btn-save-block").addEventListener("click", () => {
		const name = prompt("Enter a name for this Learning Block:");
		if (name && name.trim() !== "") {
			settings.customBlocks.push({
				id: "block_" + Date.now(),
				name: name.trim(),
				date: Date.now(),
				dictIds: Array.from(selectedIds),
			});
			saveSettings();
			alert("Block saved! You can study it in the Practice session.");
			selectMode = false;
			selectedIds.clear();
			$("#btn-select-mode").classList.remove("active");
			updateFloatingBar();
			draw();
		}
	});

	function draw() {
		const q = $("#vsearch").value.trim().toLowerCase();
		const list = $("#vlist");
		list.innerHTML = "";
		let items = ALL.filter((e) => {
			if (scope === "book" && e.custom) return false;
			if (scope === "general" && !e.custom) return false;
			if (scope === "mine" && !getMyVocabularyIds().has(e.id)) return false;
			if (e._deleted) return false;
			const isExtra = !!e.extra || (!e.sup && e.sec !== 1 && e.sec !== 2);
			const isSup = !!e.sup && !isExtra;
			const isCore1 = !e.sup && !isExtra && e.sec === 1;
			const isCore2 = !e.sup && !isExtra && e.sec === 2;

			if (!showCore1 && isCore1) return false;
			if (!showCore2 && isCore2) return false;
			if (!showSup && isSup) return false;
			if (!showExtra && isExtra) return false;

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

		function parseOrd(ord) {
			if (ord == null) return { base: 999, sub: "" };
			const str = String(ord);
			const match = str.match(/^(\d+)([a-z]?)$/i);
			if (match) {
				return { base: parseInt(match[1], 10), sub: match[2].toLowerCase() };
			}
			return { base: 999, sub: str };
		}

		function compareOrd(aOrd, bOrd) {
			const a = parseOrd(aOrd);
			const b = parseOrd(bOrd);
			if (a.base !== b.base) return a.base - b.base;
			return a.sub.localeCompare(b.sub);
		}

		if (sortMode === "alpha") {
			items.sort((a, b) => normPinyin(a.p).localeCompare(normPinyin(b.p)));
		} else {
			items.sort((a, b) => {
				if (a.l !== b.l) return a.l - b.l;
				const sa = a.sec || 99;
				const sb = b.sec || 99;
				if (sa !== sb) return sa - sb;
				return compareOrd(a.ord, b.ord);
			});
		}

		let currentSec = -1;
		filteredItems = items.slice(0, 400);

		filteredItems.forEach((e) => {
			if (sortMode === "book" && typeof activeFilter === "number" && !q) {
				const sec = e.sec || 99;
				if (sec !== currentSec) {
					currentSec = sec;
					const header = document.createElement("div");
					header.className = "vocab-sec-header";
					header.style =
						"font-weight:600; font-size:13px; color:var(--primary); margin: 12px 0 4px 4px; padding-bottom: 4px; border-bottom: 1px solid var(--line);";
					let title = T("secIndex");
					if (sec === 1) title = T("sec1");
					else if (sec === 2) title = T("sec2");
					else if (sec === 3) title = T("sec3");
					else if (sec === 4) title = T("sec4");
					header.textContent = title;
					list.appendChild(header);
				}
			}

			const d = document.createElement("div");
			d.className = "vrow" + (e.sup ? " sup" : "") + (e.extra ? " extra" : "");
			const isExtra = !!e.extra || (!e.sup && e.sec !== 1 && e.sec !== 2);
			let tag = "";
			if (e.custom) {
				tag = `<span class="vtag core-tag">${T("generalVocabulary")}</span>`;
			} else if (isExtra) {
				tag = `<span class="vtag sup-tag">${T("extraTag").toUpperCase()}</span>`;
			} else if (e.sup) {
				tag = `<span class="vtag sup-tag">SUP</span>`;
			} else {
				const coreText = e.sec === 2 ? "CORE 2" : "CORE 1";
				tag = `<span class="vtag core-tag">${coreText}</span>`;
			}
			const ordText = e.ord != null ? `${e.ord}.` : "";
			d.innerHTML = `
        <span class="vord">${ordText}</span>
        <span class="vh" style="display:flex; align-items:center; gap:8px;">
          ${e.h}
          <button class="spk-btn" 
                  style="width:24px; height:24px; font-size:12px;" 
                  title="Play audio">🔊</button>
        </span>
        <span class="vp">${e.p}</span>
        <span class="vg">${gloss(e)}</span>
        <div style="display:flex; gap:6px; align-items:center;">
          ${tag}
          <span class="vl">L${e.l === 0 ? "✦" : e.l}</span>
        </div>`;

			const spkBtn = d.querySelector(".spk-btn");
			if (spkBtn) {
				spkBtn.addEventListener("click", (ev) => {
					ev.stopPropagation();
					speak(e.h);
				});
			}

			if (selectMode) {
				const chk = document.createElement("input");
				chk.type = "checkbox";
				chk.checked = selectedIds.has(e.id);
				chk.style.marginLeft = "8px";
				chk.style.pointerEvents = "none";

				// Append to the flex container (4th grid item) to avoid breaking the 4-column grid layout
				d.lastElementChild.appendChild(chk);

				if (selectedIds.has(e.id)) d.classList.add("selected");

				d.addEventListener("click", (ev) => {
					ev.stopPropagation();
					if (selectedIds.has(e.id)) selectedIds.delete(e.id);
					else selectedIds.add(e.id);
					chk.checked = selectedIds.has(e.id);
					d.classList.toggle("selected", chk.checked);
					updateFloatingBar();
				});
			} else {
				d.addEventListener("click", () => popupEntry(e.h));
			}
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
