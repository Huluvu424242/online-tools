"use strict";

const assert = require("node:assert/strict");
const {execFileSync} = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "..", "..");
const productionSourcesPath = path.join(repositoryRoot, "production-sources.json");
const productionSources = JSON.parse(fs.readFileSync(productionSourcesPath, "utf8"));

function normalizeRepositoryPath(relativePath) {
    return relativePath.replaceAll("\\", "/");
}

function walk(directory) {
    return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
        const fullPath = path.join(directory, entry.name);

        if (entry.name === ".git" || entry.name === "node_modules") return [];
        if (entry.isDirectory()) return walk(fullPath);
        return [fullPath];
    });
}

function expandProductionSources() {
    return productionSources.productionSources.flatMap((entry) => {
        const fullPath = path.join(repositoryRoot, entry);

        if (entry.endsWith("/")) {
            return walk(fullPath).map((file) => normalizeRepositoryPath(path.relative(repositoryRoot, file)));
        }

        return [normalizeRepositoryPath(entry)];
    }).sort();
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

test("die zentrale Produktionsquellen-Liste ist vollständig und eindeutig", () => {
    assert.deepEqual(
        [...productionSources.productionSources].sort(),
        productionSources.productionSources,
        "productionSources muss sortiert sein"
    );
    assert.deepEqual(new Set(productionSources.productionSources).size, productionSources.productionSources.length);

    const expandedSources = expandProductionSources();
    assert.ok(expandedSources.includes("index.html"));
    assert.ok(expandedSources.includes("app.js"));
    assert.ok(expandedSources.includes("tools/yaml-properties.js"));
    assert.equal(expandedSources.some((file) => file.startsWith("tests/")), false);

    for (const entry of productionSources.productionSources) {
        assert.ok(fs.existsSync(path.join(repositoryRoot, entry)), `${entry} fehlt`);
    }

    for (const relativeFile of productionSources.javascriptWithBusinessLogic) {
        assert.ok(expandedSources.includes(relativeFile), `${relativeFile} ist keine produktive Quelle`);
    }
});

test("Browsercode aus der zentralen Produktionsquellen-Liste referenziert weder node_modules noch Node-only APIs", () => {
    const productionFiles = expandProductionSources()
        .filter((relative) => relative.endsWith(".js"))
        .map((relative) => path.join(repositoryRoot, relative));

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
                violations.push(`${normalizeRepositoryPath(path.relative(repositoryRoot, file))}: ${label}`);
            }
        }
    }

    assert.deepEqual(violations, [], `Node-Abhängigkeiten im Browsercode:\n${violations.join("\n")}`);
});


test("Offline-ZIP-Manifest wird automatisch aus den eingecheckten Repository-Dateien erzeugt", () => {
    const manifestPath = path.join(repositoryRoot, "offline-package-files.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const trackedFiles = execFileSync("git", ["ls-files"], {cwd: repositoryRoot, encoding: "utf8"})
        .trim()
        .split("\n")
        .filter(Boolean);

    const expectedFiles = [...new Set([...trackedFiles, "offline-package-files.json"])].sort();
    assert.equal(manifest.generatedFrom, "git ls-files");
    assert.deepEqual(manifest.files, expectedFiles);

    const zipSource = fs.readFileSync(path.join(repositoryRoot, "tools", "zip.js"), "utf8");
    assert.doesNotMatch(zipSource, /OFFLINE_PACKAGE_FILES\s*=\s*\[/);
    assert.match(zipSource, /OFFLINE_PACKAGE_MANIFEST\s*=\s*"offline-package-files\.json"/);
});

test("index.html enthält weiterhin die zentralen Tool-Navigationen", () => {
    const html = fs.readFileSync(path.join(repositoryRoot, "index.html"), "utf8");

    assert.match(html, /data-nav="De-\/Encoder"/);
    assert.match(html, /<h1>De-\/Encoder<\/h1>/);
    assert.match(html, /data-name="Konverter"[^>]*data-nav="Konverter"/);
    assert.match(html, /<h1>Konverter<\/h1>/);
});

test("Tests sind nach fachlichen und nicht-fachlichen Suites ohne zentrale Dateiliste organisiert", () => {
    const testsRoot = path.join(repositoryRoot, "tests");
    const topLevelTestFiles = fs.readdirSync(testsRoot, {withFileTypes: true})
        .filter((entry) => entry.isFile() && entry.name.endsWith(".test.js"))
        .map((entry) => entry.name);

    assert.deepEqual(topLevelTestFiles, []);

    const {discoverTestFiles} = require(path.join(testsRoot, "run-suite.js"));
    const fnaFiles = discoverTestFiles(path.join(testsRoot, "fna"))
        .map((file) => normalizeRepositoryPath(path.relative(repositoryRoot, file)));
    const nfaFiles = discoverTestFiles(path.join(testsRoot, "nfa"))
        .map((file) => normalizeRepositoryPath(path.relative(repositoryRoot, file)));

    assert.ok(fnaFiles.length >= 1, "fachliche Tests fehlen");
    assert.ok(nfaFiles.includes("tests/nfa/architecture.test.js"));
    assert.equal(fnaFiles.some((file) => file.includes("architecture")), false);
});


test("package.json verwaltet ausschließlich Entwicklungs- und Testwerkzeuge", () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));

    assert.equal(packageJson.private, true);
    assert.deepEqual(Object.keys(packageJson.dependencies || {}), []);
    assert.equal(packageJson.scripts.test, "node tests/run-all.js");
    assert.equal(packageJson.scripts["test:fna"], "node tests/run-fna.js");
    assert.equal(packageJson.scripts["test:nfa"], "node tests/run-nfa.js");
    assert.equal(packageJson.scripts.mutation, "stryker run");
    assert.equal(packageJson.scripts["update:offline-manifest"], "node scripts/update-offline-manifest.js");
    assert.ok(packageJson.devDependencies["@stryker-mutator/core"]);
});

test("Stryker mutiert produktive Tool-Logik explizit und erzwingt QS-Schwellen", () => {
    const configPath = path.join(repositoryRoot, "stryker.conf.cjs");
    const config = require(configPath);

    assert.equal(config.testRunner, "command");
    assert.equal(config.commandRunner.command, "node tests/run-fna.js");
    assert.equal(config.coverageAnalysis, "off");
    assert.deepEqual(config.thresholds, {high: 90, low: 80, break: 70});
    assert.ok(config.reporters.includes("clear-text"));
    assert.ok(config.reporters.includes("html"));
    assert.ok(config.reporters.includes("json"));

    assert.deepEqual(config.mutate, productionSources.javascriptWithBusinessLogic);

    for (const relativeFile of config.mutate) {
        assert.ok(fs.existsSync(path.join(repositoryRoot, relativeFile)), `${relativeFile} fehlt`);
    }
});
