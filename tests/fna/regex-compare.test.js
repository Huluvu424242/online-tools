"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

function createElement(value = "") {
    const listeners = new Map();
    const classListValues = new Set();
    return {
        value,
        textContent: "",
        innerHTML: "",
        focused: false,
        classList: {
            add: (...names) => names.forEach((name) => classListValues.add(name)),
            remove: (...names) => names.forEach((name) => classListValues.delete(name)),
            contains: (name) => classListValues.has(name)
        },
        querySelector(selector) {
            return selector === ".flat-value" ? this.statusValue : null;
        },
        statusValue: {textContent: "", classList: {remove() {}}},
        addEventListener(type, listener) { listeners.set(type, listener); },
        click() { return listeners.get("click")?.(); },
        keydown(key) { return listeners.get("keydown")?.({key}); },
        focus() { this.focused = true; }
    };
}

function loadRegexCompare() {
    const elements = {
        rcPatternA: createElement(),
        rcPatternB: createElement(),
        rcCompare: createElement(),
        rcSwap: createElement(),
        rcClear: createElement(),
        rcResult: createElement(),
        rcHint: createElement(),
        rcStatusBox: createElement()
    };
    global.document = {
        getElementById: (id) => elements[id] || null,
        addEventListener(type, listener) {
            if (type === "DOMContentLoaded") listener();
        }
    };

    const code = `${fs.readFileSync("src/regex-compare.js", "utf8")}
;global.__regexCompare = {RegexCompare, parse, simplify, serialize, nullable, derive, escapeVisible, escapeHtml};`;
    global.eval(code);
    return {elements, api: global.__regexCompare};
}

test("Regex-Vergleich erkennt Äquivalenz, Gegenbeispiele und ASCII-Steuerzeichen", () => {
    const {api} = loadRegexCompare();

    assert.deepEqual(api.RegexCompare.compare("a|b", "[ab]"), {equal: true});
    assert.deepEqual(api.RegexCompare.compare("a*", "a+"), {
        equal: false,
        witness: "",
        acceptsA: true,
        acceptsB: false
    });
    assert.deepEqual(api.RegexCompare.compare("\\d", "[0-9]"), {equal: true});

    const newlineDifference = api.RegexCompare.compare(".", "[\n\r -~]");
    assert.equal(newlineDifference.equal, false);
    assert.ok(newlineDifference.witness.charCodeAt(0) < 32);
    assert.equal(newlineDifference.acceptsA, true);
    assert.equal(newlineDifference.acceptsB, false);
});

test("Regex-Parser verarbeitet Quantoren, Gruppen, Klassen und Escapes deterministisch", () => {
    const {api} = loadRegexCompare();

    assert.equal(api.serialize(api.simplify(api.parse("(ab|a)c?"))), "((([a][b])|[a])([c]|ε))");
    assert.equal(api.serialize(api.simplify(api.parse("a+"))), "([a]([a])*)");
    assert.equal(api.serialize(api.simplify(api.parse("a?"))), "([a]|ε)");
    assert.equal(api.serialize(api.simplify(api.parse("[]]"))), "[\\]]");
    assert.equal(api.serialize(api.simplify(api.parse("[a-c-]"))), "[-abc]");
    assert.equal(api.serialize(api.simplify(api.parse("[\\d]"))), "[0123456789]");
    assert.equal(api.serialize(api.simplify(api.parse("[\\w]"))).includes("_"), true);
    assert.equal(api.serialize(api.simplify(api.parse("[\\s]"))).includes("\\t"), true);
    assert.equal(api.serialize(api.simplify(api.parse("\\."))), "[.]");

    assert.throws(() => api.parse("("), /Erwartet '\)'/);
    assert.throws(() => api.parse("[z-a]"), /Ungültiger Bereich z-a/);
    assert.throws(() => api.parse("[\\d-a]"), /Bereiche mit/);
    assert.throws(() => api.parse("[abc"), /Nicht geschlossene Zeichenklasse/);
    assert.throws(() => api.parse("\\"), /Ungültiger Escape am Ende/);
});

test("Ableitungen und Vereinfachungen behalten die unterstützte Regex-Semantik", () => {
    const {api} = loadRegexCompare();
    const ast = api.simplify(api.parse("ab*"));

    assert.equal(api.nullable(ast), false);
    const afterA = api.simplify(api.derive(ast, "a"));
    assert.equal(api.nullable(afterA), true);
    assert.equal(api.nullable(api.simplify(api.derive(afterA, "b"))), true);
    assert.equal(api.serialize(api.simplify({t: "alt", parts: [{t: "empty"}, api.parse("a"), api.parse("a")]})), "[a]");
    assert.equal(api.serialize(api.simplify({t: "seq", parts: [{t: "eps"}, api.parse("b")]})), "[b]");
    assert.equal(api.serialize(api.simplify({t: "star", expr: {t: "eps"}})), "ε");
    assert.throws(() => api.nullable({t: "unknown"}), /Unbekannter Knoten unknown/);
    assert.throws(() => api.derive({t: "unknown"}, "a"), /Unbekannter Knoten unknown/);
    assert.throws(() => api.serialize({t: "unknown"}), /Unbekannter Knoten unknown/);
});

test("Regex-Vergleich UI escaped Eingaben und bedient Vergleich, Swap, Clear und Enter", () => {
    const {elements} = loadRegexCompare();

    elements.rcPatternA.value = "";
    elements.rcPatternB.value = "a";
    elements.rcCompare.click();
    assert.equal(elements.rcStatusBox.statusValue.textContent, "Bitte zwei Regexe eingeben.");
    assert.match(elements.rcResult.innerHTML, /Beide Eingabefelder/);

    elements.rcPatternA.value = "<a>";
    elements.rcPatternB.value = "<a>|b";
    elements.rcCompare.click();
    assert.equal(elements.rcStatusBox.statusValue.textContent, "Regexe sind verschieden.");
    assert.match(elements.rcResult.innerHTML, /&lt;a&gt;/);
    assert.match(elements.rcResult.innerHTML, /Regex A akzeptiert:<\/strong> Nein/);
    assert.match(elements.rcHint.textContent, /Gegenbeispiel/);

    elements.rcPatternA.value = "a|b";
    elements.rcPatternB.value = "[ab]";
    elements.rcPatternA.keydown("Escape");
    assert.notEqual(elements.rcStatusBox.statusValue.textContent, "Regexe sind äquivalent.");
    elements.rcPatternA.keydown("Enter");
    assert.equal(elements.rcStatusBox.statusValue.textContent, "Regexe sind äquivalent.");
    assert.equal(elements.rcHint.textContent, "Kein Gegenbeispiel gefunden.");

    elements.rcSwap.click();
    assert.equal(elements.rcPatternA.value, "[ab]");
    assert.equal(elements.rcPatternB.value, "a|b");
    assert.equal(elements.rcPatternA.focused, true);

    elements.rcClear.click();
    assert.equal(elements.rcPatternA.value, "");
    assert.equal(elements.rcPatternB.value, "");
    assert.equal(elements.rcHint.textContent, "");
});

test("Regex-Vergleich UI zeigt Syntaxfehler escaped an", () => {
    const {elements} = loadRegexCompare();

    elements.rcPatternA.value = "[";
    elements.rcPatternB.value = "a";
    elements.rcCompare.click();

    assert.equal(elements.rcStatusBox.statusValue.textContent, "Fehler beim Vergleichen.");
    assert.match(elements.rcResult.innerHTML, /Nicht geschlossene Zeichenklasse/);
    assert.equal(elements.rcHint.textContent, "Prüfe die Syntax und die unterstützte Teilmenge.");
});

test("Regex-Vergleich escaped HTML und sichtbare Steuerzeichen kontextspezifisch", () => {
    const {api} = loadRegexCompare();

    assert.equal(api.escapeHtml(`<&>\"'`), "&lt;&amp;&gt;&quot;&#39;");
    assert.equal(api.escapeVisible("\n\r\t\v\f" + String.fromCharCode(1) + String.fromCharCode(31) + String.fromCharCode(127) + "[]\\<&>\"'"), "\\n\\r\\t\\v\\f\\x01\\x1f\\x7f[]\\&lt;&amp;&gt;&quot;&#39;");
});

test("Regex-Vergleich UI beschreibt Steuerzeichen-Gegenbeispiele ohne HTML-Injektion", () => {
    const {elements} = loadRegexCompare();

    elements.rcPatternA.value = ".";
    elements.rcPatternB.value = "[\n\r -~]";
    elements.rcCompare.click();

    assert.equal(elements.rcStatusBox.statusValue.textContent, "Regexe sind verschieden.");
    assert.match(elements.rcResult.innerHTML, /<code>\\x00<\/code>/);
    assert.match(elements.rcResult.innerHTML, /<strong>Länge:<\/strong> 1 Zeichen/);
    assert.match(elements.rcResult.innerHTML, /Regex A akzeptiert:<\/strong> Ja/);
    assert.match(elements.rcResult.innerHTML, /Regex B akzeptiert:<\/strong> Nein/);
    assert.match(elements.rcResult.innerHTML, /Zeichenanalyse:<\/strong><br>\s*\\x00 \(0x00\)/);

    elements.rcPatternA.value = "<script>alert('x')</script>";
    elements.rcPatternB.value = "<script>alert('x')</script>";
    elements.rcCompare.click();
    assert.equal(elements.rcStatusBox.statusValue.textContent, "Regexe sind äquivalent.");
    assert.doesNotMatch(elements.rcResult.innerHTML, /<script>/i);
    assert.match(elements.rcResult.innerHTML, /&lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/);
});

test("Regex-Vergleich UI reagiert auf Pattern-B-Enter und funktioniert ohne Statuswert", () => {
    const {elements} = loadRegexCompare();

    elements.rcPatternA.value = "a";
    elements.rcPatternB.value = "b";
    elements.rcPatternB.keydown("Escape");
    assert.equal(elements.rcStatusBox.statusValue.textContent, "");
    elements.rcPatternB.keydown("Enter");
    assert.equal(elements.rcStatusBox.statusValue.textContent, "Regexe sind verschieden.");

    const withoutStatusValue = loadRegexCompare();
    withoutStatusValue.elements.rcStatusBox.querySelector = () => null;
    assert.doesNotThrow(() => withoutStatusValue.elements.rcCompare.click());
});
