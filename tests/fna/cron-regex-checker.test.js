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
        addEventListener(type, listener) {
            if (!listeners.has(type)) listeners.set(type, []);
            listeners.get(type).push(listener);
        },
        click() {
            const results = (listeners.get("click") || []).map((listener) => listener());
            return results.find((result) => result && typeof result.then === "function") || results.at(-1);
        }
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

function createFlatValue(options = {}) {
    if (!options.failSafetyWriteNumber) return {innerHTML: "", textContent: ""};

    let writes = 0;
    let innerHTML = "";
    return {
        textContent: "",
        get innerHTML() { return innerHTML; },
        set innerHTML(value) {
            writes += 1;
            if (writes === options.failSafetyWriteNumber) {
                if (Object.hasOwn(options, "failSafetyWriteError")) throw options.failSafetyWriteError;
                throw new Error(options.failSafetyWriteMessage || "Anzeige defekt");
            }
            innerHTML = value;
        }
    };
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
    elements["#rxSafety"].flatValue = createFlatValue(options);
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
    assert.equal(elements["#rxStatus"].style.color, "var(--muted)");
    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), true);
    assert.equal(elements["#rxSafety"].classList.contains("flat-warn"), false);
    assert.equal(elements["#rxSafety"].classList.contains("flat-neutral"), false);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /lokale Basis-Heuristik/);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /safety-safe/);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /✔/);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /unauffällig/);

    elements["#rxPattern"].value = "(a+)+$";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-warn"), true);
    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), false);
    assert.equal(elements["#rxSafety"].classList.contains("flat-neutral"), false);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /safety-warn/);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /⚠/);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /verschachtelte Quantifizierer/);
});

test("Regex-Checker behandelt leere, ungültige und trefferlose Eingaben", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();
    await elements["#rxRun"].click();
    assert.equal(elements["#rxStatus"].textContent, "Bitte ein Pattern eingeben.");
    assert.equal(elements["#rxStatus"].style.color, "var(--danger)");
    assert.equal(elements["#rxSafety"].classList.contains("flat-neutral"), true);
    assert.match(elements["#rxResult"].innerHTML, /Noch nichts ausgeführt/);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /Noch nicht geprüft/);

    elements["#rxPattern"].value = "[";
    await elements["#rxRun"].click();
    assert.match(elements["#rxStatus"].textContent, /Regex Fehler:/);
    assert.equal(elements["#rxStatus"].style.color, "var(--danger)");
    assert.match(elements["#rxResult"].innerHTML, /Regex konnte nicht kompiliert werden/);
    assert.equal(elements["#rxSafety"].classList.contains("flat-neutral"), true);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /safety-neutral/);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /•/);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /Sicherheitsprüfung/);
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
    assert.match(elements["#rxResult"].innerHTML, /Noch nichts ausgeführt/);
    assert.equal(elements["#rxStatus"].textContent, "Geleert.");
    assert.equal(elements["#rxStatus"].style.color, "var(--muted)");
    assert.equal(elements["#rxSafety"].classList.contains("flat-neutral"), true);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /Noch nicht geprüft/);
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

    const absent = loadRegexChecker();
    absent.elements.root = null;
    assert.doesNotThrow(() => global.initRegex());

    const {elements} = loadRegexChecker();
    global.initRegex();
    global.initRegex();
    elements["#rxPattern"].value = "a";
    elements["#rxText"].value = "a a";
    await elements["#rxRun"].click();
    assert.equal(elements.root.dataset.initialized, "true");
    assert.equal(elements["#rxStatus"].textContent, "OK. Flags: (keine) · Treffer: 1");
    assert.match(elements["#rxResult"].innerHTML, /<mark>a<\/mark> a/);
    assert.doesNotMatch(elements["#rxResult"].innerHTML, /Stryker was here!/);
});

test("Regex-Checker initialisiert per DOMContentLoaded, nutzt alle Flags und behandelt fehlende Sicherheitsanzeige", async () => {
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
        "#rxFlagY": createElement(),
        root: createElement()
    };
    const domListeners = [];
    global.window = {};
    global.document = {
        addEventListener(type, listener) {
            domListeners.push(type);
            if (type === "DOMContentLoaded") listener();
        },
        getElementById(id) { return id === "tool-regex" ? elements.root : null; }
    };
    global.$ = (selector, root) => {
        if (root && selector === ".flat-value") return null;
        return elements[selector] || null;
    };
    global.escapeHtml = (value) => String(value);
    global.safeCopy = async () => {};
    global.eval(fs.readFileSync("src/regex-checker.js", "utf8") + "\n//# sourceURL=src/regex-checker.js");

    assert.deepEqual(domListeners, ["DOMContentLoaded"]);
    assert.equal(elements.root.dataset.initialized, "true");

    elements["#rxFlagG"].checked = true;
    elements["#rxFlagS"].checked = true;
    elements["#rxFlagY"].checked = true;
    elements["#rxPattern"].value = ".";
    elements["#rxText"].value = "a\nb";
    await elements["#rxRun"].click();

    assert.equal(elements["#rxStatus"].textContent, "OK. Flags: gsy · Treffer: 3");
    assert.equal(elements["#rxSafety"].textContent, "");
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
    assert.match(elements["#rxResult"].innerHTML, /<mark>a<\/mark> a/);
    assert.doesNotMatch(elements["#rxResult"].innerHTML, /Stryker was here!/);
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


test("Regex-Checker deckt Grenzfälle der lokalen ReDoS-Heuristiken ab", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();
    elements["#rxText"].value = "aaaaaaaaaaaaaaaa";

    elements["#rxPattern"].value = "(a|aa+)+";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-warn"), true);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /verschachtelte Quantifizierer, überlappende Alternativen in Wiederholung/);

    elements["#rxPattern"].value = ".+ {2,}";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /wiederholter Wildcard-Ausdruck/);

    elements["#rxPattern"].value = "(ab.*cd){2,}";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /wiederholter Wildcard-Ausdruck/);

    elements["#rxPattern"].value = "(ab|cd)+";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), true);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /keine zusätzlichen Auffälligkeiten|übersprungen/);
    assert.doesNotMatch(elements["#rxSafety"].flatValue.innerHTML, /überlappende Alternativen/);
});


test("Regex-Checker behandelt fehlende optionale Flags und Nullbreiten-Treffer beim Hervorheben", async () => {
    const {elements} = loadRegexChecker();
    elements["#rxFlagY"] = null;
    global.initRegex();

    elements["#rxFlagG"].checked = true;
    elements["#rxPattern"].value = "a*";
    elements["#rxText"].value = "ba";
    await elements["#rxRun"].click();

    assert.equal(elements["#rxStatus"].textContent, "OK. Flags: g · Treffer: 3");
    assert.match(elements["#rxResult"].innerHTML, /Treffer: <strong>3<\/strong>/);
    assert.match(elements["#rxResult"].innerHTML, /b<mark>a<\/mark>/);
});

test("Regex-Checker beschreibt kombinierte Sicherheitsfunde mit Namen, Reihenfolge und sicherem HTML", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();

    elements["#rxCheckRedos"].checked = true;
    elements["#rxPattern"].value = "(a+|a.*)+";
    elements["#rxText"].value = "aaaa";
    await elements["#rxRun"].click();

    assert.equal(elements["#rxSafety"].classList.contains("flat-warn"), true);
    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), false);
    assert.match(
        elements["#rxSafety"].flatValue.innerHTML,
        /lokale Basis-Heuristik:<\/span>\s*<span class="safety-message">potenziell gefährlich \(verschachtelte Quantifizierer, wiederholter Wildcard-Ausdruck\)/
    );
    assert.doesNotMatch(elements["#rxSafety"].flatValue.innerHTML, /Stryker was here!/);
});

test("Regex-Checker rendert sichere erweiterte Heuristik vollständig", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();

    elements["#rxCheckRedos"].checked = true;
    elements["#rxPattern"].value = "^foo$";
    elements["#rxText"].value = "foo";
    await elements["#rxRun"].click();

    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), true);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /lokale Basis-Heuristik:<\/span>\s*<span class="safety-message">unauffällig/);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /erweiterte lokale Heuristik:<\/span>\s*<span class="safety-message">keine zusätzlichen Auffälligkeiten/);
});



test("Regex-Checker unterscheidet kritische ReDoS-Grenzfälle mit Escape- und Mengenquantifizierern", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();
    elements["#rxText"].value = "aaaaaaaa";

    elements["#rxPattern"].value = "(a+){ 2 ,}";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /verschachtelte Quantifizierer/);

    elements["#rxPattern"].value = "(\\(+a+){2,}";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /verschachtelte Quantifizierer/);

    elements["#rxPattern"].value = ".* +";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /wiederholter Wildcard-Ausdruck/);

    elements["#rxPattern"].value = "(foo|foobar){ 1 ,}bar";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /überlappende Alternativen in Wiederholung/);

    elements["#rxPattern"].value = "(foo|bar){1,}";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), true);
    assert.doesNotMatch(elements["#rxSafety"].flatValue.innerHTML, /überlappende Alternativen/);
});

test("Regex-Checker erkennt ReDoS-Varianten mit Abstand, Escape-Sequenzen und mehreren Alternativen", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();
    elements["#rxText"].value = "aaaaaaaa";

    elements["#rxPattern"].value = "(a\\) +) +";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /verschachtelte Quantifizierer/);

    elements["#rxPattern"].value = "(a+\\\\b){10,}";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /verschachtelte Quantifizierer/);

    elements["#rxPattern"].value = ".+?suffix";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /wiederholter Wildcard-Ausdruck/);

    elements["#rxPattern"].value = "(pre.*post)+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /wiederholter Wildcard-Ausdruck/);

    elements["#rxPattern"].value = "(cat|catalog|dog)+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /überlappende Alternativen in Wiederholung/);

});

test("Regex-Checker prüft erweiterte ReDoS-Kombinationen mit breiten Klassen", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();
    elements["#rxCheckRedos"].checked = true;
    elements["#rxText"].value = "abc123";

    elements["#rxPattern"].value = "(foo|bar){ 2 ,}baz+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /Alternation kombiniert mit weiteren Quantifizierern/);

    elements["#rxPattern"].value = "(foo|bar)+baz{3,}";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /Alternation kombiniert mit weiteren Quantifizierern/);

    elements["#rxPattern"].value = "\\d+\\w+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /benachbarte breite Zeichenklassen mit Wiederholung/);

    elements["#rxPattern"].value = ".+\\s+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /benachbarte breite Zeichenklassen mit Wiederholung/);

    elements["#rxPattern"].value = "[^>]+[a-z]{ 1 ,}";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /benachbarte breite Zeichenklassen mit Wiederholung/);
});

test("Regex-Checker meldet Kopier- und Patternfehler", async () => {
    const empty = loadRegexChecker();
    global.initRegex();
    await empty.elements["#rxCopyMatches"].click();
    assert.equal(empty.elements["#rxStatus"].textContent, "Kein Pattern.");
    assert.equal(empty.elements["#rxStatus"].style.color, "var(--danger)");

    const failing = loadRegexChecker({copyFails: true});
    global.initRegex();
    failing.elements["#rxPattern"].value = "[";
    await failing.elements["#rxCopyMatches"].click();
    assert.equal(failing.elements["#rxStatus"].textContent, "Kopieren nicht möglich.");
    assert.equal(failing.elements["#rxStatus"].style.color, "var(--danger)");
});

test("Regex-Checker unterscheidet ReDoS-Sicherheitszustände und komplexe Extended-Heuristiken", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();
    elements["#rxText"].value = "abc123";

    elements["#rxPattern"].value = "(a+)+(.*)+";
    await elements["#rxRun"].click();
    assert.match(
        elements["#rxSafety"].flatValue.innerHTML,
        /potenziell gefährlich \(verschachtelte Quantifizierer, wiederholter Wildcard-Ausdruck\)/
    );
    assert.doesNotMatch(elements["#rxSafety"].flatValue.innerHTML, /verschachtelte Quantifiziererwiederholter Wildcard-Ausdruck/);

    elements["#rxCheckRedos"].checked = true;
    elements["#rxPattern"].value = "(foo|bar)+";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), true);
    assert.doesNotMatch(elements["#rxSafety"].flatValue.innerHTML, /Alternation kombiniert/);

    elements["#rxPattern"].value = "(foo|bar)+.+[a-z]+";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-warn"), true);
    assert.match(
        elements["#rxSafety"].flatValue.innerHTML,
        /auffällig \(Alternation kombiniert mit weiteren Quantifizierern, benachbarte breite Zeichenklassen mit Wiederholung\)/
    );
    assert.doesNotMatch(elements["#rxSafety"].flatValue.innerHTML, /Alternation kombiniert mit weiteren Quantifizierernbenachbarte/);

    elements["#rxPattern"].value = "[abc]+[def]+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /benachbarte breite Zeichenklassen mit Wiederholung/);

    elements["#rxPattern"].value = "[ab]+c+[de]+f+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /mehrere wiederholte Teilmuster/);
});

test("Regex-Checker setzt neutrale Ladeanzeige vor asynchroner Sicherheitsprüfung", () => {
    const {elements} = loadRegexChecker();
    global.initRegex();
    elements["#rxPattern"].value = "^safe$";
    elements["#rxText"].value = "safe";
    // Die Sicherheitsprüfung nutzt eine async-Funktion; der synchron sichtbare Zwischenzustand muss eindeutig sein.
    const runPromise = elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-neutral"), true);
    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), false);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /lokale Basis-Heuristik/);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /Prüfung läuft …/);
    return runPromise;
});

test("Regex-Checker meldet Fehler aus der asynchronen Sicherheitsanzeige als Warnung", async () => {
    const {elements} = loadRegexChecker({
        failSafetyWriteNumber: 2,
        failSafetyWriteMessage: "Sicherheitsanzeige defekt"
    });
    global.initRegex();

    elements["#rxPattern"].value = "^safe$";
    elements["#rxText"].value = "safe";
    await elements["#rxRun"].click();

    assert.equal(elements["#rxSafety"].classList.contains("flat-warn"), true);
    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), false);
    assert.equal(elements["#rxSafety"].classList.contains("flat-neutral"), false);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /Sicherheitsprüfung/);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /Sicherheitsanzeige defekt/);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /safety-warn/);
});

test("Regex-Checker fällt bei unbekanntem Sicherheitsfehler auf generische Warnmeldung zurück", async () => {
    const {elements} = loadRegexChecker({
        failSafetyWriteNumber: 2,
        failSafetyWriteError: {}
    });
    global.initRegex();

    elements["#rxPattern"].value = "^safe$";
    elements["#rxText"].value = "safe";
    await elements["#rxRun"].click();

    assert.equal(elements["#rxSafety"].classList.contains("flat-warn"), true);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /Sicherheitsprüfung/);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /fehlgeschlagen/);
    assert.doesNotMatch(elements["#rxSafety"].flatValue.innerHTML, /Stryker was here!/);
});

test("Regex-Checker bewertet Mengenquantifizierer nur mit gültiger Untergrenze als ReDoS-Signal", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();
    elements["#rxText"].value = "aaaaaaaa";

    elements["#rxPattern"].value = "(a+){,}";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /verschachtelte Quantifizierer/);

    elements["#rxPattern"].value = "(a+){ 12 ,}";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /verschachtelte Quantifizierer/);

    elements["#rxPattern"].value = "(a+){ a ,}";
    await elements["#rxRun"].click();
    assert.doesNotMatch(elements["#rxSafety"].flatValue.innerHTML, /verschachtelte Quantifizierer/);

    elements["#rxPattern"].value = ".*{ ,}";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /wiederholter Wildcard-Ausdruck/);

    elements["#rxPattern"].value = ".*{ word ,}";
    await elements["#rxRun"].click();
    assert.doesNotMatch(elements["#rxSafety"].flatValue.innerHTML, /wiederholter Wildcard-Ausdruck/);
});

test("Regex-Checker trennt wiederholte Gruppen exakt am Quantifizierer", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();
    elements["#rxText"].value = "foobar";

    elements["#rxPattern"].value = "(foo|foobar) { 2 ,}bar";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /überlappende Alternativen in Wiederholung/);

    elements["#rxPattern"].value = "x(foo|foobar)+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /überlappende Alternativen in Wiederholung/);
});


test("Regex-Checker entfernt veraltete Sicherheitsklassen bei Statuswechseln", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();

    elements["#rxPattern"].value = "(a+)+$";
    elements["#rxText"].value = "aaaa";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-warn"), true);

    elements["#rxPattern"].value = "^safe$";
    elements["#rxText"].value = "safe";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), true);
    assert.equal(elements["#rxSafety"].classList.contains("flat-warn"), false);
    assert.equal(elements["#rxSafety"].classList.contains("flat-neutral"), false);
});

test("Regex-Checker verhindert doppelte Copy-Listener bei erneuter Initialisierung", async () => {
    const {elements, copied} = loadRegexChecker();
    global.initRegex();
    global.initRegex();

    elements["#rxPattern"].value = "a";
    elements["#rxText"].value = "a a";
    await elements["#rxCopyMatches"].click();

    assert.deepEqual(copied, ["a\na"]);
    assert.equal(elements["#rxStatus"].textContent, "Matches kopiert: 2");
});

test("Regex-Checker prüft zusätzliche ReDoS-Abstands- und Alternationsgrenzen", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();
    elements["#rxCheckRedos"].checked = true;
    elements["#rxText"].value = "foobar123";

    elements["#rxPattern"].value = "(foo|foobar)   { 10 ,}z+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /überlappende Alternativen in Wiederholung/);

    elements["#rxPattern"].value = "(foo|bar)   +   z+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /Alternation kombiniert mit weiteren Quantifizierern/);

    elements["#rxPattern"].value = "[a-z]+   \\d+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /benachbarte breite Zeichenklassen mit Wiederholung/);
});

test("Regex-Checker behandelt escaped Alternationszeichen und leere Alternativen in Wiederholungen fachlich", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();
    elements["#rxText"].value = "foobar";

    elements["#rxPattern"].value = "(foo\\|foobar)+";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), true);
    assert.doesNotMatch(elements["#rxSafety"].flatValue.innerHTML, /überlappende Alternativen/);

    elements["#rxPattern"].value = "(foo|)+";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), true);
    assert.doesNotMatch(elements["#rxSafety"].flatValue.innerHTML, /überlappende Alternativen/);

    elements["#rxPattern"].value = "(foo|foobar){1,}";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-warn"), true);
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /überlappende Alternativen in Wiederholung/);
});

test("Regex-Checker prüft Mengenquantifizierer der erweiterten Heuristik mit Ziffern und Leerraum", async () => {
    const {elements} = loadRegexChecker();
    global.initRegex();
    elements["#rxCheckRedos"].checked = true;
    elements["#rxText"].value = "abc123";

    elements["#rxPattern"].value = "(foo|bar){ 12 ,}baz+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /Alternation kombiniert mit weiteren Quantifizierern/);

    elements["#rxPattern"].value = "[abc]+\\d+";
    await elements["#rxRun"].click();
    assert.match(elements["#rxSafety"].flatValue.innerHTML, /benachbarte breite Zeichenklassen mit Wiederholung/);

    elements["#rxPattern"].value = "a{ word ,}b{ also ,}";
    await elements["#rxRun"].click();
    assert.equal(elements["#rxSafety"].classList.contains("flat-safe"), true);
    assert.doesNotMatch(elements["#rxSafety"].flatValue.innerHTML, /mehrere wiederholte Teilmuster|benachbarte breite Zeichenklassen/);
});
