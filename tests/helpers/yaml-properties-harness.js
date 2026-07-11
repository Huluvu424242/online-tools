"use strict";

const fs = require("node:fs");
const path = require("node:path");
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
            return listeners.get("click")?.();
        },
        change() {
            return listeners.get("change")?.();
        }
    };
}

function createHarness(options = {}) {
    const repositoryRoot = options.repositoryRoot || path.resolve(__dirname, "..", "..");
    const copiedValues = [];
    const announcements = [];

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

    const sourcePath = path.join(repositoryRoot, "tools", "yaml-properties.js");
    const source = fs.readFileSync(sourcePath, "utf8");

    const sandbox = {
        window: {},
        document: {addEventListener() {}},
        console,
        $: (selector) => elements[selector] || null,
        setAnnounce(message) {
            announcements.push(message);
        },
        async safeCopy(value) {
            if (options.copyFails) {
                throw new Error("Clipboard unavailable");
            }
            copiedValues.push(value);
        }
    };

    vm.createContext(sandbox);
    vm.runInContext(source, sandbox, {filename: "tools/yaml-properties.js"});

    return {
        sandbox,
        elements,
        copiedValues,
        announcements,
        init() {
            sandbox.window.OnlineToolsYamlProperties.init();
        }
    };
}

module.exports = {
    createElement,
    createHarness
};
