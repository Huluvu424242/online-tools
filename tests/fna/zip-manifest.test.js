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

function loadZipApi(fetchImplementation = async () => ({ok: true, json: async () => ({files: []})}), DateImplementation = Date) {
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

test("Offline-ZIP schreibt DOS-Datum mit Untergrenze 1980", async () => {
    const RealDate = Date;
    class FixedDate extends RealDate {
        constructor(...args) {
            super(...(args.length ? args : ["1979-01-02T03:04:05Z"]));
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
