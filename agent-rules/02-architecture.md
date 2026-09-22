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

## Verbindliche Architektur: Browser-native Anwendung ohne eigenen Backend-Betrieb

Dieses Projekt ist eine vollständig statische, browser-native Anwendung. Es betreibt keinen eigenen Anwendungsserver und benötigt kein separat entwickeltes oder separat zu hostendes Backend für seine Kernfunktionen.

Die produktive Anwendung muss jederzeit direkt aus den im Repository enthaltenen Dateien ausführbar sein. Nutzer müssen die Anwendung verwenden können, indem sie das Repository beziehungsweise das Offline-ZIP entpacken und `index.html` in einem unterstützten Browser öffnen.

### Unveränderliche Architekturvorgaben

- Für das Ausführen, Bereitstellen oder Verpacken der Anwendung darf Node.js nicht erforderlich sein.
- Es darf keinen verpflichtenden Build-, Bundle-, Compile-, Transpile- oder Generierungsschritt geben.
- Die eingecheckten HTML-, CSS-, JavaScript- und sonstigen statischen Dateien sind unmittelbar die auslieferbare Anwendung.
- `index.html` muss ohne vorherigen Aufruf von `npm`, `npx`, `node`, Vite, Webpack, Rollup, Parcel, esbuild oder vergleichbaren Werkzeugen funktionieren.
- GitHub Pages muss die eingecheckten statischen Dateien direkt veröffentlichen können.
- Das Offline-ZIP muss ausschließlich bereits eingecheckte, unmittelbar ausführbare Dateien enthalten.
- Die Anwendung muss grundsätzlich ohne Internetverbindung funktionieren.
- Fachliche Nutzereingaben und zu verarbeitende Inhalte bleiben standardmäßig im Browser beziehungsweise im vorgesehenen lokalen oder Unternehmensnetz.
- Öffentliche GitHub-Infrastruktur und eine spätere interne GitHub-Enterprise-Installation sind beide erwartete Einsatzmodelle.
- Vorhandene Plattformdienste wie Pages, Issues, Releases, Dokumentation und Actions dürfen genutzt werden, wenn sie im vorgesehenen Vertrauensbereich liegen und keine fachlichen Nutzerdaten ungefragt nach außen übertragen.
- Externe Links sind zulässig. Eine bewusste Nutzeraktion darf Daten an ein konfiguriertes Plattformziel übergeben, wenn vorher erkennbar ist, welche Daten übertragen werden.
- Plattformfunktionen sollen genutzt werden, wenn sie den benötigten Zweck bereits erfüllen; Funktionen werden nicht allein deshalb in der App neu implementiert, weil sie technisch lokal nachgebaut werden könnten.

Änderungen, die gegen diese Architektur verstoßen, dürfen nicht umgesetzt werden, ohne dass der Maintainer die Architekturänderung ausdrücklich verlangt.

### Datenlokalität und Plattformdienste

- Zentrales Ziel ist nicht die pauschale Vermeidung von Netzwerk- oder Plattformdiensten, sondern die Kontrolle darüber, wo fachliche Nutzerdaten verarbeitet werden und welchen Vertrauensbereich sie verlassen.
- Bei einer Bereitstellung im Unternehmensnetz dürfen Hosting, Dokumentation, Issues, Releases, CI und Entwicklungswerkzeuge vollständig innerhalb der dort betriebenen GitHub-Enterprise-Infrastruktur stattfinden.
- Eine GitHub-Enterprise-Instanz im Firmennetz darf ihre eigenen Actions ausführen; deren Resultate können damit vollständig im Unternehmensumfeld verbleiben.
- Konfigurierbare Plattformziele dürfen nicht unnötig auf `github.com` fest verdrahtet werden, wenn GitHub Enterprise ein erwartetes Einsatzszenario ist.
- Das bloße Verlinken externer Dokumentation oder Projektressourcen ist zulässig. Fachliche Nutzerdaten werden dadurch nicht automatisch übertragen.
- Bei bewussten Datenübergaben gilt Datenminimierung: nur der für den konkreten Zweck notwendige und für den Nutzer erkennbare Inhalt verlässt den Browser.

Die Nutzung von GitHub Actions durch KI-Agenten unterliegt zusätzlich den Freigaberegeln aus [Sicherheit und Werkzeugketten](04-security-tooling.md).

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
- ein eigenes separat betriebenes Backend für Funktionen, die browserlokal oder sinnvoll durch die vorgesehene Plattforminfrastruktur erbracht werden können
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
- Externe Abhängigkeiten nur mit belegbarem Nutzen, Lizenzprüfung und unter Beachtung der Datenlokalitäts-, Offline- und Build-Leitplanken einführen.
- Daten- und Kontrollflüsse so gestalten, dass sicherheitsrelevante Übergänge und Serialisierungsgrenzen klar erkennbar und testbar sind.
