# Sicherheit und Werkzeugketten

## Grundregeln

- Nie im Chat nach Passwörtern, Tokens, privaten Schlüsseln oder anderen Zugangsdaten fragen.
- Secrets, Tokens, Passwörter, Schlüssel und echte personenbezogene Testdaten niemals hardcodieren, einchecken, protokollieren oder in Screenshots und Fehlertexte übernehmen.
- GitHub-Projekteinstellungen niemals eigenmächtig ändern.
- Eine vermutete Offenlegung von Zugangsdaten als Sicherheitsvorfall behandeln: Zugang widerrufen oder rotieren, Reichweite prüfen und betroffene Artefakte bereinigen.

## Strikter Erlaubnisvorbehalt für GitHub Actions und externe Werkzeugketten

Für neue oder geänderte GitHub Actions, CI/CD-Pipelines, Bots, Automationen, externe Runner und vergleichbare Werkzeugketten gilt **Default Deny**.

- Ein KI-Agent darf eine solche Werkzeugkette weder erstellen, ändern, aktivieren, deaktivieren, manuell auslösen, erneut ausführen, abbrechen noch planen, solange dafür keine vorherige ausdrückliche und hinreichend konkrete Erlaubnis oder eine in diesem Repository dokumentierte Dauerfreigabe vorliegt.
- Als Verwendung gilt auch ein Repository-Schreibvorgang, der einen nicht freigegebenen Workflow gezielt oder vorhersehbar indirekt auslöst. Vor Push-, PR-, Label-, Kommentar- oder ähnlichen Aktionen sind deshalb die vorhandenen Trigger zu prüfen.
- Ein technisch vorhandener Workflow, ein sichtbarer Ausführen-Button, vorhandene Berechtigungen, eine allgemeine Implementierungsbeauftragung oder eine frühere Freigabe für einen anderen Workflow sind keine dauerhafte Freigabe.
- Reines Lesen von Workflow-Dateien, Workflow-Metadaten, Statusinformationen und Logs ist zulässig, sofern dadurch kein Lauf ausgelöst, kein Zustand verändert und kein Geheimnis offengelegt wird.
- Fehlt ein erlaubtes Werkzeug, bleibt die betreffende technische Prüfung offen. Es wird keine Ersatz-Action oder externe Pipeline eigenmächtig eingerichtet.

### Änderungen an Werkzeugketten

- Jede Erstellung oder Änderung einer GitHub Action, CI/CD-Konfiguration oder anderer ausführbarer Automatisierung benötigt **vor der Implementierung** eine eigene Story.
- Solche Änderungen erfolgen auf einem eigenen Branch in einem separaten Pull Request.
- Der Werkzeugketten-PR muss menschlich geprüft und gemergt sein, bevor die neue oder geänderte Werkzeugkette erstmals verwendet wird.
- Eine Werkzeugkettenänderung darf nicht in einem Fach- oder Bug-PR versteckt und nicht im selben PR bereits als freigegeben vorausgesetzt werden.
- Die Story dokumentiert mindestens Zweck, Trigger, minimale Berechtigungen, Inputs und Outputs, Secrets und Datenflüsse, Artefakte, Supply-Chain- und Lizenzrisiken, erlaubte Akteure sowie Rollback beziehungsweise Deaktivierung.
- GitHub Actions erhalten explizite minimale `permissions`.
- Externe Actions sollen möglichst auf unveränderliche Commit-SHAs gepinnt werden.
- Workflows dürfen keine Codeänderungen oder Commits erzeugen, sofern dies nicht gesondert in Story, PR und ausdrücklicher Freigabe genehmigt wurde.

### Aktueller Workflow-Bestand und Freigaben

Stand der Prüfung für Story #137 am 22. September 2026:

- `.github/workflows/kiagent-qstests.yml`, Workflow **Tests**, Git-Blob-SHA `79df5364382c851d38b9b672eba7b02820c4efa7`, verwendet `contents: read`, Trigger auf `push` und `pull_request` für `master` und `develop` sowie `workflow_dispatch`.
- `.github/workflows/mutationtests.yml`, Workflow **Tests - Mutation**, Git-Blob-SHA `894e49b433b7b7b3032e30f38c5a22d4ef4ddc18`, verwendet `contents: read`, Trigger auf `push` und `pull_request` für `master` und `develop` sowie `workflow_dispatch`.
- Der QS-Workflow trägt im Repository den Dateipräfix `kiagent-`; daraus folgt keine pauschale oder dauerhafte Ausführungsfreigabe. Maßgeblich bleibt der nachfolgend dokumentierte Erlaubnisvorbehalt.
- Für keinen der beiden vorhandenen Workflows ist in diesem Harness eine dauerhafte selbständige Ausführungsfreigabe für KI-Agenten dokumentiert.

Eine künftige Dauerfreigabe muss versionsbezogen mindestens Repository, Workflow-Datei und Workflow-Name, Git-Blob-SHA oder gleichwertige unveränderliche Version, Zweck, erlaubte Trigger beziehungsweise Ausführungen, Berechtigungen, Datenzugriffe, Secrets, Outputs/Artefakte und Geltungsdauer dokumentieren. Jede relevante Workflow-Änderung lässt eine solche Freigabe erlöschen.

Die bloße automatische Ausführung eines GitHub-Workflows durch GitHub ändert nichts daran, dass ein Agent vor einem schreibenden Vorgang prüfen muss, ob er nach den geltenden Freigaben diesen Trigger verursachen darf.

## Vertrauensbereich und Plattformbetrieb

- Die Regeln unterscheiden zwischen fachlichen **Anwendungsdaten** und **Entwicklungs-/Plattformdaten**.
- Fachliche Nutzereingaben und mit den Tools verarbeitete Inhalte sollen den Browser beziehungsweise den vorgesehenen lokalen oder unternehmensinternen Vertrauensbereich nicht ungefragt verlassen.
- Repository-Inhalte, Pull Requests, Issues, Testberichte und CI-Ergebnisse dürfen innerhalb der jeweils vorgesehenen GitHub- oder GitHub-Enterprise-Plattform verarbeitet werden.
- Wird das Projekt auf einer GitHub-Enterprise-Instanz im Firmennetz betrieben, ist die Nutzung der dort vorhandenen Actions, Issues, Pages, Releases und sonstigen Plattformdienste ausdrücklich mit der Architektur vereinbar. Die Agenten-Freigabe- und Minimal-Permissions-Regeln gelten weiterhin.
- Konfigurierbare Plattformziele sollen keine öffentliche GitHub-Domain fest voraussetzen, wenn eine GitHub-Enterprise-Installation ein erwartetes Einsatzszenario ist.
- Ein Wechsel zwischen öffentlichem GitHub und GitHub Enterprise darf nicht dazu führen, dass fachliche Nutzerdaten versehentlich an die jeweils andere Plattform übertragen werden.
- Externe Links dürfen geöffnet werden. Vor einer bewussten Datenübergabe, etwa beim Erstellen eines Fehlerberichts, muss erkennbar sein, welche Daten an welches Ziel übergeben werden.

## Security-Anforderungen an Anwendungscode

Alle extern gelieferten oder vom Nutzer kontrollierten Werte gelten als nicht vertrauenswürdig.

Beim Erzeugen strukturierter Ausgabe wie Java Properties, YAML, JSON, HTML, URLs, Shell-Kommandos, regulären Ausdrücken, SQL oder JavaScript gilt:

- einen Encoder beziehungsweise eine Escaping-Funktion verwenden, die speziell für Zielformat und Ausgabekontext geeignet ist
- keinen Encoder aus einem anderen Format oder Kontext wiederverwenden
- das Escape-Zeichen selbst vor anderen Sonderzeichen escapen
- sicherstellen, dass Ersetzungen für alle relevanten Vorkommen gelten, nicht nur für das erste
- strukturierte Ausgabe nicht über teilweise escapte String-Verkettung bauen, wenn ein geeigneter Serializer oder eine Standard-API verfügbar ist
- Key-Escaping, Value-Escaping, Quoting, Parsing und Validierung klar trennen, wenn die Regeln unterschiedlich sind
- nicht annehmen, dass eine vorgelagerte Hilfsfunktion bereits einen Teil der nötigen Sicherheitskodierung erledigt hat
- Round-Trip-Verhalten erhalten: Das Parsen serialisierter Ausgabe muss die ursprüngliche Eingabe reproduzieren

Für jeden eigenen Encoder, Parser, Serializer oder Sanitizer gilt:

- Zielgrammatik und strukturell bedeutsame Zeichen dokumentieren
- Tests für Backslashes, Quotes, Delimiter, Kommentarzeichen, Whitespace, Steuerzeichen, leere Strings, Unicode und wiederholte Escape-Zeichen ergänzen
- mindestens einen Round-Trip-Test mit feindselig oder malformed wirkender Eingabe ergänzen
- Verhalten für Sequenzen wie `\n`, `\\`, `\=`, `\#`, führenden Whitespace sowie echte Newline- und Tab-Zeichen prüfen
- Standard-Serializer gegenüber eigenem Escaping bevorzugen, wann immer dies fachlich passt

Vor Abschluss einer Änderung:

1. alle Datenflüsse von Input zu Output prüfen
2. Injection, unvollständiges Escaping, Path Traversal, unsichere DOM-APIs, unsichere URL-Behandlung und versehentliche Secret-Offenlegung prüfen
3. bestehende Tests, Linter, konfigurierte Security-Scanner und anwendbare Mutationstests ausführen
4. Regressionstests für jeden behobenen Security-Befund ergänzen
5. Mutationstests verwenden, um relevante Änderungen an reparierter Security-Logik zu erkennen
6. Security-Warnungen nur nach Untersuchung und dokumentierter Begründung unterdrücken

Eine Änderung ist nicht abgeschlossen, nur weil das normale Beispiel funktioniert. Feindselige Eingaben dürfen Struktur oder Bedeutung der Ausgabe nicht unkontrolliert verändern.
