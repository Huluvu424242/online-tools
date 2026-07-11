"use strict";

const productionSources = require("./production-sources.json");

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
    mutate: productionSources.javascriptWithBusinessLogic,
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
