"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

function createElement(value = "") {
    const listeners = new Map();
    const classValues = new Set();
    return {
        value,
        checked: false,
        disabled: false,
        dataset: {},
        textContent: "",
        innerHTML: "",
        style: {},
        classList: {
            add: (...names) => names.forEach((name) => classValues.add(name)),
            remove: (...names) => names.forEach((name) => classValues.delete(name)),
            contains: (name) => classValues.has(name)
        },
        querySelector(selector) { return selector === ".flat-value" ? this.flatValue : null; },
        flatValue: {innerHTML: "", textContent: ""},
        addEventListener(type, listener) { listeners.set(type, listener); },
        click() { return listeners.get("click")?.(); }
    };
}

function loadCron() {
    const elements = {
        "#cronExpr": createElement(),
        "#cronExplain": createElement(),
        "#cronExamples": createElement(),
        "#cronClear": createElement(),
        "#cronResult": createElement(),
        "#cronStatus": createElement()
    };
    const announcements = [];
    global.window = {};
    global.document = {addEventListener() {}};
    global.$ = (selector) => elements[selector] || null;
    global.escapeHtml = (value) => String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    global.setAnnounce = (message) => announcements.push(message);
    global.eval(fs.readFileSync("src/cron-erklaerer.js", "utf8") + "\n//# sourceURL=src/cron-erklaerer.js");
    return {elements, announcements};
}

function loadRegexChecker(options = {}) {
    const elements = {
        "#rxPattern": createElement(),
        "#rxText": createElement(),
        "#rxRun": createElement(),
        "#rxClear": createElement(),
        "#rxResult": createElement(),
        "#rxStatus": createElement(),
        "#rxCopyMatches": createElement(),
        "#rxSafety": createElement(),
        "#rxCheckRedos": createElement(),
        "#rxFlagG": createElement(),
        "#rxFlagI": createElement(),
        "#rxFlagM": createElement(),
        "#rxFlagS": createElement(),
        "#rxFlagU": createElement(),
        "#rxFlagY": createElement()
    };
    const copied = [];
    global.window = {};
    global.document = {
        addEventListener() {},
        getElementById(id) { return id === "tool-regex" ? elements.root : null; }
    };
    elements.root = createElement();
    global.$ = (selector, root) => {
        if (root && selector === ".flat-value") return root.querySelector(selector);
        return elements[selector] || null;
    };
    global.escapeHtml = (value) => String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    global.safeCopy = async (value) => {
        if (options.copyFails) throw new Error("copy failed");
        copied.push(value);
    };
    global.eval(fs.readFileSync("src/regex-checker.js", "utf8") + "\n//# sourceURL=src/regex-checker.js");
    return {elements, copied};
}

test("Cron-Erklärer beschreibt Felder, escaped HTML und behandelt Fehler", () => {
    const {elements, announcements} = loadCron();
    global.initCron();

    elements["#cronExpr"].value = "*/15 1-5 1,15 <mon> *";
    elements["#cronExplain"].click();
    assert.match(elements["#cronResult"].innerHTML, /Minute: alle 15/);
    assert.match(elements["#cronResult"].innerHTML, /Stunde: Bereich 1-5/);
    assert.match(elements["#cronResult"].innerHTML, /Tag im Monat: Liste 1,15/);
    assert.match(elements["#cronResult"].innerHTML, /Monat: &lt;mon&gt;/);
    assert.equal(elements["#cronStatus"].textContent, "Erklärt.");
    assert.deepEqual(announcements, ["Cron erklärt"]);

    elements["#cronExpr"].value = "* * *";
    elements["#cronExplain"].click();
    assert.equal(elements["#cronStatus"].textContent, "Erwartet 5 Felder: min hour dom mon dow");
    assert.equal(elements["#cronStatus"].style.color, "var(--danger)");

    elements["#cronExpr"].value = "   ";
    elements["#cronExplain"].click();
    assert.equal(elements["#cronStatus"].textContent, "Bitte Cron-Ausdruck eingeben.");
});

test("Cron-Erklärer lädt Beispiele und setzt den Ausgangszustand zurück", () => {
    const {elements} = loadCron();
    global.initCron();
    elements["#cronExamples"].click();
    assert.match(elements["#cronResult"].innerHTML, /Alle 5 Minuten/);
    assert.match(elements["#cronResult"].innerHTML, /0 9 \* \* 1-5/);
    assert.equal(elements["#cronStatus"].textContent, "Beispiele geladen.");

    elements["#cronExpr"].value = "0 0 * * *";
    elements["#cronClear"].click();
    assert.equal(elements["#cronExpr"].value, "");
    assert.match(elements["#cronResult"].innerHTML, /Gib einen Ausdruck ein/);
    assert.equal(elements["#cronStatus"].textContent, "Geleert.");
});

test("Regex-Checker markiert Treffer sicher und bewertet lokale ReDoS-Heuristiken", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();
    elements["#rxFlagG"].checked = true;
    elements["#rxPattern"].value = "<a>";
    elements["#rxText"].value = "<a> & <a>";
    await elements["#rxRun"].click();
    assert.match(elements["#rxResult"].innerHTML, /<mark>&lt;a&gt;<\/mark> &amp; <mark>&lt;a&gt;<\/mark>/);
    assert.match(elements["#rxResult"].innerHTML, /Treffer: <strong>2<\/strong>/);
    assert.equal(elements["#rxStatus"].textContent, "OK. Flags: g · Treffer: 2");
    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), true);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /lokale Basis-Heuristik/);

    elements["#rxPattern"].value = "(a+)+$";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-warn"), true);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /verschachtelte Quantifizierer/);
});

test("Regex-Checker behandelt leere, ungültige und trefferlose Eingaben", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();
    await elements["#rxRun"].click();
    assert.equal(elements["#rxStatus"].textContent, "Bitte ein Pattern eingeben.");
    assert.equal(elements["#rxSafety"].classList.contains("flat-neutral"), true);

    elements["#rxPattern"].value = "[";
    await elements["#rxRun"].click();
    assert.match(elements["#rxStatus"].textContent, /Regex Fehler:/);
    assert.match(elements["#rxResult"].innerHTML, /Regex konnte nicht kompiliert werden/);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /nicht geprüft/);

    elements["#rxPattern"].value = "z+";
    elements["#rxText"].value = "abc";
    await elements["#rxRun"].click();
    assert.match(elements["#rxResult"].innerHTML, /Keine Treffer/);
    assert.match(elements["#rxStatus"].textContent, /Treffer: 0/);
});

test("Regex-Checker kopiert Matches global, handhabt leere Treffer und löscht", async () => {
    const {elements, copied} = loadRegexChecker();
    global.initRegex();
    elements["#rxPattern"].value = "a*";
    elements["#rxText"].value = "ba";
    await elements["#rxCopyMatches"].click();
    assert.deepEqual(copied, ["\na\n"]);
    assert.equal(elements["#rxStatus"].textContent, "Matches kopiert: 3");

    elements["#rxClear"].click();
    assert.equal(elements["#rxPattern"].value, "");
    assert.equal(elements["#rxText"].value, "");
    assert.equal(elements["#rxCheckRedos"].checked, false);
    assert.equal(elements["#rxSafety"].classList.contains("flat-neutral"), true);
});

test("Regex-Checker meldet Kopier- und Patternfehler", async () => {
    const empty = loadRegexChecker();
    global.initRegex();
    await empty.elements["#rxCopyMatches"].click();
    assert.equal(empty.elements["#rxStatus"].textContent, "Kein Pattern.");

    const failing = loadRegexChecker({copyFails: true});
    global.initRegex();
    failing.elements["#rxPattern"].value = "[";
    await failing.elements["#rxCopyMatches"].click();
    assert.equal(failing.elements["#rxStatus"].textContent, "Kopieren nicht möglich.");
    assert.equal(failing.elements["#rxStatus"].style.color, "var(--danger)");
});
