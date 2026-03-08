
const PRINTABLE_ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32));
const FULL_ASCII = Array.from({ length: 128 }, (_, i) => String.fromCharCode(i));
const DOT_CHARS = new Set(
    FULL_ASCII.filter((ch) => ch !== "\n" && ch !== "\r")
);

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
        if (c === ".") {
            eat();
            return { t: "set", chars: new Set(DOT_CHARS) };
        }
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
        [...value].map((ch) => {
            const code = ch.charCodeAt(0);

            if (ch === "\n") return "\\n";
            if (ch === "\r") return "\\r";
            if (ch === "\t") return "\\t";
            if (ch === "\v") return "\\v";
            if (ch === "\f") return "\\f";

            if (code < 32 || code === 127) {
                return `\\x${code.toString(16).padStart(2, "0")}`;
            }

            return ch;
        }).join("")
    );
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

class RegexCompare {

    static compare(patternA, patternB) {

        const astA = simplify(parse(patternA));
        const astB = simplify(parse(patternB));

        // zuerst nur sichtbare Zeichen testen
        let result = this._compareWithAlphabet(astA, astB, PRINTABLE_ASCII);

        if (!result.equal) {
            return result;
        }

        // falls nichts gefunden wurde → vollständiges ASCII testen
        return this._compareWithAlphabet(astA, astB, FULL_ASCII);
    }

    static _compareWithAlphabet(astA, astB, alphabet) {

        const seen = new Set();
        const queue = [{ a: astA, b: astB, witness: "" }];

        while (queue.length) {

            const { a, b, witness } = queue.shift();
            const key = `${serialize(a)}###${serialize(b)}`;

            if (seen.has(key)) {
                continue;
            }

            seen.add(key);

            if (nullable(a) !== nullable(b)) {
                return {
                    equal: false,
                    witness,
                    acceptsA: nullable(a),
                    acceptsB: nullable(b)
                };
            }

            for (const ch of alphabet) {

                const da = simplify(derive(a, ch));
                const db = simplify(derive(b, ch));

                const nextKey = `${serialize(da)}###${serialize(db)}`;

                if (!seen.has(nextKey)) {
                    queue.push({
                        a: da,
                        b: db,
                        witness: witness + ch
                    });
                }
            }
        }

        return { equal: true };
    }
}


document.addEventListener("DOMContentLoaded", () => {
    initRegexCompare();
});