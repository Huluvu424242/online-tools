# JavaScript-Testsuite

Die normalen Regressionstests verwenden ausschließlich Node.js-Bordmittel. Für diese Tests sind weder `npm install` noch ein Build-Schritt erforderlich. Die `package.json` verwaltet ausschließlich Entwicklungs- und Testwerkzeuge; die statische Anwendung bleibt ohne Node.js, Paketinstallation oder Build-Schritt ausführbar.

## Struktur

Die Tests sind nach Verzeichnissen gruppiert, damit neue Testdateien ohne Pflege einer zentralen Dateiliste aufgenommen werden:

- `tests/fna/`: fachliche Anforderungen, z. B. Konverter-, Escaping-, UI- und Layout-Verhalten
- `tests/nfa/`: nicht-fachliche normative Anforderungen, z. B. Architektur-, Offline- und QS-Konfigurationsprüfungen
- `tests/helpers/`: gemeinsame Test-Hilfen

Die Runner `tests/run-fna.js` und `tests/run-nfa.js` entdecken alle `*.test.js`-Dateien im jeweiligen Suite-Verzeichnis automatisch. `tests/run-all.js` führt beide Suites nacheinander aus.

## Installation

Den Inhalt dieses ZIP-Archivs in das Wurzelverzeichnis des Repositories kopieren.
Dabei wird nur der Ordner `tests` ergänzt beziehungsweise erweitert.

## Ausführung

Gesamte normale Suite:

```bash
node tests/run-all.js
```

Alternativ über das npm-Script für Entwicklungsumgebungen:

```bash
npm test
```

Einzelne Gruppen:

```bash
node tests/run-fna.js
node tests/run-nfa.js
npm run test:fna
npm run test:nfa
```

Einzelne Testdateien können weiterhin direkt mit dem Node-Test-Runner ausgeführt werden, zum Beispiel:

```bash
node --test tests/fna/yaml-properties-conversion.test.js
node --test tests/fna/yaml-properties-escaping.test.js
node --test tests/fna/yaml-properties-ui.test.js
node --test tests/nfa/architecture.test.js
```

Empfohlen wird Node.js 20 oder neuer.

## Mutationstests mit StrykerJS

StrykerJS ist als Entwicklungswerkzeug konfiguriert. Nach der Installation der Dev-Abhängigkeiten kann der Mutationstestlauf mit folgendem Befehl gestartet werden:

```bash
npm run mutation
```

Die Konfiguration liegt in `stryker.conf.cjs`. Sie mutiert die produktiven Tool-Dateien unter `src/`, nutzt gemäß Story die nicht-fachliche Suite `node tests/run-nfa.js` als Command-Runner und erzeugt Konsolen-, HTML- und JSON-Reports unter `reports/mutation/`. Temporäre Dateien und Reports sind über `.gitignore` ausgeschlossen und gehören nicht zur produktiven Offline-Anwendung.

## Enthaltene Testgruppen

- YAML → Properties und Properties → YAML
- Unicode, Arrays, null und String-Typisierung
- Backslashes, Kontrollzeichen, Separatoren und Kommentarzeichen
- Property-Schlüssel und Roundtrips
- Fehlerbehandlung
- UI-Aktionen einschließlich Kopieren, Tauschen und Löschen
- statische Architektur ohne CDN, Build-Schritt oder Node-Abhängigkeit im Browsercode
- Prüfung lokaler Ressourcenreferenzen
- Prüfung der Stryker-Konfiguration, expliziten Mutationsdateien und Schwellenwerte
- Prüfung der FNA-/NFA-Testorganisation

## Bewusst offene Fälle

Zwei Tests sind als `TODO` markiert:

- YAML Block-Scalars `|` und `>`
- verlustfreie Darstellung leerer Objekte und Arrays

Sie werden im Bericht angezeigt, lassen die Suite aber nicht fehlschlagen.

## GitHub Actions

Im Workflow genügt als Testschritt:

```yaml
- name: Run JavaScript regression tests
  run: node tests/run-all.js
```

Der Testcode verändert keine produktiven Dateien.
