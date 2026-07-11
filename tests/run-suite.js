"use strict";

const {spawnSync} = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function discoverTestFiles(directory) {
    return fs.readdirSync(directory, {withFileTypes: true})
        .filter((entry) => entry.isFile() && entry.name.endsWith(".test.js"))
        .map((entry) => path.join(directory, entry.name))
        .sort((left, right) => left.localeCompare(right));
}

function runSuite(suiteDirectoryName) {
    const testsDirectory = __dirname;
    const repositoryRoot = path.resolve(testsDirectory, "..");
    const suiteDirectory = path.join(testsDirectory, suiteDirectoryName);
    const testFiles = discoverTestFiles(suiteDirectory);

    if (testFiles.length === 0) {
        console.error(`Keine Testdateien in ${path.relative(repositoryRoot, suiteDirectory)} gefunden.`);
        return 1;
    }

    const result = spawnSync(
        process.execPath,
        ["--test", ...testFiles],
        {
            cwd: repositoryRoot,
            stdio: "inherit"
        }
    );

    return result.status ?? 1;
}

module.exports = {discoverTestFiles, runSuite};
