"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {createHarness} = require("../helpers/yaml-properties-harness");

const {sandbox} = createHarness();

test("maskiert sicherheitsrelevante Zeichen in Property-Werten", () => {
    const cases = [
        ["normal", "normal"],
        ["C:\\temp\\file.txt", "C:\\\\temp\\\\file.txt"],
        ["line1\nline2", "line1\\nline2"],
        ["line1\rline2", "line1\\rline2"],
        ["tab\tvalue", "tab\\tvalue"],
        [" leading", "\\ leading"],
        ["a=b:c", "a\\=b\\:c"],
        ["#comment", "\\#comment"],
        ["!comment", "\\!comment"],
        ["\\n", "\\\\n"],
        ["\\\\", "\\\\\\\\"],
        ["äöü 世界 😀", "äöü 世界 😀"]
    ];

    for (const [value, expected] of cases) {
        const yaml = `value: ${JSON.stringify(value)}`;
        assert.equal(
            sandbox.yamlToProperties(yaml),
            `value=${expected}`,
            `Fehler bei ${JSON.stringify(value)}`
        );
    }
});

test("liest maskierte Property-Werte korrekt zurück", () => {
    const properties = [
        "windows.path=C:\\\\temp\\\\file.txt",
        "actual.newline=line1\\nline2",
        "literal.sequence=\\\\n",
        "delimiters=a\\=b\\:c",
        "comments=\\#hash und \\!bang",
        "leading=\\ value"
    ].join("\n");

    const yaml = sandbox.propertiesToYaml(properties);

    assert.match(yaml, /path: "C:\\\\temp\\\\file.txt"/);
    assert.match(yaml, /newline: "line1\\nline2"/);
    assert.match(yaml, /sequence: "\\\\n"/);
    assert.match(yaml, /delimiters: "a=b:c"/);
    assert.match(yaml, /comments: "#hash und !bang"/);
    assert.match(yaml, /leading: " value"/);
});

test("unterstützt =, :, Whitespace und fehlende Separatoren", () => {
    const yaml = sandbox.propertiesToYaml([
        "equals=value",
        "colon: value",
        "space value",
        "withoutSeparator"
    ].join("\n"));

    assert.match(yaml, /^equals: value$/m);
    assert.match(yaml, /^colon: value$/m);
    assert.match(yaml, /^space: value$/m);
    assert.match(yaml, /^withoutSeparator: ""$/m);
});

test("ignoriert Properties-Kommentare und Leerzeilen", () => {
    const yaml = sandbox.propertiesToYaml(`
# comment
! another comment

name=demo
`);

    assert.equal(yaml, "name: demo");
});

test("setzt fortgesetzte Properties-Zeilen zusammen", () => {
    const yaml = sandbox.propertiesToYaml("message=Hallo\\\nWelt");
    assert.equal(yaml, "message: HalloWelt");
});

test("maskiert strukturelle Zeichen in Property-Schlüsseln", () => {
    const yaml = [
        '"key with spaces": value',
        '"key=part": equals',
        '"key:part": colon',
        '"#key": hash',
        '"!key": bang'
    ].join("\n");

    const properties = sandbox.yamlToProperties(yaml);

    assert.equal(
        properties,
        [
            "key\\ with\\ spaces=value",
            "key\\=part=equals",
            "key\\:part=colon",
            "\\#key=hash",
            "\\!key=bang"
        ].join("\n")
    );
});

test("Property-Schlüssel überstehen einen Roundtrip", () => {
    const original = [
        "key\\ with\\ spaces=value",
        "key\\=part=equals",
        "key\\:part=colon",
        "\\#key=hash",
        "\\!key=bang",
        "path\\\\key=backslash"
    ].join("\n");

    const yaml = sandbox.propertiesToYaml(original);
    const roundtrip = sandbox.yamlToProperties(yaml);

    assert.equal(roundtrip, original);
});

test("YAML-Kommentare und Schlüsseltrennung beachten Quotes, Escapes und Unicode", () => {
    const yaml = [
        "quoted: \"Wert # kein Kommentar\" # Kommentar",
        "'key:part': 'v: # bleibt'",
        "emoji: '😀 # literal'",
        "plain: value # entfernt"
    ].join("\n");

    assert.equal(sandbox.yamlToProperties(yaml), [
        "quoted=Wert \\# kein Kommentar",
        "key\\:part=v\\: \\# bleibt",
        "emoji=😀 \\# literal",
        "plain=value"
    ].join("\n"));
});

test("YAML-Properties schützt Kommentar-, Quote-, Listen- und Zeilenwechsel-Grenzfälle", () => {
    const yaml = [
        "leadingHash: \"# bleibt Wert\" # Kommentar",
        "singleQuote: 'It''s # literal' # Kommentar",
        "plainHash: vorher # Kommentar",
        "list:",
        "  - name: erstes",
        "  - label: zweites",
        "  - 'dritter Wert'",
        "multi:",
        "  one: 1",
        "  two: 2"
    ].join("\n");

    assert.equal(sandbox.yamlToProperties(yaml), [
        "leadingHash=\\# bleibt Wert",
        "singleQuote=It's \\# literal",
        "plainHash=vorher",
        "list[0].name=erstes",
        "list[1].label=zweites",
        "list[2]=dritter Wert",
        "multi.one=1",
        "multi.two=2"
    ].join("\n"));
});

test("YAML-Properties maskiert Werte mit tatsächlichen Steuerzeichen und Doppelpunkten roundtrip-fähig", () => {
    const yaml = [
        "windows: \"C:\\\\temp\\\\file.txt\"",
        "linefeed: \"eins\\nzwei\"",
        "carriage: \"eins\\rzwei\"",
        "tabbed: \"eins\\tzwei\"",
        "colonBackslash: \"a:\\\\b\"",
        "colonPlain: \"a:b\"",
        "empty: null"
    ].join("\n");

    const properties = sandbox.yamlToProperties(yaml);

    assert.equal(properties, [
        "windows=C:\\\\temp\\\\file.txt",
        "linefeed=eins\\nzwei",
        "carriage=eins\\rzwei",
        "tabbed=eins\\tzwei",
        "colonBackslash=a:\\\\b",
        "colonPlain=a\\:b",
        "empty="
    ].join("\n"));

    assert.equal(sandbox.yamlToProperties(sandbox.propertiesToYaml(properties)), properties);
});
