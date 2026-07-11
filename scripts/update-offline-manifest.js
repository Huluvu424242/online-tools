#!/usr/bin/env node
"use strict";

const {execFileSync} = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(repositoryRoot, "offline-package-files.json");
const manifestRepositoryPath = "offline-package-files.json";

function repositoryFiles() {
    const trackedFiles = execFileSync("git", ["ls-files"], {cwd: repositoryRoot, encoding: "utf8"})
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((file) => file.replaceAll("\\", "/"));

    return [...new Set([...trackedFiles, manifestRepositoryPath])].sort();
}

function writeManifest(files) {
    const manifest = {
        description: "Automatisch aus git ls-files erzeugte Dateiliste für das Offline-ZIP. Nicht manuell pflegen.",
        generatedFrom: "git ls-files",
        files
    };

    fs.writeFileSync(`${manifestPath}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    fs.renameSync(`${manifestPath}.tmp`, manifestPath);
}

if (require.main === module) {
    writeManifest(repositoryFiles());
}

module.exports = {repositoryFiles, writeManifest, manifestPath};
