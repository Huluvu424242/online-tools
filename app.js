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
    const runRedosCheck =$("#rcCheckRedos");

    if (!pattern || !text || !runBtn || !clearBtn || !result || !status || !copyBtn || !safety || !remoteConsent || !runRedosCheck ) return;

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
    async function analyzeCatastrophicBacktrackingRisk(patternText, flags, allowRedos, allowRemote) {
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
        const allowRedos = runRedosCheck.checked;

        const risk = await analyzeCatastrophicBacktrackingRisk(p, flags, allowRedos, allowRemote);
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

/* ========= Boot ========= */
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initToolNav();
    initNavHighlight();
    initToolSearch();
    initShareLink();

    initBase64();
    initRegex();
});