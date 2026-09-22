# Workflow und Zusammenarbeit

## Kommunikation

- Die Kommunikation zwischen KI-Agenten und menschlichen Entwicklern erfolgt auf Deutsch. Technische Bezeichner, Code, Kommandos und unveränderte Fehlermeldungen dürfen englisch bleiben.
- Stories, Bugs, PR-Titel und PR-Beschreibungen werden auf Deutsch formuliert.
- Nach jeder Arbeit wird der menschliche Entwickler über Ergebnis, Prüfungen, offene Risiken und den nächsten sinnvollen Schritt informiert. Relevante GitHub-Artefakte werden direkt verlinkt.
- Fachbegriffe werden präzise verwendet und nicht mechanisch übersetzt.

## Story-Workflow

Neue Funktionen und größere funktionale Änderungen werden grundsätzlich zuerst als Story mit dem Label `story` und prüfbaren Akzeptanzkriterien erfasst.

Reihenfolge:

1. Bestand und fachlichen Kontext analysieren.
2. Anforderungen und Abhängigkeiten bestimmen.
3. Ziel, Nutzen, Beschreibung, Akzeptanzkriterien und betroffene Bereiche dokumentieren.
4. Bei GUI-Änderungen relevante Leer-, Lade-, Erfolgs-, Validierungs- und Fehlerzustände mitplanen.
5. Erst danach auf einem eigenen Arbeitsbranch implementieren.

Eine bereits vorhandene Story wird nicht dupliziert. Beauftragt der Maintainer ausdrücklich die Umsetzung einer vorhandenen Story, ist damit die für diese Arbeit erforderliche fachliche Grundlage vorhanden.

## Fehlerbehebung

Ein gemeldeter Defekt wird nicht still repariert. Sofern noch kein passendes Issue existiert, gilt:

**Analyse → Bug-Issue → eigener Branch → Implementierung → Prüfung → Pull Request → Rückmeldung**

Das Bug-Issue beschreibt mindestens Fehlerbild, Analyse beziehungsweise vermutete Ursache, betroffene Komponenten und Lösungsansatz. Der PR verknüpft das Issue mit einem Closing-Keyword und nennt Ursache, Lösung, Prüfungen und Restunsicherheiten.

## Branches und Pull Requests

- Für jede Story oder jeden Bug wird ein eigener Arbeitsbranch verwendet und der Umfang eng gehalten.
- `master` und `release/*` werden ausschließlich über Pull Requests verändert. Direkte Commits, direkte Löschungen oder Force Pushes auf diese Zielbranches sind unzulässig.
- Ein Pull Request enthält mindestens Ziel, Änderungen, ausgeführte Prüfungen, Dokumentationsstatus, Risiken beziehungsweise Restunsicherheiten und ein Closing-Keyword wie `Closes #123`.
- Arbeitsbranches dürfen auf den aktuellen Zielbranch rebased werden. Geteilte Branches nur nach Abstimmung rebasen.
- Nach einem Rebase sind die relevanten Prüfungen erneut auszuführen.
- Veröffentlichte Arbeitsbranches werden nach einem Rebase ausschließlich abgesichert entsprechend `git push --force-with-lease` aktualisiert. Unabgesichertes `git push --force` ist verboten.
- Konflikte werden fachlich aufgelöst. Bei Unsicherheit wird der Rebase abgebrochen statt Änderungen zu erraten.
- Fremde oder nicht zum Auftrag gehörende Änderungen werden nicht überschrieben oder entfernt.

## Menschliches Review und Merge

Nach Erstellung eines Pull Requests endet die eigenständige Implementierungsarbeit grundsätzlich am Review-Haltepunkt.

- Ein KI-Agent merged einen Pull Request nicht allein deshalb, weil er ihn erstellt hat, Prüfungen erfolgreich sind oder der PR technisch mergefähig erscheint.
- Ein Merge durch einen KI-Agenten benötigt einen neuen, ausdrücklichen menschlichen Auftrag für den konkreten PR oder die konkret benannte PR-Menge.
- Eine frühere Merge-Erlaubnis gilt nicht für spätere Aufgaben weiter.
- Offene Review-Diskussionen, fehlgeschlagene vorgeschriebene Prüfungen oder ein unerwartet veränderter Head-Stand werden nicht umgangen.
- Bei gestapelten PRs wird ein Agent nur nach ausdrücklicher Beauftragung tätig und arbeitet die vom Menschen benannte Kette in der fachlich richtigen Reihenfolge ab. Nach jedem Merge werden Basis, Diff, Mergefähigkeit und Prüfungen des nächsten PR erneut kontrolliert.

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

Die Details zu Architektur, Tests und Mutationstests stehen in den jeweils spezialisierten Regeldateien und werden durch diese Ablaufbeschreibung nicht abgeschwächt.

## Abschlussstatus

Die Abschlussmeldung unterscheidet verbindlich:

- **Implementiert, technische Prüfung ausstehend:** Mindestens eine vorgeschriebene automatisierte Prüfung konnte weder lokal noch über eine ausdrücklich freigegebene Werkzeugkette erfolgreich ausgeführt werden.
- **Geprüft und mergebereit:** Alle vorgeschriebenen automatisierten Prüfungen waren erfolgreich; noch offene manuelle Prüfungen sind transparent benannt und stehen dem Merge nach den Projektvorgaben nicht entgegen.

Ein erstellter PR bleibt auch im Status „Geprüft und mergebereit“ am menschlichen Review-Haltepunkt, bis der Maintainer den Merge selbst durchführt oder ausdrücklich delegiert.
