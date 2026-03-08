const REMOTE_REGEX_SERVER = "toybox.cs.vt.edu";
const REMOTE_REGEX_API = "https://" + REMOTE_REGEX_SERVER + ":8000/api/lookup";

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
    const remoteConsent = $("#rxRemoteConsent");
    const runRedosCheck = $("#rxCheckRedos");

    if (!pattern || !text || !runBtn || !clearBtn || !result || !status || !copyBtn || !safety || !remoteConsent || !runRedosCheck) return;

    const label = $("#rxRemoteLabel");
    if (label) {
        label.append(` (Regex wird an ${REMOTE_REGEX_SERVER} gesendet)`);
    }

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
        safety.classList.remove("flat-safe", "flat-warn");

        if (state === "safe") safety.classList.add("flat-safe");
        if (state === "warn") safety.classList.add("flat-warn");
    }

    function safetyIcon(state) {
        if (state === "safe") return "✔";
        if (state === "warn") return "⚠";
        return "•";
    }

    // 1) safe-regex einmal laden (cached Promise)
    const safeRegexModule = import("https://esm.sh/safe-regex@1.1.0");

    // 2) redos-detector einmal laden (cached Promise)
    const redosDetectorModule = import("https://esm.sh/redos-detector@6.1.2");

    async function analyzeCatastrophicBacktrackingRisk(patternText, flags, allowRedos, allowRemote) {
        const checks = [];

        // -------------------------
        // 1) safe-regex (immer)
        // -------------------------
        let safeRegex;
        try {
            const mod = await safeRegexModule;
            safeRegex = mod.default || mod;
        } catch {
            checks.push({
                name: "safe-regex",
                state: "warn",
                message: "Bibliothek konnte nicht geladen werden"
            });

            return {
                classification: "warn",
                checks
            };
        }

        let safeOk = false;
        try {
            safeOk = safeRegex(patternText);
        } catch {
            checks.push({
                name: "safe-regex",
                state: "warn",
                message: "Analyse fehlgeschlagen"
            });

            return {
                classification: "warn",
                checks
            };
        }

        if (!safeOk) {
            checks.push({
                name: "safe-regex",
                state: "warn",
                message: "potenziell gefährlich (Backtracking möglich)"
            });

            return {
                classification: "warn",
                checks
            };
        }

        checks.push({
            name: "safe-regex",
            state: "safe",
            message: "unauffällig"
        });

        // -------------------------
        // 2) redos-detector (optional)
        // -------------------------
        if (allowRedos) {
            let isSafePattern;
            try {
                const mod = await redosDetectorModule;
                isSafePattern = mod.isSafePattern || mod.default?.isSafePattern || mod.default;
            } catch {
                checks.push({
                    name: "redos-detector",
                    state: "warn",
                    message: "Bibliothek konnte nicht geladen werden"
                });

                return {
                    classification: "warn",
                    checks
                };
            }

            const opts = {
                caseInsensitive: flags.includes("i"),
                unicode: flags.includes("u"),
                dotAll: flags.includes("s"),
                multiLine: flags.includes("m"),
                timeout: 80,
                maxSteps: 20000,
                maxScore: 200
            };

            let rd;
            try {
                rd = isSafePattern(patternText, opts);
            } catch (e) {
                checks.push({
                    name: "redos-detector",
                    state: "warn",
                    message: `Analyse fehlgeschlagen (${e?.message || "Fehler"})`
                });

                return {
                    classification: "warn",
                    checks
                };
            }

            if (!rd?.safe) {
                const scoreText = rd?.score?.infinite
                    ? "Score: ∞"
                    : (typeof rd?.score?.value === "number" ? `Score: ${rd.score.value}` : "Score: ?");

                const errText = rd?.error ? ` (${rd.error})` : "";

                checks.push({
                    name: "redos-detector",
                    state: "warn",
                    message: `UNSAFE – ${scoreText}${errText}`
                });

                return {
                    classification: "warn",
                    checks
                };
            }

            checks.push({
                name: "redos-detector",
                state: "safe",
                message: "unauffällig"
            });
        } else {
            checks.push({
                name: "redos-detector",
                state: "neutral",
                message: "übersprungen"
            });
        }

        // -------------------------
        // 3) Remote (optional)
        // -------------------------
        if (allowRemote) {
            let data;
            try {
                const resp = await fetch(REMOTE_REGEX_API, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        pattern: patternText,
                        language: "javascript",
                        requestType: "LOOKUP_ONLY"
                    })
                });

                if (!resp.ok) {
                    checks.push({
                        name: "Remote-Check",
                        state: "warn",
                        message: `HTTP ${resp.status}`
                    });

                    return {
                        classification: "warn",
                        checks
                    };
                }

                data = await resp.json();
            } catch (e) {
                checks.push({
                    name: "Remote-Check",
                    state: "warn",
                    message: `Request fehlgeschlagen (${e?.message || "Failed to fetch / CORS"})`
                });

                return {
                    classification: "warn",
                    checks
                };
            }

            const r =
                (typeof data?.result === "string") ? data.result :
                    (typeof data?.result?.result === "string") ? data.result.result :
                        null;

            if (r === "SAFE") {
                checks.push({
                    name: "Remote-Check",
                    state: "safe",
                    message: "SAFE"
                });
            } else if (r === "VULNERABLE") {
                checks.push({
                    name: "Remote-Check",
                    state: "warn",
                    message: "VULNERABLE (ReDoS möglich)"
                });

                return {
                    classification: "warn",
                    checks
                };
            } else if (r === "INVALID") {
                checks.push({
                    name: "Remote-Check",
                    state: "warn",
                    message: "INVALID (Regex ungültig)"
                });

                return {
                    classification: "warn",
                    checks
                };
            } else {
                checks.push({
                    name: "Remote-Check",
                    state: "warn",
                    message: r || "UNKNOWN"
                });

                return {
                    classification: "warn",
                    checks
                };
            }
        } else {
            checks.push({
                name: "Remote-Check",
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
            setSafety("neutral", "Noch nicht geprüft.");
            return;
        }

        const flags = getFlags();
        const allowRemote = remoteConsent.checked;
        const allowRedos = runRedosCheck.checked;

        let rx;

        // 1) Regex sofort kompilieren und Treffer direkt anzeigen
        try {
            rx = new RegExp(p, flags);
            const {matches} = renderMatches(rx, t);
            setStatus(`OK. Flags: ${flags || "(keine)"} · Treffer: ${matches.length}`);
        } catch (e) {
            setStatus(`Regex Fehler: ${e.message}`, true);
            result.innerHTML = `<p class="muted">Regex konnte nicht kompiliert werden.</p>`;
            setSafety("neutral", "Nicht geprüft, da Regex ungültig ist.");
            return;
        }

        // 2) Danach Sicherheitsprüfung
        setSafety("neutral");
        renderSafetyChecks([
            {name: "safe-regex", state: "neutral", message: "Prüfung läuft …"}
        ]);

        try {
            const risk = await analyzeCatastrophicBacktrackingRisk(p, flags, allowRedos, allowRemote);
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
        remoteConsent.checked = false;
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