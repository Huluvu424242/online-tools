# UX und Barrierefreiheit

Barrierefreiheit ist Bestandteil jeder GUI-Story und keine ausschließlich nachgelagerte Querschnittsaufgabe. Mobile First bleibt die verbindliche Grundrichtung.

## Verbindliche Anforderungen für Web-Oberflächen

- Interaktive Elemente erhalten verständliche sichtbare Bezeichnungen oder eindeutige zugängliche Namen.
- Symbolschaltflächen benötigen einen verständlichen zugänglichen Namen; ein rein visuelles Symbol genügt nicht.
- Touch-Ziele sollen ungefähr 44 CSS-Pixel Höhe und Breite erreichen, soweit das jeweilige Steuerelement dies sinnvoll zulässt.
- Primäre Aktionen bleiben auf kleinen Viewports erreichbar und werden nicht durch Bildschirmrand, virtuelle Tastatur oder überlagernde Meldungen verdeckt.
- Die Oberfläche muss vollständig per Tastatur bedienbar sein, soweit eine Funktion nicht technisch zwingend ein anderes Eingabegerät voraussetzt.
- Fokusreihenfolge und Tastaturaktivierung müssen der visuellen und fachlichen Reihenfolge entsprechen. Fokusfallen sind unzulässig.
- Bei dynamisch eingeblendeten Dialogen, Fehlersammlern oder anderen relevanten Zustandswechseln muss die Fokusführung sinnvoll und nachvollziehbar sein.
- Information wird niemals ausschließlich über Farbe, Form, Position oder ein unbeschriftetes Symbol vermittelt.
- Basislayouts funktionieren ohne Media Query auf kleinen Viewports. Inhalte umbrechen oder scrollen kontrolliert; horizontales Überlaufen ist zu vermeiden.
- Große Schrift beziehungsweise Browser-Zoom darf Kerninhalte nicht abschneiden, überlagern oder Aktionen unerreichbar machen.
- Lade-, Leer-, Erfolgs- und Fehlerzustände werden verständlich und, wo relevant, assistiver Technik wahrnehmbar umgesetzt.
- Nutzereingaben und Entwürfe bleiben bei Validierungs- oder Verarbeitungsfehlern erhalten.
- Validierungsfehler werden nahe am betroffenen Feld verständlich erklärt.
- Bei mehreren Validierungsfehlern ist ein zugänglicher Fehlersammler am Inhaltsanfang zu bevorzugen; dessen Einträge sollen zum zugehörigen Feld führen.
- Nach fehlgeschlagener Validierung werden Fokus und gegebenenfalls Scrollposition nachvollziehbar zum Fehlersammler beziehungsweise ersten relevanten Fehler geführt.
- Erfolgreiche, fehlgeschlagene und noch laufende Aktionen erhalten eine verständliche Rückmeldung.
- Deaktivierte Aktionen dürfen nicht die einzige Erklärung dafür sein, warum ein Schritt nicht möglich ist.
- Formulare verwenden semantisch passende HTML-Elemente, Labels, Überschriften und Gruppen. ARIA ergänzt native Semantik, ersetzt sie aber nicht ohne Grund.
- Dynamische Status- und Fehlermeldungen nutzen bei Bedarf geeignete Live-Regionen, ohne Nutzer durch unnötige Wiederholungen zu überlasten.
- Eingabefelder erhalten fachlich sinnvolle Begrenzungen, wenn unbegrenzte Eingaben zu Bedien-, Sicherheits- oder Performanceproblemen führen würden.
- Änderungen werden auf kleinen Viewports und üblichen Desktopgrößen geprüft.

## Tests und manuelle Prüfungen

- Relevante Accessibility-Anforderungen werden mit den im Projekt vorhandenen Web-Testmitteln automatisiert geprüft, soweit dies zuverlässig möglich ist.
- Tests prüfen beobachtbares Verhalten und semantische Ergebnisse statt nur CSS- oder DOM-Implementierungsdetails.
- Tastaturbedienung, Fokuswechsel, Validierungsfehler und Erhalt von Eingaben erhalten Tests, wenn sie durch eine Änderung betroffen sind.
- Manuelle Prüfungen werden transparent benannt, wenn Browser, Screenreader, Zoom, reale Touch-Bedienung oder visuelle Kontrastbewertung nicht sinnvoll automatisierbar sind.
- Eine spätere gebündelte Accessibility-Prüfung darf zusätzliche Befunde liefern, ersetzt aber nicht die unmittelbar umsetzbaren Anforderungen innerhalb der jeweiligen GUI-Story.
