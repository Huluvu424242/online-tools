"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

function createElement(value = "") {
    const listeners = new Map();
    return {
        value,
        textContent: "",
        style: {},
        addEventListener(type, listener) { listeners.set(type, listener); },
        click() { return listeners.get("click")?.(); },
        change() { return listeners.get("change")?.(); }
    };
}

function loadCalendarWeek() {
    const elements = {
        "#calendarCurrentWeek": createElement(),
        "#calendarDate": createElement(),
        "#calendarCalculate": createElement(),
        "#calendarToday": createElement(),
        "#calendarWeekResult": createElement(),
        "#calendarWeekStatus": createElement()
    };
    const announcements = [];
    const toolWindow = {};

    global.window = toolWindow;
    global.document = {addEventListener() {}};
    global.$ = (selector) => elements[selector] || null;
    global.setAnnounce = (message) => announcements.push(message);

    global.eval(fs.readFileSync("src/calendar-week.js", "utf8") + "\n//# sourceURL=src/calendar-week.js");
    return {api: toolWindow.OnlineToolsCalendarWeek, elements, announcements};
}

test("ISO-Kalenderwochen werden auch an Jahresgrenzen korrekt bestimmt", () => {
    const {api} = loadCalendarWeek();

    assert.deepEqual(api.getIsoWeekInfo(new Date(2021, 0, 1)), {week: 53, year: 2020});
    assert.deepEqual(api.getIsoWeekInfo(new Date(2021, 0, 4)), {week: 1, year: 2021});
    assert.deepEqual(api.getIsoWeekInfo(new Date(2024, 11, 30)), {week: 1, year: 2025});
    assert.deepEqual(api.getIsoWeekInfo(new Date(2026, 8, 22)), {week: 39, year: 2026});
});

test("Datumswerte werden streng validiert und lokal formatiert", () => {
    const {api} = loadCalendarWeek();

    assert.equal(api.formatCalendarDate(new Date(2026, 8, 2)), "2026-09-02");
    assert.equal(api.parseCalendarDate("2024-02-29")?.getDate(), 29);
    assert.equal(api.parseCalendarDate("2023-02-29"), null);
    assert.equal(api.parseCalendarDate("2026-13-01"), null);
    assert.equal(api.parseCalendarDate("22.09.2026"), null);
    assert.throws(() => api.getIsoWeekInfo(new Date("invalid")), /gültiges Datum/);
});

test("UI zeigt aktuelle und ausgewählte Kalenderwoche an", () => {
    const {api, elements, announcements} = loadCalendarWeek();
    api.init(new Date(2026, 8, 22));

    assert.equal(elements["#calendarCurrentWeek"].textContent, "KW 39 / 2026");
    assert.equal(elements["#calendarDate"].value, "2026-09-22");
    assert.equal(elements["#calendarWeekResult"].textContent, "KW 39 / 2026");

    elements["#calendarDate"].value = "2021-01-01";
    elements["#calendarCalculate"].click();
    assert.equal(elements["#calendarWeekResult"].textContent, "KW 53 / 2020");
    assert.equal(elements["#calendarWeekStatus"].textContent, "Kalenderwoche für 2021-01-01 berechnet.");
    assert.ok(announcements.includes("Kalenderwoche 53 im Jahr 2020"));
});

test("UI behandelt ungültige Eingaben verständlich und bleibt bei fehlenden Elementen robust", () => {
    const {api, elements} = loadCalendarWeek();
    api.init(new Date(2026, 8, 22));

    elements["#calendarDate"].value = "";
    elements["#calendarCalculate"].click();
    assert.equal(elements["#calendarWeekResult"].textContent, "Keine gültige Kalenderwoche.");
    assert.equal(elements["#calendarWeekStatus"].textContent, "Bitte ein gültiges Datum auswählen.");
    assert.equal(elements["#calendarWeekStatus"].style.color, "var(--danger)");

    const originalQuery = global.$;
    global.$ = (selector) => selector === "#calendarDate" ? null : originalQuery(selector);
    assert.doesNotThrow(() => api.init(new Date(2026, 8, 22)));
});
