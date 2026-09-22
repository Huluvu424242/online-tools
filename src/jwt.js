"use strict";

const JWT_MAX_LENGTH = 1_000_000;

function assertJwtLength(value, label) {
    if (typeof value !== "string") throw new Error(`${label} muss Text sein.`);
    if (value.length > JWT_MAX_LENGTH) {
        throw new Error(`${label} ist zu groß. Maximal ${JWT_MAX_LENGTH.toLocaleString("de-DE")} Zeichen werden verarbeitet.`);
    }
}

function validateBase64UrlSegment(segment, label, allowEmpty = false) {
    assertJwtLength(segment, label);
    if (segment === "") {
        if (allowEmpty) return;
        throw new Error(`${label} darf nicht leer sein.`);
    }
    if (!/^[A-Za-z0-9_-]+$/.test(segment)) {
        throw new Error(`${label} enthält ungültige Base64URL-Zeichen.`);
    }
    if (segment.length % 4 === 1) {
        throw new Error(`${label} hat eine ungültige Base64URL-Länge.`);
    }
}

function bytesToBinary(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return binary;
}

function encodeBase64Url(value) {
    assertJwtLength(value, "Text");
    const bytes = new TextEncoder().encode(value);
    return btoa(bytesToBinary(bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function decodeBase64Url(segment, label = "Segment") {
    validateBase64UrlSegment(segment, label);
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);

    let binary;
    try {
        binary = atob(padded);
    } catch {
        throw new Error(`${label} ist kein gültiges Base64URL.`);
    }

    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    try {
        return new TextDecoder("utf-8", {fatal: true}).decode(bytes);
    } catch {
        throw new Error(`${label} enthält kein gültiges UTF-8.`);
    }
}

function parseJsonObject(text, label) {
    assertJwtLength(text, label);
    if (text.trim() === "") throw new Error(`${label} darf nicht leer sein.`);

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error(`${label} enthält ungültiges JSON.`);
    }

    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
        throw new Error(`${label} muss ein JSON-Objekt sein.`);
    }
    return parsed;
}

function formatJson(value) {
    return JSON.stringify(value, null, 2);
}

function splitJwt(token) {
    assertJwtLength(token, "JWT");
    const trimmed = token.trim();
    if (trimmed === "") throw new Error("JWT darf nicht leer sein.");

    const segments = trimmed.split(".");
    if (segments.length < 3) throw new Error("JWT muss genau drei durch Punkte getrennte Segmente enthalten.");
    if (segments.length > 3) throw new Error("JWT enthält mehr als drei Segmente.");

    validateBase64UrlSegment(segments[0], "Header-Segment");
    validateBase64UrlSegment(segments[1], "Payload-Segment");
    validateBase64UrlSegment(segments[2], "Signatursegment", true);

    return {
        token: trimmed,
        headerSegment: segments[0],
        payloadSegment: segments[1],
        signature: segments[2]
    };
}

function describeSignature(header, signature, signatureInvalidated = false) {
    const algorithm = typeof header.alg === "string" ? header.alg.trim() : "";

    if (algorithm === "none") {
        if (signature !== "") {
            return {
                kind: "warning",
                text: "Header verwendet alg „none“, aber das Signatursegment ist nicht leer. Das ist kein RFC-konformes Unsecured JWT."
            };
        }
        return {
            kind: "neutral",
            text: "Unsecured JWT / alg none: Dieses Token ist nicht kryptografisch signiert."
        };
    }

    if (!algorithm) {
        return {
            kind: "warning",
            text: "Im JOSE-Header fehlt alg. Eine Signatur kann nicht fachlich eingeordnet werden."
        };
    }

    if (signatureInvalidated && signature !== "") {
        return {
            kind: "warning",
            text: "Signatur durch Änderung ungültig geworden. Das alte Signatursegment wird nur zur Analyse mitgeführt; für ein gültig signiertes JWT ist eine Neusignierung erforderlich."
        };
    }

    if (signature === "") {
        return {
            kind: "warning",
            text: `Für alg „${algorithm}“ fehlt ein Signatursegment. Das JWT ist nicht als gültig signiert anzusehen.`
        };
    }

    return {
        kind: "neutral",
        text: "Signatur vorhanden, aber nicht geprüft. Das Dekodieren bestätigt weder Echtheit noch Signaturgültigkeit."
    };
}

function decodeJwt(token) {
    const segments = splitJwt(token);
    const header = parseJsonObject(decodeBase64Url(segments.headerSegment, "Header-Segment"), "JOSE-Header");
    const payload = parseJsonObject(decodeBase64Url(segments.payloadSegment, "Payload-Segment"), "Payload");

    return {
        ...segments,
        header,
        payload,
        headerJson: formatJson(header),
        payloadJson: formatJson(payload),
        signatureInvalidated: false,
        signatureStatus: describeSignature(header, segments.signature, false)
    };
}

function sameJsonObject(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

function buildJwt(headerText, payloadText, original = null) {
    const header = parseJsonObject(headerText, "JOSE-Header");
    const payload = parseJsonObject(payloadText, "Payload");

    if (original && sameJsonObject(header, original.header) && sameJsonObject(payload, original.payload)) {
        return {
            ...original,
            header,
            payload,
            headerJson: formatJson(header),
            payloadJson: formatJson(payload),
            signatureStatus: describeSignature(header, original.signature, Boolean(original.signatureInvalidated))
        };
    }

    const headerSegment = encodeBase64Url(JSON.stringify(header));
    const payloadSegment = encodeBase64Url(JSON.stringify(payload));
    const unsecured = header.alg === "none";
    const signature = unsecured ? "" : (original?.signature || "");
    const signatureInvalidated = !unsecured && signature !== "";
    const token = `${headerSegment}.${payloadSegment}.${signature}`;

    assertJwtLength(token, "Erzeugtes JWT");

    return {
        token,
        headerSegment,
        payloadSegment,
        signature,
        header,
        payload,
        headerJson: formatJson(header),
        payloadJson: formatJson(payload),
        signatureInvalidated,
        signatureStatus: describeSignature(header, signature, signatureInvalidated)
    };
}

function initJwt() {
    const tokenInput = $("#jwtCompact");
    const headerInput = $("#jwtHeader");
    const payloadInput = $("#jwtPayload");
    const signatureInput = $("#jwtSignature");
    const status = $("#jwtSignatureStatus");
    const errorBox = $("#jwtErrors");
    const decodeButton = $("#jwtDecode");
    const buildButton = $("#jwtBuild");
    const clearButton = $("#jwtClear");
    const copyTokenButton = $("#jwtCopy");
    const copyHeaderButton = $("#jwtCopyHeader");
    const copyPayloadButton = $("#jwtCopyPayload");

    if (!tokenInput || !headerInput || !payloadInput || !signatureInput || !status || !errorBox ||
        !decodeButton || !buildButton || !clearButton || !copyTokenButton || !copyHeaderButton || !copyPayloadButton) return;

    let original = null;
    const editableFields = [tokenInput, headerInput, payloadInput];

    const resetValidation = () => {
        errorBox.hidden = true;
        errorBox.textContent = "";
        editableFields.forEach(field => field.removeAttribute("aria-invalid"));
    };

    const showError = (message, field = null) => {
        errorBox.textContent = message;
        errorBox.hidden = false;
        if (field) field.setAttribute("aria-invalid", "true");
        errorBox.focus();
        setAnnounce(message);
    };

    const renderSignature = (result) => {
        signatureInput.value = result.signature;
        status.textContent = result.signatureStatus.text;
        status.classList.toggle("flat-warn", result.signatureStatus.kind === "warning");
        status.classList.toggle("flat-neutral", result.signatureStatus.kind !== "warning");
    };

    decodeButton.addEventListener("click", () => {
        resetValidation();
        try {
            const result = decodeJwt(tokenInput.value);
            original = result;
            tokenInput.value = result.token;
            headerInput.value = result.headerJson;
            payloadInput.value = result.payloadJson;
            renderSignature(result);
            setAnnounce("JWT dekodiert. Signatur wurde nicht verifiziert.");
        } catch (error) {
            showError(error.message, tokenInput);
        }
    });

    buildButton.addEventListener("click", () => {
        resetValidation();
        try {
            const result = buildJwt(headerInput.value, payloadInput.value, original);
            original = result;
            tokenInput.value = result.token;
            headerInput.value = result.headerJson;
            payloadInput.value = result.payloadJson;
            renderSignature(result);
            setAnnounce("JWT aus Header und Payload erzeugt.");
        } catch (error) {
            const field = error.message.startsWith("JOSE-Header") ? headerInput : payloadInput;
            showError(error.message, field);
        }
    });

    clearButton.addEventListener("click", () => {
        resetValidation();
        original = null;
        tokenInput.value = "";
        headerInput.value = "";
        payloadInput.value = "";
        signatureInput.value = "";
        status.textContent = "Noch kein JWT verarbeitet.";
        status.classList.remove("flat-warn");
        status.classList.add("flat-neutral");
        setAnnounce("JWT-Werkzeug geleert.");
    });

    const copy = async (value, successMessage) => {
        resetValidation();
        try {
            await safeCopy(value);
            setAnnounce(successMessage);
        } catch {
            showError("Kopieren ist in diesem Browserkontext nicht möglich.");
        }
    };

    copyTokenButton.addEventListener("click", () => copy(tokenInput.value, "JWT kopiert."));
    copyHeaderButton.addEventListener("click", () => copy(headerInput.value, "JOSE-Header kopiert."));
    copyPayloadButton.addEventListener("click", () => copy(payloadInput.value, "Payload kopiert."));

    [headerInput, payloadInput].forEach(field => field.addEventListener("input", () => {
        if (!original) return;
        status.textContent = "Änderungen sind noch nicht in das JWT übernommen. Beim Erzeugen kann eine vorhandene Signatur ungültig werden.";
        status.classList.add("flat-warn");
        status.classList.remove("flat-neutral");
    }));
}

window.OnlineToolsJwt = {
    MAX_LENGTH: JWT_MAX_LENGTH,
    build: buildJwt,
    decode: decodeJwt,
    decodeBase64Url,
    encodeBase64Url,
    init: initJwt,
    parseJsonObject,
    signatureStatus: describeSignature,
    split: splitJwt
};

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", initJwt);
}
