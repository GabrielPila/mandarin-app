// views/grammar.js — referencia de gramática con ejemplos y audio
import { GRAMMAR } from "../../data/index.js";
import { settings } from "../store.js";
import { speak } from "../audio.js";
import { $, setView } from "../ui.js";
import { register } from "../router.js";

export function renderGrammar() {
	setView(`
    <div id="gfilter" class="scroll-row">
       <button class="lesson-btn on" data-tag="all"><b>Todas</b></button>
       <button class="lesson-btn" data-tag="hsk1"><b>HSK 1</b></button>
       <button class="lesson-btn" data-tag="hsk2"><b>HSK 2</b></button>
       <button class="lesson-btn" data-tag="hsk3"><b>HSK 3</b></button>
       <button class="lesson-btn" data-tag="npcr"><b>NPCR</b></button>
    </div>
    <div id="glist" class="glist"></div>`);
	let currentTag = "all";
	const grid = $("#gfilter");
	grid.querySelectorAll("button").forEach((b) =>
		b.addEventListener("click", () => {
			grid.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
			b.classList.add("on");
			currentTag = b.dataset.tag;
			draw();
		}),
	);

	function draw() {
		const list = $("#glist");
		list.innerHTML = "";
		const items = GRAMMAR.filter(
			(g) =>
				currentTag === "all" ||
				(currentTag === "npcr"
					? g.tags.some((t) => t.startsWith("npcr"))
					: g.tags.includes(currentTag)),
		);
		items.forEach((g) => {
			const card = document.createElement("div");
			card.className = "grammar-card";
			let exHTML = "";
			g.examples.forEach((ex, i) => {
				exHTML += `<div class="g-ex" data-id="${g.id}" data-idx="${i}">
           <div class="g-ex-zh">${ex.zh} <span class="g-speaker">(${ex.s}) 🔊</span></div>
           <div class="g-ex-tr">${settings.lang === "en" ? ex.en : ex.es}</div>
        </div>`;
			});
			card.innerHTML = `
        <div class="g-title">${g.title}</div>
        <div class="g-tags">${g.tags.map((t) => `<span class="g-tag">${t.toUpperCase()}</span>`).join("")}</div>
        <div class="g-desc">${g.desc}</div>
        <div class="g-examples">${exHTML}</div>`;
			list.appendChild(card);
		});
		list.querySelectorAll(".g-ex").forEach((el) =>
			el.addEventListener("click", () => {
				const g = GRAMMAR.find((x) => x.id === el.dataset.id);
				const ex = g.examples[el.dataset.idx];
				speak(ex.zh, null, ex.s);
			}),
		);
	}
	draw();
}

register("grammar", renderGrammar);
