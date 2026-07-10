/* ========= Tool: Regex ========= */
function initRegex() {
    const root = document.getElementById("tool-regex");
    if (!root) return;

    if (root.dataset.initialized) return;
    root.dataset.initialized = "true";

    const pattern = $("#rxPattern");
    const text = $("#rxText");
    const runBtn = $("#rxRun");
    const clearBtn = $("#rxClear");
    const result = $("#rxResult");
    const status = $("#rxStatus");
    const copyBtn = $("#rxCopyMatches");
    const safety = $("#rxSafety");
    const runRedosCheck = $("#rxCheckRedos");

    if (!pattern || !text || !runBtn || !clearBtn || !result || !status || !copyBtn || !safety || !runRedosCheck) return;

    const flagEls = {
        g: $("#rxFlagG"),
        i: $("#rxFlagI"),
        m: $("#rxFlagM"),
        s: $("#rxFlagS"),
        u: $("#rxFlagU"),
        y: $("#rxFlagY"),
    };

    const getFlags = () => Object.entries(flagEls).filter(([, el]) => el?.checked).map(([f]) => f).join("");

    const setStatus = (msg, isError = false) => {
        status.textContent = msg;
        status.style.color = isError ? "var(--danger)" : "var(--muted)";
    };

    function setSafety(state) {
        safety.classList.remove("flat-safe", "flat-warn", "flat-neutral");

        if (state === "safe") safety.classList.add("flat-safe");
        if (state === "warn") safety.classList.add("flat-warn");
        if (state === "neutral") safety.classList.add("flat-neutral");
    }

    function safetyIcon(state) {
        if (state === "safe") return "✔";
        if (state === "warn") return "⚠";
        return "•";
    }

    function hasNestedQuantifier(patternText) {
        return /\((?:\\.|[^()])*[+*](?:\\.|[^()])*\)\s*(?:[+*?]|\{\s*\d*\s*,)/.test(patternText);
    }

    function hasAmbiguousWildcardRepeat(patternText) {
        return /(?:\.\*|\.\+)\s*(?:[+*?]|\{\s*\d*\s*,)/.test(patternText) || /\((?:\\.|[^()\\])*\.\*(?:\\.|[^()\\])*\)\s*(?:[+*?]|\{\s*\d*\s*,)/.test(patternText);
    }

    function hasOverlappingAlternation(patternText) {
        const groups = patternText.match(/\((?:\\.|[^()])+\)\s*(?:[+*]|\{\s*\d*\s*,)/g) || [];

        return groups.some((group) => {
            const body = group.replace(/^\(/, "").replace(/\)\s*(?:[+*]|\{\s*\d*\s*,).*$/, "");
            const parts = body.split("|").map((part) => part.replace(/\\./g, "x")).filter(Boolean);

            return parts.some((part, index) => parts.some((other, otherIndex) => (
                index !== otherIndex && (part.startsWith(other) || other.startsWith(part))
            )));
        });
    }

    function hasLongBacktrackingChain(patternText) {
        const greedyQuantifiers = patternText.match(/(?:\\.|\[[^\]]*\]|\([^)]*\)|\.|\w)\s*(?:[+*]|\{\s*\d*\s*,)/g) || [];
        return greedyQuantifiers.length >= 4;
    }

    function runBaselineSafetyHeuristic(patternText) {
        const findings = [];

        if (hasNestedQuantifier(patternText)) {
            findings.push("verschachtelte Quantifizierer");
        }

        if (hasAmbiguousWildcardRepeat(patternText)) {
            findings.push("wiederholter Wildcard-Ausdruck");
        }

        if (hasOverlappingAlternation(patternText)) {
            findings.push("überlappende Alternativen in Wiederholung");
        }

        if (findings.length > 0) {
            return {
                state: "warn",
                message: `potenziell gefährlich (${findings.join(", ")})`
            };
        }

        return {
            state: "safe",
            message: "unauffällig"
        };
    }

    function runExtendedSafetyHeuristic(patternText) {
        const findings = [];

        if (hasLongBacktrackingChain(patternText)) {
            findings.push("mehrere wiederholte Teilmuster");
        }

        if (/\([^)]*\|[^)]*\)\s*(?:[+*]|\{\s*\d*\s*,)/.test(patternText) && /(?:[+*]|\{\s*\d*\s*,)/.test(patternText.replace(/\([^)]*\|[^)]*\)\s*(?:[+*]|\{\s*\d*\s*,)/, ""))) {
            findings.push("Alternation kombiniert mit weiteren Quantifizierern");
        }

        if (/(?:\[[^\]]*\]|\\[dws]|\.)\s*(?:[+*]|\{\s*\d*\s*,)\s*(?:\[[^\]]*\]|\\[dws]|\.)\s*(?:[+*]|\{\s*\d*\s*,)/.test(patternText)) {
            findings.push("benachbarte breite Zeichenklassen mit Wiederholung");
        }

        if (findings.length > 0) {
            return {
                state: "warn",
                message: `auffällig (${findings.join(", ")})`
            };
        }

        return {
            state: "safe",
            message: "keine zusätzlichen Auffälligkeiten"
        };
    }

    async function analyzeCatastrophicBacktrackingRisk(patternText, allowExtendedHeuristic) {
        const checks = [];
        const baseline = runBaselineSafetyHeuristic(patternText);

        checks.push({
            name: "lokale Basis-Heuristik",
            state: baseline.state,
            message: baseline.message
        });

        if (baseline.state === "warn") {
            return {
                classification: "warn",
                checks
            };
        }

        if (allowExtendedHeuristic) {
            const extended = runExtendedSafetyHeuristic(patternText);

            checks.push({
                name: "erweiterte lokale Heuristik",
                state: extended.state,
                message: extended.message
            });

            if (extended.state === "warn") {
                return {
                    classification: "warn",
                    checks
                };
            }
        } else {
            checks.push({
                name: "erweiterte lokale Heuristik",
                state: "neutral",
                message: "übersprungen"
            });
        }

        return {
            classification: "safe",
            checks
        };
    }

    function renderSafetyChecks(checks) {
        const valueEl = $(".flat-value", safety);
        if (!valueEl) {
            safety.textContent = "";
            return;
        }

        if (!checks || checks.length === 0) {
            valueEl.innerHTML = `<span class="muted">Noch nicht geprüft.</span>`;
            return;
        }

        valueEl.innerHTML = checks.map((check) => `
            <div class="safety-line safety-${check.state}">
                <span class="safety-icon">${safetyIcon(check.state)}</span>
                <span class="safety-name">${escapeHtml(check.name)}:</span>
                <span class="safety-message">${escapeHtml(check.message)}</span>
            </div>
        `).join("");
    }

    function renderMatches(regex, srcText) {
        // For highlighting, we build a list of match ranges.
        const matches = [];
        if (regex.global) {
            let m;
            while ((m = regex.exec(srcText)) !== null) {
                matches.push({start: m.index, end: m.index + m[0].length, value: m[0]});
                if (m[0].length === 0) regex.lastIndex++; // avoid infinite loop
            }
        } else {
            const m = regex.exec(srcText);
            if (m) matches.push({start: m.index, end: m.index + m[0].length, value: m[0]});
        }

        if (matches.length === 0) {
            result.innerHTML = `<p class="muted">Keine Treffer.</p>`;
            return {matches};
        }

        // Build highlighted HTML safely
        let html = "";
        let pos = 0;
        for (const m of matches) {
            html += escapeHtml(srcText.slice(pos, m.start));
            html += `<mark>${escapeHtml(srcText.slice(m.start, m.end))}</mark>`;
            pos = m.end;
        }
        html += escapeHtml(srcText.slice(pos));

        result.innerHTML = `
      <p class="muted">Treffer: <strong>${matches.length}</strong></p>
      <div class="mono">${html.replace(/\n/g, "<br>")}</div>
    `;

        return {matches};
    }

    runBtn.addEventListener("click", async () => {
        const p = pattern.value;
        const t = text.value;

        if (!p) {
            setStatus("Bitte ein Pattern eingeben.", true);
            result.innerHTML = `<p class="muted">Noch nichts ausgeführt.</p>`;
            setSafety("neutral");
            renderSafetyChecks([]);
            return;
        }

        const flags = getFlags();
        const allowExtendedHeuristic = runRedosCheck.checked;

        let rx;

        // 1) Regex sofort kompilieren und Treffer direkt anzeigen
        try {
            rx = new RegExp(p, flags);
            const {matches} = renderMatches(rx, t);
            setStatus(`OK. Flags: ${flags || "(keine)"} · Treffer: ${matches.length}`);
        } catch (e) {
            setStatus(`Regex Fehler: ${e.message}`, true);
            result.innerHTML = `<p class="muted">Regex konnte nicht kompiliert werden.</p>`;
            setSafety("neutral");
            renderSafetyChecks([
                {name: "Sicherheitsprüfung", state: "neutral", message: "nicht geprüft, da Regex ungültig ist"}
            ]);
            return;
        }

        // 2) Danach lokale Sicherheitsprüfung
        setSafety("neutral");
        renderSafetyChecks([
            {name: "lokale Basis-Heuristik", state: "neutral", message: "Prüfung läuft …"}
        ]);

        try {
            const risk = await analyzeCatastrophicBacktrackingRisk(p, allowExtendedHeuristic);
            setSafety(risk.classification);
            renderSafetyChecks(risk.checks);
        } catch (e) {
            setSafety("warn");
            renderSafetyChecks([
                {name: "Sicherheitsprüfung", state: "warn", message: e?.message || "fehlgeschlagen"}
            ]);
        }
    });

    clearBtn.addEventListener("click", () => {
        pattern.value = "";
        text.value = "";
        result.innerHTML = `<p class="muted">Noch nichts ausgeführt.</p>`;
        setStatus("Geleert.");
        runRedosCheck.checked = false;
        setSafety("neutral");
        renderSafetyChecks([]);
    });

    copyBtn.addEventListener("click", async () => {
        try {
            // Extract matches from marked content is messy; recompute with current inputs.
            const p = pattern.value;
            if (!p) return setStatus("Kein Pattern.", true);

            const flags = getFlags();
            const rx = new RegExp(p, flags.includes("g") ? flags : flags + "g");
            const t = text.value;

            const out = [];
            let m;
            while ((m = rx.exec(t)) !== null) {
                out.push(m[0]);
                if (m[0].length === 0) rx.lastIndex++;
            }

            await safeCopy(out.join("\n"));
            setStatus(`Matches kopiert: ${out.length}`);
        } catch {
            setStatus("Kopieren nicht möglich.", true);
        }
    });
}


/* ========= Boot ========= */
document.addEventListener("DOMContentLoaded", () => {
    initRegex();
});
