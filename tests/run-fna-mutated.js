"use strict";

const {spawnSync} = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const {discoverTestFiles} = require("./helpers/run-suite");

const repositoryRoot = path.resolve(__dirname, "..");

const mutationTestMap = new Map([
    ["src/base64.js", ["tests/fna/text-tools.test.js"]],
    ["src/rot13.js", ["tests/fna/text-tools.test.js"]],
    ["src/cron-erklaerer.js", ["tests/fna/cron-regex-checker.test.js"]],
    ["src/regex-checker.js", ["tests/fna/cron-regex-checker.test.js", "tests/fna/regex-layout.test.js"]],
    ["src/regex-compare.js", ["tests/fna/regex-compare.test.js"]],
    ["src/yaml-properties.js", [
        "tests/fna/yaml-properties-conversion.test.js",
        "tests/fna/yaml-properties-escaping.test.js",
        "tests/fna/yaml-properties-ui.test.js",
        "tests/fna/yaml-properties.test.js"
    ]],
    ["src/zip.js", ["tests/fna/zip-manifest.test.js"]]
]);

function normalizeGitPath(filePath) {
    return filePath.trim().replace(/\\/g, "/");
}

function allFnaTests() {
    return discoverTestFiles(path.join(__dirname, "fna"))
        .map((filePath) => path.relative(repositoryRoot, filePath).replace(/\\/g, "/"));
}

function buildMutantFileMap() {
    const mutantToFile = new Map();
    for (const filePath of mutationTestMap.keys()) {
        const fullPath = path.join(repositoryRoot, filePath);
        if (!fs.existsSync(fullPath)) continue;
        const source = fs.readFileSync(fullPath, "utf8");
        for (const match of source.matchAll(/stryMutAct_[^(]+\("(\d+)"\)/gu)) {
            mutantToFile.set(match[1], filePath);
        }
    }
    return mutantToFile;
}

function testsForMutatedFile(filePath) {
    return mutationTestMap.get(normalizeGitPath(filePath)) || allFnaTests();
}

function testsForMutantId(mutantId, mutantToFile = buildMutantFileMap()) {
    const filePath = mutantToFile.get(String(mutantId));
    return filePath ? testsForMutatedFile(filePath) : allFnaTests();
}

function selectedTests() {
    const activeMutant = process.env.__STRYKER_ACTIVE_MUTANT__;
    return activeMutant ? testsForMutantId(activeMutant) : allFnaTests();
}

function runSelectedTests(testFiles) {
    const result = spawnSync(process.execPath, ["--test", ...testFiles], {
        cwd: repositoryRoot,
        stdio: "inherit"
    });

    return result.status ?? 1;
}

if (require.main === module) {
    process.exit(runSelectedTests(selectedTests()));
}

module.exports = {
    allFnaTests,
    buildMutantFileMap,
    mutationTestMap,
    normalizeGitPath,
    selectedTests,
    testsForMutantId,
    testsForMutatedFile
};
