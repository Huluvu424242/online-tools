"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "..", "..");

function loadJwtApi() {
    const previousWindow = global.window;
    global.window = {};
    try {
        global.eval(fs.readFileSync(path.join(repositoryRoot, "src", "jwt.js"), "utf8") + "\n//# sourceURL=src/jwt.js");
        return global.window.OnlineToolsJwt;
    } finally {
        global.window = previousWindow;
    }
}

test("Base64URL verarbeitet UTF-8, URL-Alphabet und Padding round-trip", () => {
    const api = loadJwtApi();
    for (const value of ["Hallo", "Grüße 世界 😀", "a", "ab", "abc", "\u0000\n\t"]) {
        const encoded = api.encodeBase64Url(value);
        assert.doesNotMatch(encoded, /[+/=]/);
        assert.equal(api.decodeBase64Url(encoded), value);
    }
    assert.equal(api.encodeBase64Url("✓"), "4pyT");
});

test("Base64URL lehnt ungültige Zeichen, Längen und ungültiges UTF-8 ab", () => {
    const api = loadJwtApi();
    assert.throws(() => api.decodeBase64Url("abc+"), /Base64URL-Zeichen/);
    assert.throws(() => api.decodeBase64Url("a"), /Base64URL-Länge/);
    assert.throws(() => api.decodeBase64Url("_w"), /gültiges UTF-8/);
    assert.throws(() => api.decodeBase64Url(""), /darf nicht leer/);
});

test("typisches signiertes JWT wird dekodiert, aber ausdrücklich nicht verifiziert", () => {
    const api = loadJwtApi();
    const headerSegment = api.encodeBase64Url('{"alg":"HS256","typ":"JWT"}');
    const payloadSegment = api.encodeBase64Url(
        '{"sub":"synthetic-test-subject","name":"Synthetic Test User","iat":1516239022}'
    );
    const signatureSegment = api.encodeBase64Url("synthetic-test-signature-not-cryptographic");
    const token = `${headerSegment}.${payloadSegment}.${signatureSegment}`;
    const decoded = api.decode(token);

    assert.equal(decoded.header.alg, "HS256");
    assert.equal(decoded.payload.sub, "synthetic-test-subject");
    assert.equal(decoded.payload.iat, 1516239022);
    assert.equal(decoded.signatureStatus.text.includes("nicht geprüft"), true);
    assert.equal(api.build(decoded.headerJson, decoded.payloadJson, decoded).token, token);
});

test("Claims und verschachtelte JSON-Strukturen lassen sich ändern und neu serialisieren", () => {
    const api = loadJwtApi();
    const original = api.build(
        '{"alg":"HS256","typ":"JWT"}',
        '{"sub":"1","roles":["user"],"nested":{"enabled":true},"nullable":null}'
    );
    const changed = api.build(
        original.headerJson,
        '{"sub":"2","roles":["user","admin"],"nested":{"enabled":false},"count":3,"nullable":null}',
        original
    );
    const roundTrip = api.decode(changed.token);

    assert.deepEqual(roundTrip.payload, {
        sub: "2",
        roles: ["user", "admin"],
        nested: {enabled: false},
        count: 3,
        nullable: null
    });
    assert.equal(changed.signature, "");
    assert.match(changed.signatureStatus.text, /fehlt ein Signatursegment/);
});

test("eine vorhandene Signatur wird nach Inhaltsänderung als ungültig markiert", () => {
    const api = loadJwtApi();
    const signatureSegment = api.encodeBase64Url("synthetic-signature");
    const original = api.decode(
        [
            api.encodeBase64Url('{"alg":"HS256"}'),
            api.encodeBase64Url('{"sub":"1"}'),
            signatureSegment
        ].join(".")
    );
    const changed = api.build(original.headerJson, '{"sub":"2"}', original);

    assert.equal(changed.signature, signatureSegment);
    assert.equal(changed.signatureInvalidated, true);
    assert.match(changed.signatureStatus.text, /durch Änderung ungültig/);

    const repeated = api.build(changed.headerJson, changed.payloadJson, changed);
    assert.equal(repeated.signatureInvalidated, true);
    assert.match(repeated.signatureStatus.text, /durch Änderung ungültig/);

    const withoutAlg = api.build("{}", changed.payloadJson, original);
    assert.equal(withoutAlg.signatureInvalidated, true);
    assert.match(withoutAlg.signatureStatus.text, /durch Änderung ungültig/);
});

test("Wechsel auf alg none erzeugt ein RFC-konformes Unsecured JWT mit leerem Signatursegment", () => {
    const api = loadJwtApi();
    const original = api.decode(
        [
            api.encodeBase64Url('{"alg":"HS256"}'),
            api.encodeBase64Url('{"sub":"1"}'),
            api.encodeBase64Url("sig")
        ].join(".")
    );
    const unsecured = api.build('{"alg":"none","typ":"JWT"}', original.payloadJson, original);

    assert.equal(unsecured.token.endsWith("."), true);
    assert.equal(unsecured.signature, "");
    assert.match(unsecured.signatureStatus.text, /nicht kryptografisch signiert/);
    assert.equal(api.decode(unsecured.token).header.alg, "none");
});

test("alg none mit Signatur und fehlendes alg werden eindeutig gekennzeichnet", () => {
    const api = loadJwtApi();
    const noneWithSignature = api.decode(
        [
            api.encodeBase64Url('{"alg":"none"}'),
            api.encodeBase64Url("{}"),
            api.encodeBase64Url("sig")
        ].join(".")
    );
    assert.match(noneWithSignature.signatureStatus.text, /nicht leer/);

    const noAlg = api.build("{}", "{}");
    assert.match(noAlg.signatureStatus.text, /fehlt alg/);
});

test("JWT-Struktur und JSON-Objektanforderungen werden verständlich validiert", () => {
    const api = loadJwtApi();
    assert.throws(() => api.decode(""), /darf nicht leer/);
    assert.throws(() => api.decode("a.b"), /genau drei/);
    assert.throws(() => api.decode("a.b.c.d"), /mehr als drei/);

    const badHeader = api.encodeBase64Url("not json");
    const emptyObject = api.encodeBase64Url("{}");
    assert.throws(() => api.decode(`${badHeader}.${emptyObject}.`), /JOSE-Header enthält ungültiges JSON/);

    const arrayHeader = api.encodeBase64Url("[]");
    assert.throws(() => api.decode(`${arrayHeader}.${emptyObject}.`), /JOSE-Header muss ein JSON-Objekt/);

    assert.throws(() => api.build('{"alg":"none"}', "null"), /Payload muss ein JSON-Objekt/);
    assert.throws(() => api.build('{"alg":"none"', "{}"), /JOSE-Header enthält ungültiges JSON/);
});

test("hostile Claim-Werte bleiben reine JSON-Daten und JWT-Logik nutzt keine Netzwerk- oder HTML-Sinks", () => {
    const api = loadJwtApi();
    const payload = {"html":"<script>alert('x')</script>","amp":"&<>\"'","control":"line\nnext\t"};
    const result = api.build('{"alg":"none"}', JSON.stringify(payload));
    assert.deepEqual(api.decode(result.token).payload, payload);

    const source = fs.readFileSync(path.join(repositoryRoot, "src", "jwt.js"), "utf8");
    assert.doesNotMatch(source, /\.innerHTML\s*=/);
    assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon)\b/);
    assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|indexedDB)\b/);
});

test("sehr große Eingaben werden begrenzt ohne Inhalte in Fehlermeldungen zu spiegeln", () => {
    const api = loadJwtApi();
    const tooLarge = "x".repeat(api.MAX_LENGTH + 1);
    assert.throws(() => api.decode(tooLarge), /ist zu groß/);
    assert.throws(() => api.build('{"alg":"none"}', tooLarge), /ist zu groß/);
});

test("HTML integriert das JWT-Tool zugänglich und lokal", () => {
    const html = fs.readFileSync(path.join(repositoryRoot, "index.html"), "utf8");
    assert.match(html, /<script defer src="src\/jwt\.js"><\/script>/);
    assert.match(html, /id="tool-jwt"/);
    assert.match(html, /id="jwtErrors"[^>]*role="alert"/);
    assert.match(html, /id="jwtSignature"[^>]*readonly/);
    assert.match(html, /Das Dekodieren eines JWT bestätigt weder dessen Echtheit\s+noch die\s+Gültigkeit seiner Signatur/);
    assert.match(html, /Verarbeitung erfolgt ausschließlich lokal im Browser/);
});
