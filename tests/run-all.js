"use strict";

const {spawnSync} = require("node:child_process");
const path = require("node:path");

const testsDirectory = __dirname;
const result = spawnSync(
    process.execPath,
    [
        "--test",
        path.join(testsDirectory, "regex-layout.test.js"),
        path.join(testsDirectory, "yaml-properties.test.js"),
        path.join(testsDirectory, "yaml-properties-conversion.test.js"),
        path.join(testsDirectory, "yaml-properties-escaping.test.js"),
        path.join(testsDirectory, "yaml-properties-ui.test.js"),
        path.join(testsDirectory, "architecture.test.js")
    ],
    {
        cwd: path.resolve(testsDirectory, ".."),
        stdio: "inherit"
    }
);

process.exit(result.status ?? 1);
