//-- ergebnisoverlay.js - 14.05.2026 
//-------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("ergebnis-input");
//-------------------------------------------

  input.addEventListener("click", (event) => {
    event.preventDefault();
    input.blur(); // verhindert Tastatur auf Handy
    openOverlay();
  });
});

//-------------------------------------------
function changeValue(id, delta) {
//-------------------------------------------
  const input = document.getElementById(id);
  let value = parseInt(input.value) || 0;
  value = Math.max(0, value + delta);
  input.value = value;
}

//-------------------------------------------
function openOverlay() {
//-------------------------------------------
    console.log("openOverlay start");
    if (!selectedMatch) {
      console.log("openOverlay start, selectedMatch = Null");
      return
    }

    const overlay = document.getElementById("ergebnis-overlay");

    // Vorherige Werte auslesen und anzeigen
     ergebnisinput = document.getElementById("ergebnis-input");
    if (ergebnisinput) {
      const ergebnis = ergebnisinput.value
      console.log("openOverlay: ergebnis:", ergebnis);
      fillOverlayFromInput(ergebnis);
    } else {
      console.log("openOverlay: ergebnis-input nicht gefunden");
    }

    const spieler1 = selectedMatch.spieler1Name;
    const spieler2 = selectedMatch.spieler2Name;

    // Spielernamen einfügen
    const spieler1overlay = document.getElementById("overlay-spieler1")
    if (spieler1overlay) {
      spieler1overlay.textContent = spieler1;
    } else {
      console.log("openOverlay: overlay-spieler1 nicht gefunden");
    }

    const spieler2overlay = document.getElementById("overlay-spieler2")
    if (spieler2overlay) {
      spieler2overlay.textContent = spieler2;
    } else {
      console.log("openOverlay: overlay-spieler2 nicht gefunden");
    }

    // Overlay anzeigen
    console.log("Overlay wird geöffnet...");
    overlay.style.display = "block";
    overlay.classList.remove("hidden");
  }

//-------------------------------------------
  function fillOverlayFromInput(text) {
//-------------------------------------------
    const satzPattern = /(\d+)\s*:\s*(\d+)/g;
    const woPattern = /\(w\.o\.\)/i;

    let match;
    let i = 0;

    // Alle Sätze auf 0 setzen
    for (let j = 1; j <= 6; j++) {
      document.getElementById(`score${j}`).value = "0";
    }

    // Checkbox zurücksetzen
    document.getElementById("checkWO").checked = false;

    // Sätze aus Text extrahieren
    while ((match = satzPattern.exec(text)) !== null && i < 3) {
      const s1 = match[1];
      const s2 = match[2];

      document.getElementById(`score${i * 2 + 1}`).value = s1;
      document.getElementById(`score${i * 2 + 2}`).value = s2;
      i++;
    }

    // Walkover erkennen
    if (woPattern.test(text)) {
      document.getElementById("checkWO").checked = true;
    }
  }

//-------------------------------------------
function closeOverlay() {
//-------------------------------------------
  document.getElementById("ergebnis-overlay").style.display = "none";
}

//-------------------------------------------
function übernehmenErgebnis() {
//-------------------------------------------
  const scores = [];
  let suma = 0; // Satzgewinne Spieler A
  let sumb = 0; // Satzgewinne Spieler B

  for (let i = 1; i <= 6; i += 2) {
    const a = parseInt(document.getElementById(`score${i}`).value) || 0;
    const b = parseInt(document.getElementById(`score${i + 1}`).value) || 0;

    if (a === 0 && b === 0) continue;

    scores.push(`${a}:${b}`);

    // Sieger des Satzes bestimmen
    if (a > b) {
      suma += 1;
    } else if (b > a) {
      sumb += 1;
    }
    // Bei Gleichstand (z. B. 6:6) wird keiner gezählt
  }

  const wo = document.getElementById("checkWO").checked;
  if (wo) {
    scores.push("(w.o.)");
  }

  const ergebnis = scores.join(", ");

  document.getElementById("ergebnis-input").value = ergebnis;

  closeOverlay();

  // Punktwertung ermitteln
  let matchWertung = "";
  if (suma > sumb) {
    matchWertung = "1:0";
  } else if (sumb > suma) {
    matchWertung = "0:1";
  } else{
    return
  }

//    console.log("übernehmenErgebnis erg:", ergebnis);
//    console.log("übernehmenErgebnis pkt:", suma, sumb, matchWertung);
//    console.log("übernehmenErgebnis aktpkt:", selectedMatch.aktuellePunkte);
  if (selectedMatch.aktuellePunkte  === '') {
      selectedMatch.aktuellePunkte = matchWertung
      setSiegerSelect(selectedMatch) 
  }
  return 
}

