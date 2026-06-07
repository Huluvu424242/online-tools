# Projektanweisungen für Codex AI

## Architekturentscheidung: Mobile First

Dieses Projekt verfolgt ab sofort einen konsequenten Mobile-First-Ansatz.

- Neue Oberflächen werden zuerst für Smartphones und Touch-Bedienung umgesetzt.
- Die Basis-Styles müssen ohne Media Query auf kleinen Viewports hervorragend funktionieren.
- Abweichungen für Tablet oder Desktop werden nur ergänzt, wenn der größere Viewport einen echten Bedien- oder Lesbarkeitsvorteil bietet.
- Interaktive Elemente sollen gut mit dem Finger bedienbar sein; als Mindestziel gelten ca. 44 px Höhe/Breite für Touch-Ziele.
- Horizontales Überlaufen ist zu vermeiden. Lange Inhalte müssen umbrechen oder in klar begrenzten Ergebnisbereichen scrollen.
- Offline-Nutzbarkeit und die statische Architektur ohne externe Laufzeit-Abhängigkeiten bleiben erhalten.
