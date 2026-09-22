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
- Kalenderwochenanzeige für heute und frei wählbare Datumswerte nach ISO 8601
- De-/Encoder für Base64 und ROT13
- JWT Decoder & Manipulator für bidirektionale Bearbeitung von JOSE-Header und Claims
- Konverter für YAML/Properties und Java-nahe Konfigurationen
- Regex Checker mit lokaler ReDoS-Heuristik
- Regex Vergleich für eine eingeschränkte reguläre Teilmenge

## Kalenderwoche

Das Kalenderwochen-Tool zeigt die aktuelle ISO-Kalenderwoche und berechnet die Kalenderwoche für ein frei
gewähltes Datum. Die Berechnung folgt ISO 8601: Wochen beginnen montags; die erste Kalenderwoche eines
ISO-Jahres ist die Woche mit dem ersten Donnerstag. Dadurch können Tage am Jahresanfang noch zum
Kalenderwochenjahr des Vorjahres und Tage am Jahresende bereits zum Folgejahr gehören.

## JWT Decoder & Manipulator

Das JWT-Tool zerlegt eine JWT Compact Serialization lokal in **JOSE-Header**, **Payload/Claims** und
**Signatursegment**. Header und Payload werden als eingerücktes JSON angezeigt und können direkt bearbeitet
werden; beliebige Keys, Arrays, verschachtelte Objekte, Zahlen, Booleans und `null` bleiben erhalten.
Anschließend kann daraus wieder ein JWT erzeugt werden.

JWT verwendet **Base64URL**. Das reine Dekodieren prüft jedoch keine kryptografische Signatur und bestätigt
weder Echtheit noch Vertrauenswürdigkeit des Tokens. Wird Header oder Payload eines signierten JWT geändert,
wird die vorhandene Signatur ausdrücklich als ungültig geworden gekennzeichnet; eine Neusignierung findet in
diesem Tool nicht statt.

`"alg": "none"` wird als Unsecured JWT unterstützt. In diesem Fall erzeugt das Tool RFC-konform ein leeres
Signatursegment (`header.payload.`) und weist sichtbar darauf hin, dass das Token nicht kryptografisch
signiert ist.

JWT-Inhalte werden ausschließlich im Browser verarbeitet, nicht an externe APIs übertragen und nicht
automatisch in LocalStorage, SessionStorage oder IndexedDB gespeichert.

## Tests

Die JavaScript-Regressionschecks laufen ohne externe Abhängigkeiten direkt mit Node.js:

```bash
node tests/yaml-properties.test.js
```

## Datenschutz und externe Abhängigkeiten

Die Anwendung bindet zur Laufzeit keine CDNs oder Remote-Prüfdienste ein. Insbesondere werden Regex-Pattern und Testdaten nur lokal verarbeitet.
