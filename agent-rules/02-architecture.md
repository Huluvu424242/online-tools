# Architektur und Implementierung

## Architekturentscheidung: Mobile First

Dieses Projekt verfolgt einen konsequenten Mobile-First-Ansatz.

- Neue Oberflächen werden zuerst für Smartphones und Touch-Bedienung umgesetzt.
- Die Basis-Styles müssen ohne Media Query auf kleinen Viewports gut funktionieren.
- Abweichungen für Tablet oder Desktop werden nur ergänzt, wenn der größere Viewport einen echten Bedien- oder Lesbarkeitsvorteil bietet.
- Horizontales Überlaufen ist zu vermeiden.
- Lange Inhalte müssen umbrechen oder in klar begrenzten Ergebnisbereichen scrollen.
- Änderungen müssen sowohl auf kleinen Viewports als auch auf üblichen Desktopgrößen geprüft werden.

Detaillierte Anforderungen an Touch-Ziele, Tastaturbedienung, Fokusführung und semantische Beschriftung stehen unter [UX und Barrierefreiheit](03-ux-accessibility.md).

## Verbindliche Architektur: Browser-native Anwendung ohne Build-Schritt

Dieses Projekt ist eine vollständig statische, browser-native Anwendung.

Die produktive Anwendung muss jederzeit direkt aus den im Repository enthaltenen Dateien ausführbar sein. Nutzer müssen die Anwendung verwenden können, indem sie das Repository beziehungsweise das Offline-ZIP entpacken und `index.html` in einem unterstützten Browser öffnen.

### Unveränderliche Architekturvorgaben

- Für das Ausführen, Bereitstellen oder Verpacken der Anwendung darf Node.js nicht erforderlich sein.
- Es darf keinen verpflichtenden Build-, Bundle-, Compile-, Transpile- oder Generierungsschritt geben.
- Die eingecheckten HTML-, CSS-, JavaScript- und sonstigen statischen Dateien sind unmittelbar die auslieferbare Anwendung.
- `index.html` muss ohne vorherigen Aufruf von `npm`, `npx`, `node`, Vite, Webpack, Rollup, Parcel, esbuild oder vergleichbaren Werkzeugen funktionieren.
- GitHub Pages muss die eingecheckten statischen Dateien direkt veröffentlichen können.
- Das Offline-ZIP muss ausschließlich bereits eingecheckte, unmittelbar ausführbare Dateien enthalten.
- Die Anwendung muss grundsätzlich ohne Internetverbindung funktionieren.
- Nutzereingaben und fachliche Verarbeitung müssen im Browser bleiben, sofern eine konkrete Funktion nicht ausdrücklich etwas anderes verlangt.
- Es dürfen keine serverseitigen Komponenten, Serverless-Funktionen oder externen APIs als Voraussetzung für bestehende oder neue Kernfunktionen eingeführt werden.

Änderungen, die gegen diese Architektur verstoßen, dürfen nicht umgesetzt werden, ohne dass der Maintainer die Architekturänderung ausdrücklich verlangt.

### Produktive Quellen

- Die Datei `generated-config/production-sources.json` ist die zentrale Definition dafür, welche Dateien und Verzeichnisse als produktive Quellen der browser-nativen Anwendung gelten.
- Neue, verschobene oder entfernte produktive HTML-, CSS-, JavaScript- und Asset-Quellen müssen in dieser Datei nachgepflegt werden.
- Architekturprüfungen, insbesondere Prüfungen auf Node.js-Abhängigkeiten im Browsercode, müssen diese zentrale Liste verwenden und dürfen nicht pauschal Test-, Konfigurations- oder Dokumentationsdateien als Produktivcode behandeln.
- Die Offline-ZIP-Funktion bleibt davon unabhängig: Sie soll die eingecheckten, für das Repository relevanten Dateien ausliefern und nicht nur die produktiven Quellen aus `generated-config/production-sources.json`.

### Zulässige Verwendung von Node.js

Node.js darf ausschließlich als Entwicklungs-, Analyse- und Testwerkzeug verwendet werden.

Zulässig sind insbesondere:

- Regressionstests
- Mutationstests mit StrykerJS
- statische Analysen
- Linter
- Security-Scanner
- CI-Prüfungen
- lokale Hilfswerkzeuge, deren Ergebnis nicht benötigt wird, um die Anwendung auszuführen

Dabei gelten folgende Bedingungen:

- Die produktive Anwendung darf Node.js weder importieren noch zur Laufzeit voraussetzen.
- Tests dürfen Node.js verwenden, produktiver Browsercode darf aber nicht von Node-spezifischen APIs abhängen.
- Produktiver Browsercode darf insbesondere nicht von `fs`, `path`, `process`, `Buffer`, `require`, CommonJS oder anderen ausschließlich in Node.js verfügbaren APIs abhängen.
- Ein fehlendes Node.js darf nur verhindern, dass Entwicklungs- oder Testwerkzeuge ausgeführt werden.
- Ein fehlendes Node.js darf die Nutzung, Veröffentlichung und Offline-Verwendung der Anwendung nicht verhindern.
- Eine `package.json` darf ausschließlich Entwicklungs- und Testabhängigkeiten verwalten.
- `npm install`, `npm test` oder `npm run mutation` dürfen niemals Voraussetzung für die Nutzung oder Veröffentlichung der Anwendung werden.
- Node-Abhängigkeiten dürfen nicht in den produktiven Browsercode gebündelt werden.
- Stryker darf keinen produktiven Build-Schritt erforderlich machen.

Eine Testumgebung darf die Architektur der produktiven Anwendung nicht bestimmen.

### JavaScript und Browserkompatibilität

- Bevorzugt werden standardisierte Browser-APIs und direkt vom Browser ausführbares JavaScript.
- Neue produktive Bibliotheken sollen nach Möglichkeit vermieden werden.
- Eine Bibliothek darf nicht allein deshalb eingeführt werden, weil sie über npm verfügbar ist.
- Wird eine externe produktive Bibliothek zwingend benötigt, muss sie lokal mit der Anwendung ausgeliefert werden und ohne Paketmanager, CDN oder Build-Schritt funktionieren.
- Eine vorhandene Browser-Standard-API ist einer Node-Abhängigkeit oder einem Build-Plugin vorzuziehen.
- ES-Module dürfen nur verwendet werden, wenn sie mit dem unterstützten direkten statischen und Offline-Betrieb vereinbar sind.

### Verbotene Architekturänderungen

Ohne ausdrückliche Anweisung des Maintainers dürfen insbesondere nicht eingeführt werden:

- Vite, Webpack, Rollup, Parcel, esbuild oder vergleichbare Bundler
- Babel, TypeScript-Transpilierung oder andere verpflichtende Compiler
- Framework-CLIs als Voraussetzung für die Anwendung
- ein erzeugtes `dist`, `build` oder vergleichbares Verzeichnis als alleinige auslieferbare Anwendung
- npm-basierte Produktionsstarts
- ein lokaler Entwicklungsserver als Voraussetzung zur Nutzung
- CDN-Abhängigkeiten
- Backend-Dienste für Funktionen, die vollständig lokal umgesetzt werden können
- produktiver Code, der erst nach einer Paketinstallation verfügbar ist

Ein optionaler lokaler HTTP-Server darf nur zur Entwicklung oder zum Testen verwendet werden. Er darf nicht zur Voraussetzung für GitHub Pages, das Offline-ZIP oder die normale Nutzung werden.

## Generische Implementierungsprinzipien

- Kleine Verantwortungsbereiche, sprechende Namen, geringe Kopplung und wenige versteckte Seiteneffekte bevorzugen.
- Keine Architektur auf Vorrat und keine Bibliothek für triviale Funktionalität einführen.
- Fachlogik von DOM-/UI-Details trennen, soweit dies die browser-native Einfachheit verbessert.
- Fachlogik so strukturieren, dass sie unabhängig von konkreten DOM-Knoten testbar bleibt, wenn dies ohne unnötige Abstraktion möglich ist.
- Strukturierte Daten über klar benannte Strukturen führen und unkontrollierte lose Datenflüsse vermeiden.
- Lade-, Leer-, Erfolgs- und Fehlerzustände sichtbar behandeln, wenn sie für die Funktion relevant sind.
- Nutzereingaben bei Fehlern erhalten.
- Fehler nicht still ignorieren; leere `catch`-Blöcke sind unzulässig.
- Externe Abhängigkeiten nur mit belegbarem Nutzen, Lizenzprüfung und unter Beachtung der Offline- und Build-Leitplanken einführen.
- Daten- und Kontrollflüsse so gestalten, dass sicherheitsrelevante Übergänge und Serialisierungsgrenzen klar erkennbar und testbar sind.
