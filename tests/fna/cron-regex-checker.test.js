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

function loadCron(options = {}) {
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
    const domListeners = [];
    global.document = {
        addEventListener(type, listener) {
            domListeners.push({type, listener});
            if (options.fireDomReady && type === "DOMContentLoaded") listener();
        }
    };
    global.$ = (selector) => elements[selector] || null;
    global.escapeHtml = (value) => String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    global.setAnnounce = (message) => announcements.push(message);
    global.eval(fs.readFileSync("src/cron-erklaerer.js", "utf8") + "\n//# sourceURL=src/cron-erklaerer.js");
    return {elements, announcements, domListeners};
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

    elements["#cronExpr"].value = " \t*/15   1-5  1,15\t<mon>   *  ";
    elements["#cronExplain"].click();
    assert.match(elements["#cronResult"].innerHTML, /Minute: alle 15/);
    assert.match(elements["#cronResult"].innerHTML, /Stunde: Bereich 1-5/);
    assert.match(elements["#cronResult"].innerHTML, /Tag im Monat: Liste 1,15/);
    assert.match(elements["#cronResult"].innerHTML, /Monat: &lt;mon&gt;/);
    assert.match(elements["#cronResult"].innerHTML, /Wochentag: jede\(r\/s\)/);
    assert.doesNotMatch(elements["#cronResult"].innerHTML, /<\/li>Stryker was here!<li>/);
    assert.equal(elements["#cronStatus"].textContent, "Erklärt.");
    assert.equal(elements["#cronStatus"].style.color, "var(--muted)");
    assert.deepEqual(announcements, ["Cron erklärt"]);

    elements["#cronExpr"].value = "* * *";
    elements["#cronExplain"].click();
    assert.equal(elements["#cronStatus"].textContent, "Erwartet 5 Felder: min hour dom mon dow");
    assert.equal(elements["#cronStatus"].style.color, "var(--danger)");
    assert.equal(elements["#cronResult"].innerHTML, `<p class="muted">Ungültig.</p>`);

    elements["#cronExpr"].value = "   ";
    elements["#cronExplain"].click();
    assert.equal(elements["#cronStatus"].textContent, "Bitte Cron-Ausdruck eingeben.");
    assert.equal(elements["#cronStatus"].style.color, "var(--danger)");
});

test("Cron-Erklärer lädt Beispiele und setzt den Ausgangszustand zurück", () => {
    const {elements} = loadCron();
    global.initCron();
    elements["#cronExamples"].click();
    assert.match(elements["#cronResult"].innerHTML, /Alle 5 Minuten/);
    assert.match(elements["#cronResult"].innerHTML, /\*\/5 \* \* \* \*/);
    assert.match(elements["#cronResult"].innerHTML, /0 9 \* \* 1-5/);
    assert.match(elements["#cronResult"].innerHTML, /Mo–Fr um 09:00/);
    assert.match(elements["#cronResult"].innerHTML, /30 2 1 \* \*/);
    assert.match(elements["#cronResult"].innerHTML, /Am 1\. jeden Monats um 02:30/);
    assert.match(elements["#cronResult"].innerHTML, /0 0 \* \* 0/);
    assert.match(elements["#cronResult"].innerHTML, /Sonntag 00:00/);
    assert.doesNotMatch(elements["#cronResult"].innerHTML, /Stryker was here!/);
    assert.equal(elements["#cronStatus"].textContent, "Beispiele geladen.");

    elements["#cronExpr"].value = "0 0 * * *";
    elements["#cronClear"].click();
    assert.equal(elements["#cronExpr"].value, "");
    assert.match(elements["#cronResult"].innerHTML, /Gib einen Ausdruck ein/);
    assert.equal(elements["#cronStatus"].textContent, "Geleert.");
});

test("Cron-Erklärer ist robust bei fehlenden UI-Elementen und initialisiert per DOMContentLoaded", () => {
    const boot = loadCron({fireDomReady: true});
    boot.elements["#cronExpr"].value = "* * * * *";
    boot.elements["#cronExplain"].click();
    assert.match(boot.elements["#cronResult"].innerHTML, /Minute: jede\(r\/s\)/);
    assert.equal(boot.domListeners.map(({type}) => type).includes("DOMContentLoaded"), true);

    const missingSelectors = ["#cronExpr", "#cronExplain", "#cronExamples", "#cronClear", "#cronResult", "#cronStatus"];
    for (const selector of missingSelectors) {
        const {elements} = loadCron();
        const originalQuery = global.$;
        global.$ = (candidate) => candidate === selector ? null : originalQuery(candidate);
        assert.doesNotThrow(() => global.initCron(), selector);
        if (selector !== "#cronExplain") {
            assert.equal(elements["#cronExplain"].click(), undefined, selector);
        }
    }
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


test("Regex-Checker initialisiert nur mit vollständiger UI und verhindert doppelte Listener", async () => {
    const missingSelectors = [
        "#rxPattern", "#rxText", "#rxRun", "#rxClear", "#rxResult",
        "#rxStatus", "#rxCopyMatches", "#rxSafety", "#rxCheckRedos"
    ];

    for (const selector of missingSelectors) {
        const {elements} = loadRegexChecker();
        const originalQuery = global.$;
        global.$ = (candidate, root) => {
            if (!root && candidate === selector) return null;
            return originalQuery(candidate, root);
        };
        assert.doesNotThrow(() => global.initRegex(), selector);
        elements["#rxPattern"].value = "a";
        elements["#rxText"].value = "a";
        assert.equal(await elements["#rxRun"].click(), undefined, selector);
        assert.equal(elements["#rxStatus"].textContent, "", selector);
    }

    const {elements} = loadRegexChecker();
    global.initRegex();
    global.initRegex();
    elements["#rxPattern"].value = "a";
    elements["#rxText"].value = "a a";
    await elements["#rxRun"].click();
    assert.equal(elements.root.dataset.initialized, "true");
    assert.equal(elements["#rxStatus"].textContent, "OK. Flags: (keine) · Treffer: 1");
});

test("Regex-Checker berücksichtigt Flags und begrenzt nicht-globale Treffer", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();
    elements["#rxPattern"].value = "^ä.$";
    elements["#rxText"].value = "Äx\näX";
    elements["#rxFlagG"].checked = true;
    elements["#rxFlagI"].checked = true;
    elements["#rxFlagM"].checked = true;
    elements["#rxFlagU"].checked = true;
    await elements["#rxRun"].click();
    assert.equal(elements["#rxStatus"].textContent, "OK. Flags: gimu · Treffer: 2");
    assert.match(elements["#rxResult"].innerHTML, /<mark>Äx<\/mark><br><mark>äX<\/mark>/);

    elements["#rxFlagG"].checked = false;
    elements["#rxFlagI"].checked = false;
    elements["#rxFlagM"].checked = false;
    elements["#rxFlagU"].checked = false;
    elements["#rxPattern"].value = "a";
    elements["#rxText"].value = "a a";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxStatus"].textContent, "OK. Flags: (keine) · Treffer: 1");
});

test("Regex-Checker dokumentiert übersprungene und erweiterte ReDoS-Heuristiken", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();

    elements["#rxPattern"].value = "a+b+c+d+";
    elements["#rxText"].value = "aaaabbbbccccdddd";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), true);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /erweiterte lokale Heuristik/);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /übersprungen/);

    elements["#rxCheckRedos"].checked = true;
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-warn"), true);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /mehrere wiederholte Teilmuster/);

    elements["#rxPattern"].value = "(ab|cd)+z+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /Alternation kombiniert mit weiteren Quantifizierern/);

    elements["#rxPattern"].value = "[a-z]+\\d+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /benachbarte breite Zeichenklassen mit Wiederholung/);
});

test("Regex-Checker erkennt weitere Basis-Heuristiken und escaped Sicherheitsmeldungen", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();

    elements["#rxPattern"].value = "(.*)+";
    elements["#rxText"].value = "abc";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /wiederholter Wildcard-Ausdruck/);

    elements["#rxPattern"].value = "(a|ab)+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /überlappende Alternativen in Wiederholung/);
    assert.doesNotMatch(elements["#rxSafety"].flatValue.innerHTML, /Stryker was here!/);

    elements["#rxPattern"].value = "(?<bad";
    await elements["#rxRun"].click();
    assert.match(elements["#rxStatus"].textContent, /Regex Fehler:/);
    assert.equal(elements["#rxStatus"].style.color, "var(--danger)");
});


test("Regex-Checker differenziert ReDoS-Grenzfälle mit Quantorvarianten", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();

    const cases = [
        ["(a+){2,}", "verschachtelte Quantifizierer"],
        [".* {2,}", "wiederholter Wildcard-Ausdruck"],
        ["(a|ab){1,}", "überlappende Alternativen in Wiederholung"],
        ["a+b+c+d+", "mehrere wiederholte Teilmuster"],
        ["(a|b)+c{2,}", "Alternation kombiniert mit weiteren Quantifizierern"],
        ["\\d+\\w{2,}", "benachbarte breite Zeichenklassen mit Wiederholung"]
    ];

    elements["#rxText"].value = "aaaa bbbb cccc 1234";
    elements["#rxCheckRedos"].checked = true;

    for (const [pattern, expected] of cases) {
        elements["#rxPattern"].value = pattern;
        await elements["#rxRun"].click();
        assert.equal(elements["#rxSafety"].classList.contains("flat-warn"), true, pattern);
        assert.match(elements["#rxSafety"].flatValue.innerHTML, new RegExp(expected), pattern);
    }

    elements["#rxPattern"].value = "(ab|cd)+";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), true);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /keine zusätzlichen Auffälligkeiten/);
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
