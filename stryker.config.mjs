// @ts-check

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    packageManager: "npm",
    mutate: [
        "tools/base64.js",
        "tools/cron-erklaerer.js",
        "tools/regex-checker.js",
        "tools/regex-compare.js",
        "tools/rot13.js",
        "tools/yaml-properties.js",
        "tools/zip.js"
    ],

    testRunner: "command",
    commandRunner: {
        command: "node tests/run-fna.js"
    },

    reporters: [
        "html",
        "json",
        "clear-text",
        "progress"
    ],

    htmlReporter: {
        fileName: "reports/mutation/index.html"
    },

    jsonReporter: {
        fileName: "reports/mutation/mutation.json"
    },

    clearTextReporter: {
        reportTests: true,
        reportMutants: true,
        reportScoreTable: true,
        skipFull: false
    },

    thresholds: {
        high: 90,
        low: 80,
        break: 0
    },

    timeoutMS: 60_000,
    concurrency: 1,
    coverageAnalysis: "off",
    cleanTempDir: true,
    tempDirName: ".stryker-tmp"
};

export default config;
