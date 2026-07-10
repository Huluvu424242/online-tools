# Projektanweisungen für Codex AI

## Architekturentscheidung: Mobile First

Dieses Projekt verfolgt ab sofort einen konsequenten Mobile-First-Ansatz.

- Neue Oberflächen werden zuerst für Smartphones und Touch-Bedienung umgesetzt.
- Die Basis-Styles müssen ohne Media Query auf kleinen Viewports hervorragend funktionieren.
- Abweichungen für Tablet oder Desktop werden nur ergänzt, wenn der größere Viewport einen echten Bedien- oder Lesbarkeitsvorteil bietet.
- Interaktive Elemente sollen gut mit dem Finger bedienbar sein; als Mindestziel gelten ca. 44 px Höhe/Breite für Touch-Ziele.
- Horizontales Überlaufen ist zu vermeiden. Lange Inhalte müssen umbrechen oder in klar begrenzten Ergebnisbereichen scrollen.
- Offline-Nutzbarkeit und die statische Architektur ohne externe Laufzeit-Abhängigkeiten bleiben erhalten.

## Security requirements

Treat all externally supplied or user-controlled values as untrusted input.

When generating output for a structured format such as Java properties, YAML, JSON, HTML, URLs, shell commands, regular expressions, SQL, or JavaScript:

* use an encoder or escaping function designed specifically for the target format and output context
* do not reuse an encoder written for a different format or context
* escape the escape character itself before escaping other special characters
* ensure replacements apply to every relevant occurrence, not only the first occurrence
* do not build structured output through partially escaped string concatenation when a suitable serializer or standard API is available
* keep key escaping, value escaping, quoting, parsing, and validation in clearly separated functions when their rules differ
* do not assume that a previous helper function has already performed part of the required security encoding
* preserve round-trip behavior: parsing serialized output must reproduce the original input

For every custom encoder, parser, serializer, or sanitizer:

* document the target grammar and the characters with structural meaning
* add tests for backslashes, quotes, delimiters, comment characters, whitespace, control characters, empty strings, Unicode, and repeated escape characters
* add at least one round-trip test using hostile or malformed-looking input
* verify behavior for sequences such as `\n`, `\\`, `\=`, `\#`, leading whitespace, and actual newline or tab characters
* prefer standard-library serializers over custom escaping whenever possible

Before completing a change:

1. inspect all data flows from input to output
2. check for injection, incomplete escaping, path traversal, unsafe DOM APIs, unsafe URL handling, and accidental secret exposure
3. run the existing tests, linter, and configured security scanner
4. add regression tests for every fixed security finding
5. do not suppress a security warning unless the warning has been investigated and the justification is documented in the code or pull request

A change is not complete merely because the normal example works. It must also handle adversarial input without changing the structure or meaning of the generated output.

## Java properties conversion rules

Code that writes Java `.properties` output must follow the Java properties grammar.

* Backslashes must be escaped as `\\`.
* Newline, carriage return, tab, and form-feed characters must be encoded explicitly.
* Property keys and property values must use separate context-specific escaping functions.
* Spaces and delimiter characters in keys must not be allowed to change where the key ends.
* Generated values must not create unintended comments, separators, escape sequences, or line continuations.
* Every converter change must include YAML-to-properties-to-YAML or properties-to-YAML-to-properties round-trip tests where practical.
* Tests must include Windows paths, literal backslash sequences, leading spaces, `=`, `:`, `#`, `!`, multiline values, and empty values.



