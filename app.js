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

function initToolNav() {
    const nav = $("#toolNav");
    const sections = $$(".tool");

    if (!nav || sections.length === 0) return;

    nav.innerHTML = "";

    for (const section of sections) {
        if (section.dataset.navHidden === "true") continue;

        const id = section.id;
        if (!id) continue;

        const label =
            section.dataset.nav ||
            section.dataset.name ||
            $("h1", section)?.textContent?.trim() ||
            id;

        const toolName =
            (section.dataset.name || label || id)
                .toLowerCase()
                .replace(/\s+/g, "-");

        const li = document.createElement("li");
        const a = document.createElement("a");

        a.className = "nav-link";
        a.href = `#${id}`;
        a.dataset.tool = toolName;
        a.textContent = label;

        li.appendChild(a);
        nav.appendChild(li);
    }
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
    const patternA = document.getElementById("rcPatternA");
    const patternB = document.getElementById("rcPatternB");
    const compareBtn = document.getElementById("rcCompare");
    const swapBtn = document.getElementById("rcSwap");
    const clearBtn = document.getElementById("rcClear");
    const result = document.getElementById("rcResult");
    const hint = document.getElementById("rcHint");
    const statusBox = document.getElementById("rcStatusBox");

    if (!patternA || !patternB || !compareBtn || !swapBtn || !clearBtn || !result || !hint || !statusBox) {
        return;
    }

    const statusValue = statusBox.querySelector(".flat-value");

    function setStatus(state, message) {
        statusBox.classList.remove("success", "error", "neutral");
        statusBox.classList.add(state);
        if (statusValue) {
            statusValue.textContent = message;
            statusValue.classList.remove("muted");
        }
    }

    function renderResult(html) {
        result.innerHTML = html;
    }

    function compareNow() {
        const a = patternA.value.trim();
        const b = patternB.value.trim();

        if (!a || !b) {
            setStatus("neutral", "Bitte zwei Regexe eingeben.");
            renderResult('<p class="muted">Beide Eingabefelder müssen ausgefüllt sein.</p>');
            hint.textContent = "";
            return;
        }

        try {
            const comparison = RegexCompare.compare(a, b);

            if (comparison.equal) {
                setStatus("success", "Regexe sind äquivalent.");
                renderResult(`
                    <p><strong>Ergebnis:</strong> Die beiden Regexe erkennen in der unterstützten Teilmenge dieselbe Sprache.</p>
                    <p><strong>Regex A:</strong> <code>${escapeHtml(a)}</code></p>
                    <p><strong>Regex B:</strong> <code>${escapeHtml(b)}</code></p>
                `);
                hint.textContent = "Kein Gegenbeispiel gefunden.";
            } else {
                setStatus("error", "Regexe sind verschieden.");
                const witness = comparison.witness === "" ? "ε (Leerstring)" : escapeVisible(comparison.witness);

                renderResult(`
                    <p><strong>Ergebnis:</strong> Die beiden Regexe sind nicht äquivalent.</p>
                    <p><strong>Gegenbeispiel:</strong> <code>${witness}</code></p>
                    <p>
                        <strong>Regex A akzeptiert:</strong> ${comparison.acceptsA ? "Ja" : "Nein"}<br>
                        <strong>Regex B akzeptiert:</strong> ${comparison.acceptsB ? "Ja" : "Nein"}
                    </p>
                    <p><strong>Regex A:</strong> <code>${escapeHtml(a)}</code></p>
                    <p><strong>Regex B:</strong> <code>${escapeHtml(b)}</code></p>
                `);

                hint.textContent = "Das Gegenbeispiel wird von genau einem der beiden Ausdrücke akzeptiert.";
            }
        } catch (error) {
            setStatus("error", "Fehler beim Vergleichen.");
            renderResult(`
                <p><strong>Fehler:</strong> ${escapeHtml(error.message || String(error))}</p>
            `);
            hint.textContent = "Prüfe die Syntax und die unterstützte Teilmenge.";
        }
    }

    compareBtn.addEventListener("click", compareNow);

    swapBtn.addEventListener("click", () => {
        const tmp = patternA.value;
        patternA.value = patternB.value;
        patternB.value = tmp;
        patternA.focus();
    });

    clearBtn.addEventListener("click", () => {
        patternA.value = "";
        patternB.value = "";
        setStatus("neutral", "Noch nicht geprüft.");
        renderResult('<p class="muted">Gib zwei Regexe ein und klicke „Vergleichen“.</p>');
        hint.textContent = "";
        patternA.focus();
    });

    patternA.addEventListener("keydown", (event) => {
        if (event.key === "Enter") compareNow();
    });

    patternB.addEventListener("keydown", (event) => {
        if (event.key === "Enter") compareNow();
    });
}

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function escapeVisible(value) {
    return escapeHtml(
        value
            .replaceAll("\n", "\\n")
            .replaceAll("\r", "\\r")
            .replaceAll("\t", "\\t")
    );
}

class RegexCompare {
    static compare(patternA, patternB) {
        const astA = simplify(parse(patternA));
        const astB = simplify(parse(patternB));

        const seen = new Set();
        const queue = [{ a: astA, b: astB, witness: "" }];

        while (queue.length) {
            const { a, b, witness } = queue.shift();
            const key = `${serialize(a)}###${serialize(b)}`;
            if (seen.has(key)) continue;
            seen.add(key);

            if (nullable(a) !== nullable(b)) {
                return {
                    equal: false,
                    witness,
                    acceptsA: nullable(a),
                    acceptsB: nullable(b),
                };
            }

            for (const ch of ASCII) {
                const da = simplify(derive(a, ch));
                const db = simplify(derive(b, ch));
                const nextKey = `${serialize(da)}###${serialize(db)}`;
                if (!seen.has(nextKey)) {
                    queue.push({ a: da, b: db, witness: witness + ch });
                }
            }
        }

        return { equal: true };
    }
}

const ASCII = Array.from({ length: 128 }, (_, i) => String.fromCharCode(i));

function parse(input) {
    let i = 0;

    const peek = () => input[i];
    const eat = () => input[i++];
    const expect = (c) => {
        if (eat() !== c) throw new Error(`Erwartet '${c}' an Position ${i - 1}`);
    };

    function parseExpr() {
        let node = parseConcat();
        while (peek() === "|") {
            eat();
            node = { t: "alt", parts: [node, parseConcat()] };
        }
        return node;
    }

    function parseConcat() {
        const parts = [];
        while (i < input.length && peek() !== ")" && peek() !== "|") {
            parts.push(parseQuantified());
        }
        if (parts.length === 0) return { t: "eps" };
        if (parts.length === 1) return parts[0];
        return { t: "seq", parts };
    }

    function parseQuantified() {
        let node = parseAtom();
        while (true) {
            const c = peek();
            if (c === "*") {
                eat();
                node = { t: "star", expr: node };
            } else if (c === "+") {
                eat();
                node = { t: "seq", parts: [node, { t: "star", expr: deepClone(node) }] };
            } else if (c === "?") {
                eat();
                node = { t: "alt", parts: [node, { t: "eps" }] };
            } else {
                break;
            }
        }
        return node;
    }

    function parseAtom() {
        const c = peek();
        if (c === "(") {
            eat();
            const node = parseExpr();
            expect(")");
            return node;
        }
        if (c === "[") return parseClass();
        if (c === "\\") return parseEscape();
        if (!c) throw new Error(`Unerwartetes Ende an Position ${i}`);
        eat();
        return { t: "set", chars: new Set([c]) };
    }

    function parseEscape() {
        expect("\\");
        const c = eat();
        if (!c) throw new Error("Ungültiger Escape am Ende");
        if (c === "d") return charSet("0123456789");
        if (c === "w") return charSet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_");
        if (c === "s") return charSet(" \t\r\n\f\v");
        return { t: "set", chars: new Set([c]) };
    }

    function parseClass() {
        expect("[");
        const chars = new Set();
        let first = true;

        while (true) {
            if (i >= input.length) throw new Error("Nicht geschlossene Zeichenklasse");
            if (peek() === "]" && !first) {
                eat();
                break;
            }
            first = false;

            const start = readClassChar();
            if (peek() === "-" && input[i + 1] !== "]") {
                eat();
                const end = readClassChar();
                if (typeof start !== "string" || typeof end !== "string") {
                    throw new Error("Bereiche mit \\d, \\w oder \\s in Zeichenklassen werden nicht unterstützt");
                }
                const a = start.charCodeAt(0);
                const b = end.charCodeAt(0);
                if (a > b) throw new Error(`Ungültiger Bereich ${start}-${end}`);
                for (let code = a; code <= b; code++) chars.add(String.fromCharCode(code));
            } else {
                if (typeof start === "string") {
                    chars.add(start);
                } else {
                    for (const ch of start.chars) chars.add(ch);
                }
            }
        }
        return { t: "set", chars };
    }

    function readClassChar() {
        if (peek() === "\\") {
            expect("\\");
            const c = eat();
            if (!c) throw new Error("Ungültiger Escape in Zeichenklasse");
            if (c === "d") return charSet("0123456789");
            if (c === "w") return charSet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_");
            if (c === "s") return charSet(" \t\r\n\f\v");
            return c;
        }
        return eat();
    }

    const ast = parseExpr();
    if (i !== input.length) throw new Error(`Unerwartetes Zeichen '${peek()}' an Position ${i}`);
    return ast;
}

function charSet(chars) {
    return { t: "set", chars: new Set(chars.split("")) };
}

function nullable(r) {
    switch (r.t) {
        case "empty": return false;
        case "eps": return true;
        case "set": return false;
        case "alt": return r.parts.some(nullable);
        case "seq": return r.parts.every(nullable);
        case "star": return true;
        default: throw new Error(`Unbekannter Knoten ${r.t}`);
    }
}

function derive(r, ch) {
    switch (r.t) {
        case "empty": return { t: "empty" };
        case "eps": return { t: "empty" };
        case "set": return r.chars.has(ch) ? { t: "eps" } : { t: "empty" };
        case "alt":
            return simplify({ t: "alt", parts: r.parts.map((p) => derive(p, ch)) });
        case "seq": {
            const [first, ...rest] = r.parts;
            const tail = rest.length === 0 ? { t: "eps" } : { t: "seq", parts: rest };
            const left = simplify({ t: "seq", parts: [derive(first, ch), tail] });
            if (nullable(first)) {
                return simplify({ t: "alt", parts: [left, derive(tail, ch)] });
            }
            return left;
        }
        case "star":
            return simplify({ t: "seq", parts: [derive(r.expr, ch), r] });
        default:
            throw new Error(`Unbekannter Knoten ${r.t}`);
    }
}

function simplify(r) {
    switch (r.t) {
        case "alt": {
            const flat = [];
            for (const p of r.parts.map(simplify)) {
                if (p.t === "empty") continue;
                if (p.t === "alt") flat.push(...p.parts);
                else flat.push(p);
            }
            const uniq = dedupe(flat);
            if (uniq.length === 0) return { t: "empty" };
            if (uniq.length === 1) return uniq[0];
            uniq.sort((a, b) => serialize(a).localeCompare(serialize(b)));
            return { t: "alt", parts: uniq };
        }
        case "seq": {
            const flat = [];
            for (const p of r.parts.map(simplify)) {
                if (p.t === "empty") return { t: "empty" };
                if (p.t === "eps") continue;
                if (p.t === "seq") flat.push(...p.parts);
                else flat.push(p);
            }
            if (flat.length === 0) return { t: "eps" };
            if (flat.length === 1) return flat[0];
            return { t: "seq", parts: flat };
        }
        case "star": {
            const inner = simplify(r.expr);
            if (inner.t === "empty" || inner.t === "eps") return { t: "eps" };
            if (inner.t === "star") return inner;
            return { t: "star", expr: inner };
        }
        default:
            return r;
    }
}

function dedupe(parts) {
    const map = new Map();
    for (const p of parts) map.set(serialize(p), p);
    return [...map.values()];
}

function serialize(r) {
    switch (r.t) {
        case "empty": return "∅";
        case "eps": return "ε";
        case "set": return `[${[...r.chars].sort().map(escapeChar).join("")}]`;
        case "alt": return `(${r.parts.map(serialize).join("|")})`;
        case "seq": return `(${r.parts.map(serialize).join("")})`;
        case "star": return `(${serialize(r.expr)})*`;
        default: throw new Error(`Unbekannter Knoten ${r.t}`);
    }
}

function escapeChar(ch) {
    const code = ch.charCodeAt(0);
    if (ch === "\\" || ch === "]" || ch === "[") return `\\${ch}`;
    if (ch === "\n") return "\\n";
    if (ch === "\r") return "\\r";
    if (ch === "\t") return "\\t";
    if (code < 32 || code === 127) return `\\x${code.toString(16).padStart(2, "0")}`;
    return ch;
}

function deepClone(node) {
    switch (node.t) {
        case "empty":
        case "eps":
            return { ...node };
        case "set":
            return { t: "set", chars: new Set(node.chars) };
        case "alt":
        case "seq":
            return { t: node.t, parts: node.parts.map(deepClone) };
        case "star":
            return { t: "star", expr: deepClone(node.expr) };
        default:
            throw new Error(`Unbekannter Knoten ${node.t}`);
    }
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
    initToolNav();
    initNavHighlight();
    initToolSearch();
    initShareLink();

    initCron();
    initBase64();
    initRegex();
    initRegexCompare();
});