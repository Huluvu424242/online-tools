"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

function createElement(value = "") {
    const listeners = new Map();
    return {
        value,
        checked: false,
        textContent: "",
        style: {},
        addEventListener(type, listener) { listeners.set(type, listener); },
        click() { return listeners.get("click")?.(); },
        change() { return listeners.get("change")?.(); }
    };
}

function loadTextTools(options = {}) {
    const elements = {
        "#b64Algorithm": createElement(options.algorithm || "base64"),
        "#b64Input": createElement(),
        "#b64Output": createElement(),
        "#b64Status": createElement(),
        "#b64AlgorithmHint": createElement(),
        "#b64Encode": createElement(),
        "#b64Decode": createElement(),
        "#b64Swap": createElement(),
        "#b64Clear": createElement(),
        "#b64Copy": createElement()
    };
    const copied = [];
    const announcements = [];
    const toolWindow = {};
    global.window = toolWindow;
    global.document = {addEventListener(type, listener) { if (options.fireDomReady && type === "DOMContentLoaded") listener(); }};
    global.$ = (selector) => elements[selector] || null;
    global.setAnnounce = (message) => announcements.push(message);
    global.safeCopy = async (value) => {
        if (options.copyFails) throw new Error("copy failed");
        copied.push(value);
    };

    global.eval(fs.readFileSync("src/rot13.js", "utf8") + "\n//# sourceURL=src/rot13.js");
    global.eval(fs.readFileSync("src/base64.js", "utf8") + "\n//# sourceURL=src/base64.js");
    return {sandbox: {window: toolWindow}, elements, copied, announcements};
}

test("Base64 kodiert und dekodiert UTF-8, Steuerzeichen und leere Eingaben", () => {
    const {sandbox} = loadTextTools();
    const values = ["", "Hallo Welt", "Grüße 世界 😀", "line1\nline2\ttab", "\\slashes\\"];
    for (const value of values) {
        assert.equal(sandbox.window.OnlineToolsBase64.decode(sandbox.window.OnlineToolsBase64.encode(value)), value);
    }
    assert.equal(sandbox.window.OnlineToolsBase64.encode("✓"), "4pyT");
});


test("Base64 Initialisierung ist robust bei fehlenden UI-Elementen und DOMContentLoaded", () => {
    const boot = loadTextTools({fireDomReady: true});
    assert.equal(boot.elements["#b64AlgorithmHint"].textContent.includes("UTF-8-Text"), true);

    const missingSelectors = ["#b64Algorithm", "#b64Input", "#b64Output", "#b64Status", "#b64AlgorithmHint", "#b64Encode", "#b64Decode", "#b64Swap", "#b64Clear", "#b64Copy"];
    for (const selector of missingSelectors) {
        const {sandbox} = loadTextTools();
        const originalQuery = global.$;
        global.$ = (candidate) => candidate === selector ? null : originalQuery(candidate);
        assert.doesNotThrow(() => sandbox.window.OnlineToolsBase64.init(), selector);
    }
});

test("Base64 UI kodiert, dekodiert und behandelt Fehler", () => {
    const {elements, announcements, sandbox} = loadTextTools();
    sandbox.window.OnlineToolsBase64.init();

    elements["#b64Input"].value = "Grüße 世界 😀";
    elements["#b64Encode"].click();
    assert.equal(elements["#b64Output"].value, "R3LDvMOfZSDkuJbnlYwg8J+YgA==");
    assert.equal(elements["#b64Status"].textContent, "Base64 kodiert.");
    assert.equal(elements["#b64Status"].style.color, "var(--muted)");
    assert.ok(announcements.includes("Base64 kodiert"));

    elements["#b64Input"].value = `  ${elements["#b64Output"].value}\n`;
    elements["#b64Decode"].click();
    assert.equal(elements["#b64Output"].value, "Grüße 世界 😀");
    assert.equal(elements["#b64Status"].textContent, "Base64 dekodiert.");
    assert.ok(announcements.includes("Base64 dekodiert"));

    elements["#b64Input"].value = " TWFu ";
    elements["#b64Decode"].click();
    assert.equal(elements["#b64Output"].value, "Man");

    elements["#b64Input"].value = "%%%";
    elements["#b64Decode"].click();
    assert.equal(elements["#b64Status"].textContent, "Ungültige Base64-Eingabe.");
    assert.equal(elements["#b64Status"].style.color, "var(--danger)");
});

test("ROT13 transformiert nur ASCII-Buchstaben und ist symmetrisch", () => {
    const {sandbox} = loadTextTools();
    const api = sandbox.window.OnlineToolsRot13;
    assert.equal(api.encode("Hello, World! äöü 123"), "Uryyb, Jbeyq! äöü 123");
    assert.equal(api.decode("Uryyb, Jbeyq! äöü 123"), "Hello, World! äöü 123");
    assert.equal(api.encode("Zz"), "Mm");
    assert.equal(api.decode(api.encode("AbcXyz-[]")), "AbcXyz-[]");
});

test("Texttool UI wechselt Algorithmus, tauscht, löscht und kopiert", async () => {
    const {elements, copied, announcements, sandbox} = loadTextTools();
    sandbox.window.OnlineToolsBase64.init();

    elements["#b64Algorithm"].value = "rot13";
    elements["#b64Algorithm"].change();
    assert.equal(elements["#b64Status"].textContent, "Algorithmus: ROT13.");
    assert.equal(elements["#b64Status"].style.color, "var(--muted)");
    assert.ok(elements["#b64AlgorithmHint"].textContent.includes("symmetrisch"));

    elements["#b64Input"].value = "Attack at dawn";
    elements["#b64Encode"].click();
    assert.equal(elements["#b64Output"].value, "Nggnpx ng qnja");
    elements["#b64Input"].value = "Nggnpx ng qnja";
    elements["#b64Decode"].click();
    assert.equal(elements["#b64Output"].value, "Attack at dawn");
    elements["#b64Input"].value = "Attack at dawn";
    elements["#b64Encode"].click();
    elements["#b64Swap"].click();
    assert.equal(elements["#b64Input"].value, "Nggnpx ng qnja");
    assert.equal(elements["#b64Output"].value, "Attack at dawn");
    assert.equal(elements["#b64Status"].textContent, "Eingabe/Ausgabe getauscht.");

    await elements["#b64Copy"].click();
    assert.deepEqual(copied, ["Attack at dawn"]);
    assert.equal(elements["#b64Status"].textContent, "Ausgabe kopiert.");
    assert.ok(announcements.includes("Algorithmus ROT13 ausgewählt"));

    elements["#b64Clear"].click();
    assert.equal(elements["#b64Input"].value, "");
    assert.equal(elements["#b64Output"].value, "");
    assert.equal(elements["#b64Status"].textContent, "Geleert.");
});

test("Kopierfehler im Texttool wird angezeigt", async () => {
    const {elements, sandbox} = loadTextTools({copyFails: true});
    sandbox.window.OnlineToolsBase64.init();
    await elements["#b64Copy"].click();
    assert.equal(elements["#b64Status"].textContent, "Kopieren nicht möglich.");
    assert.equal(elements["#b64Status"].style.color, "var(--danger)");
});
