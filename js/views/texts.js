// views/texts.js — lista de textos y lector con audio
import {
	B1_TEXTS,
	B2_TEXTS,
	B1_READINGS,
	B2_READINGS,
} from "../../data/index.js";
import { settings, getReadingHistory, recordReadingOpened, markReadingComplete, toggleReadingFavorite } from "../store.js";
import { externalVocabularyDictionary, registerExternalVocabulary } from "../dict.js";
import { T } from "../i18n.js";
import { $, setView, renderTokens } from "../ui.js";
import { createReaderPlayer } from "../audio.js";
import { register, nav } from "../router.js";
import { forgetPrivateReadings, loadPrivateReadingCollection, rememberedPrivateReadings, unlockPrivateReadings } from "../private-readings.js";

const player = createReaderPlayer();
let readerKeyHandler = null;
function clearReaderKeyboard() {
	if (readerKeyHandler) document.removeEventListener("keydown", readerKeyHandler);
	readerKeyHandler = null;
}
window.__stopReader = () => { player.stop(); clearReaderKeyboard(); }; // el router lo llama al cambiar de pestaña

let privateBooks;
const privateCollectionCache = new Map();

async function openPrivateCollection(collection) {
	player.stop();
	setView(`<p class="section-desc">${T("loadingReadings")}</p>`);
	try {
		let books = privateCollectionCache.get(collection.id);
		if (!books) {
			books = await loadPrivateReadingCollection(collection);
			privateCollectionCache.set(collection.id, books);
			books.forEach((book) => book.chapters?.forEach((chapter) => registerExternalVocabulary(chapter.vocabulary, book.source)));
		}
		window.__languageData = [...privateCollectionCache.values()].flat();
		renderPrivateBook(books[0]);
	} catch (error) {
		console.error("Could not load private collection", error);
		setView(`<button id="back" class="back-btn">← ${T("back")}</button><p class="empty">${T("invalidReading")}</p>`);
		$("#back").addEventListener("click", () => renderTextList("m"));
	}
}

async function loadPrivateBooks() {
	if (privateBooks !== undefined) return privateBooks;
	if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
		privateBooks = null;
		return privateBooks;
	}
	privateBooks = await Promise.race([
		rememberedPrivateReadings(),
		new Promise((resolve) => setTimeout(() => resolve(null), 2500)),
	]);
	if (privateBooks) {
		window.__languageData = [...privateCollectionCache.values()].flat();
	}
	return privateBooks;
}

export async function renderTextList(initialList = "d") {
	player.stop();
	clearReaderKeyboard();
	setView(`<p class="section-desc">${T("loadingReadings")}</p>`);
	let personal = null;
	try {
		personal = await loadPrivateBooks();
	} catch (error) {
		console.error("Could not initialize private readings", error);
	}
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
	const dialogs = B1_TEXTS.concat(B2_TEXTS);
	dialogs.forEach((t, index) => {
		const b = document.createElement("button");
		b.className = "text-item";
		b.innerHTML = `<b>${T("lesson")} ${t.l}</b><span class="ti-zh">${t.t}</span>
      <span class="ti-tr">${settings.lang === "en" ? t.ten : t.tes}</span>`;
		b.addEventListener("click", () => renderReader(t, "dialog", () => renderTextList("d"), { items: dialogs, index }));
		ld.appendChild(b);
	});
	const readings = B1_READINGS.concat(B2_READINGS);
	readings.forEach((t, index) => {
		const b = document.createElement("button");
		b.className = "text-item reading";
		b.innerHTML = `<b>${T("lesson")} ${t.l}</b><span class="ti-zh">${t.t}</span>
      <span class="ti-tr">${settings.lang === "en" ? t.ten : t.tes}</span>`;
		b.addEventListener("click", () => renderReader(t, "reading", () => renderTextList("r"), { items: readings, index }));
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
				window.__languageData = [...privateCollectionCache.values()].flat();
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
		forget.addEventListener("click", async () => { await forgetPrivateReadings(); privateCollectionCache.clear(); privateBooks = undefined; await renderTextList("m"); });
		lm.appendChild(forget);
		personal.forEach((book) => {
			const b = document.createElement("button");
			b.className = "text-item personal-reading";
			b.innerHTML = `<b>${book.source || T("myReadings")}</b>
			  <span class="ti-zh">${book.titleZh}</span>
			  <span class="ti-tr">${settings.lang === "en" ? book.titleEn : book.titleEs}${book.readingCount ? ` · ${book.readingCount} ${book.kind === "online-collection" ? T("episode") : T("chapter")}` : ""}</span>`;
			b.addEventListener("click", () => openPrivateCollection(book));
			lm.appendChild(b);
		});
	}
	selectList(initialList);
	window.__refreshLanguage = () => renderTextList(initialList);
}

const privateBookViewState = new Map();

function chapterMetadata(chapter) {
	const calculated = chapter.metadata?.calculated || {};
	const hanCharacters = calculated.hanCharacters || chapter.lines.reduce((count, line) => count + (line.zh.match(/[\u3400-\u9fff\uf900-\ufaff]/g)?.length || 0), 0);
	return {
		topics: chapter.metadata?.source?.topics || (chapter.tags || []).filter((tag) => !/^HSK|Mandarin Bean$/i.test(tag)),
		hsk: chapter.metadata?.source?.hsk,
		level: chapter.metadata?.source?.level,
		publishedAt: chapter.metadata?.source?.publishedAt || "",
		hanCharacters,
		words: calculated.words || chapter.vocabulary?.length || 0,
		length: calculated.length || (hanCharacters <= 100 ? "short" : hanCharacters <= 250 ? "medium" : "long"),
		contentType: chapter.metadata?.contentType,
	};
}

function metadataChips(chapter) {
	const meta = chapterMetadata(chapter);
	return [meta.hsk ? `HSK ${meta.hsk}` : meta.level, ...meta.topics, meta.contentType && T(meta.contentType), T(meta.length), `${meta.hanCharacters} ${T("characters")}`].filter(Boolean);
}

function privateReaderItem(chapter, book) {
	return {
		t: chapter.titleZh,
		ten: chapter.titleEn,
		tes: chapter.titleEs,
		l: chapter.number,
		lines: chapter.lines,
		privateBook: book,
		id: chapter.id || `${book.id}:${chapter.number}`,
		sourceUrl: chapter.sourceUrl,
		metadata: chapter.metadata,
		tags: chapter.tags,
		vocabulary: chapter.vocabulary,
	};
}

function renderPrivateBook(book) {
	player.stop();
	clearReaderKeyboard();
	const online = book.kind === "online-collection";
	const filterState = privateBookViewState.get(book.id) || { topic: "all", length: "all", status: "all", sort: "source" };
	privateBookViewState.set(book.id, filterState);
	setView(`
		<button id="back" class="back-btn">← ${T("back")}</button>
		<h2 class="reader-title">${book.titleZh}</h2>
		<p class="reader-sub">${settings.lang === "en" ? book.titleEn : book.titleEs} · ${book.source || T("myReadings")}</p>
		${online ? `<div class="reading-filters">
			<label>${T("filterTopic")}<select id="filter-topic"></select></label>
			<label>${T("filterLength")}<select id="filter-length">
				<option value="all">${T("allLengths")}</option><option value="short">${T("short")}</option><option value="medium">${T("medium")}</option><option value="long">${T("long")}</option>
			</select></label>
			<label>${T("filterStatus")}<select id="filter-status">
				<option value="all">${T("allStatuses")}</option><option value="unread">${T("unread")}</option><option value="in-progress">${T("inProgress")}</option><option value="read">${T("readStatus")}</option><option value="favorites">${T("favorites")}</option>
			</select></label>
			<label>${T("sortBy")}<select id="reading-sort">
				<option value="source">${T("sourceOrder")}</option><option value="newest">${T("newest")}</option><option value="shortest">${T("shortest")}</option><option value="least-recent">${T("leastRecent")}</option>
			</select></label>
		</div><p id="reading-results" class="filter-results"></p>` : ""}
		<div id="private-chapters" class="text-list"></div>
	`);
	$("#back").addEventListener("click", () => renderTextList("m"));
	const list = $("#private-chapters");
	const renderChapters = () => {
		list.innerHTML = "";
		let chapters = book.chapters.map((chapter, sourceIndex) => ({ chapter, sourceIndex }));
		if (online) {
			chapters = chapters.filter(({ chapter }) => {
				const meta = chapterMetadata(chapter), history = getReadingHistory(chapter.id || `${book.id}:${chapter.number}`);
				const status = history.status || "unread";
				return (filterState.topic === "all" || meta.topics.includes(filterState.topic)) &&
					(filterState.length === "all" || meta.length === filterState.length) &&
					(filterState.status === "all" || filterState.status === status || (filterState.status === "favorites" && history.favorite));
			});
			chapters.sort((a, b) => filterState.sort === "newest" ? (chapterMetadata(b.chapter).publishedAt || "").localeCompare(chapterMetadata(a.chapter).publishedAt || "") :
				filterState.sort === "shortest" ? chapterMetadata(a.chapter).hanCharacters - chapterMetadata(b.chapter).hanCharacters :
				filterState.sort === "least-recent" ? (getReadingHistory(a.chapter.id).lastCompletedAt || "").localeCompare(getReadingHistory(b.chapter.id).lastCompletedAt || "") : a.sourceIndex - b.sourceIndex);
			$("#reading-results").textContent = `${chapters.length} ${T("results")}`;
		}
		if (!chapters.length) list.innerHTML = `<p class="empty">${T("noMatchingReadings")}</p>`;
		const readerItems = chapters.map(({ chapter }) => privateReaderItem(chapter, book));
		chapters.forEach(({ chapter }, index) => {
		const history = getReadingHistory(chapter.id || `${book.id}:${chapter.number}`);
		const wrapper = document.createElement("div");
		wrapper.className = "reading-list-item";
		const b = document.createElement("button");
		b.className = "text-item personal-reading";
		const label = book.kind === "online-collection" ? T("episode") : T("chapter");
		const status = history.status === "read" ? `${T("readTimes")}: ${history.readCount || 1} · ${T("lastRead")}: ${new Date(history.lastCompletedAt).toLocaleDateString(settings.lang)}` : T(history.status === "in-progress" ? "inProgress" : "unread");
		b.innerHTML = `<b>${label} ${chapter.number} · ${status}</b>
			<span class="ti-zh">${chapter.titleZh}</span>
			<span class="ti-tr">${settings.lang === "en" ? chapter.titleEn : chapter.titleEs}</span>
			${online ? `<span class="metadata-chips">${metadataChips(chapter).map((chip) => `<span>${chip}</span>`).join("")}</span>` : ""}`;
		b.addEventListener("click", () => renderReader(readerItems[index], "private", () => renderPrivateBook(book), { items: readerItems, index }));
		wrapper.appendChild(b);
		if (online) {
			const favorite = document.createElement("button");
			favorite.className = `favorite-btn${history.favorite ? " on" : ""}`;
			favorite.type = "button"; favorite.title = T("favorite"); favorite.setAttribute("aria-label", T("favorite")); favorite.textContent = history.favorite ? "★" : "☆";
			favorite.addEventListener("click", () => { toggleReadingFavorite(chapter.id); renderChapters(); });
			wrapper.appendChild(favorite);
		}
		list.appendChild(wrapper);
		});
	};
	if (online) {
		const topics = [...new Set(book.chapters.flatMap((chapter) => chapterMetadata(chapter).topics))].sort();
		$("#filter-topic").innerHTML = `<option value="all">${T("allTopics")}</option>${topics.map((topic) => `<option value="${topic}">${topic}</option>`).join("")}`;
		[["#filter-topic", "topic"], ["#filter-length", "length"], ["#filter-status", "status"], ["#reading-sort", "sort"]].forEach(([selector, key]) => {
			$(selector).value = filterState[key];
			$(selector).addEventListener("change", (event) => { filterState[key] = event.target.value; renderChapters(); });
		});
	}
	renderChapters();
	window.__refreshLanguage = () => renderPrivateBook(book);
}

let readerMode = "none",
	readerTrans = false;

function renderReader(t, kind, onBack = renderTextList, navigation = null) {
	player.stop();
	if (t.id) recordReadingOpened(t.id);
	let activePart = 0;
	const itemLabel = kind === "private" && t.privateBook?.kind === "online-collection" ? T("episode") : kind === "private" ? T("chapter") : T("lesson");
	const v = setView(`
	<div class="reader-header">
      <button id="back" class="back-btn">← ${T("back")}</button>
	  <div class="reader-heading">
        <h2 class="reader-title">${t.t}</h2>
        <p id="active-reader-sub" class="reader-sub">${settings.lang === "en" ? t.ten : t.tes} · ${itemLabel} ${t.l}</p>
	    <div id="reader-meta" class="metadata-chips"></div>
	  </div>
	  ${navigation ? `<div id="reader-page-nav-top" class="reader-page-nav"></div>` : ""}
	</div>
    <div id="part-tabs" class="reader-toggles" style="margin-top:12px; margin-bottom:12px; display:none;"></div>
    <div class="reader-toggles">
      <button id="tg-pinyin">${T("pinyin")}</button>
      <button id="tg-tones">${T("tones")}</button>
      <button id="tg-trans">${T("trans")}</button>
      <button id="tg-audio" class="action-btn">🔊</button>
    </div>
    <div id="reader"></div>`);
	$("#back").addEventListener("click", onBack);
	const renderPageNavigation = (container) => {
		if (!navigation || !container) return;
		container.innerHTML = `<button class="reader-nav-icon reader-prev" aria-label="${T("previous")}" title="${T("previous")}"${navigation.index === 0 ? " disabled" : ""}>‹</button><span>${navigation.index + 1} / ${navigation.items.length}</span><button class="reader-nav-icon reader-next" aria-label="${T("next")}" title="${T("next")}"${navigation.index === navigation.items.length - 1 ? " disabled" : ""}>›</button>`;
		container.querySelector(".reader-prev").addEventListener("click", () => {
			if (navigation.index > 0) renderReader(navigation.items[navigation.index - 1], kind, onBack, { ...navigation, index: navigation.index - 1 });
		});
		container.querySelector(".reader-next").addEventListener("click", () => {
			if (navigation.index < navigation.items.length - 1) renderReader(navigation.items[navigation.index + 1], kind, onBack, { ...navigation, index: navigation.index + 1 });
		});
	};
	renderPageNavigation($("#reader-page-nav-top"));
	if (t.metadata) $("#reader-meta").innerHTML = metadataChips(t).map((chip) => `<span>${chip}</span>`).join("");

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
		player.isPlaying() ? player.stop() : player.play(0);
	});
	clearReaderKeyboard();
	readerKeyHandler = (event) => {
		if (event.code !== "Space" || event.repeat) return;
		const target = event.target;
		if (target?.isContentEditable || target?.matches?.("input, textarea, select, button, a")) return;
		event.preventDefault();
		player.isPlaying() ? player.stop() : player.play(0);
	};
	document.addEventListener("keydown", readerKeyHandler);
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
		$("#active-reader-sub").textContent = `${settings.lang === "en" ? t.ten : t.tes} · ${itemLabel} ${t.l}`;
		$("#tg-pinyin").textContent = T("pinyin");
		$("#tg-tones").textContent = T("tones");
		$("#tg-trans").textContent = T("trans");
		renderPageNavigation($("#reader-page-nav-top"));
		if (t.metadata) $("#reader-meta").innerHTML = metadataChips(t).map((chip) => `<span>${chip}</span>`).join("");
		drawReader(t, kind, activePart);
		if (view) view.scrollTop = scrollTop;
	};
	update();
}

function drawReader(t, kind, activePart = 0) {
	const r = $("#reader");
	r.innerHTML = "";
	const lineObjs = [];
	const localDictionary = externalVocabularyDictionary(t.vocabulary);

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
			zh.appendChild(renderTokens(line.zh, readerMode, line.py || "", localDictionary, line.meanings || []));
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
			row.addEventListener("click", () => player.toggle(lineObjs.indexOf(obj)));
		}
	});
	player.setLines(lineObjs);
	if (t.id) {
		const actions = document.createElement("div");
		actions.className = "reader-actions";
		const done = document.createElement("button");
		done.className = "btn primary";
		const updateDone = () => {
			const history = getReadingHistory(t.id);
			done.textContent = history.status === "read" ? `✓ ${T("readTimes")}: ${history.readCount || 1}` : T("markAsRead");
		};
		updateDone();
		done.addEventListener("click", () => { markReadingComplete(t.id); updateDone(); });
		actions.appendChild(done);
		if (t.privateBook?.kind === "online-collection") {
			const favorite = document.createElement("button");
			favorite.className = "btn";
			const updateFavorite = () => { favorite.textContent = `${getReadingHistory(t.id).favorite ? "★" : "☆"} ${T("favorite")}`; };
			updateFavorite(); favorite.addEventListener("click", () => { toggleReadingFavorite(t.id); updateFavorite(); }); actions.appendChild(favorite);
		}
		if (t.sourceUrl) {
			const source = document.createElement("a");
			source.className = "btn"; source.href = t.sourceUrl; source.target = "_blank"; source.rel = "noopener"; source.textContent = T("originalSource");
			actions.appendChild(source);
		}
		r.appendChild(actions);
	}
	if (navigation) {
		const bottomNavigation = document.createElement("div");
		bottomNavigation.className = "reader-page-nav";
		r.appendChild(bottomNavigation);
		const previous = document.createElement("button");
		previous.className = "reader-nav-icon"; previous.disabled = navigation.index === 0; previous.textContent = "‹"; previous.title = T("previous"); previous.setAttribute("aria-label", T("previous"));
		previous.addEventListener("click", () => renderReader(navigation.items[navigation.index - 1], kind, onBack, { ...navigation, index: navigation.index - 1 }));
		const position = document.createElement("span"); position.textContent = `${navigation.index + 1} / ${navigation.items.length}`;
		const next = document.createElement("button");
		next.className = "reader-nav-icon"; next.disabled = navigation.index === navigation.items.length - 1; next.textContent = "›"; next.title = T("next"); next.setAttribute("aria-label", T("next"));
		next.addEventListener("click", () => renderReader(navigation.items[navigation.index + 1], kind, onBack, { ...navigation, index: navigation.index + 1 }));
		bottomNavigation.append(previous, position, next);
	}
}

register("texts", renderTextList);
