"use strict";

/* ========= Helpers ========= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function setAnnounce(msg) {
    const el = $("#announcer");
    if (!el) return;
    el.textContent = msg;
}

function safeCopy(text) {
    if (!navigator.clipboard) return Promise.reject(new Error("Clipboard API not available"));
    return navigator.clipboard.writeText(text);
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
}

/* ========= Theme ========= */
function initTheme() {
    const key = "online-tools.theme";
    const saved = localStorage.getItem(key);
    if (saved === "light" || saved === "dark") {
        document.documentElement.dataset.theme = saved;
    } else {
        // default: follow system (no dataset) but allow toggle to set explicitly
        document.documentElement.dataset.theme = window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }

    const btn = $("#themeToggle");
    if (!btn) return;

    const applyPressed = () => {
        const isLight = document.documentElement.dataset.theme === "light";
        btn.setAttribute("aria-pressed", String(isLight));
    };

    applyPressed();

    btn.addEventListener("click", () => {
        const current = document.documentElement.dataset.theme;
        const next = current === "light" ? "dark" : "light";
        document.documentElement.dataset.theme = next;
        localStorage.setItem(key, next);
        applyPressed();
        setAnnounce(`Theme: ${next}`);
    });
}

/* ========= Navigation state (aria-current) ========= */
function initNavHighlight() {
    const links = $$(".nav-link");
    const sections = $$(".tool");

    const byId = new Map(sections.map(s => [s.id, s]));
    const setCurrent = (hash) => {
        links.forEach(a => a.setAttribute("aria-current", "false"));
        const active = links.find(a => a.getAttribute("href") === hash);
        if (active) active.setAttribute("aria-current", "true");
    };

    // On click
    links.forEach(a => a.addEventListener("click", () => setCurrent(a.getAttribute("href"))));

    // On scroll (simple observer)
    const obs = new IntersectionObserver((entries) => {
        const visible = entries
            .filter(e => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        setCurrent(`#${visible.target.id}`);
    }, {root: null, threshold: [0.25, 0.4, 0.6]});

    sections.forEach(s => obs.observe(s));

    // initial
    if (location.hash && byId.has(location.hash.slice(1))) setCurrent(location.hash);
    else setCurrent("#tool-base64");
}

/* ========= Global search (filter tools) ========= */
function initToolSearch() {
    const input = $("#toolSearch");
    const nav = $("#toolNav");
    if (!input || !nav) return;

    const navItems = $$(".nav-link", nav).map(a => ({
        a,
        li: a.closest("li"),
        text: (a.textContent || "").toLowerCase(),
        tool: (a.dataset.tool || "").toLowerCase()
    }));

    const toolSections = $$(".tool").map(sec => ({
        sec,
        name: (sec.dataset.name || sec.id).toLowerCase(),
        tags: (sec.dataset.tags || "").toLowerCase()
    }));

    const apply = () => {
        const q = input.value.trim().toLowerCase();
        if (!q) {
            navItems.forEach(i => i.li && (i.li.hidden = false));
            toolSections.forEach(t => (t.sec.hidden = false));
            setAnnounce("Filter zurückgesetzt");
            return;
        }

        const match = (hay) => hay.includes(q);

        navItems.forEach(i => {
            const ok = match(i.text) || match(i.tool);
            if (i.li) i.li.hidden = !ok;
        });

        toolSections.forEach(t => {
            const ok = match(t.name) || match(t.tags);
            t.sec.hidden = !ok;
        });

        setAnnounce(`Filter aktiv: ${q}`);
    };

    input.addEventListener("input", apply);

    // Ctrl/⌘ K focus
    window.addEventListener("keydown", (e) => {
        const isK = e.key && e.key.toLowerCase() === "k";
        if ((e.ctrlKey || e.metaKey) && isK) {
            e.preventDefault();
            input.focus();
            input.select();
        } else if (e.key === "Escape") {
            // reset filter
            input.value = "";
            apply();
            input.blur();
        }
    });
}

/* ========= Share link ========= */
function initShareLink() {
    const btn = $("#copyLink");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        try {
            await safeCopy(location.href);
            setAnnounce("Link kopiert");
        } catch {
            setAnnounce("Kopieren nicht möglich");
        }
    });
}

/* ========= Tool: Base64 ========= */
function initBase64() {
    const input = $("#b64Input");
    const output = $("#b64Output");
    const status = $("#b64Status");

    const encodeBtn = $("#b64Encode");
    const decodeBtn = $("#b64Decode");
    const swapBtn = $("#b64Swap");
    const clearBtn = $("#b64Clear");
    const copyBtn = $("#b64Copy");

    if (!input || !output || !status || !encodeBtn || !decodeBtn || !swapBtn || !clearBtn || !copyBtn) return;

    const setStatus = (msg, isError = false) => {
        status.textContent = msg;
        status.style.color = isError ? "var(--danger)" : "var(--muted)";
    };

    const utf8ToB64 = (str) => {
        // Handles UTF-8 safely
        const bytes = new TextEncoder().encode(str);
        let bin = "";
        bytes.forEach(b => bin += String.fromCharCode(b));
        return btoa(bin);
    };

    const b64ToUtf8 = (b64) => {
        const bin = atob(b64);
        const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    };

    encodeBtn.addEventListener("click", () => {
        try {
            output.value = utf8ToB64(input.value);
            setStatus("Kodiert.");
            setAnnounce("Base64 kodiert");
        } catch (e) {
            setStatus("Fehler beim Kodieren.", true);
        }
    });

    decodeBtn.addEventListener("click", () => {
        try {
            output.value = b64ToUtf8(input.value.trim());
            setStatus("Dekodiert.");
            setAnnounce("Base64 dekodiert");
        } catch (e) {
            setStatus("Ungültiges Base64.", true);
        }
    });

    swapBtn.addEventListener("click", () => {
        const tmp = input.value;
        input.value = output.value;
        output.value = tmp;
        setStatus("Eingabe/Ausgabe getauscht.");
    });

    clearBtn.addEventListener("click", () => {
        input.value = "";
        output.value = "";
        setStatus("Geleert.");
    });

    copyBtn.addEventListener("click", async () => {
        try {
            await safeCopy(output.value);
            setStatus("Ausgabe kopiert.");
        } catch {
            setStatus("Kopieren nicht möglich.", true);
        }
    });
}

/* ========= Tool: Regex ========= */
function initRegex() {
    const pattern = $("#rxPattern");
    const text = $("#rxText");
    const runBtn = $("#rxRun");
    const clearBtn = $("#rxClear");
    const result = $("#rxResult");
    const status = $("#rxStatus");
    const copyBtn = $("#rxCopyMatches");
    const safety = $("#rxSafety");
    const remoteConsent = $("#rxRemoteConsent");

    if (!pattern || !text || !runBtn || !clearBtn || !result || !status || !copyBtn || !safety || !remoteConsent) return;

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

    function setSafety(state, message) {
        // state: "neutral" | "safe" | "warn"
        safety.classList.remove("flat-safe", "flat-warn");
        // const valueEl = $(".flat-value", safety) || safety;

        if (state === "safe") safety.classList.add("flat-safe");
        if (state === "warn") safety.classList.add("flat-warn");

        // If the markup exists:
        if ($(".flat-value", safety)) {
            $(".flat-value", safety).textContent = message;
        } else {
            safety.textContent = message;
        }
    }


    // 1) safe-regex einmal laden (cached Promise)
    const safeRegexModule = import("https://esm.sh/safe-regex@1.1.0");

    // 2) redos-detector einmal laden (cached Promise)
    const redosDetectorModule = import("https://esm.sh/redos-detector@6.1.2");

    /**
     * 3-stufige ReDoS-Prüfung:
     * - safe-regex (lokal, schnell)
     * - redos-detector (lokal, genauer)
     * - vuln-regex-detector (remote, nur bei Opt-in)
     *
     * Rückgabe:
     * { classification: "safe" | "warn" | "neutral", message: string }
     */
    async function analyzeCatastrophicBacktrackingRisk(patternText, flags, allowRemote) {
        // -------------------------
        // 1) safe-regex (lokal)
        // -------------------------
        let safeRegex;
        try {
            const mod = await safeRegexModule;
            safeRegex = mod.default || mod;
        } catch {
            return {classification: "warn", message: "safe-regex: Bibliothek konnte nicht geladen werden"};
        }

        let safeOk = false;
        try {
            safeOk = safeRegex(patternText);
        } catch {
            return {classification: "warn", message: "safe-regex: Analyse fehlgeschlagen"};
        }

        if (!safeOk) {
            return {classification: "warn", message: "safe-regex: potenziell gefährlich (Backtracking möglich)"};
        }

        // -------------------------
        // 2) redos-detector (lokal)
        // -------------------------
        let isSafePattern;
        try {
            const mod = await redosDetectorModule;
            // esm-sh kann default oder named liefern
            isSafePattern = mod.isSafePattern || mod.default?.isSafePattern || mod.default;
        } catch {
            return {classification: "warn", message: "redos-detector: Bibliothek konnte nicht geladen werden"};
        }

        // Flags in Optionen übersetzen (redos-detector akzeptiert diese Optionen) :contentReference[oaicite:4]{index=4}
        const opts = {
            caseInsensitive: flags.includes("i"),
            unicode: flags.includes("u"),
            dotAll: flags.includes("s"),
            multiLine: flags.includes("m"),

            // wichtig für UI: nicht ewig rechnen
            timeout: 80,     // ms (klein halten, sonst UI zäh)
            maxSteps: 20000, // Default lt. Doku; bleibt ok
            maxScore: 200    // Default lt. Doku
        };

        let rd;
        try {
            rd = isSafePattern(patternText, opts);
        } catch (e) {
            return {
                classification: "warn",
                message: `redos-detector: Analyse fehlgeschlagen (${e?.message || "Fehler"})`
            };
        }

        if (!rd?.safe) {
            const scoreText = rd?.score?.infinite
                ? "Score: ∞"
                : (typeof rd?.score?.value === "number" ? `Score: ${rd.score.value}` : "Score: ?");

            const errText = rd?.error ? ` (${rd.error})` : "";
            return {
                classification: "warn",
                message: `redos-detector: UNSAFE – ${scoreText}${errText}`
            };
        }

        // -------------------------
        // 3) Remote (nur bei Opt-in)
        // -------------------------
        if (!allowRemote) {
            return {
                classification: "safe",
                message: "OK (lokal: safe-regex + redos-detector)"
            };
        }

        let data;
        try {
            const resp = await fetch("https://toybox.cs.vt.edu:8000/api/lookup", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    pattern: patternText,
                    language: "javascript",
                    requestType: "LOOKUP_ONLY"
                })
            });

            if (!resp.ok) {
                return {classification: "warn", message: `vuln-regex-detector: HTTP ${resp.status}`};
            }
            data = await resp.json();
        } catch (e) {
            // Browser zeigt bei CORS typischerweise nur "Failed to fetch"
            return {
                classification: "warn",
                message: `vuln-regex-detector: Request fehlgeschlagen (${e?.message || "Failed to fetch / CORS"})`
            };
        }

        const r =
            (typeof data?.result === "string") ? data.result :
                (typeof data?.result?.result === "string") ? data.result.result :
                    null;

        if (r === "SAFE") {
            return {classification: "safe", message: "OK (lokal + remote: SAFE)"};
        }
        if (r === "VULNERABLE") {
            return {classification: "warn", message: "vuln-regex-detector: VULNERABLE (ReDoS möglich)"};
        }
        if (r === "INVALID") {
            return {classification: "warn", message: "vuln-regex-detector: INVALID (Regex ungültig)"};
        }
        return {classification: "warn", message: `vuln-regex-detector: ${r || "UNKNOWN"}`};
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

        setSafety("neutral", `Prüfe: ${p}`);

        const flags = getFlags();
        const allowRemote = remoteConsent.checked;

        const risk = await analyzeCatastrophicBacktrackingRisk(p, flags, allowRemote);
        setSafety(risk.classification, `Geprüft  ${p} und ermittelt: ` + risk.message);

        try {
            const rx = new RegExp(p, flags);
            const {matches} = renderMatches(rx, t);
            setStatus(`OK. Flags: ${flags || "(keine)"} · Treffer: ${matches.length}`);
            setAnnounce(`Regex geprüft. Treffer: ${matches.length}`);
        } catch (e) {
            setStatus(`Regex Fehler: ${e.message}`, true);
            result.innerHTML = `<p class="muted">Regex konnte nicht kompiliert werden.</p>`;
        }
    });

    clearBtn.addEventListener("click", () => {
        pattern.value = "";
        text.value = "";
        result.innerHTML = `<p class="muted">Noch nichts ausgeführt.</p>`;
        setStatus("Geleert.");
        remoteConsent.checked = false;
        setSafety("neutral", "Noch nicht geprüft.");
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

function initRegexCompare() {
    const patternA = $("#rcPatternA");
    const patternB = $("#rcPatternB");
    const compareBtn = $("#rcCompare");
    const swapBtn = $("#rcSwap");
    const clearBtn = $("#rcClear");
    const result = $("#rcResult");
    const hint = $("#rcHint");
    const statusBox = $("#rcStatusBox");

    if (!patternA || !patternB || !compareBtn || !swapBtn || !clearBtn || !result || !hint || !statusBox) return;

    function setStatus(state, message) {
        statusBox.classList.remove("flat-safe", "flat-warn", "flat-neutral");
        if (state === "safe") statusBox.classList.add("flat-safe");
        else if (state === "warn") statusBox.classList.add("flat-warn");
        else statusBox.classList.add("flat-neutral");

        const valueEl = $(".flat-value", statusBox);
        if (valueEl) valueEl.textContent = message;
    }

    function setHint(message, isError = false) {
        hint.textContent = message;
        hint.style.color = isError ? "var(--danger)" : "var(--muted)";
    }

    function containsUnsupportedConstructs(pattern) {
        const findings = [];

        if (/[()]/.test(pattern)) findings.push("Gruppen mit ( )");
        if (/\\[1-9]/.test(pattern)) findings.push("Backreferences");
        if (/\(\?[:=!<]/.test(pattern)) findings.push("Spezialgruppen / Lookaround");
        if (/\(\?<=|\(\?<!/.test(pattern)) findings.push("Lookbehind");
        if (/\(\?=|\(\?!/.test(pattern)) findings.push("Lookahead");

        return findings;
    }

    function normalizeSimpleRegex(pattern) {
        return pattern.replace(/\s+/g, "");
    }

    function generateSampleWords(alphabet, maxLen) {
        const words = [""];
        for (let len = 1; len <= maxLen; len++) {
            const next = [];
            for (const prefix of words.filter(w => w.length === len - 1)) {
                for (const ch of alphabet) {
                    next.push(prefix + ch);
                }
            }
            words.push(...next);
        }
        return words;
    }

    function extractAlphabet(...patterns) {
        const chars = new Set();
        for (const pattern of patterns) {
            for (const ch of pattern) {
                if (/^[a-zA-Z0-9]$/.test(ch)) chars.add(ch);
            }
        }
        if (chars.size === 0) {
            chars.add("a");
            chars.add("b");
        }
        return [...chars].slice(0, 6);
    }

    function compareBySamples(a, b) {
        const alphabet = extractAlphabet(a, b);
        const samples = generateSampleWords(alphabet, 4);

        let rxA;
        let rxB;

        try {
            rxA = new RegExp(`^(?:${a})$`);
            rxB = new RegExp(`^(?:${b})$`);
        } catch (e) {
            return {
                ok: false,
                type: "invalid",
                message: `Ungültiges Regex: ${e.message}`
            };
        }

        for (const sample of samples) {
            const aMatch = rxA.test(sample);
            const bMatch = rxB.test(sample);
            if (aMatch !== bMatch) {
                return {
                    ok: true,
                    equal: false,
                    witness: sample
                };
            }
        }

        return {
            ok: true,
            equal: true,
            witness: null
        };
    }

    compareBtn.addEventListener("click", () => {
        const aRaw = patternA.value.trim();
        const bRaw = patternB.value.trim();

        if (!aRaw || !bRaw) {
            setStatus("warn", "Bitte beide Regexe eingeben.");
            setHint("Es fehlen Eingaben.", true);
            result.innerHTML = `<p class="muted">Bitte Regex A und Regex B befüllen.</p>`;
            return;
        }

        const unsupportedA = containsUnsupportedConstructs(aRaw);
        const unsupportedB = containsUnsupportedConstructs(bRaw);

        if (unsupportedA.length || unsupportedB.length) {
            const parts = [];
            if (unsupportedA.length) parts.push(`Regex A enthält: ${unsupportedA.join(", ")}`);
            if (unsupportedB.length) parts.push(`Regex B enthält: ${unsupportedB.join(", ")}`);

            setStatus("warn", "Nicht unterstützte Konstrukte gefunden.");
            setHint("Vergleich abgebrochen.", true);
            result.innerHTML = `
        <p><strong>Vergleich nicht möglich.</strong></p>
        <p>${escapeHtml(parts.join(" | "))}</p>
        <p class="muted">
          Unterstützt wird nur eine eingeschränkte reguläre Teilmenge ohne Gruppen und ohne engine-spezifische Erweiterungen.
        </p>
      `;
            return;
        }

        const a = normalizeSimpleRegex(aRaw);
        const b = normalizeSimpleRegex(bRaw);

        if (a === b) {
            setStatus("safe", "Regexe sind textuell identisch.");
            setHint("Direkte Übereinstimmung.");
            result.innerHTML = `
        <p><strong>Ergebnis:</strong> Die Regexe sind nach Normalisierung identisch.</p>
        <p class="muted">Das ist ein starker Hinweis auf Gleichheit, aber noch kein formaler Beweis für beliebige Engines.</p>
      `;
            return;
        }

        const cmp = compareBySamples(a, b);

        if (!cmp.ok) {
            setStatus("warn", "Vergleich fehlgeschlagen.");
            setHint(cmp.message, true);
            result.innerHTML = `<p>${escapeHtml(cmp.message)}</p>`;
            return;
        }

        if (!cmp.equal) {
            const shownWitness = cmp.witness === "" ? "ε (leeres Wort)" : escapeHtml(cmp.witness);
            setStatus("warn", "Regexe unterscheiden sich.");
            setHint("Es wurde ein Gegenbeispiel gefunden.");
            result.innerHTML = `
        <p><strong>Ergebnis:</strong> Die Regexe sind nicht gleichwertig.</p>
        <p>Gefundenes Gegenbeispiel: <code>${shownWitness}</code></p>
        <p class="muted">Für dieses Wort liefern die beiden Regexe unterschiedliche Ergebnisse.</p>
      `;
            return;
        }

        setStatus("neutral", "Keine Unterschiede in der Stichprobe gefunden.");
        setHint("Das ist nur ein heuristischer Vergleich.");
        result.innerHTML = `
      <p><strong>Vorläufiges Ergebnis:</strong> In der geprüften Stichprobe wurden keine Unterschiede gefunden.</p>
      <p class="muted">
        Das ist noch kein formaler Beweis. Für einen echten Äquivalenzbeweis müsste man die Regexe in endliche Automaten überführen und diese vergleichen.
      </p>
    `;
    });

    swapBtn.addEventListener("click", () => {
        const tmp = patternA.value;
        patternA.value = patternB.value;
        patternB.value = tmp;
        setStatus("neutral", "Regexe getauscht.");
        setHint("");
    });

    clearBtn.addEventListener("click", () => {
        patternA.value = "";
        patternB.value = "";
        setStatus("neutral", "Noch nicht geprüft.");
        setHint("");
        result.innerHTML = `<p class="muted">Gib zwei Regexe ein und klicke „Vergleichen“.</p>`;
    });
}

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
    initTheme();
    initNavHighlight();
    initToolSearch();
    initShareLink();

    initBase64();
    initRegex();
    initRegexCompare();
    initCron();
});