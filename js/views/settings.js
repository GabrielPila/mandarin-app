// views/settings.js — ajustes
import {
	settings,
	saveSettings,
	exportData,
	importData,
	resetAll,
} from "../store.js";
import { T } from "../i18n.js";
import { speak, chineseVoices } from "../audio.js";
import { $, setView, applyTheme } from "../ui.js";
import { register, nav } from "../router.js";

// Removed setLangChangeHandler

export function renderSettings() {
	setView(`
    <div class="setting"><label>${T("maxLesson")}: <b id="ml-val">${settings.maxLesson}</b></label>
      <input type="range" id="max-lesson" min="1" max="20" value="${settings.maxLesson}"></div>
    <div class="setting"><label>${T("newPerDay")}: <b id="npd-val">${settings.newPerDay}</b></label>
      <input type="range" id="new-per-day" min="0" max="40" step="5" value="${settings.newPerDay}"></div>
		<div class="setting"><label>${T("voiceSpeed")}: <b id="vs-val">${settings.voiceSpeed || 1.0}x</b></label>
      <input type="range" id="voice-speed" min="0.5" max="1.5" step="0.1" value="${settings.voiceSpeed || 1.0}"></div>

    <div class="setting"><label>${T("voice")}</label>
      <div style="display:flex; gap:8px;">
        <select id="voice-select" style="flex:1; padding:8px; border-radius:8px; border:1px solid var(--line); background:var(--card-bg); color:var(--ink); font-size:14px;"></select>
        <button id="test-voice" class="big-btn secondary" style="margin:0; width:auto; padding:8px 16px;">${T("testVoice")}</button>
      </div></div>
    <div class="setting">
      <button id="export" class="big-btn secondary">${T("exportBtn")}</button>
      <button id="import" class="big-btn secondary">${T("importBtn")}</button>
      <input type="file" id="import-file" accept=".json" style="display:none">
      <button id="reset" class="big-btn danger">${T("resetBtn")}</button>
    </div>
    <p class="about">NPCR · El Nuevo Libro de Chino Práctico 1 & 2</p>`);

	const seg = (ids, get, set) =>
		ids.forEach(([id, val]) => {
			const el = $("#" + id);
			el.classList.toggle("on", get() === val);
			el.addEventListener("click", () => {
				set(val);
				saveSettings();
				ids.forEach(([i, v]) => $("#" + i).classList.toggle("on", get() === v));
			});
		});
	// removed seg for lang and text size
	$("#max-lesson").addEventListener("input", (e) => {
		settings.maxLesson = +e.target.value;
		$("#ml-val").textContent = e.target.value;
		saveSettings();
	});
	$("#new-per-day").addEventListener("input", (e) => {
		settings.newPerDay = +e.target.value;
		$("#npd-val").textContent = e.target.value;
		saveSettings();
	});
	const populateVoices = () => {
		const sel = $("#voice-select");
		if (!sel) return;
		const voices = chineseVoices();
		sel.innerHTML =
			'<option value="">' +
			T("autoVoice") +
			"</option>" +
			voices
				.map((v) => {
					let source = "Local";
					const uri = (v.voiceURI || "").toLowerCase(),
						nm = v.name.toLowerCase();
					if (nm.includes("google")) source = "Google";
					else if (
						uri.includes("microsoft") ||
						nm.includes("xiaoxiao") ||
						nm.includes("yunxi") ||
						nm.includes("yunyang")
					)
						source = "Microsoft";
					else if (
						uri.includes("apple") ||
						nm.includes("tingting") ||
						nm.includes("meijia")
					)
						source = "Apple";
					else if (!v.localService) source = "Cloud";
					const cleanName = v.name
						.replace(/\s*\(Chinese[\s\S]*$/i, "")
						.replace(/\s*（[^）]*）\s*$/, "")
						.trim();
					return `<option value="${v.voiceURI}" ${settings.voiceURI === v.voiceURI ? "selected" : ""}>${cleanName} (${source})</option>`;
				})
				.join("");
	};
	populateVoices();
	if (speechSynthesis.onvoiceschanged !== undefined)
		speechSynthesis.onvoiceschanged = populateVoices;
	$("#voice-select").addEventListener("change", (e) => {
		settings.voiceURI = e.target.value;
		saveSettings();
	});
	$("#voice-speed").addEventListener("input", (e) => {
		settings.voiceSpeed = +e.target.value;
		$("#vs-val").textContent = e.target.value + "x";
		saveSettings();
	});
	$("#test-voice").addEventListener("click", () =>
		speak("你好，欢迎学习中文！"),
	);

	$("#export").addEventListener("click", () => {
		const blob = new Blob([exportData()], { type: "application/json" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download =
			"mandarin-progreso-" + new Date().toISOString().slice(0, 10) + ".json";
		a.click();
	});
	$("#import").addEventListener("click", () => $("#import-file").click());
	$("#import-file").addEventListener("change", (e) => {
		const f = e.target.files[0];
		if (!f) return;
		const r = new FileReader();
		r.onload = () => {
			try {
				importData(r.result);
				alert(T("imported"));
				renderSettings();
			} catch (err) {
				alert("Error: " + err.message);
			}
		};
		r.readAsText(f);
	});
	$("#reset").addEventListener("click", () => {
		if (confirm(T("resetConfirm"))) {
			resetAll();
			renderSettings();
		}
	});
}

register("settings", renderSettings);
