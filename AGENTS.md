# Projektanweisungen für Codex AI

Diese Datei enthält verbindliche Architektur-, Qualitäts-, Test- und Sicherheitsvorgaben für alle Änderungen an diesem Repository.

Die Vorgaben sind keine unverbindlichen Empfehlungen. Codex darf davon nur abweichen, wenn der Maintainer die betreffende Abweichung ausdrücklich verlangt.

## Architekturentscheidung: Mobile First

Dieses Projekt verfolgt einen konsequenten Mobile-First-Ansatz.

* Neue Oberflächen werden zuerst für Smartphones und Touch-Bedienung umgesetzt.
* Die Basis-Styles müssen ohne Media Query auf kleinen Viewports gut funktionieren.
* Abweichungen für Tablet oder Desktop werden nur ergänzt, wenn der größere Viewport einen echten Bedien- oder Lesbarkeitsvorteil bietet.
* Interaktive Elemente müssen gut mit dem Finger bedienbar sein. Als Mindestziel gelten ungefähr 44 Pixel Höhe und Breite für Touch-Ziele.
* Horizontales Überlaufen ist zu vermeiden.
* Lange Inhalte müssen umbrechen oder in klar begrenzten Ergebnisbereichen scrollen.
* Änderungen müssen sowohl auf kleinen Viewports als auch auf üblichen Desktopgrößen geprüft werden.

## Verbindliche Architektur: Browser-native Anwendung ohne Build-Schritt

Dieses Projekt ist eine vollständig statische, browser-native Anwendung.

Die produktive Anwendung muss jederzeit direkt aus den im Repository enthaltenen Dateien ausführbar sein. Nutzer müssen die Anwendung verwenden können, indem sie das Repository beziehungsweise das Offline-ZIP entpacken und `index.html` in einem unterstützten Browser öffnen.

### Unveränderliche Architekturvorgaben

* Für das Ausführen, Bereitstellen oder Verpacken der Anwendung darf Node.js nicht erforderlich sein.
* Es darf keinen verpflichtenden Build-, Bundle-, Compile-, Transpile- oder Generierungsschritt geben.
* Die eingecheckten HTML-, CSS-, JavaScript- und sonstigen statischen Dateien sind unmittelbar die auslieferbare Anwendung.
* `index.html` muss ohne vorherigen Aufruf von `npm`, `npx`, `node`, Vite, Webpack, Rollup, Parcel, esbuild oder vergleichbaren Werkzeugen funktionieren.
* GitHub Pages muss die eingecheckten statischen Dateien direkt veröffentlichen können.
* Das Offline-ZIP muss ausschließlich bereits eingecheckte, unmittelbar ausführbare Dateien enthalten.
* Die Anwendung muss grundsätzlich ohne Internetverbindung funktionieren.
* Nutzereingaben und fachliche Verarbeitung müssen im Browser bleiben, sofern eine konkrete Funktion nicht ausdrücklich etwas anderes verlangt.
* Es dürfen keine serverseitigen Komponenten, Serverless-Funktionen oder externen APIs als Voraussetzung für bestehende oder neue Kernfunktionen eingeführt werden.

Änderungen, die gegen diese Architektur verstoßen, dürfen nicht umgesetzt werden, ohne dass der Maintainer die Architekturänderung ausdrücklich verlangt.

### Zulässige Verwendung von Node.js

Node.js darf ausschließlich als Entwicklungs-, Analyse- und Testwerkzeug verwendet werden.

Zulässig sind insbesondere:

* Regressionstests
* Mutationstests mit StrykerJS
* statische Analysen
* Linter
* Security-Scanner
* CI-Prüfungen
* lokale Hilfswerkzeuge, deren Ergebnis nicht benötigt wird, um die Anwendung auszuführen

Dabei gelten folgende Bedingungen:

* Die produktive Anwendung darf Node.js weder importieren noch zur Laufzeit voraussetzen.
* Tests dürfen Node.js verwenden, produktiver Browsercode darf aber nicht von Node-spezifischen APIs abhängen.
* Produktiver Browsercode darf insbesondere nicht von `fs`, `path`, `process`, `Buffer`, `require`, CommonJS oder anderen ausschließlich in Node.js verfügbaren APIs abhängen.
* Ein fehlendes Node.js darf nur verhindern, dass Entwicklungs- oder Testwerkzeuge ausgeführt werden.
* Ein fehlendes Node.js darf die Nutzung, Veröffentlichung und Offline-Verwendung der Anwendung nicht verhindern.
* Eine `package.json` darf ausschließlich Entwicklungs- und Testabhängigkeiten verwalten.
* `npm install`, `npm test` oder `npm run mutation` dürfen niemals Voraussetzung für die Nutzung oder Veröffentlichung der Anwendung werden.
* Node-Abhängigkeiten dürfen nicht in den produktiven Browsercode gebündelt werden.
* Stryker darf keinen produktiven Build-Schritt erforderlich machen.

Eine Testumgebung darf die Architektur der produktiven Anwendung nicht bestimmen.

### JavaScript und Browserkompatibilität

* Bevorzugt werden standardisierte Browser-APIs und direkt vom Browser ausführbares JavaScript.
* Neue produktive Bibliotheken sollen nach Möglichkeit vermieden werden.
* Eine Bibliothek darf nicht allein deshalb eingeführt werden, weil sie über npm verfügbar ist.
* Wird eine externe produktive Bibliothek zwingend benötigt, muss sie lokal mit der Anwendung ausgeliefert werden und ohne Paketmanager, CDN oder Build-Schritt funktionieren.
* Eine vorhandene Browser-Standard-API ist einer Node-Abhängigkeit oder einem Build-Plugin vorzuziehen.
* ES-Module dürfen nur verwendet werden, wenn sie mit dem unterstützten direkten statischen und Offline-Betrieb vereinbar sind.

### Verbotene Architekturänderungen

Ohne ausdrückliche Anweisung des Maintainers dürfen insbesondere nicht eingeführt werden:

* Vite, Webpack, Rollup, Parcel, esbuild oder vergleichbare Bundler
* Babel, TypeScript-Transpilierung oder andere verpflichtende Compiler
* Framework-CLIs als Voraussetzung für die Anwendung
* ein erzeugtes `dist`, `build` oder vergleichbares Verzeichnis als alleinige auslieferbare Anwendung
* npm-basierte Produktionsstarts
* ein lokaler Entwicklungsserver als Voraussetzung zur Nutzung
* CDN-Abhängigkeiten
* Backend-Dienste für Funktionen, die vollständig lokal umgesetzt werden können
* produktiver Code, der erst nach einer Paketinstallation verfügbar ist

Ein optionaler lokaler HTTP-Server darf nur zur Entwicklung oder zum Testen verwendet werden. Er darf nicht zur Voraussetzung für GitHub Pages, das Offline-ZIP oder die normale Nutzung werden.

## Teststrategie

Tests sind Teil der Implementierung und keine nachgelagerte Zusatzaufgabe.

### Grundregeln

* Jede Fehlerkorrektur benötigt mindestens einen Regressionstest, der vor der Korrektur fehlschlagen und nach der Korrektur erfolgreich sein würde.
* Jede neue fachliche Funktion benötigt Tests für das erwartete Verhalten.
* Änderungen an bestehender fachlicher Logik benötigen angepasste oder zusätzliche Tests.
* Tests müssen nicht nur Erfolgsfälle, sondern auch Grenzwerte, ungültige Eingaben und relevante Fehlerfälle abdecken.
* Tests müssen deterministisch, voneinander unabhängig und beliebig oft wiederholbar sein.
* Tests dürfen keine Internetverbindung und keine externen Dienste benötigen.
* Tests dürfen keine Reihenfolge voraussetzen.
* Tests dürfen produktive Dateien nicht dauerhaft verändern.
* Tests dürfen nicht lediglich interne Implementierungsdetails bestätigen.
* Bevorzugt werden Tests, die beobachtbares Verhalten und fachliche Ergebnisse prüfen.

### Obligatorische Testfälle

Je nach Funktion sind insbesondere zu prüfen:

* leere Eingaben
* minimale und maximale sinnvolle Werte
* Werte direkt unter, auf und über fachlichen Grenzwerten
* ungültige Syntax
* unvollständige Eingaben
* Unicode und Nicht-ASCII-Zeichen
* Steuerzeichen
* sehr lange Eingaben
* wiederholte Trenn- und Escape-Zeichen
* führende und nachfolgende Leerzeichen
* Windows- und Unix-Zeilenenden
* unerwartete, aber syntaktisch mögliche Eingaben
* Round-Trip-Verhalten bei Konvertern
* sicherheitskritische oder absichtlich feindselig wirkende Eingaben

Ein einzelner Happy-Path-Test ist für eine neue fachliche Funktion nicht ausreichend.

## Verbindliche Mutationstests mit StrykerJS

StrykerJS ist das verbindliche Werkzeug zur Bewertung der Wirksamkeit der JavaScript-Tests.

Mutationstests ergänzen normale Regressionstests. Sie ersetzen diese nicht.

Das Ziel besteht nicht darin, einen hohen Zahlenwert durch Ausschlüsse oder triviale Tests zu erzeugen. Das Ziel besteht darin, nachzuweisen, dass die Tests relevante Verhaltensänderungen im produktiven Code erkennen.

### Geltungsbereich

* Alle produktiven JavaScript-Dateien mit fachlicher Logik müssen grundsätzlich durch Stryker mutiert werden.
* Dazu gehören insbesondere Parser, Konverter, Encoder, Decoder, Validatoren, Berechnungen, Vergleiche, Filter, Escape-Funktionen und sicherheitsrelevante Prüfungen.
* Testdateien dürfen nicht mutiert werden.
* Rein deklarative Daten, unveränderliche Konstantenlisten und ausschließlich visuelle Initialisierung dürfen ausgeschlossen werden, wenn eine Mutation keinen sinnvollen fachlichen Erkenntnisgewinn liefern würde.
* Dateien oder Mutationstypen dürfen nicht pauschal ausgeschlossen werden, nur um den Mutation Score zu erhöhen.
* Jeder Ausschluss muss eng begrenzt und in der Stryker-Konfiguration oder unmittelbar am Code begründet werden.

Die `mutate`-Konfiguration muss explizit festlegen, welche produktiven Dateien untersucht werden. Eine zufällige Auswahl allein aufgrund von Stryker-Standardmustern ist nicht ausreichend.

### Verbindliche Ausführung

Nach Änderungen an produktivem JavaScript muss Codex:

1. die normalen Tests ausführen
2. anschließend die relevanten Mutationstests ausführen
3. den Mutation Score prüfen
4. überlebende Mutanten untersuchen
5. fehlende sinnvolle Tests ergänzen
6. die normalen Tests erneut ausführen
7. Stryker erneut ausführen

Eine Änderung an fachlicher JavaScript-Logik ist nicht abgeschlossen, wenn Stryker nicht ausgeführt wurde.

Falls Stryker in der aktuellen Umgebung technisch nicht ausgeführt werden kann, muss Codex:

* dies ausdrücklich mitteilen
* den Grund nennen
* die mutmaßlich betroffenen Dateien nennen
* den exakten auszuführenden Mutationstest-Befehl angeben
* keine erfolgreiche Mutationstest-Prüfung behaupten

### Mutation-Score-Sollwerte

Langfristig gelten für das Gesamtprojekt folgende Sollwerte:

```text
high: 90
low: 80
break: 70
```

Diese Werte bedeuten:

* Mutation Score ab 90 Prozent: guter Zielbereich
* Mutation Score von mindestens 80, aber unter 90 Prozent: akzeptabel, aber verbesserungsbedürftig
* Mutation Score von mindestens 70, aber unter 80 Prozent: deutlicher Handlungsbedarf
* Mutation Score unter 70 Prozent: Qualitätsprüfung fehlgeschlagen

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

* darf nicht einfach ein unerreichbarer Schwellwert gesetzt und dauerhaft ignoriert werden
* wird `break` zunächst knapp unterhalb des tatsächlich erreichten Ausgangswerts festgelegt
* darf der konfigurierte `break` niemals ohne dokumentierte fachliche Begründung abgesenkt werden
* muss der Wert mit jeder gezielten Testverbesserung schrittweise angehoben werden
* bleiben `high: 90`, `low: 80` und `break: 70` das verbindliche langfristige Ziel

Ein niedriger Ausgangswert ist kein Grund, produktiven Code aus der Mutation auszuschließen.

### Nichtverschlechterungsregel

Unabhängig vom absoluten Schwellwert gilt:

* Eine Änderung darf den Mutation Score des betroffenen Bereichs nicht verschlechtern.
* Neuer oder geänderter fachlicher Code darf keine ungeprüften überlebenden Mutanten hinterlassen.
* Sinkt der Score, muss Codex die Ursache untersuchen und zusätzliche sinnvolle Tests ergänzen.
* Eine Verschlechterung darf nur akzeptiert werden, wenn sie fachlich begründet und vom Maintainer ausdrücklich genehmigt wurde.
* Der Schwellwert darf nicht abgesenkt werden, um eine Verschlechterung zu verdecken.

### Bewertung überlebender Mutanten

Jeder überlebende Mutant muss einzeln bewertet werden.

Für jeden überlebenden Mutanten ist eine der folgenden Maßnahmen erforderlich:

1. einen fehlenden Test ergänzen
2. redundanten oder wirkungslosen produktiven Code entfernen
3. den Code so vereinfachen, dass die fachliche Absicht eindeutig testbar wird
4. einen nachweislich äquivalenten oder technisch nicht sinnvoll testbaren Mutanten eng begrenzt deaktivieren und die Begründung dokumentieren

Folgende Begründungen reichen nicht aus:

* „Der Mutation Score ist bereits hoch genug.“
* „Der Mutant ist wahrscheinlich unwichtig.“
* „Die Zeile ist schwer zu testen.“
* „Der Test würde zusätzlichen Aufwand verursachen.“
* „Stryker erzeugt zu viele Mutanten.“

Insbesondere bei Parsern, Konvertern, Escaping, Validierung und sicherheitsrelevanter Logik soll für überlebende Mutanten grundsätzlich ein Test ergänzt werden.

### Besonders kritische Bereiche

Für folgende Bereiche ist ein Mutation Score von möglichst 100 Prozent anzustreben:

* Escaping und Encoding
* Parser und Serializer
* Formatkonverter
* Eingabevalidierung
* sicherheitsrelevante Filter
* Grenzwertentscheidungen
* reguläre Ausdrücke mit fachlicher Bedeutung
* URL- und Pfadverarbeitung
* Erkennung gefährlicher oder ungültiger Eingaben
* Funktionen, die strukturierte Ausgabe erzeugen

Ein Wert unter 100 Prozent in diesen Bereichen ist nur akzeptabel, wenn sämtliche überlebenden Mutanten geprüft und nachvollziehbar begründet wurden.

### Keine Manipulation des Scores

Es ist verboten, den Mutation Score künstlich zu verbessern durch:

* unnötige Ausschlüsse produktiver Dateien
* pauschales Deaktivieren von Mutatoren
* Ignorieren überlebender Mutanten ohne Analyse
* Tests, die lediglich auf interne Implementierungsdetails zugeschnitten sind
* Tests, die absichtlich einen bestimmten Mutanten statt fachliches Verhalten prüfen
* Entfernen sinnvoller Mutationstypen aus der Konfiguration
* Verkleinern des Mutationstestbereichs ohne fachlichen Grund
* Absenken der Schwellwerte zur Umgehung eines fehlgeschlagenen Laufs

Tests müssen fachliches Verhalten beschreiben. Sie dürfen nicht allein deshalb existieren, um Stryker zufriedenzustellen.

### Stryker und die statische Architektur

Stryker ist ausschließlich ein Testwerkzeug.

* Stryker darf Node.js als Entwicklungsabhängigkeit verwenden.
* Stryker darf eine `package.json` und `node_modules` für Testzwecke voraussetzen.
* Stryker darf keinen Build-Schritt für die produktive Anwendung einführen.
* Die produktiven Dateien müssen weiterhin direkt im Browser ausführbar bleiben.
* Mutationstest-spezifischer Instrumentierungscode darf nicht in die veröffentlichten produktiven Dateien gelangen.
* Temporäre Stryker-Dateien und Reports dürfen nicht Bestandteil des Offline-ZIP werden.
* Stryker darf keine Vite-, Webpack- oder sonstige Bundler-Abhängigkeit erzwingen.
* Wenn für Tests ein lokaler Server benötigt wird, bleibt dieser ausschließlich Bestandteil der Testumgebung.
* Mutationstests dürfen keine dauerhaften Änderungen an produktiven Dateien hinterlassen.

### Performance und Umfang

Mutationstests dürfen gezielt nach Bereichen ausgeführt werden, wenn ein vollständiger Lauf unverhältnismäßig lange dauert.

Dabei gilt:

* Für die lokale Entwicklung darf der betroffene fachliche Bereich mutiert werden.
* Vor einer Veröffentlichung oder nach größeren Änderungen soll ein vollständiger Mutationstestlauf erfolgen.
* Die Auswahl eines Teilbereichs muss alle durch die Änderung betroffenen produktiven Dateien enthalten.
* Ein Teiltest darf nicht verwendet werden, um bekannte überlebende Mutanten in anderen geänderten Dateien zu umgehen.
* Incremental Mutation Testing darf zur Beschleunigung verwendet werden.
* In regelmäßigen Abständen muss ein vollständiger, nicht nur inkrementeller Lauf erfolgen.

### Reports

Stryker soll mindestens folgende Reports erzeugen:

* lesbare Konsolenausgabe
* HTML-Report
* maschinenlesbaren JSON-Report

Reports müssen die Analyse überlebender Mutanten ermöglichen.

Generierte Reports gehören grundsätzlich nicht in die produktive Anwendung und nicht in das Offline-ZIP. Ob einzelne Reports versioniert oder als CI-Artefakte gespeichert werden, entscheidet der Maintainer.

### Definition of Done für Tests

Eine Änderung an produktivem JavaScript ist erst abgeschlossen, wenn:

* alle normalen Tests erfolgreich sind
* passende Tests für neues oder geändertes Verhalten vorhanden sind
* Stryker erfolgreich ausgeführt wurde
* der konfigurierte `break`-Schwellwert eingehalten wurde
* der Mutation Score nicht gegenüber dem bisherigen Stand verschlechtert wurde
* alle überlebenden Mutanten im geänderten Bereich geprüft wurden
* fehlende fachliche Testfälle ergänzt wurden
* Ausschlüsse und deaktivierte Mutanten eng begrenzt begründet sind
* keine Mutationstest-Infrastruktur in die produktive Laufzeit gelangt ist
* die statische Offline-Anwendung weiterhin ohne Node.js und Build-Schritt funktioniert

Ein erfolgreicher normaler Testlauf allein reicht nicht als Abschlusskriterium.

## Security requirements

Treat all externally supplied or user-controlled values as untrusted input.

When generating output for a structured format such as Java properties, YAML, JSON, HTML, URLs, shell commands, regular expressions, SQL, or JavaScript:

* use an encoder or escaping function designed specifically for the target format and output context
* do not reuse an encoder written for a different format or context
* escape the escape character itself before escaping other special characters
* ensure replacements apply to every relevant occurrence, not only the first occurrence
* do not build structured output through partially escaped string concatenation when a suitable serializer or standard API is available
* keep key escaping, value escaping, quoting, parsing, and validation in clearly separated functions when their rules differ
* do not assume that a previous helper function has already performed part of the required security encoding
* preserve round-trip behavior: parsing serialized output must reproduce the original input

For every custom encoder, parser, serializer, or sanitizer:

* document the target grammar and the characters with structural meaning
* add tests for backslashes, quotes, delimiters, comment characters, whitespace, control characters, empty strings, Unicode, and repeated escape characters
* add at least one round-trip test using hostile or malformed-looking input
* verify behavior for sequences such as `\n`, `\\`, `\=`, `\#`, leading whitespace, and actual newline or tab characters
* prefer standard-library serializers over custom escaping whenever possible

Before completing a change:

1. inspect all data flows from input to output
2. check for injection, incomplete escaping, path traversal, unsafe DOM APIs, unsafe URL handling, and accidental secret exposure
3. run the existing tests, linter, configured security scanner, and applicable mutation tests
4. add regression tests for every fixed security finding
5. use mutation tests to verify that the regression tests detect relevant changes to the repaired security logic
6. do not suppress a security warning unless the warning has been investigated and the justification is documented in the code or pull request

A change is not complete merely because the normal example works. It must also handle adversarial input without changing the structure or meaning of the generated output.

## Java properties conversion rules

Code that writes Java `.properties` output must follow the Java properties grammar.

* Backslashes must be escaped as `\\`.
* Newline, carriage return, tab, and form-feed characters must be encoded explicitly.
* Property keys and property values must use separate context-specific escaping functions.
* Spaces and delimiter characters in keys must not be allowed to change where the key ends.
* Generated values must not create unintended comments, separators, escape sequences or line continuations.
* Every converter change must include YAML-to-properties-to-YAML or properties-to-YAML-to-properties round-trip tests where practical.
* Tests must include Windows paths, literal backslash sequences, leading spaces, `=`, `:`, `#`, `!`, multiline values and empty values.
* Änderungen an der Properties-Konvertierung müssen zusätzlich durch Stryker geprüft werden.
* Überlebende Mutanten in Escaping-, Parsing- oder Serialisierungsfunktionen müssen durch Tests getötet oder als tatsächlich äquivalent nachvollziehbar dokumentiert werden.
* Für diesen Bereich ist ein Mutation Score von möglichst 100 Prozent anzustreben.

## Vorgehen bei neuen Funktionen

Bei jeder neuen Funktion oder größeren Änderung ist folgende Reihenfolge einzuhalten:

1. prüfen, ob die Funktion vollständig mit standardisierten Browser-APIs umgesetzt werden kann
2. eine browser-native Lösung ohne neue produktive Abhängigkeiten bevorzugen
3. fachliche Anforderungen und Grenzfälle bestimmen
4. normale Tests für Erfolgs-, Grenz- und Fehlerfälle ergänzen
5. die Funktion implementieren
6. normale Tests ausführen
7. Stryker für die betroffenen produktiven Dateien ausführen
8. überlebende Mutanten analysieren
9. fehlende sinnvolle Tests ergänzen
10. normale Tests und Mutationstests erneut ausführen
11. sicherstellen, dass GitHub Pages keinen Build-Schritt benötigt
12. sicherstellen, dass das Offline-ZIP weiterhin autark funktioniert
13. sicherstellen, dass Node.js ausschließlich für Entwicklung und Tests verwendet wird

## Abschließende Abnahmekriterien

Vor Abschluss jeder Änderung muss Codex prüfen:

### Architektur

* Die Anwendung funktioniert ohne installierte Node.js-Laufzeit.
* Es ist kein `npm install` für die Nutzung erforderlich.
* Es ist kein Build-Befehl für die Nutzung oder Veröffentlichung erforderlich.
* Die auslieferbaren Dateien sind vollständig im Repository enthalten.
* GitHub Pages kann die Dateien direkt bereitstellen.
* Das Offline-ZIP enthält eine unmittelbar nutzbare Anwendung.
* Neue Kernfunktionen arbeiten ohne Netzwerkzugriff, sofern Netzwerkzugriff nicht ausdrücklich Bestandteil der Funktion ist.

### Funktionalität und Sicherheit

* Das gewünschte Verhalten ist umgesetzt.
* Relevante Grenz- und Fehlerfälle sind berücksichtigt.
* Nutzereingaben werden als nicht vertrauenswürdig behandelt.
* Strukturierte Ausgaben verwenden kontextspezifisches Escaping oder geeignete Standard-Serializer.
* Es wurden keine Secrets oder sensiblen Daten eingecheckt.

### Tests

* Alle normalen Tests sind erfolgreich.
* Neue und geänderte Logik besitzt passende Tests.
* Fehlerkorrekturen besitzen Regressionstests.
* Stryker wurde für die betroffenen Dateien ausgeführt.
* Der Mutation Score unterschreitet den konfigurierten `break`-Wert nicht.
* Der Score wurde durch die Änderung nicht verschlechtert.
* Überlebende Mutanten wurden analysiert.
* Kritische Konverter-, Parser-, Validierungs- und Escaping-Logik strebt einen Mutation Score von 100 Prozent an.
* Testwerkzeuge haben keine produktiven Dateien dauerhaft verändert.

Codex muss im Abschlussbericht nennen:

* welche normalen Tests ausgeführt wurden
* welche Mutationstests ausgeführt wurden
* welche Dateien mutiert wurden
* welchen Mutation Score der Lauf erreichte
* wie viele Mutanten getötet, überlebt, nicht abgedeckt oder durch Timeouts beendet wurden
* welche überlebenden Mutanten verbleiben und warum
* ob alle Architektur- und Offline-Vorgaben weiterhin eingehalten werden

Eine Änderung ist nicht allein deshalb abgeschlossen, weil sie im normalen Beispiel funktioniert.
