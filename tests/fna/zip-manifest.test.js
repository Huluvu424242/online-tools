"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const repositoryRoot = path.resolve(__dirname, "..", "..");

function loadZipApi(fetchImplementation = async () => ({ok: true, json: async () => ({files: []})})) {
    const context = {
        Blob,
        __stryker__: globalThis.__stryker__,
        DataView,
        Date,
        Error,
        Math,
        TextEncoder,
        URL,
        Uint8Array,
        Uint32Array,
        document: {baseURI: "https://example.test/index.html"},
        fetch: fetchImplementation,
        process,
        setAnnounce() {},
        window: {},
        $() { return null; }
    };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(repositoryRoot, "src", "zip.js"), "utf8"), context);
    return context.window.OnlineToolsZip;
}

test("Offline-Manifest sortiert, dedupliziert und normalisiert Repository-Pfade", () => {
    const api = loadZipApi();

    assert.deepEqual(
        Array.from(api.parseOfflinePackageManifest({files: ["src\\zip.js", "index.html", "index.html", "README.md"]})),
        ["index.html", "README.md", "src/zip.js"].sort()
    );
});

test("Offline-Manifest lehnt fehlende und syntaktisch unsichere Dateilisten ab", () => {
    const api = loadZipApi();

    assert.throws(() => api.parseOfflinePackageManifest({}), /keine Dateiliste/);
    assert.throws(() => api.parseOfflinePackageManifest({files: [""]}), /unsicheren Dateinamen/);
    assert.throws(() => api.parseOfflinePackageManifest({files: ["/etc/passwd"]}), /unsicheren Dateinamen/);
    assert.throws(() => api.parseOfflinePackageManifest({files: ["docs/../secret"]}), /unsicheren Dateinamen/);
    assert.throws(() => api.parseOfflinePackageManifest({files: ["docs/.."]}), /unsicheren Dateinamen/);
    assert.throws(() => api.parseOfflinePackageManifest({files: [42]}), /ungültigen Dateinamen/);
});

test("Offline-Manifest wird über die zentrale Manifest-Datei geladen", async () => {
    const requestedUrls = [];
    const api = loadZipApi(async (url, options) => {
        requestedUrls.push({url: String(url), options});
        return {ok: true, json: async () => ({files: ["index.html"]})};
    });

    assert.deepEqual(Array.from(await api.loadOfflinePackageFiles()), ["index.html"]);
    assert.deepEqual(JSON.parse(JSON.stringify(requestedUrls)), [{url: "https://example.test/offline-package-files.json", options: {cache: "no-store"}}]);
});

test("Offline-Manifest meldet HTTP-Fehler der Manifest-Datei", async () => {
    const api = loadZipApi(async () => ({ok: false, status: 404}));

    await assert.rejects(api.loadOfflinePackageFiles(), /offline-package-files\.json: HTTP 404/);
});
