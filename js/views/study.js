// views/study.js — pantalla principal: estadísticas, panel de progreso, cram y práctica
import { ALL } from "../dict.js";
import { settings, saveSettings, exportData, importData, resetAll } from "../store.js";
import { renderBlocks } from "./blocks.js";
import * as SRS from "../srs.js";
import { T } from "../i18n.js";
import { $, setView, cardPool } from "../ui.js";
import { register } from "../router.js";
import { startSRS, startCram } from "./cards.js";
import { renderCloze } from "./practice/cloze.js";
import { renderBuilder } from "./practice/builder.js";
import { renderPairs } from "./practice/pairs.js";
import { renderTones } from "./practice/tones.js";
import { renderNumbers } from "./practice/numbers.js";

function streakOf() {
	const today = new Date();
	let streak = 0;
	for (let i = 0; i < 365; i++) {
		const d = new Date(today);
		d.setDate(d.getDate() - i);
		const ds = d.toISOString().slice(0, 10);
		if (settings.history[ds]) streak++;
		else if (i > 0) break;
	}
	return streak;
}

function heatmapHTML() {
	const today = new Date();
	let h = '<div class="heatmap">';
	for (let i = 13; i >= 0; i--) {
		const d = new Date(today);
		d.setDate(d.getDate() - i);
		const ds = d.toISOString().slice(0, 10);
		const count = settings.history[ds] || 0;
		const lvl = count === 0 ? 0 : count < 20 ? 1 : count < 50 ? 2 : 3;
		h += `<div class="heat-box lvl-${lvl}" title="${ds}: ${count}"></div>`;
	}
	return h + "</div>";
}

function bar(learned, mature, total) {
	const lp = total ? Math.round((100 * learned) / total) : 0;
	const mp = total ? Math.round((100 * mature) / total) : 0;
	return `<div class="pbar"><div class="pbar-learned" style="width:${lp}%"></div><div class="pbar-mature" style="width:${mp}%"></div></div>`;
}

function dashboardHTML() {
	const pool = cardPool(ALL);
	const st = SRS.stats(pool);
	let h = `<details class="dash"><summary>${T("progress")} — ${st.learned} ${T("known")} · ${st.mature} ${T("mature")}</summary>`;
	// por lección
	h += `<h4>${T("byLesson")}</h4><div class="prog-list">`;
	for (let l = 0; l <= 20; l++) {
		const cards = ALL.filter(
			(e) => e.l === l
		);
		if (!cards.length) continue;
		const s = SRS.stats(cards);
		h += `<div class="prog-row"><span class="prog-lbl">${l === 0 ? "✦" : l}</span>${bar(s.learned, s.mature, s.total)}<span class="prog-num">${s.learned}/${s.total}</span></div>`;
	}
	h += "</div>";
	// por HSK
	h += `<h4>${T("byHsk")}</h4><div class="prog-list">`;
	for (const tag of ["hsk1", "hsk2", "hsk3", "hsk4", "hsk5"]) {
		const cards = ALL.filter(
			(e) => e.tags && e.tags.includes(tag)
		);
		if (!cards.length) continue;
		const s = SRS.stats(cards);
		h += `<div class="prog-row"><span class="prog-lbl">${tag.toUpperCase()}</span>${bar(s.learned, s.mature, s.total)}<span class="prog-num">${s.learned}/${s.total}</span></div>`;
	}
	h += "</div>";
	// pronóstico
	const fc = SRS.forecast(pool, 7);
	const maxfc = Math.max(1, ...fc);
	h +=
		`<h4>${T("forecast")}</h4><div class="forecast">` +
		fc
			.map(
				(n) =>
					`<div class="fc-col"><div class="fc-bar" style="height:${Math.round((40 * n) / maxfc) + 2}px"></div><span>${n}</span></div>`,
			)
			.join("") +
		"</div>";
	return h + "</details>";
}

const GAMES = [
	[
		"hardWords",
		"hardWordsDesc",
		'<i data-lucide="target"></i>',
		() => {
			const l = SRS.leeches(cardPool(ALL));
			if (l.length) startCram(l);
			else alert(T("noDue"));
		},
	],
	["cloze", "clozeDesc", '<i data-lucide="pen-line"></i>', renderCloze],
	["builder", "builderDesc", '<i data-lucide="puzzle"></i>', renderBuilder],
	["pairs", "pairsDesc", '<i data-lucide="link"></i>', renderPairs],
	["toneGame", "toneGameDesc", '<i data-lucide="music"></i>', renderTones],
	["numbers", "numbersDesc", '<i data-lucide="hash"></i>', renderNumbers],
];

export function renderStudy() {
	const pool = cardPool(ALL);
	const st = SRS.stats(pool);
	const v = setView(`
    <div class="stats">
      <div class="stat"><b>${st.due}</b><span>${T("due")}</span></div>
      <div class="stat"><b>${st.fresh}</b><span>${T("fresh")}</span></div>
      <div class="stat"><b>${streakOf()}</b><span>${T("streak")} 🔥</span></div>
    </div>
    ${heatmapHTML()}
    ${dashboardHTML()}
    <div style="display:flex; flex-direction:column; gap:16px; margin-bottom: 16px; font-size: 13px; color: var(--muted); background: var(--card-bg); padding: 16px; border-radius: 12px; border: 1px solid var(--card-border);">
      <div style="display:flex; flex-wrap:wrap; gap:16px;">
        <label class="vocab-chk" style="display:inline-flex; align-items:center; gap:6px;">
          <input type="checkbox" id="study-random" checked> 🔀 ${T("randomOrder")}
        </label>
        <label class="vocab-chk" style="display:inline-flex; align-items:center; gap:6px;">
          <input type="checkbox" id="study-reverse" ${settings.reverseCards ? 'checked' : ''}> ⇄ ${T("reverse") || "Reverse Cards"}
        </label>
        <label class="vocab-chk" style="display:inline-flex; align-items:center; gap:6px;">
          <input type="checkbox" id="study-listening" ${settings.listeningMode ? 'checked' : ''}> 🎧 ${T("listeningMode") || "Listening Mode"}
        </label>
      </div>
      
      <div style="height: 1px; background: var(--line); opacity: 0.5;"></div>

      <div style="display:flex; flex-wrap:wrap; gap:24px;">
        <div style="flex:1; min-width:200px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <label>${T("maxLesson")}</label>
            <b id="ml-val" style="color:var(--text);">${settings.maxLesson}</b>
          </div>
          <input type="range" id="max-lesson" min="1" max="20" value="${settings.maxLesson}" style="width:100%;">
        </div>
        <div style="flex:1; min-width:200px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <label>${T("newPerDay")}</label>
            <b id="npd-val" style="color:var(--text);">${settings.newPerDay}</b>
          </div>
          <input type="range" id="new-per-day" min="0" max="40" step="5" value="${settings.newPerDay}" style="width:100%;">
        </div>
      </div>
    </div>
    <div style="display:flex; flex-direction:column; gap:12px;">
      <button id="start-blocks" class="big-btn">Study vocabulary blocks</button>
      <button id="start-srs" class="big-btn" style="background:rgba(255,255,255,0.05); color:var(--text); border:1px solid var(--line);">Daily SRS Review</button>
    </div>
    <h3>${T("practice")}</h3>
    <div id="games" class="game-grid" style="margin-bottom: 20px;"></div>
    <h3>${T("cram")}</h3>
    <div id="cram-container" style="margin-bottom: 24px;"></div>
    
    <div style="height: 1px; background: var(--line); opacity: 0.5; margin: 32px 0;"></div>
    
    <div style="display:flex; flex-direction:column; gap:12px; margin-bottom: 40px;">
      <h3 style="margin:0;">Data Management</h3>
      <p style="font-size:13px; color:var(--muted); margin:0 0 8px 0;">Backup or reset your progress.</p>
      <button id="export" class="big-btn secondary" style="background:var(--card-bg); border:1px solid var(--line);">${T("exportBtn") || "Export progress"}</button>
      <button id="import" class="big-btn secondary" style="background:var(--card-bg); border:1px solid var(--line);">${T("importBtn") || "Import progress"}</button>
      <input type="file" id="import-file" accept=".json" style="display:none">
      <button id="reset" class="big-btn danger" style="background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.2);">${T("resetBtn") || "Reset all progress"}</button>
    </div>`);
	v.querySelector("#start-srs").addEventListener("click", startSRS);
	v.querySelector("#start-blocks").addEventListener("click", renderBlocks);

	v.querySelector("#max-lesson").addEventListener("input", (e) => {
		settings.maxLesson = +e.target.value;
		v.querySelector("#ml-val").textContent = e.target.value;
		saveSettings();
		
		// Optionally, re-render dashboard stats to reflect the new global maxLesson pool
		// but since they haven't started studying, they can just refresh or we leave it.
	});
	v.querySelector("#new-per-day").addEventListener("input", (e) => {
		settings.newPerDay = +e.target.value;
		v.querySelector("#npd-val").textContent = e.target.value;
		saveSettings();
	});

	v.querySelector("#study-reverse").addEventListener("change", e => {
		settings.reverseCards = e.target.checked;
		if (e.target.checked && settings.listeningMode) {
			settings.listeningMode = false;
			v.querySelector("#study-listening").checked = false;
		}
		saveSettings();
	});
	v.querySelector("#study-listening").addEventListener("change", e => {
		settings.listeningMode = e.target.checked;
		if (e.target.checked && settings.reverseCards) {
			settings.reverseCards = false;
			v.querySelector("#study-reverse").checked = false;
		}
		saveSettings();
	});

	const gg = $("#games");
	GAMES.forEach(([name, desc, icon, fn]) => {
		const b = document.createElement("button");
		b.className = "game-card";
		b.innerHTML = `<span class="game-icon">${icon}</span><b>${T(name)}</b><span class="game-desc">${T(desc)}</span>`;
		b.addEventListener("click", fn);
		gg.appendChild(b);
	});

	const container = $("#cram-container");
	container.innerHTML = `
    <h4>HSK</h4><div id="cram-hsk" class="lesson-grid" style="margin-bottom:20px;"></div>
    <h4>${T("book1")} (1-10)</h4><div id="cram-b1" class="lesson-grid"></div>
    <h4>${T("book2")} (11-20)</h4><div id="cram-b2" class="lesson-grid"></div>`;

	["hsk1", "hsk2", "hsk3"].forEach((tag) => {
		const cards = ALL.filter(
			(e) => e.tags && e.tags.includes(tag)
		);
		if (!cards.length) return;
		const b = document.createElement("button");
		b.className = "lesson-btn";
		b.innerHTML = `<b>${tag.toUpperCase()}</b><span>${cards.length}</span>`;
		b.addEventListener("click", () =>
			startCram(cards, $("#study-random").checked),
		);
		$("#cram-hsk").appendChild(b);
	});
	for (let l = 0; l <= 20; l++) {
		const cards = ALL.filter(
			(e) => e.l === l
		);
		if (!cards.length) continue;
		const b = document.createElement("button");
		b.className = "lesson-btn";
		b.innerHTML = `<b>${l === 0 ? "✦" : l}</b><span>${cards.length}</span>`;
		b.addEventListener("click", () =>
			startCram(cards, $("#study-random").checked),
		);
		(l <= 10 ? $("#cram-b1") : $("#cram-b2")).appendChild(b);
	}
	// CRAM setup
	const cramSet = (name, cnd, emptyMsg = "") => {
		const arr = pool.filter(cnd);
		const el = document.createElement("button");
		el.className = "game-card";
		el.innerHTML = `<span class="icon">📚</span><span class="label">${name} (${arr.length})</span>`;
		el.onclick = () => {
			if (!arr.length && emptyMsg) return alert(emptyMsg);
			startCram(arr);
		};
		v.querySelector("#cram-container").appendChild(el);
	};
	cramSet(T("dueCram"), (i) => {
		const c = SRS.get(i.id);
		return c && c.due <= Date.now();
	});
	cramSet(T("allCram"), () => true);
	cramSet(T("diffCram"), (i) => i.score < 0, T("noDiffMsg"));

	// Data Management
	v.querySelector("#export").addEventListener("click", () => {
		const blob = new Blob([exportData()], { type: "application/json" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = `mandarin-progress-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
	});
	v.querySelector("#import").addEventListener("click", () => v.querySelector("#import-file").click());
	v.querySelector("#import-file").addEventListener("change", (e) => {
		const file = e.target.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (e) => {
			if (importData(e.target.result)) {
				alert(T("importOk") || "Progress imported correctly. Restarting...");
				location.reload();
			} else {
				alert(T("importErr") || "Invalid backup file.");
			}
		};
		reader.readAsText(file);
	});
	v.querySelector("#reset").addEventListener("click", () => {
		if (confirm(T("resetConf") || "Are you absolutely sure you want to reset all your progress?")) {
			resetAll();
			location.reload();
		}
	});
}

register("study", renderStudy);
