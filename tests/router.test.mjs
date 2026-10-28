import { test, before } from "node:test";
import assert from "node:assert/strict";

// Stubs mínimos para entorno Node.js
globalThis.window = globalThis;
globalThis.document = {
	querySelector: () => ({
		classList: {
			toggle: () => {},
		},
	}),
};

let router;
before(async () => {
	router = await import("../js/router.js");
});

test("router: registro y despacho de vistas", () => {
	let executed = false;
	router.register("dummy-test", () => {
		executed = true;
	});

	router.nav("dummy-test");
	assert.ok(executed, "El handler registrado debe ejecutarse al navegar");
	assert.equal(router.current, "dummy-test");
});

test("router: invoca window.__stopReader para limpiar audio y teclado", () => {
	let stopReaderCalled = false;
	window.__stopReader = () => {
		stopReaderCalled = true;
	};

	router.nav("study");
	assert.ok(
		stopReaderCalled,
		"Al cambiar de pestaña debe invocarse __stopReader",
	);
});

