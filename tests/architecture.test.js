"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "..");

function walk(directory) {
    return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
        const fullPath = path.join(directory, entry.name);

        if (entry.name === ".git" || entry.name === "node_modules") return [];
        if (entry.isDirectory()) return walk(fullPath);
        return [fullPath];
    });
}

function localReferences(html) {
    const references = [];
    const regex = /<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["'][^>]*>/gi;

    for (const match of html.matchAll(regex)) {
        const reference = match[1].split(/[?#]/, 1)[0];
        if (!reference) continue;
        if (/^(?:https?:|data:|mailto:|tel:|#|\/\/)/i.test(reference)) continue;
        references.push(reference);
    }

    return references;
}

test("index.html und der YAML/Properties-Konverter existieren", () => {
    assert.ok(fs.existsSync(path.join(repositoryRoot, "index.html")));
    assert.ok(fs.existsSync(path.join(repositoryRoot, "tools", "yaml-properties.js")));
});

test("alle lokalen Script- und Stylesheet-Referenzen aus index.html existieren", () => {
    const html = fs.readFileSync(path.join(repositoryRoot, "index.html"), "utf8");
    const missing = localReferences(html).filter((reference) => {
        const decoded = decodeURIComponent(reference);
        return !fs.existsSync(path.resolve(repositoryRoot, decoded));
    });

    assert.deepEqual(missing, [], `Fehlende lokale Ressourcen: ${missing.join(", ")}`);
});

test("index.html lädt keine Scripts oder Stylesheets über ein CDN", () => {
    const html = fs.readFileSync(path.join(repositoryRoot, "index.html"), "utf8");
    const remoteRuntimeResources = [...html.matchAll(
        /<(?:script|link)\b[^>]*?\b(?:src|href)=["'](https?:\/\/[^"']+)["'][^>]*>/gi
    )].map((match) => match[1]);

    assert.deepEqual(
        remoteRuntimeResources,
        [],
        `Externe Laufzeitressourcen gefunden: ${remoteRuntimeResources.join(", ")}`
    );
});

test("Browsercode referenziert weder node_modules noch Node-only APIs", () => {
    const productionFiles = walk(repositoryRoot).filter((file) => {
        const relative = path.relative(repositoryRoot, file).replaceAll("\\", "/");
        return relative.endsWith(".js") && !relative.startsWith("tests/");
    });

    const violations = [];
    const forbiddenPatterns = [
        [/\bnode_modules\b/, "node_modules"],
        [/\brequire\s*\(\s*["'](?:node:)?(?:fs|path|child_process|os|vm)["']\s*\)/, "Node require"],
        [/\bfrom\s+["'](?:node:)?(?:fs|path|child_process|os|vm)["']/, "Node import"],
        [/\bprocess\.(?:env|cwd|argv)\b/, "process"],
        [/\bBuffer\.(?:from|alloc|concat)\b/, "Buffer"]
    ];

    for (const file of productionFiles) {
        const source = fs.readFileSync(file, "utf8");
        for (const [pattern, label] of forbiddenPatterns) {
            if (pattern.test(source)) {
                violations.push(`${path.relative(repositoryRoot, file)}: ${label}`);
            }
        }
    }

    assert.deepEqual(violations, [], `Node-Abhängigkeiten im Browsercode:\n${violations.join("\n")}`);
});

test("index.html enthält weiterhin die zentralen Tool-Navigationen", () => {
    const html = fs.readFileSync(path.join(repositoryRoot, "index.html"), "utf8");

    assert.match(html, /data-nav="De-\/Encoder"/);
    assert.match(html, /<h1>De-\/Encoder<\/h1>/);
    assert.match(html, /data-name="Konverter"[^>]*data-nav="Konverter"/);
    assert.match(html, /<h1>Konverter<\/h1>/);
});
