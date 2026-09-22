"use strict";

function getIsoWeekInfo(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        throw new TypeError("Ein gültiges Datum ist erforderlich.");
    }

    const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const isoWeekday = day.getUTCDay() || 7;
    day.setUTCDate(day.getUTCDate() + 4 - isoWeekday);

    const weekYear = day.getUTCFullYear();
    const yearStart = new Date(Date.UTC(weekYear, 0, 1));
    const week = Math.ceil((((day - yearStart) / 86400000) + 1) / 7);

    return {week, year: weekYear};
}

function parseCalendarDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const candidate = new Date(year, month - 1, day);

    if (
        candidate.getFullYear() !== year ||
        candidate.getMonth() !== month - 1
    ) {
        return null;
    }

    return candidate;
}

function formatCalendarDate(date) {
    const year = String(date.getFullYear()).padStart(4, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatWeek(info) {
    return `KW ${info.week} / ${info.year}`;
}

function initCalendarWeek(now = new Date()) {
    const currentOutput = $("#calendarCurrentWeek");
    const input = $("#calendarDate");
    const calculateBtn = $("#calendarCalculate");
    const todayBtn = $("#calendarToday");
    const result = $("#calendarWeekResult");
    const status = $("#calendarWeekStatus");

    if (!currentOutput || !input || !calculateBtn || !todayBtn || !result || !status) return;

    const currentInfo = getIsoWeekInfo(now);
    currentOutput.textContent = formatWeek(currentInfo);

    const setStatus = (message, isError = false) => {
        status.textContent = message;
        status.style.color = isError ? "var(--danger)" : "var(--muted)";
    };

    const calculate = () => {
        const date = parseCalendarDate(input.value);
        if (!date) {
            result.textContent = "Keine gültige Kalenderwoche.";
            setStatus("Bitte ein gültiges Datum auswählen.", true);
            return;
        }

        const info = getIsoWeekInfo(date);
        result.textContent = formatWeek(info);
        setStatus(`Kalenderwoche für ${input.value} berechnet.`);
        setAnnounce(`Kalenderwoche ${info.week} im Jahr ${info.year}`);
    };

    const useToday = () => {
        input.value = formatCalendarDate(now);
        calculate();
    };

    calculateBtn.addEventListener("click", calculate);
    todayBtn.addEventListener("click", useToday);
    input.addEventListener("change", calculate);

    useToday();
}

window.OnlineToolsCalendarWeek = {
    formatCalendarDate,
    getIsoWeekInfo,
    init: initCalendarWeek,
    parseCalendarDate
};

document.addEventListener("DOMContentLoaded", () => {
    initCalendarWeek();
});
