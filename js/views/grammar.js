// views/grammar.js — referencia de gramática con ejemplos y audio
import { GRAMMAR } from "../../data/index.js";
import { settings } from "../store.js";
import { speak } from "../audio.js";
import { $, setView, renderTokens } from "../ui.js";
import { register } from "../router.js";
import { T } from "../i18n.js";

let grammarRubyMode = "none"; // 'none', 'pinyin', 'tones'

export function renderGrammar() {
	setView(`
    <div class="reader-toggles" style="margin-bottom: 12px; padding: 0 16px;">
      <button id="tg-pinyin">${T("pinyin")}</button>
      <button id="tg-tones">${T("tones")}</button>
    </div>
    <div id="gfilter" class="scroll-row">
       <button class="lesson-btn on" data-tag="all"><b>Todas</b></button>
       <button class="lesson-btn" data-tag="hsk1"><b>HSK 1</b></button>
       <button class="lesson-btn" data-tag="hsk2"><b>HSK 2</b></button>
       <button class="lesson-btn" data-tag="hsk3"><b>HSK 3</b></button>
       <button class="lesson-btn" data-tag="npcr"><b>NPCR</b></button>
    </div>
    <div id="glist" class="glist"></div>`);
    
	let currentTag = "all";
	
	const updateToggles = () => {
		$("#tg-pinyin").classList.toggle("on", grammarRubyMode === "pinyin");
		$("#tg-tones").classList.toggle("on", grammarRubyMode === "tones");
	};

	$("#tg-pinyin").addEventListener("click", () => {
		grammarRubyMode = grammarRubyMode === "pinyin" ? "none" : "pinyin";
		updateToggles();
		draw();
	});
	
	$("#tg-tones").addEventListener("click", () => {
		grammarRubyMode = grammarRubyMode === "tones" ? "none" : "tones";
		updateToggles();
		draw();
	});
	
	updateToggles();

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
			
			card.innerHTML = `
        <div class="g-title">${g.title}</div>
        <div class="g-tags">${g.tags.map((t) => `<span class="g-tag">${t.toUpperCase()}</span>`).join("")}</div>
        <div class="g-desc">${g.desc.replace(/\n/g, '<br>')}</div>
        <div class="g-examples-container"></div>`;
        
            const exContainer = card.querySelector(".g-examples-container");
            exContainer.className = "g-examples";
            
			g.examples.forEach((ex) => {
			    const exDiv = document.createElement("div");
			    exDiv.className = "g-ex";
			    
			    const zhDiv = document.createElement("div");
			    zhDiv.className = "g-ex-zh";
			    
			    const textSpan = document.createElement("span");
			    textSpan.className = "line-zh";
			    textSpan.style.flex = "1";
			    // Render tokens with pinyin/tones
			    textSpan.appendChild(renderTokens(ex.zh, grammarRubyMode));
			    zhDiv.appendChild(textSpan);
			    
			    const speakerSpan = document.createElement("span");
			    speakerSpan.className = "g-speaker";
			    speakerSpan.innerHTML = ` ${ex.s && ex.s !== 'Generic' ? `(${ex.s}) ` : ''}🔊`;
			    zhDiv.appendChild(speakerSpan);
			    
			    const trDiv = document.createElement("div");
			    trDiv.className = "g-ex-tr";
			    trDiv.textContent = settings.lang === "en" ? ex.en : ex.es;
			    
			    exDiv.appendChild(zhDiv);
			    exDiv.appendChild(trDiv);
			    
			    exDiv.addEventListener("click", () => {
			        speak(ex.zh, null, ex.s);
			    });
			    
			    exContainer.appendChild(exDiv);
			});
			
			list.appendChild(card);
		});
	}
	draw();
}

register("grammar", renderGrammar);
