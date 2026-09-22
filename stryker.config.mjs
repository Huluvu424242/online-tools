// @ts-check

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    packageManager: "npm",
    mutate: [
        "src/calendar-week.js"
    ],

    testRunner: "command",
    commandRunner: {
        command: "node tests/run-fna-mutated.js"
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
        break: 70
    },

    timeoutMS: 60_000,
    concurrency: 4,
    coverageAnalysis: "off",
    cleanTempDir: true,
    inPlace: true,
    tempDirName: ".stryker-tmp"
};

export default config;
