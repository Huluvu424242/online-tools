"use strict";

/**
 * StrykerJS configuration for the browser-native production JavaScript.
 * Node.js is used only for development-time tests; the application itself
 * remains directly executable from the checked-in static files.
 */
module.exports = {
    packageManager: "npm",
    testRunner: "command",
    commandRunner: {
        command: "node tests/run-all.js"
    },
    coverageAnalysis: "off",
    mutate: [
        "tools/base64.js",
        "tools/cron-erklaerer.js",
        "tools/regex-checker.js",
        "tools/regex-compare.js",
        "tools/rot13.js",
        "tools/yaml-properties.js",
        "tools/zip.js"
    ],
    reporters: ["clear-text", "progress", "html", "json"],
    jsonReporter: {
        fileName: "reports/mutation/mutation.json"
    },
    htmlReporter: {
        fileName: "reports/mutation/html"
    },
    tempDirName: ".stryker-tmp",
    thresholds: {
        high: 90,
        low: 80,
        break: 70
    }
};
