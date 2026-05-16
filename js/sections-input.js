// --- "sections-input.js" - 15.05.2026  ----------

let currentSpielerSortColumn = 'Name'; // Standardmäßig nach Name sortieren
let currentSpielerSortDirection = 'asc'; // Standardmäßig aufsteigend

// ******* Ergebnis Eingabe Logik *********
//---------------------------------------
function loadPlayersForSelection() {
//---------------------------------------
    const spielerSelect = document.getElementById('spieler-select');
    const playerSelectionDiv = document.getElementById('player-selection');
    const matchDisplayDiv = document.getElementById('match-display');
    const matchEntryForm = document.getElementById('match-entry-form'); 

    if (!spielerSelect || !playerSelectionDiv || !matchDisplayDiv || !matchEntryForm) {
        console.error("Erforderliche Elemente für Spieler-Auswahl nicht gefunden.");
        return;
    }

    // Zustand zurücksetzen
    playerSelectionDiv.classList.remove('hidden');
    
    // Hinweis und Buttons initial verstecken, wenn die Sektion zum ersten Mal geladen wird
    // oder wenn kein Spieler ausgewählt ist.
    if (!selectedPlayerId) { // Nur verstecken, wenn noch kein Spieler ausgewählt ist
        document.getElementById('match-selection-hint').classList.add('hidden');
        document.getElementById('save-single-match-button').classList.add('hidden');
        document.getElementById('match-display').classList.add('hidden'); // Auch die Tabelle verstecken
        resetMatchForm(); // Formular leeren, wenn kein Spieler ausgewählt ist
    } else {
        // Wenn ein Spieler ausgewählt ist, die Tabelle und Buttons anzeigen
        document.getElementById('match-selection-hint').classList.remove('hidden');
        document.getElementById('save-single-match-button').classList.remove('hidden');
        document.getElementById('match-display').classList.remove('hidden');
        // Und Matches für den bereits ausgewählten Spieler neu laden
        loadPlayerMatches(selectedPlayerId); // Dies wird jetzt den Fokus setzen
    }
}

//---------------------------------------
function populatePlayerSelect(playersData) {
//---------------------------------------
    const spielerSelect = document.getElementById('spieler-select');
    if (!spielerSelect) return;

    // Wichtig: Jetzt wird die erste Option auf den Standardtext gesetzt,
    // der vom Nutzer auswählbar ist.
    spielerSelect.innerHTML = '<option value="">-- Spieler wählen --</option>';
    spielerSelect.disabled = false; // Wieder aktivieren, da Daten geladen sind

    if (playersData.length === 0) {
        spielerSelect.innerHTML = '<option value="">Keine Spieler gefunden.</option>';
        return;
    }

    playersData.forEach(row => {
        const playerID = row[0];
        const playerName = row[1];

        if (playerID !== undefined && playerName !== undefined) {
            const option = document.createElement('option');
            option.value = playerID;
            option.textContent = playerName;
            spielerSelect.appendChild(option);
        }
    });

    // Setze den Wert der Select-Box auf den zuletzt ausgewählten Spieler, falls vorhanden
    // Die Matches werden dann von loadPlayersForSelection() oder dem Change-Event geladen.
    if (selectedPlayerId) {
        spielerSelect.value = selectedPlayerId;
    }
}

//---------------------------------------
function loadPlayerMatches(playerId) {
//---------------------------------------
    const matchesListDiv = document.getElementById('matches-list');
    if (!matchesListDiv) {
        console.error("Element 'matches-list' nicht gefunden.");
        return;
    }
    const targetPlayer = allSpielerDataRaw.find(p => String(p[0]) === playerId);
    if (!targetPlayer) {
        console.error(`Ausgewählter Spieler mit ID ${playerId} in allSpielerDataRaw nicht gefunden.`);
        matchesListDiv.innerHTML = '<p>Ausgewählter Spieler konnte nicht gefunden werden.</p>';
        return;
    }

    selectedPlayerName = targetPlayer[1]; 
    
    console.log('Generating matches for player:', playerId, selectedPlayerName, targetPlayer);

    const generatedMatches = [];
    // Für jeden Spieler in der Liste (der selbst ein Spieler1 sein könnte)
    for (let i = 0; i < allSpielerDataRaw.length; i++) {
        const player1Data = allSpielerDataRaw[i];
        const player1Id = String(player1Data[0]);
        const player1Name = String(player1Data[1]);

        // Nur Matches generieren, in denen der ausgewählte Spieler (playerId) selbst einer der beiden Spieler ist
        // Hier lassen wir alle möglichen Paarungen generieren, bevor wir filtern und anpassen
        for (let j = 0; j < allSpielerDataRaw.length; j++) {
            const player2Data = allSpielerDataRaw[j];
            const player2Id = String(player2Data[0]);
            const player2Name = String(player2Data[1]);

            if (player1Id !== player2Id) { // Spieler nicht gegen sich selbst
                // Stelle sicher, dass Matches nur einmal generiert werden, unabhängig von der Reihenfolge der IDs
                const sortedIds = [player1Id, player2Id].sort();
                const matchKey = sortedIds.join('-');

                // Überprüfen, ob dieses Match (basierend auf sortierten IDs) bereits hinzugefügt wurde
                const existingMatchIndex = generatedMatches.findIndex(m =>
                    m.originalMatchId === matchKey // Prüfen auf die originale, sortierte Match-ID
                );

                if (existingMatchIndex === -1) {
                    generatedMatches.push({
                        id: `${player1Id}-${player2Id}`, // Dies ist eine temporäre ID für die Generierung
                        originalMatchId: matchKey, // Die eindeutige ID im Speicher (immer sortiert)
                        originalPlayer1Id: player1Id, // ID des Spielers, der zuerst im originalen Schlüssel ist
                        originalPlayer1Name: player1Name,
                        originalPlayer2Id: player2Id, // ID des Spielers, der zweit im originalen Schlüssel ist
                        originalPlayer2Name: player2Name,
                        aktuellesErgebnisRaw: '', // Rohes Ergebnis aus dem Backend (immer Spieler1 vs Spieler2)
                        aktuellePunkteRaw: '',    // Rohe Punkte aus dem Backend
                        aktuellesDatum: ''
                    });
                }
            }
        }
    }

    // Ergebnis- und Punktedaten aus dem Cache holen
    const resultsMap = new Map();
    const punkteMap = new Map();
    const datumMap = new Map();

    if (allErgebnisseDataRaw && allErgebnisseDataRaw.length > 0 && allErgebnisseHeaders.length > 0) {
        const spieler1IdCol = allErgebnisseHeaders.indexOf('Spieler1_ID');
        const spieler2IdCol = allErgebnisseHeaders.indexOf('Spieler2_ID');
        const ergebnisCol = allErgebnisseHeaders.indexOf('Ergebnis');
        const punkteCol = allErgebnisseHeaders.indexOf('Punkte');
        const datumCol = allErgebnisseHeaders.indexOf('Datum');

        if (spieler1IdCol !== -1 && spieler2IdCol !== -1 && ergebnisCol !== -1 && punkteCol !== -1 && datumCol !== -1) {
            for (let i = 0; i < allErgebnisseDataRaw.length; i++) {
                const row = allErgebnisseDataRaw[i];
                const rawId1 = String(row[spieler1IdCol]).trim();
                const rawId2 = String(row[spieler2IdCol]).trim();
                const rawErgebnis = String(row[ergebnisCol] || '').trim();
                const rawPunkte = String(row[punkteCol] || '').trim();
                const rawDatum = String(row[datumCol] || '').trim();
                const rawKey = [rawId1, rawId2].sort().join('-'); // Schlüssel basiert immer auf sortierten IDs
                resultsMap.set(rawKey, rawErgebnis);
                punkteMap.set(rawKey, rawPunkte);
                datumMap.set(rawKey, rawDatum);
            }
        } else {
            console.warn('Ergebnis-Header in allErgebnisseHeaders unvollständig oder falsch. Kann Ergebnisse nicht mappen.');
        }
    } else {
        console.log('Keine Ergebnisdaten im Frontend gecached oder leer.');
    }

    // Filtern, Zuordnen und Formatieren der Matches für die ANZEIGE
    let formattedMatchesForDisplay = generatedMatches.filter(match =>
        String(match.originalPlayer1Id) === String(playerId) || String(match.originalPlayer2Id) === String(playerId)
    ).map(match => {
        // Starte mit einer Kopie des originalen Match-Objekts
        const displayMatch = { ...match }; 

        // Hole die ROHE Daten aus dem Cache basierend auf originalMatchId
        displayMatch.aktuellesErgebnisRaw = resultsMap.get(displayMatch.originalMatchId) || '';
        displayMatch.aktuellePunkteRaw = punkteMap.get(displayMatch.originalMatchId) || '';
        displayMatch.aktuellesDatum = datumMap.get(displayMatch.originalMatchId) || '';

        // *** HIER IST DIE KRITISCHE STELLE FÜR DIE UMKEHRUNG DER ANZEIGE-WERTE UND NAMEN ***
        if (String(displayMatch.originalPlayer2Id) === String(playerId)) {
            // Wenn der ausgewählte Spieler (playerId) der originale Spieler2 war,
            // dann werden die Ergebnis- und Punktstrings FÜR DIE ANZEIGE umgedreht.
            displayMatch.aktuellesErgebnis = reverseTennisScore(displayMatch.aktuellesErgebnisRaw);
            displayMatch.aktuellePunkte = reversePoints(displayMatch.aktuellePunkteRaw);

            // Und die Spielernamen werden für die Anzeige so getauscht, dass der
            // ausgewählte Spieler an erster Stelle steht.
            const tempName = displayMatch.originalPlayer1Name;
            displayMatch.spieler1Name = displayMatch.originalPlayer2Name;
            displayMatch.spieler2Name = tempName;
            // Die angepassten IDs für die Anzeige
            displayMatch.spieler1Id = displayMatch.originalPlayer2Id;
            displayMatch.spieler2Id = displayMatch.originalPlayer1Id;

        } else {
            // Wenn der ausgewählte Spieler (playerId) der originale Spieler1 war,
            // dann bleiben die Ergebnis- und Punktstrings und Namen unverändert für die Anzeige.
            displayMatch.aktuellesErgebnis = displayMatch.aktuellesErgebnisRaw;
            displayMatch.aktuellePunkte = displayMatch.aktuellePunkteRaw;
            displayMatch.spieler1Name = displayMatch.originalPlayer1Name;
            displayMatch.spieler2Name = displayMatch.originalPlayer2Name;
            displayMatch.spieler1Id = displayMatch.originalPlayer1Id;
            displayMatch.spieler2Id = displayMatch.originalPlayer2Id;
        }

        // Setze die `id` des Match-Objekts auf die sortierte `originalMatchId`
        // Das wird die ID sein, die in `data-match-id` im HTML verwendet wird
        // und dient als eindeutige Referenz zurück zum Original-Match im `allErgebnisseDataRaw` Cache.
        displayMatch.id = displayMatch.originalMatchId;

        return displayMatch;
    });

    // Sortierung (gespielte zuerst, dann alphabetisch nach Gegenspieler)
    formattedMatchesForDisplay.sort((a, b) => {
        const hasResultA = a.aktuellesErgebnis && a.aktuellesErgebnis.trim() !== '';
        const hasResultB = b.aktuellesErgebnis && b.aktuellesErgebnis.trim() !== '';

        // Gespielte Matches zuerst
        if (hasResultA && !hasResultB) return -1; // A hat Ergebnis, B nicht: A kommt vor B
        if (!hasResultA && hasResultB) return 1;  // B hat Ergebnis, A nicht: B kommt vor A

        // Dann alphabetisch nach dem Namen des Gegners (der in spieler2Name steht)
        return a.spieler2Name.localeCompare(b.spieler2Name);
    });

    currentMatchesData = formattedMatchesForDisplay; // Speichert die für die Anzeige vorbereiteten Matches

    const totalMatchesCount = currentMatchesData.length;
    const playedMatchesCount = currentMatchesData.filter(match => match.aktuellesErgebnis && match.aktuellesErgebnis.trim() !== '').length;
    const openMatchesCount = totalMatchesCount - playedMatchesCount;

    displayPlayerMatchesTable(currentMatchesData, playedMatchesCount, totalMatchesCount);

    // Hinweis und Buttons sichtbar machen, wenn ein Spieler ausgewählt ist
    document.getElementById('match-selection-hint').classList.remove('hidden');
    document.getElementById('save-single-match-button').classList.remove('hidden');

    // NEU: Logik für den initialen Fokus oder die Wiederherstellung der Auswahl
    let matchToFocus = null;

    if (selectedMatch && String(selectedMatch.spieler1Id) === String(playerId)) {
        // 1. Versuch: Das zuvor ausgewählte Match wiederherstellen, wenn es noch zum aktuellen Spieler gehört
        matchToFocus = currentMatchesData.find(m => m.id === selectedMatch.id);
    }

    if (matchToFocus) {
        // Wenn ein zuvor ausgewähltes Match gefunden wurde, klicke es an
        handleMatchRowClick(matchToFocus);
        const isMobileBreakpoint = window.innerWidth <= 600;
        const matchRow = document.getElementById('matches-list').querySelector(`[data-match-id="${matchToFocus.id}"]`);
        if (matchRow && !isMobileBreakpoint) {
            matchRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    } else {
        // 2. Versuch: Das erste ungespielte Match auswählen (wenn kein zuvor ausgewähltes Match oder Spieler gewechselt)
        const firstNoResultMatch = currentMatchesData.find(match => !match.aktuellesErgebnis || match.aktuellesErgebnis.trim() === '');
        if (firstNoResultMatch) {
            handleMatchRowClick(firstNoResultMatch);
            const isMobileBreakpoint = window.innerWidth <= 600;
            const matchRow = document.getElementById('matches-list').querySelector(`[data-match-id="${firstNoResultMatch.id}"]`);
            if (matchRow && !isMobileBreakpoint) {
                matchRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else {
            // 3. Fall: Keine ungespielten Matches gefunden, Formular zurücksetzen
            resetMatchForm();
        }
    }
}

//---------------------------------------
function resetMatchForm() {
//---------------------------------------
// Funktion zum Zurücksetzen des Match-Formulars
    document.getElementById('ergebnis-input').value = '';
    document.getElementById('punkte-input').value = '';
    document.getElementById('datum-input').value = '';
    document.getElementById('match-label-display').textContent = 'Match:';
    selectedMatch = null; // Wichtig: selectedMatch zurücksetzen
    // Entferne die "selected"-Klasse von allen Zeilen
    document.querySelectorAll('.match-row.selected').forEach(row => {
        row.classList.remove('selected');
    });
}

//---------------------------------------
function displayPlayerMatchesTable(matches, playedCount, totalCount) {
//---------------------------------------

    const matchesListDiv = document.getElementById('matches-list');
    if (!matchesListDiv) {
        console.error("Element 'matches-list' nicht gefunden.");
        return;
    }

    matchesListDiv.innerHTML = '';
    // currentMatchesData ist bereits oben in loadPlayerMatches gesetzt und transformiert

    if (matches.length === 0) {
        matchesListDiv.innerHTML = '<p>Keine Paarungen für diesen Spieler gefunden.</p>';
        return;
    }

    const table = document.createElement('table');
    table.classList.add('match-results-table');
    table.classList.add('sortable-table'); // NEU: Sortierbare Tabelle
    
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    let headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th>Match (${playedCount}/${totalCount})</th>
        <th>Ergebnis</th>
        <th>Pkt</th> <!-- GEÄNDERT: 'Punkte' zu 'Pkt' -->
        <th>Datum</th>
    `;
    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody);

    matches.forEach(match => {
        // match.spieler1Name und match.spieler2Name sind hier bereits in der korrekten ANZEIGE-Reihenfolge
        const matchLabel = `${match.spieler1Name} - ${match.spieler2Name}`; 

        const row = document.createElement('tr');
        row.classList.add('match-row');
        row.dataset.matchId = match.id; // Die ID des Matches (originalMatchId)

        if (!match.aktuellesErgebnis || match.aktuellesErgebnis.trim() === '') {
            row.classList.add('no-result');
        }

        row.innerHTML = `
            <td>${matchLabel}</td>
            <td>${match.aktuellesErgebnis}</td>
            <td>${match.aktuellePunkte}</td>
            <td>${match.aktuellesDatum || ''}</td>
        `;
        
        // Der Klick-Handler muss das `match`-Objekt übergeben, das ALLE notwendigen Infos enthält.
        row.addEventListener('click', () => handleMatchRowClick(match)); 

        tbody.appendChild(row);
    });

    matchesListDiv.appendChild(table);

}

//---------------------------------------
function handleMatchRowClick(match) {
//---------------------------------------
    document.querySelectorAll('.match-row.selected').forEach(row => {
        row.classList.remove('selected');
    });
    const clickedRow = document.querySelector(`tr[data-match-id="${match.id}"]`);
    if (clickedRow) {
        clickedRow.classList.add('selected');
    }

    // `match` ist hier das Objekt aus `currentMatchesData`, das bereits die
    // für die Anzeige korrekten Namen, `aktuellesErgebnis` und `aktuellePunkte` hat.
    // Es enthält auch die `originalPlayer1Id`/`originalPlayer2Id` und `aktuellesErgebnisRaw`/`aktuellePunkteRaw`.
    selectedMatch = match; 

    updateErgebnisFormular(selectedMatch); // Übergibt das vollständig vorbereitete Match-Objekt
}

//---------------------------------------
function updateErgebnisFormular(match) {
//---------------------------------------
    const matchLabelDisplay = document.getElementById('match-label-display');
    const resultInput = document.getElementById('ergebnis-input');
    const pointsInput = document.getElementById('punkte-input');
    const dateInput = document.getElementById('datum-input');
    const matchEntryForm = document.getElementById('match-entry-form');

    if (!matchLabelDisplay || !resultInput || !pointsInput || !dateInput || !matchEntryForm) {
        console.error("Eines der Formular-Elemente wurde nicht gefunden.", matchLabelDisplay, resultInput,pointsInput,dateInput,matchEntryForm);
        return;
    }

    // Das Label wird aus den bereits angepassten Namen im Match-Objekt genommen
    matchLabelDisplay.textContent = `${match.spieler1Name} vs ${match.spieler2Name}`;

    // Die Input-Felder werden mit den `aktuellesErgebnis` und `aktuellePunkte` gefüllt,
    // die bereits in `loadPlayerMatches` korrekt für die Anzeige vorbereitet wurden.
    resultInput.value = match.aktuellesErgebnis || ''; 
    pointsInput.value = match.aktuellePunkte || ''; 

    setSiegerSelect(match) 

    // Datum bleibt das originale Datum
    if (match.aktuellesDatum) {
        const dateObj = new Date(match.aktuellesDatum);
        if (!isNaN(dateObj.getTime())) {
            dateInput.value = dateObj.toISOString().split('T')[0];
        } else {
            const today = new Date();
            dateInput.value = today.toISOString().split('T')[0];
        }
    } else {
        const today = new Date();
        dateInput.value = today.toISOString().split('T')[0];
    }

    // matchEntryForm.classList.remove('hidden'); // DIESE ZEILE ENTFERNT: Formular ist immer sichtbar
}
//---------------------------------------
function setSiegerSelect(match) {
//---------------------------------------
    console.log("setSiegerSelect, match: ", match);
    const siegerSelect = document.getElementById('sieger-select');
    if (!siegerSelect) return;

    siegerSelect.innerHTML = '<option value="">Sieger wählen</option>';
    siegerSelect.disabled = false; 

    // Erste Option für Spieler 1
    const option1 = document.createElement('option'); // Korrektur: Hier war 'option' zweimal deklariert
    option1.value = match.spieler1Id;
    option1.textContent = match.spieler1Name;
    siegerSelect.appendChild(option1);
//    console.log("setSiegerSelect, option1: ", option1.value, option1.textContent);

    // Zweite Option für Spieler 2
    const option2 = document.createElement('option'); // Korrektur: Eine neue Variable 'option2' verwenden
    option2.value = match.spieler2Id;
    option2.textContent = match.spieler2Name;
    siegerSelect.appendChild(option2);
//    console.log("setSiegerSelect, option2: ", option2.value, option2.textContent);

    const punkte = match.aktuellePunkte; // Verwendet die bereits für die Anzeige aufbereiteten Punkte
    
    // Vorbelegung des Dropdowns basierend auf den Punkten
    if (punkte === "1:0") {
        siegerSelect.value = match.spieler1Id;
//        console.log("setSiegerSelect 1:0: ", punkte, match.spieler1Id, siegerSelect.value);
    } else if (punkte === "0:1") {
        siegerSelect.value = match.spieler2Id;
//        console.log("setSiegerSelect 0:1: ", punkte, match.spieler2Id, siegerSelect.value);
    } else {
        siegerSelect.value = ''; // Kein Ergebnis oder unentschieden, Option "Sieger wählen" aktiv lassen
    }
//    console.log("setSiegerSelect, punkte, sieger: ", punkte, siegerSelect.value);
}

//---------------------------------------
function getSiegerSelect(match) {
//---------------------------------------
    console.log("getSiegerSelect, match: ", match);

    const siegerSelect = document.getElementById('sieger-select');
    if (!siegerSelect) return '';

    let punkteToSave = '';
    const selectedSiegerId = siegerSelect.value; 
    if (selectedSiegerId) {
        if (String(selectedSiegerId) === String(selectedMatch.spieler1Id)) {
            punkteToSave = "1:0"; // Der Spieler, der im Formular als Spieler1 angezeigt wird, hat gewonnen
        } else if (String(selectedSiegerId) === String(selectedMatch.spieler2Id)) {
            punkteToSave = "0:1"; // Der Spieler, der im Formular als Spieler2 angezeigt wird, hat gewonnen
        }

        // Die selectedSiegerId ist die ID des Spielers, der im Dropdown als Sieger gewählt wurde.
        // Diese IDs sind entweder match.spieler1Id oder match.spieler2Id (die für die Anzeige gedrehten IDs).
    }
    console.log("getSiegerSelect, punkteToSave: ", selectedSiegerId, punkteToSave);
    
  return punkteToSave

}

