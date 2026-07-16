"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {createHarness} = require("../helpers/yaml-properties-harness");

test("initialisiert Beschriftungen und Platzhalter", () => {
    const {elements, init} = createHarness();
    init();

    assert.equal(elements["#ypInputLabel"].textContent, "Eingabe (YAML)");
    assert.equal(elements["#ypOutputLabel"].textContent, "Ausgabe (Properties)");
    assert.match(elements["#ypInput"].placeholder, /server:/);
    assert.equal(elements["#ypOutput"].placeholder, "Properties-Ergebnis…");
});

test("Beispiel und Konvertierung funktionieren", () => {
    const {elements, init, announcements} = createHarness();
    init();

    elements["#ypExample"].click();
    assert.equal(elements["#ypMode"].value, "yamlToProperties");
    assert.equal(elements["#ypOutput"].value, "");
    assert.equal(elements["#ypStatus"].textContent, "Beispiel eingefügt.");

    elements["#ypConvert"].click();
    assert.match(elements["#ypOutput"].value, /spring\.application\.name=demo-service/);
    assert.equal(elements["#ypStatus"].textContent, "Konvertierung abgeschlossen.");
    assert.ok(announcements.includes("YAML Properties Konvertierung abgeschlossen"));
});

test("Tauschen übernimmt das Ergebnis, wechselt die Richtung und leert die Ausgabe", () => {
    const {elements, init} = createHarness();
    init();

    elements["#ypInput"].value = "name: demo";
    elements["#ypConvert"].click();
    elements["#ypSwap"].click();

    assert.equal(elements["#ypMode"].value, "propertiesToYaml");
    assert.equal(elements["#ypInput"].value, "name=demo");
    assert.equal(elements["#ypOutput"].value, "");
    assert.equal(elements["#ypInputLabel"].textContent, "Eingabe (Properties)");
    assert.equal(elements["#ypOutputLabel"].textContent, "Ausgabe (YAML)");
    assert.equal(elements["#ypOutput"].placeholder, "YAML-Ergebnis…");
});

test("Richtungswechsel entfernt veraltete Ausgabe", () => {
    const {elements, init} = createHarness();
    init();

    elements["#ypOutput"].value = "stale=value";
    elements["#ypMode"].value = "propertiesToYaml";
    elements["#ypMode"].change();

    assert.equal(elements["#ypOutput"].value, "");
    assert.match(elements["#ypStatus"].textContent, /Ausgabe geleert/);
});

test("leere Eingabe entfernt veraltete Ausgabe", () => {
    const {elements, init, announcements} = createHarness();
    init();

    elements["#ypInput"].value = "";
    elements["#ypOutput"].value = "stale=value";
    elements["#ypConvert"].click();

    assert.equal(elements["#ypOutput"].value, "");
    assert.equal(elements["#ypStatus"].textContent, "Eingabe ist leer.");
    assert.ok(announcements.includes("YAML Properties Eingabe ist leer"));
});

test("Konvertierungsfehler werden angezeigt und angekündigt", () => {
    const {elements, init, announcements} = createHarness();
    init();

    elements["#ypInput"].value = "application:\n\tname: demo";
    elements["#ypConvert"].click();

    assert.match(elements["#ypStatus"].textContent, /Tabs in Einrückungen/);
    assert.equal(elements["#ypStatus"].style.color, "var(--danger)");
    assert.ok(announcements.includes("YAML Properties Konvertierung fehlgeschlagen"));
});

test("Löschen leert Ein- und Ausgabe", () => {
    const {elements, init} = createHarness();
    init();

    elements["#ypInput"].value = "name: demo";
    elements["#ypOutput"].value = "name=demo";
    elements["#ypClear"].click();

    assert.equal(elements["#ypInput"].value, "");
    assert.equal(elements["#ypOutput"].value, "");
    assert.equal(elements["#ypStatus"].textContent, "Geleert.");
});

test("Kopieren übergibt die Ausgabe exakt an safeCopy", async () => {
    const {elements, copiedValues, init} = createHarness();
    init();

    elements["#ypOutput"].value = "name=demo\npath=C:\\\\temp";
    await elements["#ypCopy"].click();

    assert.deepEqual(copiedValues, ["name=demo\npath=C:\\\\temp"]);
    assert.equal(elements["#ypStatus"].textContent, "Ausgabe kopiert.");
});

test("Fehler beim Kopieren wird verständlich angezeigt", async () => {
    const {elements, init} = createHarness({copyFails: true});
    init();

    elements["#ypOutput"].value = "name=demo";
    await elements["#ypCopy"].click();

    assert.equal(elements["#ypStatus"].textContent, "Kopieren nicht möglich.");
    assert.equal(elements["#ypStatus"].style.color, "var(--danger)");
});

test("wiederholte Konvertierung ist deterministisch", () => {
    const {elements, init} = createHarness();
    init();

    elements["#ypInput"].value = "name: demo";
    elements["#ypConvert"].click();
    const first = elements["#ypOutput"].value;

    elements["#ypConvert"].click();
    assert.equal(elements["#ypOutput"].value, first);
});

test("Initialisierung bricht ohne vollständige UI ohne Nebenwirkungen ab", () => {
    const {elements, init} = createHarness();
    delete elements["#ypExample"];

    assert.doesNotThrow(() => init());
    assert.equal(elements["#ypInputLabel"].textContent, "");
});

test("Properties-Modus setzt eigene Beschriftungen und Platzhalter", () => {
    const {elements, init} = createHarness();
    elements["#ypMode"].value = "propertiesToYaml";

    init();

    assert.equal(elements["#ypInputLabel"].textContent, "Eingabe (Properties)");
    assert.equal(elements["#ypOutputLabel"].textContent, "Ausgabe (YAML)");
    assert.match(elements["#ypInput"].placeholder, /server\.port=8080/);
    assert.equal(elements["#ypOutput"].placeholder, "YAML-Ergebnis…");
});

test("Whitespace-Eingabe gilt beim Konvertieren und Tauschen als leer", () => {
    const {elements, init, announcements} = createHarness();
    init();

    elements["#ypInput"].value = "  \n\t  ";
    elements["#ypOutput"].value = "stale=value";
    elements["#ypConvert"].click();

    assert.equal(elements["#ypOutput"].value, "");
    assert.equal(elements["#ypStatus"].textContent, "Eingabe ist leer.");
    assert.equal(elements["#ypStatus"].style.color, "var(--muted)");
    assert.ok(announcements.includes("YAML Properties Eingabe ist leer"));

    elements["#ypSwap"].click();
    assert.equal(elements["#ypInput"].value, "");
    assert.equal(elements["#ypOutput"].value, "");
    assert.equal(elements["#ypMode"].value, "propertiesToYaml");
});

test("Tauschen bevorzugt vorhandene Ausgabe vor erneuter Konvertierung", () => {
    const {elements, init} = createHarness();
    init();

    elements["#ypInput"].value = "name: original";
    elements["#ypOutput"].value = "name=edited";
    elements["#ypSwap"].click();

    assert.equal(elements["#ypInput"].value, "name=edited");
    assert.equal(elements["#ypOutput"].value, "");
    assert.equal(elements["#ypMode"].value, "propertiesToYaml");
});

test("Tauschfehler werden mit Fehlfarbe angezeigt", () => {
    const {elements, init} = createHarness();
    init();

    elements["#ypInput"].value = "application:\n\tname: demo";
    elements["#ypSwap"].click();

    assert.match(elements["#ypStatus"].textContent, /Tabs in Einrückungen/);
    assert.equal(elements["#ypStatus"].style.color, "var(--danger)");
    assert.equal(elements["#ypMode"].value, "yamlToProperties");
});
