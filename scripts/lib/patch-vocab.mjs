// patch-vocab.mjs — edición textual in-place de data/book*-{vocab,sup}.js.
// Nunca reordena ni borra: localiza el objeto k-ésimo del array exportado y
// inserta/actualiza campos, o añade entradas al final del array.
// El invariante de ids SRS (posición === id) depende de esto.

// Escanea `export const NAME = [ … ]` y devuelve los offsets [start, end)
// de cada objeto de profundidad 1 (end incluye la '}').
export function scanArrayObjects(src, exportName) {
	const decl = src.indexOf(`export const ${exportName}`);
	if (decl < 0) throw new Error(`no se encontró 'export const ${exportName}'`);
	const open = src.indexOf("[", decl);
	if (open < 0) throw new Error(`no se encontró '[' tras ${exportName}`);

	const objects = [];
	let i = open + 1;
	let braceDepth = 0;
	let bracketDepth = 1; // ya dentro del array principal
	let objStart = -1;
	while (i < src.length && bracketDepth > 0) {
		const c = src[i];
		if (c === '"' || c === "'" || c === "`") {
			const quote = c;
			i++;
			while (i < src.length) {
				if (src[i] === "\\") i += 2;
				else if (src[i] === quote) break;
				else i++;
			}
		} else if (c === "/" && src[i + 1] === "/") {
			while (i < src.length && src[i] !== "\n") i++;
		} else if (c === "/" && src[i + 1] === "*") {
			i += 2;
			while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
			i++;
		} else if (c === "{") {
			if (braceDepth === 0 && bracketDepth === 1) objStart = i;
			braceDepth++;
		} else if (c === "}") {
			braceDepth--;
			if (braceDepth === 0 && bracketDepth === 1) {
				objects.push({ start: objStart, end: i + 1 });
				objStart = -1;
			}
		} else if (c === "[") {
			bracketDepth++;
		} else if (c === "]") {
			bracketDepth--;
			if (bracketDepth === 0) {
				return { objects, arrayOpen: open, arrayClose: i };
			}
		}
		i++;
	}
	throw new Error(`array ${exportName} sin cierre ']'`);
}

// Inserta o actualiza campos planos de número, string o booleano ({sec:1, ord:"1a", extra:true})
// en el objeto `index` del array `exportName`. Devuelve el nuevo fuente.
export function upsertFields(src, exportName, index, fields) {
	const { objects } = scanArrayObjects(src, exportName);
	const obj = objects[index];
	if (!obj) throw new Error(`${exportName}[${index}] no existe`);
	let text = src.slice(obj.start, obj.end);
	const pending = [];
	for (const [key, rawVal] of Object.entries(fields)) {
		const val = typeof rawVal === "string" ? JSON.stringify(rawVal) : rawVal;
		const re = new RegExp(`(\\b${key}:\\s*)(?:\\d+|true|false|"[^"]*")`, "u");
		if (re.test(text)) text = text.replace(re, `$1${val}`);
		else pending.push([key, val]);
	}
	if (pending.length) {
		const closing = text.lastIndexOf("}");
		let head = text.slice(0, closing).replace(/\s+$/u, "");
		if (!/[,{]$/u.test(head)) head += ",";
		const body = pending.map(([k, v]) => `\t\t${k}: ${v},`).join("\n");
		text = `${head}\n${body}\n\t${text.slice(closing)}`;
	}
	return src.slice(0, obj.start) + text + src.slice(obj.end);
}

// Inserta o actualiza el campo de colocaciones 'cols' (cols: ["x", "y"])
// en el objeto `index` del array `exportName`. Devuelve el nuevo fuente.
export function upsertColsField(src, exportName, index, cols) {
	const { objects } = scanArrayObjects(src, exportName);
	const obj = objects[index];
	if (!obj) throw new Error(`${exportName}[${index}] no existe`);
	let text = src.slice(obj.start, obj.end);
	const colsStr = `cols: [${cols.map((c) => JSON.stringify(c)).join(", ")}]`;
	const re = /(\bcols:\s*\[.*?\])/u;
	if (re.test(text)) {
		text = text.replace(re, colsStr);
	} else {
		const closing = text.lastIndexOf("}");
		let head = text.slice(0, closing).replace(/\s+$/u, "");
		if (!/[,{]$/u.test(head)) head += ",";
		text = `${head}\n\t\t${colsStr},\n\t${text.slice(closing)}`;
	}
	return src.slice(0, obj.start) + text + src.slice(obj.end);
}

// Añade `entryText` (un objeto ya formateado, sin coma final) al final del
// array `exportName`. Solo append — nunca insertar en medio.
export function appendEntry(src, exportName, entryText) {
	const { arrayClose } = scanArrayObjects(src, exportName);
	// retrocede hasta el último no-espacio antes de ']'
	let j = arrayClose - 1;
	while (j > 0 && /\s/.test(src[j])) j--;
	const needsComma = src[j] !== "," && src[j] !== "[";
	const insert = `${needsComma ? "," : ""}\n\t${entryText.trim()},\n`;
	return src.slice(0, j + 1) + insert + src.slice(arrayClose);
}

// Serializa una entrada de vocabulario nueva con el formato del repo
// (tabs, un campo por línea, comillas dobles).
export function formatVocabEntry(e) {
	const q = (s) => JSON.stringify(s);
	const lines = [`h: ${q(e.h)}`, `p: ${q(e.p)}`];
	if (e.pos) lines.push(`pos: ${q(e.pos)}`);
	lines.push(`es: ${q(e.es)}`, `en: ${q(e.en)}`, `l: ${e.l}`);
	if (e.tags?.length) lines.push(`tags: [${e.tags.map(q).join(", ")}]`);
	if (e.sec != null) lines.push(`sec: ${e.sec}`);
	if (e.ord != null)
		lines.push(`ord: ${typeof e.ord === "string" ? q(e.ord) : e.ord}`);
	if (e.extra) lines.push("extra: true");
	return `{\n${lines.map((l) => `\t\t${l},`).join("\n")}\n\t}`;
}
