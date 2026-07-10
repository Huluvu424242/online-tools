"use strict";

/* ========= Tool: Konverter ========= */
function stripYamlComment(line) {
    let quote = null;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const previous = line[i - 1];

        if ((char === "\"" || char === "'") && previous !== "\\") {
            quote = quote === char ? null : (quote || char);
        }

        if (char === "#" && !quote && (i === 0 || /\s/.test(line[i - 1]))) {
            return line.slice(0, i).trimEnd();
        }
    }

    return line.trimEnd();
}

function splitYamlKeyValue(text) {
    let quote = null;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const previous = text[i - 1];

        if ((char === "\"" || char === "'") && previous !== "\\") {
            quote = quote === char ? null : (quote || char);
        }

        if (char === ":" && !quote && (i === text.length - 1 || /\s/.test(text[i + 1]))) {
            return [text.slice(0, i).trim(), text.slice(i + 1).trim()];
        }
    }

    return [text.trim(), ""];
}

function unquoteYamlScalar(value) {
    const trimmed = value.trim();

    if (trimmed === "~" || /^null$/i.test(trimmed)) return "";

    if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        const inner = trimmed.slice(1, -1);

        if (trimmed[0] === "'") {
            return inner.replace(/''/g, "'");
        }

        return inner
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\r/g, "\r")
            .replace(/\\"/g, "\"")
            .replace(/\\\\/g, "\\");
    }

    return trimmed;
}

function normalizeYamlKey(key) {
    return unquoteYamlScalar(key).trim();
}

function propertyPathToString(path) {
    return path.map((part, index) => {
        if (typeof part === "number") return `[${part}]`;
        return index === 0 ? part : `.${part}`;
    }).join("");
}

function yamlToProperties(yaml) {
    const properties = [];
    const stack = [{indent: -1, path: [], listIndex: -1}];
    const lines = yaml.replace(/\r\n?/g, "\n").split("\n");

    lines.forEach((rawLine, lineIndex) => {
        if (/^\s*($|---\s*$|\.\.\.\s*$|#)/.test(rawLine)) return;

        const withoutComment = stripYamlComment(rawLine);
        if (!withoutComment.trim()) return;
        if (/\t/.test(rawLine.match(/^\s*/)?.[0] || "")) {
            throw new Error(`Zeile ${lineIndex + 1}: Tabs in Einrückungen werden nicht unterstützt.`);
        }

        const indent = withoutComment.match(/^ */)[0].length;
        const text = withoutComment.trim();

        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }

        const parent = stack[stack.length - 1];

        if (text.startsWith("- ")) {
            parent.listIndex += 1;
            const itemPath = [...parent.path, parent.listIndex];
            const itemText = text.slice(2).trim();

            if (!itemText) {
                stack.push({indent, path: itemPath, listIndex: -1});
                return;
            }

            const [key, value] = splitYamlKeyValue(itemText);
            if (value || itemText.includes(":")) {
                const normalizedKey = normalizeYamlKey(key);
                if (!normalizedKey) throw new Error(`Zeile ${lineIndex + 1}: Leerer YAML-Schlüssel.`);

                const nextPath = [...itemPath, normalizedKey];
                if (value === "") {
                    stack.push({indent, path: nextPath, listIndex: -1});
                } else {
                    properties.push([propertyPathToString(nextPath), unquoteYamlScalar(value)]);
                    stack.push({indent, path: itemPath, listIndex: parent.listIndex});
                }
                return;
            }

            properties.push([propertyPathToString(itemPath), unquoteYamlScalar(itemText)]);
            return;
        }

        const [key, value] = splitYamlKeyValue(text);
        const normalizedKey = normalizeYamlKey(key);
        if (!normalizedKey) throw new Error(`Zeile ${lineIndex + 1}: Leerer YAML-Schlüssel.`);

        const nextPath = [...parent.path, normalizedKey];
        if (value === "") {
            stack.push({indent, path: nextPath, listIndex: -1});
        } else {
            properties.push([propertyPathToString(nextPath), unquoteYamlScalar(value)]);
        }
    });

    return properties.map(([key, value]) => `${escapePropertyPart(key)}=${escapePropertyValue(value)}`).join("\n");
}

function escapePropertyPart(value) {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");
}

function escapePropertyValue(value) {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t")
        .replace(/^ /, "\\ ")
        .replace(/([:=#!])/g, "\\$1");
}

function findPropertySeparator(line) {
    let escaped = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === "\\") {
            escaped = true;
            continue;
        }

        if (char === "=" || char === ":") return i;
        if (/\s/.test(char)) return i;
    }

    return -1;
}

function unescapeProperty(value) {
    return String(value).replace(/\\([nrtf:=#!\\ ])/g, (match, escaped) => {
        const values = {n: "\n", r: "\r", t: "\t", f: "\f"};
        return Object.prototype.hasOwnProperty.call(values, escaped) ? values[escaped] : escaped;
    });
}

function parsePropertyKey(key) {
    const parts = [];
    let buffer = "";

    for (let i = 0; i < key.length; i++) {
        const char = key[i];

        if (char === ".") {
            if (buffer) parts.push(buffer);
            buffer = "";
            continue;
        }

        if (char === "[") {
            if (buffer) parts.push(buffer);
            buffer = "";
            const end = key.indexOf("]", i);
            if (end === -1) {
                buffer += char;
                continue;
            }

            const index = Number(key.slice(i + 1, end));
            parts.push(Number.isInteger(index) && index >= 0 ? index : key.slice(i + 1, end));
            i = end;
            continue;
        }

        buffer += char;
    }

    if (buffer) parts.push(buffer);
    return parts;
}

function setTreeValue(root, path, value) {
    let node = root;

    path.forEach((part, index) => {
        const last = index === path.length - 1;

        if (last) {
            node[part] = value;
            return;
        }

        const nextPart = path[index + 1];
        if (node[part] === undefined || typeof node[part] !== "object") {
            node[part] = typeof nextPart === "number" ? [] : {};
        }

        node = node[part];
    });
}

function parseProperties(properties) {
    const root = {};
    const lines = properties.replace(/\\\r?\n/g, "").replace(/\r\n?/g, "\n").split("\n");

    lines.forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line || line.startsWith("#") || line.startsWith("!")) return;

        const separator = findPropertySeparator(line);
        const rawKey = separator === -1 ? line : line.slice(0, separator).trim();
        let rawValue = separator === -1 ? "" : line.slice(separator + 1);

        if (separator !== -1 && (line[separator] === " " || line[separator] === "\t")) {
            rawValue = rawValue.replace(/^\s*[:=]?\s*/, "");
        } else {
            rawValue = rawValue.trimStart();
        }

        const path = parsePropertyKey(unescapeProperty(rawKey));
        if (path.length) setTreeValue(root, path, unescapeProperty(rawValue));
    });

    return root;
}

function isPlainObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
}

function formatYamlScalar(value) {
    const text = String(value);

    if (text === "") return "\"\"";
    if (/^[A-Za-z0-9_.\-/]+$/.test(text) && !/^(true|false|null|~|yes|no|on|off|[-+]?\d+(\.\d+)?)$/i.test(text)) {
        return text;
    }

    return `"${text
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t")
        .replace(/\"/g, "\\\"")}"`;
}

function needsQuotedYamlKey(key) {
    return !/^[A-Za-z0-9_-]+$/.test(key);
}

function formatYamlKey(key) {
    return needsQuotedYamlKey(key) ? formatYamlScalar(key) : key;
}

function stringifyYamlNode(node, indent = 0) {
    const spaces = " ".repeat(indent);

    if (Array.isArray(node)) {
        return node.map((item) => {
            if (isPlainObject(item) || Array.isArray(item)) {
                const nested = stringifyYamlNode(item, indent + 2);
                return `${spaces}-\n${nested}`;
            }

            return `${spaces}- ${formatYamlScalar(item ?? "")}`;
        }).join("\n");
    }

    return Object.keys(node).map((key) => {
        const value = node[key];
        const yamlKey = formatYamlKey(key);

        if (isPlainObject(value) || Array.isArray(value)) {
            const nested = stringifyYamlNode(value, indent + 2);
            return `${spaces}${yamlKey}:\n${nested}`;
        }

        return `${spaces}${yamlKey}: ${formatYamlScalar(value ?? "")}`;
    }).join("\n");
}

function propertiesToYaml(properties) {
    return stringifyYamlNode(parseProperties(properties));
}

function initYamlPropertiesConverter() {
    const mode = $("#ypMode");
    const input = $("#ypInput");
    const output = $("#ypOutput");
    const status = $("#ypStatus");
    const convertBtn = $("#ypConvert");
    const swapBtn = $("#ypSwap");
    const clearBtn = $("#ypClear");
    const copyBtn = $("#ypCopy");
    const exampleBtn = $("#ypExample");

    if (!mode || !input || !output || !status || !convertBtn || !swapBtn || !clearBtn || !copyBtn || !exampleBtn) return;

    const setStatus = (message, isError = false) => {
        status.textContent = message;
        status.style.color = isError ? "var(--danger)" : "var(--muted)";
    };

    const modeLabels = {
        yamlToProperties: ["YAML", "Properties"],
        propertiesToYaml: ["Properties", "YAML"]
    };

    const syncLabels = () => {
        const [inputLabel, outputLabel] = modeLabels[mode.value] || modeLabels.yamlToProperties;
        $("#ypInputLabel").textContent = `Eingabe (${inputLabel})`;
        $("#ypOutputLabel").textContent = `Ausgabe (${outputLabel})`;
        input.placeholder = inputLabel === "YAML" ? "server:\n  port: 8080\nspring:\n  application:\n    name: demo" : "server.port=8080\nspring.application.name=demo";
        output.placeholder = `${outputLabel}-Ergebnis…`;
    };

    const convertValue = (value, conversionMode = mode.value) => (
        conversionMode === "propertiesToYaml" ? propertiesToYaml(value) : yamlToProperties(value)
    );

    const convert = () => {
        const source = input.value;

        if (!source.trim()) {
            output.value = "";
            setStatus("Eingabe ist leer.");
            setAnnounce("YAML Properties Eingabe ist leer");
            return;
        }

        try {
            output.value = convertValue(source);
            setStatus("Konvertierung abgeschlossen.");
            setAnnounce("YAML Properties Konvertierung abgeschlossen");
        } catch (error) {
            setStatus(error?.message || "Konvertierung fehlgeschlagen.", true);
            setAnnounce("YAML Properties Konvertierung fehlgeschlagen");
        }
    };

    mode.addEventListener("change", () => {
        output.value = "";
        syncLabels();
        setStatus("Konvertierungsrichtung geändert. Ausgabe geleert, damit kein Ergebnis der alten Richtung stehen bleibt.");
    });

    convertBtn.addEventListener("click", convert);

    swapBtn.addEventListener("click", () => {
        try {
            const convertedInput = output.value || (input.value.trim() ? convertValue(input.value) : "");

            input.value = convertedInput;
            output.value = "";
            mode.value = mode.value === "propertiesToYaml" ? "yamlToProperties" : "propertiesToYaml";
            syncLabels();
            setStatus("Eingabe/Ausgabe getauscht, Richtung gewechselt und Ausgabe für die nächste Konvertierung geleert.");
        } catch (error) {
            setStatus(error?.message || "Tauschen fehlgeschlagen.", true);
        }
    });

    clearBtn.addEventListener("click", () => {
        input.value = "";
        output.value = "";
        syncLabels();
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

    exampleBtn.addEventListener("click", () => {
        mode.value = "yamlToProperties";
        input.value = "spring:\n  application:\n    name: demo-service\n  datasource:\n    url: jdbc:postgresql://localhost:5432/demo\n    username: demo\nserver:\n  port: 8080\nfeatures:\n  - login\n  - audit";
        output.value = "";
        syncLabels();
        setStatus("Beispiel eingefügt.");
    });

    syncLabels();
}

window.OnlineToolsYamlProperties = {
    yamlToProperties,
    propertiesToYaml,
    init: initYamlPropertiesConverter
};

document.addEventListener("DOMContentLoaded", () => {
    initYamlPropertiesConverter();
});
