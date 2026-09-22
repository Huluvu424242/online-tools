# Domänenspezifische Regeln

## Java-Properties-Konvertierung

Code, der Java-`.properties`-Ausgabe schreibt, muss der Java-Properties-Grammatik folgen.

- Backslashes müssen als `\\` escaped werden.
- Newline, Carriage Return, Tab und Form Feed müssen explizit kodiert werden.
- Property-Keys und Property-Values müssen separate kontextspezifische Escaping-Funktionen verwenden.
- Spaces und Delimiter-Zeichen in Keys dürfen nicht verändern, wo der Key endet.
- Generierte Values dürfen keine unbeabsichtigten Kommentare, Separatoren, Escape-Sequenzen oder Line Continuations erzeugen.
- Jede Converter-Änderung muss, soweit praktisch, YAML→Properties→YAML- oder Properties→YAML→Properties-Round-Trip-Tests enthalten.
- Tests müssen Windows-Pfade, literale Backslash-Sequenzen, führende Leerzeichen, `=`, `:`, `#`, `!`, mehrzeilige Werte und leere Werte enthalten.
- Änderungen an der Properties-Konvertierung müssen zusätzlich durch Stryker geprüft werden.
- Überlebende Mutanten in Escaping-, Parsing- oder Serialisierungsfunktionen müssen durch Tests getötet oder als tatsächlich äquivalent nachvollziehbar dokumentiert werden.
- Für diesen Bereich ist ein Mutation Score von möglichst 100 Prozent anzustreben.

Zusätzlich gelten ohne Einschränkung die allgemeinen Regeln aus [Sicherheit und Werkzeugketten](04-security-tooling.md) und [Qualität und Tests](05-quality-testing.md).
