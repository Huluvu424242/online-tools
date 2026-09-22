# Release und Abschluss

## Releasevorbereitung

Eine Releasevorbereitung ist ein eigener, nachvollziehbarer Arbeitsablauf auf einem eigenen Branch und wird über Pull Request bereitgestellt.

Für `online-tools` stehen nicht mobile Buildnummern oder Plattformpakete im Mittelpunkt, sondern die Konsistenz der direkt ausgelieferten statischen Anwendung.

Vor Kennzeichnung eines Stands als releasebereit ist zu prüfen:

1. vorgesehener Releaseumfang und gegebenenfalls Zielversion anhand des aktuellen `master`-Stands bestimmen
2. `CHANGE.log` und relevante Benutzer-, Entwickler- und Architekturdokumentation auf den Releaseumfang abstimmen
3. repositoryweit nach Aussagen suchen, die einen aktuellen Release- oder Versionsstand behaupten, und deren Konsistenz prüfen
4. sicherstellen, dass GitHub Pages weiterhin die eingecheckten statischen Dateien ohne produktiven Build-Schritt veröffentlichen kann
5. sicherstellen, dass `index.html` direkt und ohne Node.js beziehungsweise Paketinstallation nutzbar bleibt
6. sicherstellen, dass das Offline-ZIP ausschließlich eingecheckte, unmittelbar ausführbare Inhalte bereitstellt und autark nutzbar bleibt
7. normale Tests und die nach [Qualität und Tests](05-quality-testing.md) erforderlichen Mutationstests ausführen
8. Security-, Lizenz- und Dokumentationsstatus prüfen
9. Releasevorbereitungs-PR mit Ziel, Änderungen, Prüfungen, Dokumentationsstatus, Risiken und gegebenenfalls Closing-Keyword bereitstellen

Historische Versionsangaben werden nicht mechanisch ersetzt, wenn ihr historischer Bezug weiterhin korrekt ist.

## Abschließende Abnahmekriterien

Vor Abschluss jeder Änderung sind die für den Umfang relevanten Punkte zu prüfen.

### Architektur

- Die Anwendung funktioniert ohne installierte Node.js-Laufzeit.
- Es ist kein `npm install` für die Nutzung erforderlich.
- Es ist kein Build-Befehl für die Nutzung oder Veröffentlichung erforderlich.
- Die auslieferbaren Dateien sind vollständig im Repository enthalten.
- GitHub Pages kann die Dateien direkt bereitstellen.
- Das Offline-ZIP enthält eine unmittelbar nutzbare Anwendung.
- Neue Kernfunktionen arbeiten ohne Netzwerkzugriff, sofern Netzwerkzugriff nicht ausdrücklich Bestandteil der Funktion ist.
- `generated-config/production-sources.json` ist bei Änderungen produktiver Quellen aktuell.

### Funktionalität und Sicherheit

- Das gewünschte Verhalten ist umgesetzt.
- Relevante Grenz- und Fehlerfälle sind berücksichtigt.
- Nutzereingaben werden als nicht vertrauenswürdig behandelt.
- Strukturierte Ausgaben verwenden kontextspezifisches Escaping oder geeignete Standard-Serializer.
- Es wurden keine Secrets oder sensiblen Daten eingecheckt.
- Bei GUI-Änderungen wurden die einschlägigen Accessibility-Anforderungen geprüft.

### Tests

Für Änderungen an produktivem JavaScript gilt vollständig die Definition of Done aus [Qualität und Tests](05-quality-testing.md). Insbesondere:

- alle normalen Tests sind erfolgreich
- neue und geänderte Logik besitzt passende Tests
- Fehlerkorrekturen besitzen Regressionstests
- Stryker wurde für die betroffenen Dateien ausgeführt
- der konfigurierte `break`-Wert wurde eingehalten
- der Mutation Score wurde nicht verschlechtert
- überlebende Mutanten wurden analysiert
- kritische Konverter-, Parser-, Validierungs- und Escaping-Logik strebt einen Mutation Score von 100 Prozent an
- Testwerkzeuge haben produktive Dateien nicht dauerhaft verändert

Bei reinen Dokumentations- oder Harness-Änderungen ohne Änderung produktiver JavaScript-Logik sind Mutationstests nicht allein wegen der Dokumentationsänderung erforderlich. Stattdessen werden die für die Änderung sinnvollen Struktur-, Link- und Konsistenzprüfungen ausgeführt. Ein vorhandener CI-Lauf darf nur gemäß [Sicherheit und Werkzeugketten](04-security-tooling.md) verwendet werden.

## Verbindlicher Abschlussbericht

Der Abschlussbericht nennt für Änderungen an produktivem JavaScript:

- welche normalen Tests ausgeführt wurden
- welche Mutationstests ausgeführt wurden
- welche Dateien mutiert wurden
- welchen Mutation Score der Lauf erreichte
- wie viele Mutanten getötet, überlebt, nicht abgedeckt oder durch Timeouts beendet wurden
- welche überlebenden Mutanten verbleiben und warum
- ob alle Architektur- und Offline-Vorgaben weiterhin eingehalten werden

Für reine Harness-/Dokumentationsänderungen nennt der Abschlussbericht stattdessen die tatsächlich ausgeführten Struktur-, Link- und Konsistenzprüfungen und stellt ausdrücklich fest, dass keine produktive JavaScript-Logik geändert wurde.

Eine Änderung ist nicht allein deshalb abgeschlossen, weil sie im normalen Beispiel funktioniert.
