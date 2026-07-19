"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {createHarness} = require("../helpers/yaml-properties-harness");

const {sandbox} = createHarness();

test("konvertiert verschachteltes YAML und Arrays nach Properties", () => {
    const yaml = `spring:
  application:
    name: demo-service
  datasource:
    url: jdbc:postgresql://localhost:5432/demo
server:
  port: 8080
features:
  - login
  - audit`;

    const expected = [
        "spring.application.name=demo-service",
        "spring.datasource.url=jdbc\\:postgresql\\://localhost\\:5432/demo",
        "server.port=8080",
        "features[0]=login",
        "features[1]=audit"
    ].join("\n");

    assert.equal(sandbox.yamlToProperties(yaml), expected);
});

test("ignoriert YAML-Dokumentmarker, Leerzeilen und Kommentare", () => {
    const yaml = `---
# Kommentar
application:
  name: demo # Kommentar am Zeilenende
  text: "Wert # bleibt erhalten"
...
`;

    assert.equal(
        sandbox.yamlToProperties(yaml),
        [
            "application.name=demo",
            "application.text=Wert \\# bleibt erhalten"
        ].join("\n")
    );
});

test("unterstützt einfache Skalare einschließlich null", () => {
    const yaml = `enabled: true
port: 8080
rate: 1.25
missing: null
alternateMissing: ~`;

    assert.equal(
        sandbox.yamlToProperties(yaml),
        [
            "enabled=true",
            "port=8080",
            "rate=1.25",
            "missing=",
            "alternateMissing="
        ].join("\n")
    );
});

test("erhält Unicode-Zeichen", () => {
    const yaml = `message: "Grüße 世界 😀"`;
    assert.equal(sandbox.yamlToProperties(yaml), "message=Grüße 世界 😀");
});

test("unterscheidet echte Kontrollzeichen von literalen Escape-Sequenzen", () => {
    const yaml = String.raw`actualNewline: "line1\nline2"
literalSequence: "line1\\nline2"
tab: "a\tb"`;

    assert.equal(
        sandbox.yamlToProperties(yaml),
        [
            "actualNewline=line1\\nline2",
            "literalSequence=line1\\\\nline2",
            "tab=a\\tb"
        ].join("\n")
    );
});

test("leere Eingaben ergeben leere Ausgaben", () => {
    assert.equal(sandbox.yamlToProperties(""), "");
    assert.equal(sandbox.propertiesToYaml(""), "");
});

test("Tabs in YAML-Einrückungen werden mit Zeilennummer abgelehnt", () => {
    assert.throws(
        () => sandbox.yamlToProperties("application:\n\tname: demo"),
        /Zeile 2: Tabs in Einrückungen/
    );
});

test("leere YAML-Schlüssel werden abgelehnt", () => {
    assert.throws(
        () => sandbox.yamlToProperties(": value"),
        /Leerer YAML-Schlüssel/
    );
});

test("Properties werden als Strings in YAML ausgegeben", () => {
    const yaml = sandbox.propertiesToYaml([
        "enabled=true",
        "port=8080",
        "rate=1.25",
        "empty="
    ].join("\n"));

    assert.match(yaml, /^enabled: "true"$/m);
    assert.match(yaml, /^port: "8080"$/m);
    assert.match(yaml, /^rate: "1.25"$/m);
    assert.match(yaml, /^empty: ""$/m);
});

test("Properties-Arrays werden in YAML-Listen umgewandelt", () => {
    const yaml = sandbox.propertiesToYaml([
        "features[0]=login",
        "features[1]=audit"
    ].join("\n"));

    assert.equal(yaml, "features:\n  - login\n  - audit");
});

test("YAML-Properties-YAML-Roundtrip erhält die fachlichen Werte", () => {
    const originalYaml = String.raw`application:
  name: demo
  path: "C:\\temp\\demo"
  message: "Hallo\nWelt"
  enabled: true
  tags:
  - alpha
  - beta`;

    const properties = sandbox.yamlToProperties(originalYaml);
    const convertedYaml = sandbox.propertiesToYaml(properties);
    const secondProperties = sandbox.yamlToProperties(convertedYaml);

    assert.equal(secondProperties, properties);
});

test.todo("YAML Block-Scalars mit | und > fachlich korrekt unterstützen");

test("YAML-Kommentare starten nur außerhalb von Quotes und nach Whitespace", () => {
    const yaml = String.raw`url: http://example.test/#anchor
quoted: "Wert # bleibt"
escapedQuote: "a \"# kein Kommentar\" b"`;

    assert.equal(
        sandbox.yamlToProperties(yaml),
        [
            "url=http\\://example.test/\\#anchor",
            "quoted=Wert \\# bleibt",
            "escapedQuote=a \"\\# kein Kommentar\" b"
        ].join("\n")
    );
});

test("YAML-Kommentare und Doppelpunkte bleiben in Quotes struktursicher", () => {
    const yaml = [
        "plain: Wert#kein Kommentar",
        "commented: Wert # Kommentar",
        "double: \"http://example.test/a#b: c\" # Kommentar",
        "single: 'it''s # not a comment: ok'",
        "escaped: \"Quote \\\" und Slash \\\\ und Tab\\t\"",
        "nullish: null",
        "tilde: ~",
        " spaced key :  spaced value  "
    ].join("\n");

    assert.equal(sandbox.yamlToProperties(yaml), [
        "plain=Wert\\#kein Kommentar",
        "commented=Wert",
        "double=http\\://example.test/a\\#b\\: c",
        "single=it's \\# not a comment\\: ok",
        "escaped=Quote \" und Slash \\\\ und Tab\\t",
        "nullish=",
        "tilde=",
        "spaced\\ key=spaced value"
    ].join("\n"));
});

test("YAML-Doppelpunkte trennen Schlüssel nur am Zeilenende oder vor Whitespace", () => {
    const yaml = String.raw`url: jdbc:postgresql://localhost:5432/demo
mapping:
  "a:b": value
  plain:with:colon: kept`;

    assert.equal(
        sandbox.yamlToProperties(yaml),
        [
            "url=jdbc\\:postgresql\\://localhost\\:5432/demo",
            "mapping.a\\:b=value",
            "mapping.plain\\:with\\:colon=kept"
        ].join("\n")
    );
});

test("Properties-Parser erkennt Whitespace-, Doppelpunkt- und Gleich-Separatoren mit optionalem Abstand", () => {
    const yaml = sandbox.propertiesToYaml([
        "spaceKey    spaced value",
        "colonKey   : colon value",
        "equalsKey  = equals value",
        "tabKey\t:\ttab value"
    ].join("\n"));

    assert.match(yaml, /^spaceKey: "spaced value"$/m);
    assert.match(yaml, /^colonKey: "colon value"$/m);
    assert.match(yaml, /^equalsKey: "equals value"$/m);
    assert.match(yaml, /^tabKey: "tab value"$/m);
});

test("Properties-Unescaping behandelt Formfeed, unbekannte Escapes und Windows-Zeilenenden", () => {
    const yaml = sandbox.propertiesToYaml("form=before\\fafter\r\nunknown=keep\\xchar");

    assert.match(yaml, /^form: "before\fafter"$/m);
    assert.match(yaml, /^unknown: "keep\\\\xchar"$/m);
});
test.todo("leere YAML-Objekte und leere Arrays verlustfrei darstellen");

test("YAML-Listen mit Objekten und quoted Keys bleiben fachlich erhalten", () => {
    const yaml = String.raw`services:
  - name: api
    "port:number": 8080
  - name: web
    enabled: false`;

    assert.equal(
        sandbox.yamlToProperties(yaml),
        [
            "services[0].name=api",
            "services[0].port\\:number=8080",
            "services[1].name=web",
            "services[1].enabled=false"
        ].join("\n")
    );
});

test("Properties verarbeitet Fortsetzungszeilen, Kommentarpräfixe und nichtnumerische Indexsegmente", () => {
    const yaml = sandbox.propertiesToYaml([
        "# ignored",
        "! ignored too",
        "continued=line\\",
        "next",
        "items[abc]=named",
        "items[2]=third"
    ].join("\n"));

    assert.match(yaml, /^continued: linenext$/m);
    assert.match(yaml, /^items:/m);
    assert.match(yaml, /^  abc: named$/m);
    assert.match(yaml, /^  - third$/m);
});


test("Properties-Pfade unterscheiden Indexgrenzen und verschachtelte Arrays", () => {
    const properties = [
        "literal.dot=value",
        "array[0]=zero",
        "array[01]=leading-zero-index",
        "array[-1]=negative-index",
        "array[abc]=named-index",
        "nested[0].child=value",
        "nested[1].list[0]=entry"
    ].join("\n");

    assert.equal(sandbox.propertiesToYaml(properties), [
        "literal:",
        "  dot: value",
        "array:",
        "  -1: negative-index",
        "  abc: named-index",
        "  - zero",
        "  - leading-zero-index",
        "nested:",
        "  -",
        "    child: value",
        "  -",
        "    list:",
        "      - entry"
    ].join("\n"));
});

test("Properties-Parser ersetzt skalare Zwischenknoten durch passende Objekt- oder Listenstruktur", () => {
    const objectYaml = sandbox.propertiesToYaml([
        "service=scalar",
        "service.name=api"
    ].join("\n"));

    assert.equal(objectYaml, "service:\n  name: api");

    const listYaml = sandbox.propertiesToYaml([
        "items=scalar",
        "items[0]=first"
    ].join("\n"));

    assert.equal(listYaml, "items:\n  - first");
});

test("Properties-Parser behält unvollständige Indexsyntax als literalen Schlüsselteil", () => {
    assert.equal(
        sandbox.propertiesToYaml("items[broken=value"),
        'items:\n  "[broken": value'
    );
});
