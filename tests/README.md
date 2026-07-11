# JavaScript-Testsuite

Die Tests verwenden ausschließlich Node.js-Bordmittel. Es sind weder `npm install`
noch eine `package.json` oder ein Build-Schritt erforderlich.

## Installation

Den Inhalt dieses ZIP-Archivs in das Wurzelverzeichnis des Repositories kopieren.
Dabei wird nur der Ordner `tests` ergänzt beziehungsweise erweitert.

## Ausführung

Gesamte Suite:

```bash
node tests/run-all.js
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

## Enthaltene Testgruppen

- YAML → Properties und Properties → YAML
- Unicode, Arrays, null und String-Typisierung
- Backslashes, Kontrollzeichen, Separatoren und Kommentarzeichen
- Property-Schlüssel und Roundtrips
- Fehlerbehandlung
- UI-Aktionen einschließlich Kopieren, Tauschen und Löschen
- statische Architektur ohne CDN, Build-Schritt oder Node-Abhängigkeit im Browsercode
- Prüfung lokaler Ressourcenreferenzen

## Bewusst offene Fälle

Zwei Tests sind als `TODO` markiert:

- YAML Block-Scalars `|` und `>`
- verlustfreie Darstellung leerer Objekte und Arrays

Sie werden im Bericht angezeigt, lassen die Suite aber nicht fehlschlagen.

## Erwarteter anfänglicher Befund

Die Tests für strukturelle Zeichen in Property-Schlüsseln können mit dem derzeitigen
Stand des Konverters fehlschlagen. Das ist beabsichtigt: Sie bilden die gewünschte
sichere Properties-Grammatik ab und machen den noch fehlenden Schlüssel-Encoder
sichtbar.

Insbesondere werden folgende Ausgaben erwartet:

```properties
key\ with\ spaces=value
key\=part=value
key\:part=value
\#key=value
\!key=value
```

## GitHub Actions

Im Workflow genügt als Testschritt:

```yaml
- name: Run JavaScript regression tests
  run: node tests/run-all.js
```

Der Testcode verändert keine produktiven Dateien.
