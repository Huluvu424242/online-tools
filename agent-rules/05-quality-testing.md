# Qualität und Tests

Tests sind Teil der Implementierung und keine nachgelagerte Zusatzaufgabe.

## Grundregeln

- Jede Fehlerkorrektur benötigt mindestens einen Regressionstest, der vor der Korrektur fehlschlagen und nach der Korrektur erfolgreich sein würde.
- Jede neue fachliche Funktion benötigt Tests für das erwartete Verhalten.
- Änderungen an bestehender fachlicher Logik benötigen angepasste oder zusätzliche Tests.
- Tests müssen nicht nur Erfolgsfälle, sondern auch Grenzwerte, ungültige Eingaben und relevante Fehlerfälle abdecken.
- Tests müssen deterministisch, voneinander unabhängig und beliebig oft wiederholbar sein.
- Tests dürfen keine Internetverbindung und keine externen Dienste benötigen.
- Tests dürfen keine Reihenfolge voraussetzen.
- Tests dürfen produktive Dateien nicht dauerhaft verändern.
- Tests dürfen nicht lediglich interne Implementierungsdetails bestätigen.
- Bevorzugt werden Tests, die beobachtbares Verhalten und fachliche Ergebnisse prüfen.

## Obligatorische Testfälle

Je nach Funktion sind insbesondere zu prüfen:

- leere Eingaben
- minimale und maximale sinnvolle Werte
- Werte direkt unter, auf und über fachlichen Grenzwerten
- ungültige Syntax
- unvollständige Eingaben
- Unicode und Nicht-ASCII-Zeichen
- Steuerzeichen
- sehr lange Eingaben
- wiederholte Trenn- und Escape-Zeichen
- führende und nachfolgende Leerzeichen
- Windows- und Unix-Zeilenenden
- unerwartete, aber syntaktisch mögliche Eingaben
- Round-Trip-Verhalten bei Konvertern
- sicherheitskritische oder absichtlich feindselig wirkende Eingaben

Ein einzelner Happy-Path-Test ist für eine neue fachliche Funktion nicht ausreichend.

## Verbindliche Mutationstests mit StrykerJS

StrykerJS ist das verbindliche Werkzeug zur Bewertung der Wirksamkeit der JavaScript-Tests.

Mutationstests ergänzen normale Regressionstests. Sie ersetzen diese nicht.

Das Ziel besteht nicht darin, einen hohen Zahlenwert durch Ausschlüsse oder triviale Tests zu erzeugen. Das Ziel besteht darin, nachzuweisen, dass die Tests relevante Verhaltensänderungen im produktiven Code erkennen.

### Geltungsbereich

- Alle produktiven JavaScript-Dateien mit fachlicher Logik müssen grundsätzlich durch Stryker mutiert werden.
- Dazu gehören insbesondere Parser, Konverter, Encoder, Decoder, Validatoren, Berechnungen, Vergleiche, Filter, Escape-Funktionen und sicherheitsrelevante Prüfungen.
- Testdateien dürfen nicht mutiert werden.
- Rein deklarative Daten, unveränderliche Konstantenlisten und ausschließlich visuelle Initialisierung dürfen ausgeschlossen werden, wenn eine Mutation keinen sinnvollen fachlichen Erkenntnisgewinn liefern würde.
- Dateien oder Mutationstypen dürfen nicht pauschal ausgeschlossen werden, nur um den Mutation Score zu erhöhen.
- Jeder Ausschluss muss eng begrenzt und in der Stryker-Konfiguration oder unmittelbar am Code begründet werden.

Die `mutate`-Konfiguration muss explizit festlegen, welche produktiven Dateien untersucht werden. Eine zufällige Auswahl allein aufgrund von Stryker-Standardmustern ist nicht ausreichend.

### Verbindliche Ausführung

Nach Änderungen an produktivem JavaScript muss der KI-Agent:

1. die normalen Tests ausführen
2. anschließend die relevanten Mutationstests ausführen
3. den Mutation Score prüfen
4. überlebende Mutanten untersuchen
5. fehlende sinnvolle Tests ergänzen
6. die normalen Tests erneut ausführen
7. Stryker erneut ausführen

Eine Änderung an fachlicher JavaScript-Logik ist nicht abgeschlossen, wenn Stryker nicht ausgeführt wurde.

Falls Stryker in der aktuellen Umgebung technisch nicht ausgeführt werden kann, muss der KI-Agent:

- dies ausdrücklich mitteilen
- den Grund nennen
- die mutmaßlich betroffenen Dateien nennen
- den exakten auszuführenden Mutationstest-Befehl angeben
- keine erfolgreiche Mutationstest-Prüfung behaupten

### Mutation-Score-Sollwerte

Langfristig gelten für das Gesamtprojekt folgende Sollwerte:

```text
high: 90
low: 80
break: 70
```

Diese Werte bedeuten:

- Mutation Score ab 90 Prozent: guter Zielbereich
- Mutation Score von mindestens 80, aber unter 90 Prozent: akzeptabel, aber verbesserungsbedürftig
- Mutation Score von mindestens 70, aber unter 80 Prozent: deutlicher Handlungsbedarf
- Mutation Score unter 70 Prozent: Qualitätsprüfung fehlgeschlagen

Die Stryker-Konfiguration soll langfristig folgende Schwellen enthalten:

```js
thresholds: {
    high: 90,
    low: 80,
    break: 70
}
```

### Stufenweise Einführung der Schwellwerte

Bei der erstmaligen Einführung von Stryker ist zunächst der vollständige Ausgangswert zu messen.

Falls der Ausgangswert unter dem langfristigen Mindestwert liegt:

- darf nicht einfach ein unerreichbarer Schwellwert gesetzt und dauerhaft ignoriert werden
- wird `break` zunächst knapp unterhalb des tatsächlich erreichten Ausgangswerts festgelegt
- darf der konfigurierte `break` niemals ohne dokumentierte fachliche Begründung abgesenkt werden
- muss der Wert mit jeder gezielten Testverbesserung schrittweise angehoben werden
- bleiben `high: 90`, `low: 80` und `break: 70` das verbindliche langfristige Ziel

Ein niedriger Ausgangswert ist kein Grund, produktiven Code aus der Mutation auszuschließen.

### Nichtverschlechterungsregel

Unabhängig vom absoluten Schwellwert gilt:

- Eine Änderung darf den Mutation Score des betroffenen Bereichs nicht verschlechtern.
- Neuer oder geänderter fachlicher Code darf keine ungeprüften überlebenden Mutanten hinterlassen.
- Sinkt der Score, muss die Ursache untersucht und zusätzliche sinnvolle Tests ergänzt werden.
- Eine Verschlechterung darf nur akzeptiert werden, wenn sie fachlich begründet und vom Maintainer ausdrücklich genehmigt wurde.
- Der Schwellwert darf nicht abgesenkt werden, um eine Verschlechterung zu verdecken.

### Bewertung überlebender Mutanten

Jeder überlebende Mutant muss einzeln bewertet werden.

Für jeden überlebenden Mutanten ist eine der folgenden Maßnahmen erforderlich:

1. einen fehlenden Test ergänzen
2. redundanten oder wirkungslosen produktiven Code entfernen
3. den Code so vereinfachen, dass die fachliche Absicht eindeutig testbar wird
4. einen nachweislich äquivalenten oder technisch nicht sinnvoll testbaren Mutanten eng begrenzt deaktivieren und die Begründung dokumentieren

Folgende Begründungen reichen nicht aus:

- „Der Mutation Score ist bereits hoch genug.“
- „Der Mutant ist wahrscheinlich unwichtig.“
- „Die Zeile ist schwer zu testen.“
- „Der Test würde zusätzlichen Aufwand verursachen.“
- „Stryker erzeugt zu viele Mutanten.“

Insbesondere bei Parsern, Konvertern, Escaping, Validierung und sicherheitsrelevanter Logik soll für überlebende Mutanten grundsätzlich ein Test ergänzt werden.

### Besonders kritische Bereiche

Für folgende Bereiche ist ein Mutation Score von möglichst 100 Prozent anzustreben:

- Escaping und Encoding
- Parser und Serializer
- Formatkonverter
- Eingabevalidierung
- sicherheitsrelevante Filter
- Grenzwertentscheidungen
- reguläre Ausdrücke mit fachlicher Bedeutung
- URL- und Pfadverarbeitung
- Erkennung gefährlicher oder ungültiger Eingaben
- Funktionen, die strukturierte Ausgabe erzeugen

Ein Wert unter 100 Prozent in diesen Bereichen ist nur akzeptabel, wenn sämtliche überlebenden Mutanten geprüft und nachvollziehbar begründet wurden.

### Keine Manipulation des Scores

Es ist verboten, den Mutation Score künstlich zu verbessern durch:

- unnötige Ausschlüsse produktiver Dateien
- pauschales Deaktivieren von Mutatoren
- Ignorieren überlebender Mutanten ohne Analyse
- Tests, die lediglich auf interne Implementierungsdetails zugeschnitten sind
- Tests, die absichtlich einen bestimmten Mutanten statt fachliches Verhalten prüfen
- Entfernen sinnvoller Mutationstypen aus der Konfiguration
- Verkleinern des Mutationstestbereichs ohne fachlichen Grund
- Absenken der Schwellwerte zur Umgehung eines fehlgeschlagenen Laufs

Tests müssen fachliches Verhalten beschreiben. Sie dürfen nicht allein deshalb existieren, um Stryker zufriedenzustellen.

### Stryker und die statische Architektur

Stryker ist ausschließlich ein Testwerkzeug.

- Stryker darf Node.js als Entwicklungsabhängigkeit verwenden.
- Stryker darf eine `package.json` und `node_modules` für Testzwecke voraussetzen.
- Stryker darf keinen Build-Schritt für die produktive Anwendung einführen.
- Die produktiven Dateien müssen weiterhin direkt im Browser ausführbar bleiben.
- Mutationstest-spezifischer Instrumentierungscode darf nicht in die veröffentlichten produktiven Dateien gelangen.
- Temporäre Stryker-Dateien und Reports dürfen nicht Bestandteil des Offline-ZIP werden.
- Stryker darf keine Vite-, Webpack- oder sonstige Bundler-Abhängigkeit erzwingen.
- Wenn für Tests ein lokaler Server benötigt wird, bleibt dieser ausschließlich Bestandteil der Testumgebung.
- Mutationstests dürfen keine dauerhaften Änderungen an produktiven Dateien hinterlassen.

### Performance und Umfang

Mutationstests dürfen gezielt nach Bereichen ausgeführt werden, wenn ein vollständiger Lauf unverhältnismäßig lange dauert.

Dabei gilt:

- Für die lokale Entwicklung darf der betroffene fachliche Bereich mutiert werden.
- Vor einer Veröffentlichung oder nach größeren Änderungen soll ein vollständiger Mutationstestlauf erfolgen.
- Die Auswahl eines Teilbereichs muss alle durch die Änderung betroffenen produktiven Dateien enthalten.
- Ein Teiltest darf nicht verwendet werden, um bekannte überlebende Mutanten in anderen geänderten Dateien zu umgehen.
- Incremental Mutation Testing darf zur Beschleunigung verwendet werden.
- In regelmäßigen Abständen muss ein vollständiger, nicht nur inkrementeller Lauf erfolgen.

Beispielstories für QS-Verbesserung:

- Initiale Erreichung von QS-Zielen nach Refactorings: https://github.com/Huluvu424242/online-tools/issues/75
- Anpassung der QS-Zielvorgaben bei ungleich entwickelten Testbereichen: https://github.com/Huluvu424242/online-tools/issues/103
- Partitionierung langer Testdateien: https://github.com/Huluvu424242/online-tools/issues/109

### Reports

Stryker soll mindestens folgende Reports erzeugen:

- lesbare Konsolenausgabe
- HTML-Report
- maschinenlesbaren JSON-Report

Reports müssen die Analyse überlebender Mutanten ermöglichen.

Generierte Reports gehören grundsätzlich nicht in die produktive Anwendung und nicht in das Offline-ZIP. Ob einzelne Reports versioniert oder als CI-Artefakte gespeichert werden, entscheidet der Maintainer.

## Definition of Done für Tests

Eine Änderung an produktivem JavaScript ist erst abgeschlossen, wenn:

- alle normalen Tests erfolgreich sind
- passende Tests für neues oder geändertes Verhalten vorhanden sind
- Stryker erfolgreich ausgeführt wurde
- der konfigurierte `break`-Schwellwert eingehalten wurde
- der Mutation Score nicht gegenüber dem bisherigen Stand verschlechtert wurde
- alle überlebenden Mutanten im geänderten Bereich geprüft wurden
- fehlende fachliche Testfälle ergänzt wurden
- Ausschlüsse und deaktivierte Mutanten eng begrenzt begründet sind
- keine Mutationstest-Infrastruktur in die produktive Laufzeit gelangt ist
- die statische Offline-Anwendung weiterhin ohne Node.js und Build-Schritt funktioniert

Ein erfolgreicher normaler Testlauf allein reicht bei Änderungen an produktivem JavaScript nicht als Abschlusskriterium.
