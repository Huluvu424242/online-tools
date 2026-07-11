# JavaScript-Testsuite

Die normalen Regressionstests verwenden ausschließlich Node.js-Bordmittel. Für diese Tests sind weder `npm install` noch ein Build-Schritt erforderlich. Die `package.json` verwaltet ausschließlich Entwicklungs- und Testwerkzeuge; die statische Anwendung bleibt ohne Node.js, Paketinstallation oder Build-Schritt ausführbar.

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

Alternativ direkt mit dem Node-Test-Runner:

```bash
node --test tests/*.test.js
```

Einzelne Gruppen:

```bash
node --test tests/yaml-properties-conversion.test.js
node --test tests/yaml-properties-escaping.test.js
node --test tests/yaml-properties-ui.test.js
node --test tests/architecture.test.js
```

Empfohlen wird Node.js 20 oder neuer.

## Mutationstests mit StrykerJS

StrykerJS ist als Entwicklungswerkzeug konfiguriert. Nach der Installation der Dev-Abhängigkeiten kann der vollständige Mutationstestlauf mit folgendem Befehl gestartet werden:

```bash
npm run mutation
```

Die Konfiguration liegt in `stryker.conf.cjs`. Sie mutiert die produktiven Tool-Dateien unter `tools/`, nutzt die normale Testsuite als Command-Runner und erzeugt Konsolen-, HTML- und JSON-Reports unter `reports/mutation/`. Temporäre Dateien und Reports sind über `.gitignore` ausgeschlossen und gehören nicht zur produktiven Offline-Anwendung.

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
