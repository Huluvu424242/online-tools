"use strict";

const {spawnSync} = require("node:child_process");
const path = require("node:path");

const testsDirectory = __dirname;
const repositoryRoot = path.resolve(testsDirectory, "..");
const suites = ["run-fna.js", "run-nfa.js"];

for (const suite of suites) {
    const result = spawnSync(process.execPath, [path.join(testsDirectory, suite)], {
        cwd: repositoryRoot,
        stdio: "inherit"
    });

    if ((result.status ?? 1) !== 0) {
        process.exit(result.status ?? 1);
    }
}
