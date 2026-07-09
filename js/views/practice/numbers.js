// practice/numbers.js — dictado de números, precios, horas y fechas
import {
	numToHanzi,
	priceToHanzi,
	timeToHanzi,
	dateToHanzi,
} from "../../numbers.js";
import { recordActivity } from "../../store.js";
import { T } from "../../i18n.js";
import { speak } from "../../audio.js";
import { $, setView } from "../../ui.js";
import { nav } from "../../router.js";
import { pick } from "./corpus.js";

const ROUND = 10;
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function makeItem(cat) {
	const c = cat === "mixed" ? pick(["num", "price", "time", "date"]) : cat;
	if (c === "num") {
		const n = rnd(0, 9999);
		return { hanzi: numToHanzi(n), answer: String(n), ph: "1234" };
	}
	if (c === "price") {
		const k = rnd(1, 999),
			m = rnd(0, 9);
		return {
			hanzi: priceToHanzi(k, m),
			answer: m ? `${k}.${m}` : String(k),
			ph: "¥12.5",
		};
	}
	if (c === "time") {
		const h = rnd(1, 12),
			m = pick([0, 5, 10, 15, 30, 45]);
		return {
			hanzi: timeToHanzi(h, m),
			answer: `${h}:${String(m).padStart(2, "0")}`,
			ph: "8:30",
		};
	}
	const mo = rnd(1, 12),
		d = rnd(1, 28);
	return { hanzi: dateToHanzi(mo, d), answer: `${mo}/${d}`, ph: "10/25" };
}

export function renderNumbers() {
	const v = setView(`<h3>${T("numbers")}</h3>
    <div class="seg wrap" id="cat">
      <button data-c="num" class="on">${T("catNumbers")}</button>
      <button data-c="price">${T("catPrices")}</button>
      <button data-c="time">${T("catTimes")}</button>
      <button data-c="date">${T("catDates")}</button>
      <button data-c="mixed">${T("catMixed")}</button>
    </div>
    <button id="go" class="big-btn">${T("start")}</button>
    <button id="back" class="back-btn">← ${T("back")}</button>`);
	let cat = "num";
	$("#cat")
		.querySelectorAll("button")
		.forEach((b) =>
			b.addEventListener("click", () => {
				cat = b.dataset.c;
				$("#cat")
					.querySelectorAll("button")
					.forEach((x) => x.classList.remove("on"));
				b.classList.add("on");
			}),
		);
	$("#go").addEventListener("click", () => play(cat));
	$("#back").addEventListener("click", () => nav("study"));
}

function play(cat) {
	let n = 0,
		correct = 0;
	function round() {
		if (n >= ROUND) {
			recordActivity();
			setView(`<div class="summary"><h2>${T("numbers")}</h2>
        <div class="stats"><div class="stat"><b>${correct}/${ROUND}</b><span>${T("score")}</span></div></div>
        <button id="again" class="big-btn">${T("restart")}</button>
        <button id="back" class="big-btn secondary">${T("back")}</button></div>`);
			$("#again").addEventListener("click", renderNumbers);
			$("#back").addEventListener("click", () => nav("study"));
			return;
		}
		const it = makeItem(cat);
		setView(`
      <div class="card-progress">${n + 1} ${T("of")} ${ROUND}</div>
      <div class="tone-play"><button id="play" class="spk-btn large">🔊</button></div>
      <input id="ans" class="search num-input" inputmode="text" placeholder="${it.ph}" autocomplete="off">
      <button id="check" class="big-btn">${T("check")}</button>
      <div id="result" class="num-result"></div>
      <button id="back" class="back-btn">← ${T("back")}</button>`);
		setTimeout(() => speak(it.hanzi), 250);
		$("#play").addEventListener("click", () => speak(it.hanzi));
		$("#ans").focus();
		const submit = () => {
			const got = $("#ans")
				.value.trim()
				.replace(/[¥$\s]/g, "");
			const want = it.answer.replace(/[¥$\s]/g, "");
			const ok = got === want;
			if (ok) correct++;
			$("#result").innerHTML =
				`<span class="${ok ? "opt-correct" : "opt-wrong"}">${ok ? T("correct") : T("incorrect")}</span>
        <div class="num-reveal">${it.hanzi} = <b>${it.answer}</b></div>`;
			$("#check").textContent = T("next");
			$("#check").replaceWith($("#check").cloneNode(true));
			$("#check").addEventListener("click", () => {
				n++;
				round();
			});
			$("#ans").disabled = true;
		};
		$("#check").addEventListener("click", submit);
		$("#ans").addEventListener("keydown", (e) => {
			if (e.key === "Enter") submit();
		});
		$("#back").addEventListener("click", () => nav("study"));
	}
	round();
}
