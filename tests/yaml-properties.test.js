const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function createElement(value = "") {
    const listeners = new Map();

    return {
        value,
        textContent: "",
        placeholder: "",
        style: {},
        addEventListener(type, listener) {
            listeners.set(type, listener);
        },
        click() {
            listeners.get("click")?.();
        },
        change() {
            listeners.get("change")?.();
        }
    };
}

const elements = {
    "#ypMode": createElement("yamlToProperties"),
    "#ypInput": createElement(),
    "#ypOutput": createElement(),
    "#ypStatus": createElement(),
    "#ypConvert": createElement(),
    "#ypSwap": createElement(),
    "#ypClear": createElement(),
    "#ypCopy": createElement(),
    "#ypExample": createElement(),
    "#ypInputLabel": createElement(),
    "#ypOutputLabel": createElement()
};

const source = fs.readFileSync("tools/yaml-properties.js", "utf8");
const sandbox = {
    window: {},
    document: {addEventListener() {}},
    console,
    $: (selector) => elements[selector] || null,
    setAnnounce() {},
    safeCopy: async () => {}
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox, {filename: "tools/yaml-properties.js"});

const exampleYaml = `spring:
  application:
    name: demo-service
  datasource:
    url: jdbc:postgresql://localhost:5432/demo
    username: demo
server:
  port: 8080
features:
  - login
  - audit`;

const expectedProperties = [
    "spring.application.name=demo-service",
    "spring.datasource.url=jdbc\\:postgresql\\://localhost\\:5432/demo",
    "spring.datasource.username=demo",
    "server.port=8080",
    "features[0]=login",
    "features[1]=audit"
].join("\n");

assert.equal(sandbox.yamlToProperties(exampleYaml), expectedProperties);

const yamlAfterSwapConvert = sandbox.propertiesToYaml(expectedProperties);
assert.match(yamlAfterSwapConvert, /spring:\n  application:\n    name: demo-service/);
assert.match(yamlAfterSwapConvert, /datasource:\n    url: "jdbc:postgresql:\/\/localhost:5432\/demo"/);
assert.match(yamlAfterSwapConvert, /server:\n  port: "8080"/);
assert.match(yamlAfterSwapConvert, /features:\n  - login\n  - audit/);

const roundTrippedProperties = sandbox.yamlToProperties(yamlAfterSwapConvert);
assert.equal(roundTrippedProperties, expectedProperties);

assert.equal(sandbox.yamlToProperties(""), "");
assert.equal(sandbox.propertiesToYaml(""), "");

sandbox.window.OnlineToolsYamlProperties.init();
elements["#ypExample"].click();
assert.equal(elements["#ypMode"].value, "yamlToProperties");
assert.equal(elements["#ypOutput"].value, "");

elements["#ypConvert"].click();
assert.equal(elements["#ypOutput"].value, expectedProperties);

elements["#ypSwap"].click();
assert.equal(elements["#ypMode"].value, "propertiesToYaml");
assert.equal(elements["#ypInput"].value, expectedProperties);
assert.equal(elements["#ypOutputLabel"].textContent, "Ausgabe (YAML)");
assert.equal(elements["#ypOutput"].placeholder, "YAML-Ergebnis…");

elements["#ypConvert"].click();
assert.match(elements["#ypOutput"].value, /spring:\n  application:\n    name: demo-service/);
assert.match(elements["#ypStatus"].textContent, /Konvertierung abgeschlossen/);

elements["#ypClear"].click();
assert.equal(elements["#ypInput"].value, "");
assert.equal(elements["#ypOutput"].value, "");
assert.equal(elements["#ypStatus"].textContent, "Geleert.");

const indexHtml = fs.readFileSync("index.html", "utf8");
assert.match(indexHtml, /data-nav="De-\/Encoder" data-nav-hint="Base64, ROT13, \.\.\."/);
assert.match(indexHtml, /<h1>De-\/Encoder<\/h1>/);
assert.match(indexHtml, /data-nav="Konverter" data-nav-hint="yaml, properties, \.\.\."/);

console.log("YAML/Properties regression tests passed.");
