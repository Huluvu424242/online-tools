# Dokumentation und Lizenzen

## Grundsätze

- Dokumentation wird im selben Pull Request aktualisiert wie die Änderung, die sie fachlich erforderlich macht.
- Benutzer-, Entwickler- und Architekturdokumentation werden inhaltlich klar getrennt, auch wenn die bestehende Repository-Struktur dafür schrittweise weiterentwickelt wird.
- Benutzerbezogene Dokumentation beschreibt die tatsächlich ausgelieferte Bedienung, sichtbare Funktionen, bekannte Einschränkungen sowie Offline- und Datenschutzverhalten verständlich.
- Entwicklerdokumentation beschreibt Setup, Entwicklungswerkzeuge, Tests und Wartungsabläufe.
- Architekturentscheidungen dokumentieren insbesondere die browser-native Laufzeit, Offline-Fähigkeit, direkte GitHub-Pages-Auslieferung, produktive Quellen und Grenzen zulässiger Tooling-Abhängigkeiten.
- Diagramme werden bevorzugt in textuell versionierbaren Formaten wie Mermaid gepflegt, sofern ein Diagramm einen echten Mehrwert bietet.
- Dokumentationsänderungen dürfen keinen produktiven Build-Schritt für die Webanwendung einführen.

## Bestehende Dokumentationsartefakte

Dieses Repository verwendet historisch folgende Dateinamen:

- `README.md` für den zentralen Projekteinstieg.
- `docs/` für weiterführende Dokumentation.
- `CHANGE.log` als Änderungshistorie.
- `ATTRIBUTION` für Attributions- und Lizenzhinweise ausgelieferter Assets.

Diese Dateien werden im Rahmen normaler Fachänderungen nicht allein aus Namenskonventionsgründen umbenannt. Eine Umstellung etwa auf `CHANGELOG.md` oder `ATTRIBUTIONS.md` benötigt eine bewusste, eigene Änderung mit Prüfung aller Verweise und Automationen.

## Changelog

- `CHANGE.log` bleibt die maßgebliche Änderungshistorie des Projekts, solange keine gesonderte Migration beschlossen wurde.
- Neue Einträge folgen weiterhin der vorhandenen Keep-a-Changelog-orientierten Struktur mit `Unreleased` und geeigneten Kategorien wie `Added`, `Changed`, `Fixed`, `Security` oder `Accessibility`.
- Nutzerrelevante Funktionen, Security-Fixes und relevante Änderungen des Projektbetriebs werden im selben PR eingetragen.
- Rein interne Formulierungs- oder Strukturänderungen ohne Einfluss auf Projektbetrieb, Wartung oder Nutzerverhalten müssen nicht künstlich aufgebläht werden.

## Attribution und Lizenzen

- Lizenzrelevante ausgelieferte Bibliotheken, Bilder, Schriften, Logos und andere Assets werden mit Herkunft, Rechteinhaber beziehungsweise Quelle, Lizenz und Verwendung dokumentiert.
- Die bestehende Datei `ATTRIBUTION` wird dafür verwendet, solange keine gesonderte Migration erfolgt.
- Neue produktive Abhängigkeiten erfordern vor Aufnahme eine Prüfung von Lizenz, Herkunft, Wartungszustand und Offline-Kompatibilität.
- Entwicklungs- und Testabhängigkeiten werden ebenfalls lizenz- und supply-chain-bewusst gewählt; sie dürfen die produktive Browserlaufzeit nicht bestimmen.

## Dokumentationsstatus im PR

Jeder Pull Request nennt ausdrücklich:

- welche Dokumentation aktualisiert wurde,
- welche Dokumentation geprüft, aber nicht angepasst werden musste,
- ob Changelog oder Attribution betroffen sind,
- welche Dokumentations- oder manuelle Verifikationsarbeit noch offen ist.
