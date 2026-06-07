# online-tools

Online Tools für Entwickler.

Demo: https://huluvu424242.github.io/online-tools/

## Mobile-First-Architektur

Die Oberfläche wird mobile-first gestaltet: Basis-Styles optimieren kleine Touch-Viewports, vermeiden horizontales Überlaufen und ergänzen Tablet-/Desktop-Abweichungen nur, wenn sie Bedienbarkeit oder Lesbarkeit verbessern. Die verbindlichen Codex-Hinweise stehen in `AGENTS.md`.

## Offline-Nutzung

Die Webseite ist vollständig statisch und führt ihre Tools direkt im Browser aus. Nutzereingaben werden nicht an fremde Server gesendet.

Auf der Startseite gibt es den Button **Offline-ZIP herunterladen**. Damit wird ein ZIP mit der kompletten Implementierung erzeugt. Nach dem Download:

1. ZIP-Datei entpacken.
2. `index.html` im Browser öffnen.
3. Die Tools ohne Internetverbindung nutzen.

## Enthaltene Tools

- Cron Erklärer
- De-/Encoder für Base64 und ROT13
- YAML/Properties Konverter für Java-nahe Konfigurationen
- Regex Checker mit lokaler ReDoS-Heuristik
- Regex Vergleich für eine eingeschränkte reguläre Teilmenge

## Tests

Die JavaScript-Regressionschecks laufen ohne externe Abhängigkeiten direkt mit Node.js:

```bash
node tests/yaml-properties.test.js
```

## Datenschutz und externe Abhängigkeiten

Die Anwendung bindet zur Laufzeit keine CDNs oder Remote-Prüfdienste ein. Insbesondere werden Regex-Pattern und Testdaten nur lokal verarbeitet.
