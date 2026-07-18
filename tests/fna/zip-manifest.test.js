"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const repositoryRoot = path.resolve(__dirname, "..", "..");


async function readBlobBytes(blob) {
    return new Uint8Array(await blob.arrayBuffer());
}

function bytesToText(bytes) {
    return new TextDecoder().decode(bytes);
}

function parseZipEntries(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const entries = [];
    let offset = 0;

    while (view.getUint32(offset, true) === 0x04034b50) {
        const crc = view.getUint32(offset + 14, true);
        const compressedSize = view.getUint32(offset + 18, true);
        const uncompressedSize = view.getUint32(offset + 22, true);
        const nameLength = view.getUint16(offset + 26, true);
        const extraLength = view.getUint16(offset + 28, true);
        const nameStart = offset + 30;
        const dataStart = nameStart + nameLength + extraLength;
        const dataEnd = dataStart + compressedSize;

        entries.push({
            name: bytesToText(bytes.slice(nameStart, nameStart + nameLength)),
            crc,
            compressedSize,
            uncompressedSize,
            data: bytes.slice(dataStart, dataEnd)
        });
        offset = dataEnd;
    }

    const centralOffset = offset;
    const centralEntries = [];
    while (view.getUint32(offset, true) === 0x02014b50) {
        const nameLength = view.getUint16(offset + 28, true);
        const extraLength = view.getUint16(offset + 30, true);
        const commentLength = view.getUint16(offset + 32, true);
        centralEntries.push({
            name: bytesToText(bytes.slice(offset + 46, offset + 46 + nameLength)),
            crc: view.getUint32(offset + 16, true),
            compressedSize: view.getUint32(offset + 20, true),
            uncompressedSize: view.getUint32(offset + 24, true),
            localHeaderOffset: view.getUint32(offset + 42, true)
        });
        offset += 46 + nameLength + extraLength + commentLength;
    }

    assert.equal(view.getUint32(offset, true), 0x06054b50);
    const fileCount = view.getUint16(offset + 8, true);
    const centralFileCount = view.getUint16(offset + 10, true);
    const centralSize = view.getUint32(offset + 12, true);
    const recordedCentralOffset = view.getUint32(offset + 16, true);

    return {entries, centralEntries, fileCount, centralFileCount, centralSize, centralOffset, recordedCentralOffset};
}

function loadZipApi(fetchImplementation = async () => ({ok: true, json: async () => ({files: []})}), DateImplementation = Date, domOptions = {}) {
    const listeners = new Map();
    const appendedLinks = [];
    const announcements = [];
    const button = Object.hasOwn(domOptions, "button") ? domOptions.button : {disabled: false, addEventListener(type, listener) { listeners.set(type, listener); }};
    const status = Object.hasOwn(domOptions, "status") ? domOptions.status : {textContent: "", style: {}};
    const context = {
        Blob,
        __stryker__: globalThis.__stryker__,
        DataView,
        Date: DateImplementation,
        Error,
        Math,
        TextEncoder,
        URL,
        Uint8Array,
        Uint32Array,
        document: {
            baseURI: "https://example.test/index.html",
            body: {appendChild(link) { appendedLinks.push(link); }},
            createElement(tagName) {
                return {
                    tagName,
                    href: "",
                    download: "",
                    clicked: false,
                    click() { this.clicked = true; },
                    remove() { this.removed = true; }
                };
            }
        },
        fetch: fetchImplementation,
        process,
        setAnnounce(message) { announcements.push(message); },
        window: {},
        $: (selector) => selector === "#downloadOfflineZip" ? button : selector === "#offlineZipStatus" ? status : null
    };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(repositoryRoot, "src", "zip.js"), "utf8"), context);
    const api = context.window.OnlineToolsZip;
    api.__test = {listeners, appendedLinks, announcements, button, status, context};
    return api;
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
    assert.throws(() => api.parseOfflinePackageManifest({files: ["."]}), /unsicheren Dateinamen/);
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


test("Offline-ZIP enthält valide lokale Header, Zentralverzeichnis und Datei-Inhalte", async () => {
    const api = loadZipApi();
    const firstData = new TextEncoder().encode("Hallo ZIP\n");
    const secondData = new Uint8Array([0, 1, 2, 255]);

    const zip = api.createZip([
        {path: "index.html", data: firstData},
        {path: "assets/ä space.txt", data: secondData}
    ]);

    assert.equal(zip.type, "application/zip");
    const parsed = parseZipEntries(await readBlobBytes(zip));

    assert.equal(parsed.fileCount, 2);
    assert.equal(parsed.centralFileCount, 2);
    assert.equal(parsed.centralOffset, parsed.recordedCentralOffset);
    assert.equal(parsed.centralSize, 46 + "index.html".length + 46 + new TextEncoder().encode("assets/ä space.txt").length);
    assert.deepEqual(parsed.entries.map((entry) => entry.name), ["index.html", "assets/ä space.txt"]);
    assert.deepEqual(parsed.centralEntries.map((entry) => entry.name), ["index.html", "assets/ä space.txt"]);
    assert.deepEqual(Array.from(parsed.entries[0].data), Array.from(firstData));
    assert.deepEqual(Array.from(parsed.entries[1].data), Array.from(secondData));
    assert.deepEqual(parsed.entries.map((entry) => entry.uncompressedSize), [firstData.length, secondData.length]);
    assert.deepEqual(parsed.centralEntries.map((entry) => entry.localHeaderOffset), [0, 30 + "index.html".length + firstData.length]);
    assert.deepEqual(parsed.centralEntries.map((entry) => entry.crc), parsed.entries.map((entry) => entry.crc));
});

test("Offline-ZIP begrenzt lokale DOS-Zeitstempel auf das Jahr 1980", async () => {
    const RealDate = Date;
    class FixedDate extends RealDate {
        constructor(...args) {
            super(...(args.length ? args : [1979, 0, 2, 3, 4, 5]));
        }
    }
    const api = loadZipApi(undefined, FixedDate);
    const parsed = parseZipEntries(await readBlobBytes(api.createZip([{path: "old.txt", data: new Uint8Array()}])));
    const bytes = await readBlobBytes(api.createZip([{path: "old.txt", data: new Uint8Array()}]));
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    assert.equal(parsed.entries[0].name, "old.txt");
    assert.equal(view.getUint16(12, true), (0 << 9) | (1 << 5) | 2);
    assert.equal(view.getUint16(10, true), (3 << 11) | (4 << 5) | 2);
});


test("Offline-ZIP schreibt erwartete CRC32-Prüfsummen für bekannte Inhalte", async () => {
    const api = loadZipApi();
    const parsed = parseZipEntries(await readBlobBytes(api.createZip([
        {path: "empty.txt", data: new Uint8Array()},
        {path: "hello.txt", data: new TextEncoder().encode("123456789")}
    ])));

    assert.deepEqual(parsed.entries.map((entry) => entry.crc), [0x00000000, 0xcbf43926]);
    assert.deepEqual(parsed.centralEntries.map((entry) => entry.crc), [0x00000000, 0xcbf43926]);
});


test("Offline-ZIP schreibt Zentralverzeichnis-Felder little-endian ZIP-konform", async () => {
    const api = loadZipApi();
    const data = new TextEncoder().encode("123456789");
    const bytes = await readBlobBytes(api.createZip([{path: "hello.txt", data}]));
    const parsed = parseZipEntries(bytes);
    const centralOffset = parsed.centralOffset;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    assert.equal(view.getUint32(centralOffset, true), 0x02014b50);
    assert.equal(view.getUint16(centralOffset + 4, true), 20);
    assert.equal(view.getUint16(centralOffset + 6, true), 20);
    assert.equal(view.getUint16(centralOffset + 8, true), 0x0800);
    assert.equal(view.getUint16(centralOffset + 10, true), 0);
    assert.notEqual(view.getUint16(centralOffset + 12, true), view.getUint16(centralOffset + 12, false));
    assert.notEqual(view.getUint16(centralOffset + 14, true), view.getUint16(centralOffset + 14, false));
    assert.equal(view.getUint32(centralOffset + 16, true), 0xcbf43926);
    assert.equal(view.getUint32(centralOffset + 20, true), data.length);
    assert.equal(view.getUint32(centralOffset + 24, true), data.length);
    assert.equal(view.getUint16(centralOffset + 28, true), "hello.txt".length);
    assert.equal(view.getUint16(centralOffset + 30, true), 0);
    assert.equal(view.getUint16(centralOffset + 32, true), 0);
    assert.equal(view.getUint16(centralOffset + 34, true), 0);
    assert.equal(view.getUint16(centralOffset + 36, true), 0);
    assert.equal(view.getUint32(centralOffset + 38, true), 0);
    assert.equal(view.getUint32(centralOffset + 42, true), 0);
});

test("Offline-ZIP-UI lädt Manifest-Dateien, erzeugt Download-Link und räumt URL auf", async () => {
    const requested = [];
    const objectUrls = [];
    const revoked = [];
    const api = loadZipApi(async (url, options) => {
        requested.push({url: String(url), options});
        if (String(url).endsWith("offline-package-files.json")) {
            return {ok: true, json: async () => ({files: ["b.txt", "a.txt"]})};
        }
        return {ok: true, arrayBuffer: async () => new TextEncoder().encode(String(url).endsWith("a.txt") ? "A" : "B").buffer};
    });
    api.__test.context.URL.createObjectURL = (blob) => {
        objectUrls.push(blob);
        return "blob:offline";
    };
    api.__test.context.URL.revokeObjectURL = (url) => revoked.push(url);

    api.initOfflineZipDownload();
    await api.__test.listeners.get("click")();

    assert.equal(api.__test.button.disabled, false);
    assert.equal(api.__test.status.textContent, "Offline-ZIP erstellt. Entpacken und index.html lokal öffnen.");
    assert.equal(api.__test.status.style.color, "var(--muted)");
    assert.deepEqual(api.__test.announcements, ["Offline-ZIP erstellt"]);
    assert.equal(api.__test.appendedLinks.length, 1);
    assert.equal(api.__test.appendedLinks[0].tagName, "a");
    assert.equal(api.__test.appendedLinks[0].href, "blob:offline");
    assert.equal(api.__test.appendedLinks[0].download, "online-tools-offline.zip");
    assert.equal(api.__test.appendedLinks[0].clicked, true);
    assert.equal(api.__test.appendedLinks[0].removed, true);
    assert.deepEqual(revoked, ["blob:offline"]);
    assert.equal(objectUrls[0].type, "application/zip");
    assert.deepEqual(requested.map((entry) => entry.url), [
        "https://example.test/offline-package-files.json",
        "https://example.test/a.txt",
        "https://example.test/b.txt"
    ]);
    assert.deepEqual(JSON.parse(JSON.stringify(requested.map((entry) => entry.options))), [
        {cache: "no-store"},
        {cache: "no-store"},
        {cache: "no-store"}
    ]);
});


test("Offline-ZIP-UI zeigt während der asynchronen Erstellung einen gesperrten Ladezustand", async () => {
    let resolveManifest;
    const manifestStarted = new Promise((resolve) => { resolveManifest = resolve; });
    const api = loadZipApi(async () => {
        await manifestStarted;
        return {ok: true, json: async () => ({files: []})};
    });
    api.__test.context.URL.createObjectURL = () => "blob:empty";
    api.__test.context.URL.revokeObjectURL = () => {};

    api.initOfflineZipDownload();
    const clickPromise = api.__test.listeners.get("click")();

    assert.equal(api.__test.button.disabled, true);
    assert.equal(api.__test.status.textContent, "ZIP wird erstellt …");
    assert.equal(api.__test.status.style.color, "var(--muted)");

    resolveManifest();
    await clickPromise;

    assert.equal(api.__test.button.disabled, false);
});

test("Offline-ZIP-UI meldet Ladefehler und reaktiviert den Button", async () => {
    const api = loadZipApi(async (url) => {
        if (String(url).endsWith("offline-package-files.json")) {
            return {ok: true, json: async () => ({files: ["missing.txt"]})};
        }
        return {ok: false, status: 500};
    });

    api.initOfflineZipDownload();
    await api.__test.listeners.get("click")();

    assert.equal(api.__test.button.disabled, false);
    assert.equal(api.__test.status.textContent, "ZIP konnte nicht erstellt werden: missing.txt: HTTP 500");
    assert.equal(api.__test.status.style.color, "var(--danger)");
    assert.deepEqual(api.__test.announcements, ["Offline-ZIP konnte nicht erstellt werden"]);
});


test("Offline-ZIP-UI meldet unbekannte Fehler ohne message verständlich", async () => {
    const api = loadZipApi(async () => { throw {}; });

    api.initOfflineZipDownload();
    await api.__test.listeners.get("click")();

    assert.equal(api.__test.button.disabled, false);
    assert.equal(api.__test.status.textContent, "ZIP konnte nicht erstellt werden: unbekannter Fehler");
    assert.equal(api.__test.status.style.color, "var(--danger)");
    assert.deepEqual(api.__test.announcements, ["Offline-ZIP konnte nicht erstellt werden"]);
});

test("Offline-ZIP-UI ignoriert unvollständige Oberflächen robust", () => {
    const addEventCalls = [];
    const button = {addEventListener(type) { addEventCalls.push(type); }};
    loadZipApi(undefined, Date, {button, status: null}).initOfflineZipDownload();
    assert.deepEqual(addEventCalls, []);

    const status = {textContent: "", style: {}};
    loadZipApi(undefined, Date, {button: null, status}).initOfflineZipDownload();
    assert.deepEqual(addEventCalls, []);
});
