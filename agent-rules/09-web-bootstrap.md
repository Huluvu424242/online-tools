# Web-Grundgerüst und Supportfunktionen

Diese Regeln übertragen geeignete Grundgerüst-Ideen aus `taugts` auf eine statische Webanwendung ohne eigenen Backend-Betrieb.

## Verbindliche Grundgerüst-Funktionen

Ein neues eigenständiges Web-Grundgerüst beziehungsweise eine grundlegende Neuaufsetzung ist erst vollständig, wenn mindestens folgende Funktionen vorhanden und soweit automatisierbar getestet sind:

- eindeutiger Anwendungsname und visuelle Identität
- sichtbare Versionsinformation
- zentral erreichbarer Bereich `Über` beziehungsweise `Info`
- `Fehler melden`
- direkter Zugang zur Projektseite
- Zugang zur Benutzerdokumentation
- Zugang zur Barrierefreiheitserklärung beziehungsweise zu den vorgesehenen Accessibility-Informationen

Diese Funktionen gehören in die Grundgerüst- beziehungsweise Initial-Story und werden nicht ohne fachlichen Grund auf spätere Stories verschoben.

## Version und Anwendungsmetadaten

- Die aktuell ausgelieferte Version muss für Nutzer innerhalb der Anwendung sichtbar sein.
- Die Version wird aus einer eingecheckten, statisch auslieferbaren Quelle ermittelt. Dafür ist kein eigenes Backend erforderlich.
- Versionsquelle und sichtbare Anzeige müssen denselben Release-Stand beschreiben.
- Die Lösung muss mit direkter statischer Auslieferung, Offline-ZIP und GitHub Pages beziehungsweise GitHub Enterprise kompatibel sein.
- Versions-, Repository-, Dokumentations- und Issue-Ziele sollen zentral gepflegt werden, damit `Über`, Fehlerberichte und andere Anzeigen keine voneinander abweichenden Werte hartcodieren.
- Ein Fork oder eine Unternehmensinstallation muss diese Metadaten auf die eigene GitHub-Enterprise-Umgebung anpassen können, ohne die Architektur neu zu bauen.

## Über-/Info-Bereich

Der zentrale Info-Bereich zeigt beziehungsweise verlinkt mindestens:

- Anwendungsname
- aktuell ausgelieferte Version
- Projekt-/Repository-Seite
- Benutzerdokumentation
- Barrierefreiheitsinformationen
- `Fehler melden`

Links und Plattformziele dürfen auf öffentliche GitHub-Infrastruktur oder auf eine unternehmensinterne GitHub-Enterprise-Instanz zeigen. Eine öffentliche GitHub-Domain ist nicht das einzig zulässige Ziel.

Wenn ein externes Ziel nicht erreichbar ist, bleibt die Kernanwendung benutzbar. Der Fehler wird verständlich angezeigt; es wird kein Erfolg vorgetäuscht.

## Fehler melden ohne eigenes Backend

Wenn die verwendete Plattform bereits ein Issue-System bereitstellt, soll dieses genutzt werden, statt einen eigenen Fehlerdienst zu entwickeln.

Der Ablauf ist grundsätzlich:

1. Nutzer öffnet `Fehler melden`.
2. Die Anwendung zeigt einen lokalen, barrierefrei bedienbaren Dialog.
3. Fehlerart, fachlicher Aufrufkontext und aktuelle Anwendungsversion werden angezeigt beziehungsweise vorbereitet.
4. Der Nutzer kann eine Beschreibung bewusst ergänzen.
5. Vor dem Verlassen der Anwendung ist erkennbar, welches Plattformziel geöffnet wird und welche Informationen dorthin übergeben werden.
6. Erst durch eine bewusste Nutzeraktion wird ein vorbereiteter Issue- oder vergleichbarer Melde-Link geöffnet.
7. Der Nutzer prüft und versendet den Bericht auf der Zielplattform.

Zulässig beziehungsweise vorgesehen sind Fehlerart, stabiler Aufrufkontext, Anwendungsversion und die vom Nutzer bewusst eingegebene Beschreibung.

Nicht automatisch übertragen werden:

- Inhalte anderer Tools oder Eingabefelder
- lokale Dateien oder Zwischenablageinhalte
- Local-/Session-Storage
- Tokens, Passwörter oder Schlüssel
- Logs mit potenziell sensiblen Daten
- Browserfingerprints oder Gerätekennungen
- sonstige Diagnose- oder Nutzerdaten, die der Nutzer nicht bewusst für den Fehlerbericht freigegeben hat

## Plattformneutralität zwischen GitHub und GitHub Enterprise

- Repository-, Dokumentations- und Issue-Ziele werden so zentral konfiguriert, dass ein Fork oder eine Unternehmensinstallation sie auf die eigene GitHub-Enterprise-Instanz umstellen kann.
- Öffentliche Entwicklung auf `github.com` und spätere interne Nutzung auf GitHub Enterprise sind gleichwertig unterstützte Einsatzmodelle.
- Die Fehlerberichtsfunktion darf nicht voraussetzen, dass `github.com` aus dem Einsatznetz erreichbar ist.
- Wenn eine Enterprise-Installation Issues, Pages, Releases oder Actions bereitstellt, sollen diese vorhandenen Möglichkeiten genutzt werden, statt parallele projektspezifische Dienste nachzubauen.
- Daten dürfen nicht versehentlich zwischen öffentlicher und interner Plattform vermischt werden. Das konfigurierte Ziel bestimmt den Vertrauensbereich.

## Fachlicher Aufrufkontext

Jeder Einstieg in `Fehler melden` übergibt einen stabilen, nutzerverständlichen fachlichen Kontext, zum Beispiel `Base64-Tool`, `JWT-Tool`, `YAML/Properties-Konverter`, `Regex-Prüfung`, `Über-Dialog` oder `Barrierefreiheitsinformationen`.

Generische technische Bezeichnungen wie `Dialog`, `Formular` oder ein Klassen-/Dateiname reichen nicht aus, wenn sie den Nutzerkontext nicht eindeutig beschreiben.

## Tests

Soweit mit den vorhandenen Web-Testmitteln automatisierbar, werden mindestens geprüft:

- sichtbare und korrekte Versionsanzeige
- Erreichbarkeit von `Über`, `Fehler melden`, Projektseite, Dokumentation und Accessibility-Informationen
- korrekte Verwendung zentraler Projekt-/Plattformmetadaten
- korrekte URL-Kodierung vorbereiteter Fehlerberichte
- Fehlerart, Kontext und Version im vorbereiteten Bericht
- Übernahme nur der bewusst eingegebenen Beschreibung
- Ausschluss sensibler oder nicht ausdrücklich freigegebener Daten
- verständliches Verhalten bei nicht erreichbaren externen Zielen
- Konfigurierbarkeit auf ein alternatives GitHub-Enterprise-Ziel, soweit die Implementierung dies berührt

Die allgemeinen Accessibility-, Security-, Datenschutz- und Testregeln gelten zusätzlich.
