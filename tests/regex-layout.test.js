const assert = require("node:assert/strict");
const fs = require("node:fs");

const indexHtml = fs.readFileSync("index.html", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");

assert.match(indexHtml, /<fieldset class="option-group regex-flags" aria-label="Regex Flags">/);
assert.match(styles, /\.regex-flags label:not\(\.consent\) \{[\s\S]*?flex: 0 0 auto;[\s\S]*?white-space: nowrap;[\s\S]*?\}/);
assert.match(styles, /\.regex-flags input\[type="checkbox"\] \{[\s\S]*?flex: 0 0 auto;[\s\S]*?\}/);

console.log("Regex layout regression tests passed.");
