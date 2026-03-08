
/* ========= Tool: Cron (minimal, pragmatic) ========= */
function initCron() {
    const expr = $("#cronExpr");
    const explainBtn = $("#cronExplain");
    const examplesBtn = $("#cronExamples");
    const clearBtn = $("#cronClear");
    const result = $("#cronResult");
    const status = $("#cronStatus");

    if (!expr || !explainBtn || !examplesBtn || !clearBtn || !result || !status) return;

    const setStatus = (msg, isError = false) => {
        status.textContent = msg;
        status.style.color = isError ? "var(--danger)" : "var(--muted)";
    };

    const explainField = (label, val) => {
        if (val === "*") return `${label}: jede(r/s)`;
        if (val.includes("*/")) return `${label}: alle ${val.split("*/")[1]}`;
        if (val.includes("-")) return `${label}: Bereich ${val}`;
        if (val.includes(",")) return `${label}: Liste ${val}`;
        return `${label}: ${val}`;
    };

    function explainCron(raw) {
        const parts = raw.trim().split(/\s+/);
        if (parts.length !== 5) {
            throw new Error("Erwartet 5 Felder: min hour dom mon dow");
        }
        const [min, hour, dom, mon, dow] = parts;

        return [
            explainField("Minute", min),
            explainField("Stunde", hour),
            explainField("Tag im Monat", dom),
            explainField("Monat", mon),
            explainField("Wochentag", dow),
        ];

    }

    explainBtn.addEventListener("click", () => {
        const raw = expr.value;
        if (!raw.trim()) {
            setStatus("Bitte Cron-Ausdruck eingeben.", true);
            return;
        }
        try {
            const lines = explainCron(raw);
            result.innerHTML = `
        <ul>
          ${lines.map(l => `<li>${escapeHtml(l)}</li>`).join("")}
        </ul>
        <p class="muted">Hinweis: Minimal-Interpretation (keine Sonderfälle wie @daily, ? oder Quartz).</p>
      `;
            setStatus("Erklärt.");
            setAnnounce("Cron erklärt");
        } catch (e) {
            result.innerHTML = `<p class="muted">Ungültig.</p>`;
            setStatus(e.message, true);
        }
    });

    examplesBtn.addEventListener("click", () => {
        const list = [
            {e: "*/5 * * * *", d: "Alle 5 Minuten"},
            {e: "0 9 * * 1-5", d: "Mo–Fr um 09:00"},
            {e: "30 2 1 * *", d: "Am 1. jeden Monats um 02:30"},
            {e: "0 0 * * 0", d: "Sonntag 00:00"},
        ];
        result.innerHTML = `
      <ul>
        ${list.map(x => `<li><code>${escapeHtml(x.e)}</code> – ${escapeHtml(x.d)}</li>`).join("")}
      </ul>
    `;
        setStatus("Beispiele geladen.");
    });

    clearBtn.addEventListener("click", () => {
        expr.value = "";
        result.innerHTML = `<p class="muted">Gib einen Ausdruck ein und klicke „Erklären“.</p>`;
        setStatus("Geleert.");
    });
}


/* ========= Boot ========= */
document.addEventListener("DOMContentLoaded", () => {
    initCron();
});