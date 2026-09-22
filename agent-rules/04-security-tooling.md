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

Stand der Prüfung am 22. September 2026 nach Merge von Story #142 / PR #145:

- `.github/workflows/kiagent-qstests.yml`, Workflow **Tests**, Git-Blob-SHA `afa6037bcc676acd1930d1fdc80b70522a2b9e7e`, verwendet `contents: read`, Trigger auf `push` und `pull_request` für `master` und `release/**` sowie `workflow_dispatch`.
- `.github/workflows/kiagent-mutationtests.yml`, Workflow **Tests - Mutation**, Git-Blob-SHA `c20a9d5f4fb63ad7c168946e1b80a1a57c23df57`, verwendet `contents: read`, Trigger auf `push` und `pull_request` für `master` und `release/**` sowie `workflow_dispatch`.
- Gegenüber den zuvor freigegebenen Versionen wurden ausschließlich die Branchfilter angepasst: `develop` wurde entfernt und `release/**` ergänzt. Berechtigungen, Secrets, Datenzugriffe, Runner, externe Actions, Jobs, Testbefehle und Artefaktkonfiguration blieben unverändert.

### Für KI-Agenten freigegebene Workflows

Die beiden oben referenzierten `kiagent-*`-Workflows sind für die selbständige Verwendung durch KI-Agenten freigegeben, solange exakt die nachfolgend referenzierten Versionen und Sicherheitsmerkmale gelten:

- **Tests:** `.github/workflows/kiagent-qstests.yml`, Git-Blob-SHA `afa6037bcc676acd1930d1fdc80b70522a2b9e7e`.
- **Tests - Mutation:** `.github/workflows/kiagent-mutationtests.yml`, Git-Blob-SHA `c20a9d5f4fb63ad7c168946e1b80a1a57c23df57`.
- Diese beiden nach Story #142 / PR #145 gemergten Versionen sind nach erneuter Sicherheitsprüfung ausdrücklich dauerhaft für die hier beschriebene selbständige Agentennutzung freigegeben.
- Zulässige Verwendung umfasst die in diesen Versionen vorhandenen automatischen `push`- und `pull_request`-Trigger sowie `workflow_dispatch` und das erneute Ausführen eines zu derselben freigegebenen Version gehörenden Laufs.
- Die Freigabe umfasst ausschließlich die in den referenzierten Versionen vorhandenen Berechtigungen, Inputs, Datenzugriffe, Artefakte, Runner und Zwecke. Eine Erweiterung wird nicht still mitfreigegeben.
- Die Workflows dürfen Repository-Inhalte und regulär auflösbare Entwicklungsabhängigkeiten verarbeiten sowie die in ihnen definierten Testreports als Artefakte erzeugen. Zusätzliche Secrets oder schreibende Repositoryberechtigungen sind nicht freigegeben.
- Der Dateipräfix `kiagent-` kennzeichnet Workflows, die für Agentennutzung vorgesehen sind. Für die konkrete Ausführungsfreigabe ist zusätzlich der hier dokumentierte Referenzstand maßgeblich; der Präfix allein hebt die versionsbezogene Sicherheitsprüfung nicht auf.

### Pflege der Workflow-Referenzen

- Wird ein für KI-Agenten freigegebener Workflow umbenannt, verschoben oder inhaltlich geändert, müssen die Referenzen in diesem Freigabeverzeichnis im selben zugehörigen Harness-/Werkzeugketten-Kontext aktualisiert werden.
- Dabei sind mindestens Dateipfad, sichtbarer Workflow-Name, Git-Blob-SHA oder gleichwertige unveränderliche Version, Trigger, Berechtigungen, Inputs, Outputs/Artefakte, Secrets, Datenzugriffe, Runner und Zweck erneut abzugleichen.
- Eine reine Umbenennung bei unverändertem Blob-Inhalt darf die bestehende inhaltliche Sicherheitsbewertung übernehmen, muss aber den neuen Dateipfad hier ausdrücklich nachziehen.
- Ändert sich der Blob-Inhalt oder eines der genannten Sicherheitsmerkmale, gilt die vorherige versionsbezogene Freigabe für den neuen Stand nicht automatisch weiter. Die neue Version wird erst nach der vorgeschriebenen Story, dem separaten Werkzeugketten-PR, menschlichem Review und einer ausdrücklich dokumentierten Freigabe selbständig verwendet.
- Veraltete Dateipfade oder SHAs werden nicht parallel als scheinbar gültige Referenzen stehen gelassen.
- Bei jeder Harness-Änderung, die GitHub-Actions-Rechte oder Branch-/PR-Abläufe betrifft, ist zu prüfen, ob die Referenzen dieses Freigabeverzeichnisses noch dem tatsächlichen Repository-Stand entsprechen.

Die bloße automatische Ausführung eines anderen, nicht in diesem Freigabeverzeichnis erfassten GitHub-Workflows durch GitHub begründet keine Ausführungsfreigabe für einen KI-Agenten.

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
