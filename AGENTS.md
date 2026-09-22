# Arbeitsregeln für KI-Assistenten

Diese Datei ist der verbindliche Einstiegspunkt für alle Repository-Arbeiten an **online-tools**. Das Projekt ist eine vollständig statische, browser-native Webanwendung ohne produktiven Build-Schritt, ohne eigenen Anwendungsserver und ohne verpflichtendes separates Backend.

## Verbindliche Regelstruktur

**Vor jeder Repository-Arbeit müssen diese `AGENTS.md` und alle nachfolgend aufgeführten Regeldateien vollständig gelesen werden.** Die verlinkten Dateien sind verbindlicher Bestandteil der Arbeitsregeln und keine optionale Dokumentation:

1. [Workflow und Zusammenarbeit](agent-rules/01-workflow.md)
2. [Architektur und Implementierung](agent-rules/02-architecture.md)
3. [UX und Barrierefreiheit](agent-rules/03-ux-accessibility.md)
4. [Sicherheit und Werkzeugketten](agent-rules/04-security-tooling.md)
5. [Qualität und Tests](agent-rules/05-quality-testing.md)
6. [Dokumentation und Lizenzen](agent-rules/06-documentation.md)
7. [Release und Abschluss](agent-rules/07-release-completion.md)
8. [Domänenspezifische Regeln](agent-rules/08-domain-specific.md)
9. [Web-Grundgerüst und Supportfunktionen](agent-rules/09-web-bootstrap.md)

Eine Repository-Arbeit darf nicht begonnen werden, bevor alle genannten Regeldateien gelesen wurden.

## Vor jeder Repository-Arbeit

1. Diese Datei und alle unter „Verbindliche Regelstruktur“ aufgeführten Dateien vollständig lesen.
2. Repository, Zielbranch, vorhandene Änderungen und relevante Dokumentation prüfen.
3. Für GitHub-Inhalte und GitHub-Änderungen bevorzugt den verbundenen GitHub-Connector verwenden.
4. Fremde oder nicht zum Auftrag gehörende Änderungen erhalten.
5. Vor schreibenden GitHub-Aktionen die Regeln unter [Sicherheit und Werkzeugketten](agent-rules/04-security-tooling.md) einschließlich vorhandener Workflow-Trigger beachten.

## Unveränderliche Projektleitplanken

Diese Leitplanken dürfen ohne ausdrückliche Anweisung des Maintainers nicht geändert oder abgeschwächt werden:

- Die produktive Anwendung ist vollständig statisch und browser-native.
- Die eingecheckten HTML-, CSS-, JavaScript- und Asset-Dateien sind unmittelbar die auslieferbare Anwendung.
- Es gibt keinen verpflichtenden produktiven Build-, Bundle-, Compile-, Transpile- oder Generierungsschritt.
- `index.html` muss ohne vorherigen Aufruf von `npm`, `npx`, `node` oder einem Bundler nutzbar bleiben.
- GitHub Pages veröffentlicht die eingecheckten statischen Dateien direkt.
- Das Offline-ZIP bleibt ohne Build-Schritt unmittelbar nutzbar.
- Node.js ist ausschließlich Entwicklungs-, Analyse- und Testwerkzeug.
- Die Anwendung benötigt keinen eigenen Anwendungsserver und kein separat betriebenes Backend.
- Vorhandene Infrastruktur- und Plattformdienste wie GitHub oder GitHub Enterprise dürfen für Hosting, Dokumentation, Issues, Releases, Quellcodeverwaltung und Entwicklungsautomatisierung genutzt werden, wenn dies die Datenlokalität und den vorgesehenen Vertrauensbereich respektiert.
- Fachliche Nutzereingaben und zu verarbeitende Daten bleiben standardmäßig im Browser beziehungsweise im vorgesehenen lokalen oder Unternehmensnetz. Sie werden nicht ungefragt an externe Dienste übertragen.
- Externe Links und bewusst vom Nutzer ausgelöste Übergaben an konfigurierte Plattformdienste sind zulässig, wenn transparent ist, welche Daten den Browser verlassen.
- `generated-config/production-sources.json` bleibt die zentrale Definition produktiver Quellen.
- Mobile First, Datenlokalität, Datenschutz, Security, Regressionstests und die verbindliche StrykerJS-Strategie bleiben Projektanforderungen.

Details stehen in den verlinkten Regeldateien und sind dort verbindlich.

## Regelpriorität

Bei Widersprüchen gilt:

1. Eine ausdrückliche, auf die konkrete Aufgabe bezogene Anweisung des Maintainers hat Vorrang vor allgemeinen Projektregeln, soweit sie nicht gegen übergeordnete Sicherheits- oder Plattformvorgaben verstößt.
2. Sicherheitsregeln haben Vorrang vor anderen Projektregeln.
3. Spezifische Regeln haben Vorrang vor allgemeinen Regeln.
4. Bestehende projektspezifische Regeln für Architektur, Datenlokalität, Security, Stryker und Konverter haben Vorrang vor aus Referenzprojekten übernommenen generischen Prinzipien.
5. Kann ein Widerspruch dadurch nicht eindeutig aufgelöst werden, wird nicht geraten. Die Arbeit wird an der betroffenen Stelle angehalten und der Maintainer über den Konflikt informiert.
