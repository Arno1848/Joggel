/**
 * "sections-helpers.js" - Stand: 15.05.2026
 * Enthält Hilfsfunktionen für die Score-Logik, Validierung 
 * sowie die (asynchrone) Berechnung und Speicherung der Statistiken.
 */

// -----------------------------------------------------------------------------
// I. BASIS-HILFSFUNKTIONEN (SCORE-LOGIK)
// -----------------------------------------------------------------------------

//---------------------------------------
function reverseTennisScore(scoreString) {
//---------------------------------------
    if (!scoreString) return "";
    const sets = scoreString.split(' ');
    const reversedSets = sets.map(set => {
        if (set.toLowerCase().includes('w.o.')) return set;
        const parts = set.split(':');
        if (parts.length === 2) {
            return parts[1] + ':' + parts[0];
        }
        return set;
    });
    return reversedSets.join(' ');
}

//---------------------------------------
function reversePoints(pointsString) {
//---------------------------------------
    if (!pointsString) return "";
    const parts = pointsString.split(':');
    if (parts.length === 2) {
        return parts[1] + ':' + parts[0];
    }
    return pointsString;
}

//---------------------------------------
function checkResultSyntax(rawResultString) {
//---------------------------------------
    let s = rawResultString.trim().toLowerCase();
    let isWalkover = false;

    if (s.includes('w.o.')) {
        isWalkover = true;
        s = s.replace('w.o.', '').replace(',', '').trim();
    }

    if (s === "") {
        return { formattedScore: "", isWalkover: isWalkover };
    }

    const setStrings = s.split(/[\s,]+/);
    const formattedSets = [];

    setStrings.forEach(setStr => {
        const digits = setStr.replace(/\D/g, '');
        if (digits.length === 2) {
            formattedSets.push(digits[0] + ':' + digits[1]);
        } else if (setStr.includes(':')) {
            formattedSets.push(setStr);
        }
    });

    return {
        formattedScore: formattedSets.join(' '),
        isWalkover: isWalkover
    };
}

//---------------------------------------
function getMatchOutcomePunkte(playerId, matchPlayer1Id, matchPlayer2Id, punkteString) {
//---------------------------------------
    if (!punkteString || !punkteString.includes(':')) return 'unfinished';
    const parts = punkteString.split(':');
    const p1Punkte = parseInt(parts[0]);
    const p2Punkte = parseInt(parts[1]);

    if (String(playerId) === String(matchPlayer1Id)) {
        if (p1Punkte > p2Punkte) return 'win';
        if (p1Punkte < p2Punkte) return 'loss';
    } else if (String(playerId) === String(matchPlayer2Id)) {
        if (p2Punkte > p1Punkte) return 'win';
        if (p2Punkte < p1Punkte) return 'loss';
    }
    return 'unfinished';
}

function getPlayerNameById(playerId) {
    if (!allSpielerDataRaw) return 'Unbekannt';
    const playerRow = allSpielerDataRaw.find(p => String(p[0]) === String(playerId));
    return playerRow ? String(playerRow[1]) : 'Unbekannt';
}

// -----------------------------------------------------------------------------
// II. STATISTIKEN BERECHNEN & SPEICHERN
// -----------------------------------------------------------------------------

//---------------------------------------
async function calculateAndSavePlayerStats() {
//---------------------------------------
    console.log("Berechne Statistiken...");

    const updatedPlayerStats = [];
    const spielerIdColIndex = allSpielerHeaders.indexOf('ID');
    const spieleColIndex = allSpielerHeaders.indexOf('Spiele');
    const punkteColIndex = allSpielerHeaders.indexOf('Punkte');

    const ergebnisSpieler1IdColIndex = allErgebnisseHeaders.indexOf('Spieler1_ID');
    const ergebnisSpieler2IdColIndex = allErgebnisseHeaders.indexOf('Spieler2_ID');
    const ergebnisPunkteColIndex = allErgebnisseHeaders.indexOf('Punkte');

    if (spielerIdColIndex === -1 || ergebnisPunkteColIndex === -1) {
        console.error("Spalten für Stats nicht gefunden.");
        return;
    }

    allSpielerDataRaw.forEach(playerRow => {
        const playerId = String(playerRow[spielerIdColIndex]);
        let wins = 0;
        let losses = 0;

        allErgebnisseDataRaw.forEach(matchRow => {
            const mP1 = String(matchRow[ergebnisSpieler1IdColIndex]);
            const mP2 = String(matchRow[ergebnisSpieler2IdColIndex]);
            const pStr = String(matchRow[ergebnisPunkteColIndex] || '').trim();

            if (mP1 !== playerId && mP2 !== playerId) return;
            if (pStr === '') return;

            const outcome = getMatchOutcomePunkte(playerId, mP1, mP2, pStr);
            if (outcome === 'win') wins++;
            else if (outcome === 'loss') losses++;
        });

        const playedMatches = wins + losses;
        playerRow[spieleColIndex] = playedMatches;
        playerRow[punkteColIndex] = `${wins}:${losses}`;

        updatedPlayerStats.push({
            id: playerId,
            spiele: playedMatches,
            punkte: `${wins}:${losses}`
        });
    });

    try {
        // Backend-Update via API
        const res = await apiCall('updatePlayerStats', { playerStatsToUpdate: updatedPlayerStats });
        console.log("Stats erfolgreich im Google Sheet aktualisiert:", res);
        
        // Falls die Übersicht gerade offen ist, sofort neu zeichnen
        if (document.getElementById('spieler-uebersicht').classList.contains('active')) {
            displaySpielerUebersicht(allSpielerDataRaw, allSpielerHeaders);
        }
    } catch (err) {
        console.error("Fehler beim Stats-Update:", err);
    }
}

// -----------------------------------------------------------------------------
// III. MATCH-ERGEBNIS SPEICHERN
// -----------------------------------------------------------------------------
//---------------------------------------
async function saveMatchResult() {
//---------------------------------------
    if (!selectedMatch) {
        showPopup('Kein Match ausgewählt.', 'error');
        return;
    }

    const ergebnisInput = document.getElementById('ergebnis-input');
    const datumInput = document.getElementById('datum-input');
    const ergebnisRaw = ergebnisInput.value.trim();
    const datum = datumInput.value; 
    const punkte = getSiegerSelect(selectedMatch);

    if (punkte === "") {
        showPopup('Bitte einen Sieger festlegen.', 'error');
        return;
    }

    const parsedResult = checkResultSyntax(ergebnisRaw);
    let ergebnisToSave = parsedResult.formattedScore;
    if (parsedResult.isWalkover) {
        ergebnisToSave = ergebnisToSave !== '' ? ergebnisToSave + ', w.o.' : 'w.o.';
    }

    let punkteToSave = punkte;

    // Falls der User Spieler 2 ist, müssen wir Score und Punkte für das Sheet drehen
    if (String(selectedMatch.originalPlayer2Id) === String(selectedPlayerId)) {
        ergebnisToSave = reverseTennisScore(ergebnisToSave);
        punkteToSave = reversePoints(punkteToSave);
    }

    // UI Feedback: Lade-Animation starten
    let popupSpinner = document.getElementById('popup-spinner');
    if (!popupSpinner) {
        popupSpinner = document.createElement('div');
        popupSpinner.id = 'popup-spinner';
        popupSpinner.classList.add('_spinner');
        appPopup.insertBefore(popupSpinner, popupMessage);
    }
    popupSpinner.style.display = 'block';
    popupCloseButton.style.display = 'none';
    showPopup('Übertrage Daten...', 'info');

    const payload = {
        spieler1Id: String(selectedMatch.originalPlayer1Id),
        spieler2Id: String(selectedMatch.originalPlayer2Id),
        ergebnis: ergebnisToSave,
        punkte: punkteToSave,
        datum: datum
    };

    try {
        // API Call an Google Apps Script
        const res = await apiCall('saveErgebnisse', { resultsToSave: [payload] });
        
        popupSpinner.style.display = 'none';
        let checkmark = document.createElement('div');
        checkmark.classList.add('checkmark');
        let existingCheck = appPopup.querySelector('.checkmark');
        if (existingCheck) existingCheck.remove();
        appPopup.insertBefore(checkmark, popupMessage);

        showPopup(res.message || 'Erfolgreich gespeichert', res.type || 'success');
        popupCloseButton.style.display = 'block';

        // 1. Lokalen Daten-Cache (allErgebnisseDataRaw) aktualisieren
        const key = selectedMatch.originalMatchId;
        const eIdx = allErgebnisseHeaders.indexOf('Ergebnis');
        const pIdx = allErgebnisseHeaders.indexOf('Punkte');
        const dIdx = allErgebnisseHeaders.indexOf('Datum');
        const s1Idx = allErgebnisseHeaders.indexOf('Spieler1_ID');
        const s2Idx = allErgebnisseHeaders.indexOf('Spieler2_ID');

        let found = false;
        for (let row of allErgebnisseDataRaw) {
            const rowKey = [String(row[s1Idx]), String(row[s2Idx])].sort().join('-');
            if (rowKey === key) {
                row[eIdx] = ergebnisToSave;
                row[pIdx] = punkteToSave;
                row[dIdx] = datum;
                found = true;
                break;
            }
        }
        if (!found) {
            const newRow = new Array(allErgebnisseHeaders.length).fill('');
            newRow[s1Idx] = selectedMatch.originalPlayer1Id;
            newRow[s2Idx] = selectedMatch.originalPlayer2Id;
            newRow[eIdx] = ergebnisToSave;
            newRow[pIdx] = punkteToSave;
            newRow[dIdx] = datum;
            allErgebnisseDataRaw.push(newRow);
        }

        // 2. UI Refresh für den aktuellen Spieler
        const playerSelect = document.getElementById('spieler-select');
        if (playerSelect && playerSelect.value) {
            loadPlayerMatches(playerSelect.value); 
        }

        // 3. Statistiken neu berechnen und ins Sheet schreiben
        await calculateAndSavePlayerStats();

        // Checkmark nach 2 Sekunden entfernen
        setTimeout(() => { if (checkmark.parentNode) checkmark.parentNode.removeChild(checkmark); }, 2000);

    } catch (err) {
        console.error("Fehler beim Speichern:", err);
        popupSpinner.style.display = 'none';
        showPopup('Fehler beim Speichern: ' + (err.message || 'Serverfehler'), 'error');
        popupCloseButton.style.display = 'block';
    }
}