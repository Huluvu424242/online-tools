const assert = require("node:assert/strict");
const fs = require("node:fs");

const indexHtml = fs.readFileSync("index.html", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");

assert.match(indexHtml, /<fieldset class="option-group regex-flags" aria-label="Regex Flags">/);
assert.match(styles, /\.regex-flags \{[\s\S]*?display: grid;[\s\S]*?grid-template-columns: repeat\(6, 44px\);[\s\S]*?overflow-x: auto;[\s\S]*?\}/);
assert.match(styles, /\.regex-flags label:not\(\.consent\) \{[\s\S]*?justify-content: center;[\s\S]*?min-width: 44px;[\s\S]*?gap: 4px;[\s\S]*?white-space: nowrap;[\s\S]*?\}/);
assert.match(styles, /\.regex-flags input\[type="checkbox"\] \{[\s\S]*?flex: 0 0 auto;[\s\S]*?\}/);

console.log("Regex layout regression tests passed.");
