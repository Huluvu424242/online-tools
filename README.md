# online-tools

Online Tools für Entwickler.

Demo: https://huluvu424242.github.io/online-tools/

## Offline-Nutzung

Die Webseite ist vollständig statisch und führt ihre Tools direkt im Browser aus. Nutzereingaben werden nicht an fremde Server gesendet.

Auf der Startseite gibt es den Button **Offline-ZIP herunterladen**. Damit wird ein ZIP mit der kompletten Implementierung erzeugt. Nach dem Download:

1. ZIP-Datei entpacken.
2. `index.html` im Browser öffnen.
3. Die Tools ohne Internetverbindung nutzen.

## Enthaltene Tools

- Cron Erklärer
- Base64 Codierer/Dekodierer
- Regex Checker mit lokaler ReDoS-Heuristik
- Regex Vergleich für eine eingeschränkte reguläre Teilmenge

## Datenschutz und externe Abhängigkeiten

Die Anwendung bindet zur Laufzeit keine CDNs oder Remote-Prüfdienste ein. Insbesondere werden Regex-Pattern und Testdaten nur lokal verarbeitet.
