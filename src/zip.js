"use strict";

/* ========= Offline ZIP download ========= */
const OFFLINE_PACKAGE_MANIFEST = "offline-package-files.json";

function normalizeOfflineManifestPath(path) {
    if (typeof path !== "string") {
        throw new Error("Offline-Manifest enthält einen ungültigen Dateinamen");
    }

    const normalized = path.replaceAll("\\", "/");

    if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..") || normalized === ".") {
        throw new Error(`Offline-Manifest enthält einen unsicheren Dateinamen: ${path}`);
    }

    return normalized;
}

function parseOfflinePackageManifest(manifest) {
    if (!manifest || !Array.isArray(manifest.files)) {
        throw new Error("Offline-Manifest enthält keine Dateiliste");
    }

    return [...new Set(manifest.files.map(normalizeOfflineManifestPath))].sort();
}

async function loadOfflinePackageFiles() {
    const response = await fetch(new URL(OFFLINE_PACKAGE_MANIFEST, document.baseURI), {cache: "no-store"});

    if (!response.ok) {
        throw new Error(`${OFFLINE_PACKAGE_MANIFEST}: HTTP ${response.status}`);
    }

    return parseOfflinePackageManifest(await response.json());
}

let crcTable;

function getCrcTable() {
    // Stryker disable next-line ConditionalExpression: CRC table caching is a pure performance optimization; recomputing yields the same checksum values.
    if (crcTable) return crcTable;

    crcTable = new Uint32Array(256);

    // Stryker disable next-line EqualityOperator: Filling index 256 creates an unused typed-array no-op; CRC32 only addresses byte indexes 0..255.
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crcTable[n] = c >>> 0;
    }

    return crcTable;
}

function crc32(bytes) {
    const table = getCrcTable();
    let crc = 0xffffffff;

    for (const byte of bytes) {
        crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const day = (year - 1980) << 9 | ((date.getMonth() + 1) << 5) | date.getDate();

    return {time, day};
}

function concatUint8Arrays(parts) {
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(totalLength);
    let offset = 0;

    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }

    return out;
}

function createZip(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    const {time, day} = dosDateTime();
    let offset = 0;

    for (const file of files) {
        const nameBytes = encoder.encode(file.path);
        const data = file.data;
        const checksum = crc32(data);

        const localHeader = new Uint8Array(30 + nameBytes.length);
        const localView = new DataView(localHeader.buffer);
        localView.setUint32(0, 0x04034b50, true);
        localView.setUint16(4, 20, true);
        localView.setUint16(6, 0x0800, true);
        // Stryker disable next-line BooleanLiteral: Zero-valued ZIP header fields have identical bytes in either endian mode.
        localView.setUint16(8, 0, true);
        localView.setUint16(10, time, true);
        localView.setUint16(12, day, true);
        localView.setUint32(14, checksum, true);
        localView.setUint32(18, data.length, true);
        localView.setUint32(22, data.length, true);
        localView.setUint16(26, nameBytes.length, true);
        // Stryker disable next-line BooleanLiteral: Zero-valued ZIP header fields have identical bytes in either endian mode.
        localView.setUint16(28, 0, true);
        localHeader.set(nameBytes, 30);

        localParts.push(localHeader, data);

        const centralHeader = new Uint8Array(46 + nameBytes.length);
        const centralView = new DataView(centralHeader.buffer);
        centralView.setUint32(0, 0x02014b50, true);
        centralView.setUint16(4, 20, true);
        centralView.setUint16(6, 20, true);
        centralView.setUint16(8, 0x0800, true);
        // Stryker disable next-line BooleanLiteral: Zero-valued ZIP header fields have identical bytes in either endian mode.
        centralView.setUint16(10, 0, true);
        centralView.setUint16(12, time, true);
        centralView.setUint16(14, day, true);
        centralView.setUint32(16, checksum, true);
        centralView.setUint32(20, data.length, true);
        centralView.setUint32(24, data.length, true);
        centralView.setUint16(28, nameBytes.length, true);
        // Stryker disable next-line BooleanLiteral: Zero-valued ZIP header fields have identical bytes in either endian mode.
        centralView.setUint16(30, 0, true);
        // Stryker disable next-line BooleanLiteral: Zero-valued ZIP header fields have identical bytes in either endian mode.
        centralView.setUint16(32, 0, true);
        // Stryker disable next-line BooleanLiteral: Zero-valued ZIP header fields have identical bytes in either endian mode.
        centralView.setUint16(34, 0, true);
        // Stryker disable next-line BooleanLiteral: Zero-valued ZIP header fields have identical bytes in either endian mode.
        centralView.setUint16(36, 0, true);
        // Stryker disable next-line BooleanLiteral: Zero-valued ZIP header fields have identical bytes in either endian mode.
        centralView.setUint32(38, 0, true);
        centralView.setUint32(42, offset, true);
        centralHeader.set(nameBytes, 46);

        centralParts.push(centralHeader);
        offset += localHeader.length + data.length;
    }

    const centralDirectory = concatUint8Arrays(centralParts);
    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralDirectory.length, true);
    endView.setUint32(16, offset, true);

    return new Blob([...localParts, centralDirectory, endRecord], {type: "application/zip"});
}

async function readPackageFile(path) {
    const response = await fetch(new URL(path, document.baseURI), {cache: "no-store"});

    if (!response.ok) {
        throw new Error(`${path}: HTTP ${response.status}`);
    }

    return new Uint8Array(await response.arrayBuffer());
}

function initOfflineZipDownload() {
    const btn = $("#downloadOfflineZip");
    const status = $("#offlineZipStatus");
    if (!btn || !status) return;

    btn.addEventListener("click", async () => {
        btn.disabled = true;
        status.textContent = "ZIP wird erstellt …";
        status.style.color = "var(--muted)";

        try {
            const files = [];
            const packageFiles = await loadOfflinePackageFiles();

            for (const path of packageFiles) {
                files.push({path, data: await readPackageFile(path)});
            }

            const zip = createZip(files);
            const url = URL.createObjectURL(zip);
            const link = document.createElement("a");
            link.href = url;
            link.download = "online-tools-offline.zip";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);

            status.textContent = "Offline-ZIP erstellt. Entpacken und index.html lokal öffnen.";
            setAnnounce("Offline-ZIP erstellt");
        } catch (e) {
            status.textContent = `ZIP konnte nicht erstellt werden: ${e?.message || "unbekannter Fehler"}`;
            status.style.color = "var(--danger)";
            setAnnounce("Offline-ZIP konnte nicht erstellt werden");
        } finally {
            btn.disabled = false;
        }
    });
}

window.OnlineToolsZip = {
    createZip,
    initOfflineZipDownload,
    loadOfflinePackageFiles,
    parseOfflinePackageManifest
};
