// --- "sections-players&results.js" - 14.05.2026----------

let selectedAllMatchesRow = null;
let currentSortColumn = 'Datum'; // Standardmäßig nach Datum sortieren
let currentSortDirection = 'desc'; // Standardmäßig absteigend (neuestes Datum zuerst)

// ******* "Alle Ergebnisse" Logik ***************
//---------------------------------------
function displayAlleErgebnisse(data, headers) {
//---------------------------------------
    const tableContainer = document.getElementById('all-matches-table-container');
    if (!tableContainer) {
        console.error("Element 'all-matches-table-container' nicht gefunden.");
        return;
    }

    tableContainer.innerHTML = ''; 

    if (!data || data.length === 0) {
        tableContainer.innerHTML = '<p>Keine Ergebnisse gefunden.</p>';
        return;
    }

    const table = document.createElement('table');
    table.classList.add('match-results-table'); 
    table.classList.add('sortable-table'); 
    
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    let headerRow = document.createElement('tr');
    const displayHeaders = ['Match', 'Ergebnis', 'Pkt', 'Datum']; 
    
    const colIndexes = {
        'Match': null, 
        'Ergebnis': headers.indexOf('Ergebnis'),
        'Punkte': headers.indexOf('Punkte'), 
        'Datum': headers.indexOf('Datum'),
        'Spieler1_ID': headers.indexOf('Spieler1_ID'), 
        'Spieler2_ID': headers.indexOf('Spieler2_ID')  
    };

    if (colIndexes.Ergebnis === -1 || colIndexes.Punkte === -1 || colIndexes.Datum === -1 || colIndexes.Spieler1_ID === -1 || colIndexes.Spieler2_ID === -1) {
        tableContainer.innerHTML = '<p>Fehler: Erforderliche Spalten nicht gefunden.</p>';
        return;
    }

    displayHeaders.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.dataset.column = headerText; 

        if (currentSortColumn === headerText) {
            th.classList.add('sort-active');
            th.innerHTML += ` <span class="sort-arrow">${currentSortDirection === 'asc' ? '&#9650;' : '&#9660;'}</span>`;
        }

        th.addEventListener('click', function() {
            const column = this.dataset.column;
            if (currentSortColumn === column) {
                currentSortDirection = (currentSortDirection === 'asc' ? 'desc' : 'asc');
            } else {
                currentSortColumn = column;
                currentSortDirection = 'asc';
            }
            displayAlleErgebnisse(allErgebnisseDataRaw, allErgebnisseHeaders);
        });
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody);

    data.sort((a, b) => {
        let valA, valB;
        switch (currentSortColumn) {
            case 'Datum':
                valA = new Date(String(a[colIndexes.Datum]));
                valB = new Date(String(b[colIndexes.Datum]));
                break;
            case 'Match':
                valA = `${getPlayerNameById(a[colIndexes.Spieler1_ID])} - ${getPlayerNameById(a[colIndexes.Spieler2_ID])}`;
                valB = `${getPlayerNameById(b[colIndexes.Spieler1_ID])} - ${getPlayerNameById(b[colIndexes.Spieler2_ID])}`;
                break;
            case 'Ergebnis':
                valA = String(a[colIndexes.Ergebnis]);
                valB = String(b[colIndexes.Ergebnis]);
                break;
            case 'Pkt':
                valA = String(a[colIndexes.Punkte]);
                valB = String(b[colIndexes.Punkte]);
                break;
            default: return 0;
        }

        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
        } else if (valA instanceof Date && valB instanceof Date) {
            comparison = valA.getTime() - valB.getTime();
        } else {
            if (valA > valB) comparison = 1;
            else if (valA < valB) comparison = -1;
        }
        return currentSortDirection === 'asc' ? comparison : -comparison;
    });

    data.forEach(rowData => {
        const row = document.createElement('tr');
        row.dataset.player1Id = rowData[colIndexes.Spieler1_ID];
        row.dataset.player2Id = rowData[colIndexes.Spieler2_ID];

        const matchLabel = `${getPlayerNameById(rowData[colIndexes.Spieler1_ID])} - ${getPlayerNameById(rowData[colIndexes.Spieler2_ID])}`;
        const ergebnis = rowData[colIndexes.Ergebnis] || '';
        const punkte = rowData[colIndexes.Punkte] || '';
        let datum = rowData[colIndexes.Datum] || '';

        if (datum instanceof Date) {
            datum = datum.toISOString().split('T')[0];
        }

        row.innerHTML = `<td>${matchLabel}</td><td>${ergebnis}</td><td>${punkte}</td><td>${datum}</td>`;

        row.addEventListener('click', function() {
            document.querySelectorAll('#all-matches-table-container .match-results-table tr.selected').forEach(r => r.classList.remove('selected'));
            this.classList.add('selected');
            selectedAllMatchesRow = this;
        });

        tbody.appendChild(row);
    });

    tableContainer.appendChild(table);
}

//---------------------------------------
async function deleteMatchResult() {
//---------------------------------------
    if (!selectedAllMatchesRow) {
        showPopup('Bitte zuerst ein Ergebnis aus der Tabelle zum Löschen auswählen.', 'error');
        return;
    }

    const player1IdToDelete = selectedAllMatchesRow.dataset.player1Id;
    const player2IdToDelete = selectedAllMatchesRow.dataset.player2Id;
    const matchLabelToDelete = selectedAllMatchesRow.querySelector('td:first-child').textContent;

    const confirmationMessage = `Möchten Sie das Ergebnis für das Match "${matchLabelToDelete}" wirklich löschen?`;

    showConfirmationPopup(confirmationMessage, async () => {
        let popupSpinner = document.getElementById('popup-spinner');
        if (!popupSpinner) {
            popupSpinner = document.createElement('div');
            popupSpinner.id = 'popup-spinner';
            popupSpinner.classList.add('_spinner');
            appPopup.insertBefore(popupSpinner, popupMessage);
        }
        popupSpinner.style.display = 'block';
        popupCloseButton.style.display = 'none';
        showPopup('Lösche Ergebnis...', 'info');

        try {
            const res = await apiCall('deleteErgebnis', { 
                spieler1Id: player1IdToDelete, 
                spieler2Id: player2IdToDelete 
            });

            console.log("Backend deletion successful:", res); 
            popupSpinner.style.display = 'none';
            
            // Checkmark Animation
            let checkmark = document.createElement('div');
            checkmark.classList.add('checkmark');
            let existingCheckmark = appPopup.querySelector('.checkmark');
            if (existingCheckmark) existingCheckmark.remove();
            appPopup.insertBefore(checkmark, popupMessage);

            showPopup(res.message, res.type);
            popupCloseButton.style.display = 'block';

            // Lokale Daten aktualisieren
            const s1IdIndex = allErgebnisseHeaders.indexOf('Spieler1_ID');
            const s2IdIndex = allErgebnisseHeaders.indexOf('Spieler2_ID');

            allErgebnisseDataRaw = allErgebnisseDataRaw.filter(row => {
                const rowS1 = String(row[s1IdIndex]).trim();
                const rowS2 = String(row[s2IdIndex]).trim();
                return !((rowS1 === player1IdToDelete && rowS2 === player2IdToDelete) ||
                         (rowS1 === player2IdToDelete && rowS2 === player1IdToDelete));
            });

            selectedAllMatchesRow = null;
            displayAlleErgebnisse(allErgebnisseDataRaw, allErgebnisseHeaders);
            
            if (typeof calculateAndSavePlayerStats === 'function') {
                calculateAndSavePlayerStats();
            }

            setTimeout(() => { if (checkmark.parentNode) checkmark.parentNode.removeChild(checkmark); }, 2000);

        } catch (err) {
            console.error("Deletion failed:", err); 
            popupSpinner.style.display = 'none';
            showPopup('Fehler beim Löschen: ' + (err.message || err), 'error');
            popupCloseButton.style.display = 'block';
        }
    });
}

//---------------------------------------
document.addEventListener('DOMContentLoaded', function() {
//---------------------------------------
// Event Listener für DELETE ALL MATCHES BUTTON
    const deleteSelectedMatchButton = document.getElementById('delete-selected-match-button'); // ID angepasst
    if (deleteSelectedMatchButton) {
        deleteSelectedMatchButton.addEventListener('click', function() {
            console.log("Delete Selected Match Button clicked!"); // Debug-Log
            deleteMatchResult(); 
        });
    }
});



// ******* Spieler Übersicht Logik ****

//---------------------------------------
function displaySpielerUebersicht(data, headers) {
//---------------------------------------
    const spielerListeContent = document.getElementById('spieler-liste-content');
    if (!spielerListeContent) {
        console.error("Element 'spieler-liste-content' nicht gefunden.");
        return;
    }

    spielerListeContent.innerHTML = ''; // Vorherigen Inhalt leeren

    if (!data || data.length === 0) {
        spielerListeContent.innerHTML = '<p>Keine Spielerdaten gefunden.</p>';
        return;
    }

    const table = document.createElement('table');
    table.classList.add('spieler-uebersicht-table'); // Eigene Klasse für diese Tabelle
    table.classList.add('sortable-table'); // Macht die Tabelle sortierbar
    
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    let headerRow = document.createElement('tr');
    // Hier definieren wir die Spalten, die wir anzeigen wollen und ihre Reihenfolge
    const displayHeaders = ['Name', 'Telefon', 'Spiele', 'Pkt'];
    
    // Indexe der benötigten Spalten in den Rohdaten (allSpielerHeaders)
    const colIndexes = {
        'ID': headers.indexOf('ID'),
        'Name': headers.indexOf('Name'),
        'Telefon': headers.indexOf('Telefon'),
        'Spiele': headers.indexOf('Spiele'),
        'Punkte': headers.indexOf('Punkte') // Backend-Header ist 'Punkte'
    };

    // Überprüfe, ob alle benötigten Spalten vorhanden sind
    if (colIndexes.ID === -1 || colIndexes.Name === -1 || colIndexes.Telefon === -1 || colIndexes.Spiele === -1 || colIndexes.Punkte === -1) {
        spielerListeContent.innerHTML = '<p>Fehler: Eine oder mehrere erforderliche Spalten (ID, Name, Telefon, Spiele, Punkte) wurden nicht in den Spielerdaten gefunden.</p>';
        console.error("Fehler bei der Anzeige der Spielerübersicht: Spalten nicht gefunden in Headern.", headers);
        return;
    }

    displayHeaders.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.dataset.column = headerText; // Speichere den Spaltennamen im data-Attribut

        // Füge Sortierpfeil hinzu und Event-Listener
        if (currentSpielerSortColumn === headerText) {
            th.classList.add('sort-active');
            th.innerHTML += ` <span class="sort-arrow">${currentSpielerSortDirection === 'asc' ? '&#9650;' : '&#9660;'}</span>`;
        }

        th.addEventListener('click', function() {
            const column = this.dataset.column;
            if (currentSpielerSortColumn === column) {
                // Bei erneutem Klick auf dieselbe Spalte, Sortierrichtung umkehren
                currentSpielerSortDirection = (currentSpielerSortDirection === 'asc' ? 'desc' : 'asc');
            } else {
                // Bei Klick auf neue Spalte, Standardrichtung setzen
                currentSpielerSortColumn = column;
                // Standard für 'Name' ist aufsteigend, für 'Spiele' und 'Pkt' absteigend
                currentSpielerSortDirection = (column === 'Name' ? 'asc' : 'desc');
            }
            // Tabelle neu laden mit der neuen Sortierung
            displaySpielerUebersicht(allSpielerDataRaw, allSpielerHeaders);
        });
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody);

    // Sortiere die Spielerdaten basierend auf currentSpielerSortColumn und currentSpielerSortDirection
    data.sort((a, b) => {
        let valA, valB;

        switch (currentSpielerSortColumn) {
            case 'Name':
                valA = String(a[colIndexes.Name]);
                valB = String(b[colIndexes.Name]);
                return currentSpielerSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            case 'Spiele':
                valA = parseInt(a[colIndexes.Spiele]) || 0;
                valB = parseInt(b[colIndexes.Spiele]) || 0;
                break;
            case 'Pkt': // Sortierung für "Siege:Niederlagen"
                const parsePoints = (pointsStr) => {
                    const parts = String(pointsStr).split(':');
                    const wins = parseInt(parts[0]) || 0;
                    const losses = parseInt(parts[1]) || 0;
                    return { wins, losses };
                };
                const pointsA = parsePoints(a[colIndexes.Punkte]);
                const pointsB = parsePoints(b[colIndexes.Punkte]);

                // Primär nach Siegen sortieren (absteigend)
                if (pointsA.wins !== pointsB.wins) {
                    return currentSpielerSortDirection === 'asc' ? pointsA.wins - pointsB.wins : pointsB.wins - pointsA.wins;
                }
                // Sekundär nach Niederlagen sortieren (aufsteigend, weniger Niederlagen ist besser)
                return currentSpielerSortDirection === 'asc' ? pointsA.losses - pointsB.losses : pointsB.losses - pointsA.losses;
            default:
                return 0; // Keine Sortierung, wenn Spalte unbekannt
        }

        // Standard numerische Sortierung für 'Spiele'
        let comparison = 0;
        if (valA > valB) comparison = 1;
        else if (valA < valB) comparison = -1;
        
        return currentSpielerSortDirection === 'asc' ? comparison : -comparison;
    });

    data.forEach(row => {
        const rowElement = document.createElement('tr');
        // Sicherstellen, dass die Daten in der richtigen Reihenfolge und als String ausgegeben werden
        rowElement.innerHTML = `
            <td>${String(row[colIndexes.Name] || '')}</td>
            <td>${String(row[colIndexes.Telefon] || '')}</td>
            <td>${String(row[colIndexes.Spiele] || '')}</td>
            <td>${String(row[colIndexes.Punkte] || '')}</td>
        `;
        tbody.appendChild(rowElement);
    });
    spielerListeContent.appendChild(table);
}


//---------------------------------------
function xxxdisplayAlleErgebnisse(data, headers) {
//---------------------------------------
    const tableContainer = document.getElementById('all-matches-table-container');
    if (!tableContainer) {
        console.error("Element 'all-matches-table-container' nicht gefunden.");
        return;
    }

    tableContainer.innerHTML = ''; // Vorherigen Inhalt leeren

    if (!data || data.length === 0) {
        tableContainer.innerHTML = '<p>Keine Ergebnisse gefunden.</p>';
        return;
    }

    const table = document.createElement('table');
    table.classList.add('match-results-table'); // Dieselbe Klasse wie die andere Match-Tabelle
    table.classList.add('sortable-table'); // NEU: Sortierbare Tabelle
    
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    let headerRow = document.createElement('tr');
    // Hier definieren wir die Spalten, die wir anzeigen wollen und ihre Reihenfolge
    const displayHeaders = ['Match', 'Ergebnis', 'Pkt', 'Datum']; // GEÄNDERT: 'Punkte' zu 'Pkt'
    
    // Indexe der benötigten Daten-Spalten im Rohdaten-Array
    const colIndexes = {
        'Match': null, // Wird dynamisch durch Namen ermittelt
        'Ergebnis': headers.indexOf('Ergebnis'),
        'Punkte': headers.indexOf('Punkte'), // Bleibt 'Punkte' für den Index-Lookup
        'Datum': headers.indexOf('Datum'),
        'Spieler1_ID': headers.indexOf('Spieler1_ID'), // Benötigt für getPlayerNameById
        'Spieler2_ID': headers.indexOf('Spieler2_ID')  // Benötigt für getPlayerNameById
    };

    // Überprüfe, ob alle benötigten Spalten vorhanden sind
    if (colIndexes.Ergebnis === -1 || colIndexes.Punkte === -1 || colIndexes.Datum === -1 || colIndexes.Spieler1_ID === -1 || colIndexes.Spieler2_ID === -1) {
        tableContainer.innerHTML = '<p>Fehler: Eine oder mehrere erforderliche Spalten (Spieler1_ID, Spieler2_ID, Ergebnis, Punkte, Datum) wurden nicht in den Ergebnisdaten gefunden.</p>';
        console.error("Fehler bei der Anzeige der Ergebnisse: Spalten nicht gefunden in Headern.", headers);
        return;
    }

    displayHeaders.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.dataset.column = headerText; // Speichere den Spaltennamen im data-Attribut

        // Füge Sortierpfeil hinzu
        if (currentSortColumn === headerText) {
            th.classList.add('sort-active');
            th.innerHTML += ` <span class="sort-arrow">${currentSortDirection === 'asc' ? '&#9650;' : '&#9660;'}</span>`;
        }

        th.addEventListener('click', function() {
            const column = this.dataset.column;
            if (currentSortColumn === column) {
                // Bei erneutem Klick auf dieselbe Spalte, Sortierrichtung umkehren
                currentSortDirection = (currentSortDirection === 'asc' ? 'desc' : 'asc');
            } else {
                // Bei Klick auf neue Spalte, Standardrichtung (asc) setzen
                currentSortColumn = column;
                currentSortDirection = 'asc';
            }
            // Tabelle neu laden mit der neuen Sortierung
            displayAlleErgebnisse(allErgebnisseDataRaw, allErgebnisseHeaders);
        });
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody);

    // Sortiere die Ergebnisse basierend auf currentSortColumn und currentSortDirection
    data.sort((a, b) => {
        let valA, valB;

        switch (currentSortColumn) {
            case 'Datum':
                valA = new Date(String(a[colIndexes.Datum]));
                valB = new Date(String(b[colIndexes.Datum]));
                break;
            case 'Match':
                const nameA1 = getPlayerNameById(a[colIndexes.Spieler1_ID]);
                const nameA2 = getPlayerNameById(a[colIndexes.Spieler2_ID]);
                const nameB1 = getPlayerNameById(b[colIndexes.Spieler1_ID]);
                const nameB2 = getPlayerNameById(b[colIndexes.Spieler2_ID]);
                valA = `${nameA1} - ${nameA2}`;
                valB = `${nameB1} - ${nameB2}`;
                break;
            case 'Ergebnis':
                valA = String(a[colIndexes.Ergebnis]);
                valB = String(b[colIndexes.Ergebnis]);
                break;
            case 'Pkt': // GEÄNDERT: 'Punkte' zu 'Pkt' hier für den Case
                valA = String(a[colIndexes.Punkte]); // Index bleibt 'Punkte'
                valB = String(b[colIndexes.Punkte]); // Index bleibt 'Punkte'
                break;
            default:
                // Falls unbekannte Spalte, keine Sortierung ändern
                return 0;
        }

        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB); // Für Strings (Match, Ergebnis, Pkt)
        } else if (valA instanceof Date && valB instanceof Date) {
            comparison = valA.getTime() - valB.getTime(); // Für Daten
        } else {
            // Fallback für andere Typen oder wenn Typen gemischt sind
            if (valA > valB) comparison = 1;
            else if (valA < valB) comparison = -1;
        }
        
        return currentSortDirection === 'asc' ? comparison : -comparison;
    });

    data.forEach(rowData => {
        const row = document.createElement('tr');
        
        // Speichere die originalen Spieler-IDs in data-attributen der Zeile
        row.dataset.player1Id = rowData[colIndexes.Spieler1_ID];
        row.dataset.player2Id = rowData[colIndexes.Spieler2_ID];

        // Match (Spieler1 Name - Spieler2 Name) - Hier aus den gespeicherten Rohdaten, keine Transformation
        const spieler1Name = getPlayerNameById(rowData[colIndexes.Spieler1_ID]);
        const spieler2Name = getPlayerNameById(rowData[colIndexes.Spieler2_ID]);
        const matchLabel = `${spieler1Name} - ${spieler2Name}`;
        
        // Daten für die Zellen
        const ergebnis = rowData[colIndexes.Ergebnis] || '';
        const punkte = rowData[colIndexes.Punkte] || '';
        let datum = rowData[colIndexes.Datum] || '';

        // Datum formatieren, falls es als vollständiges Datumsobjekt kommt
        if (datum instanceof Date) {
            datum = datum.toISOString().split('T')[0]; // Format YYYY-MM-DD
        }

        row.innerHTML = `
            <td>${matchLabel}</td>
            <td>${ergebnis}</td>
            <td>${punkte}</td>
            <td>${datum}</td>
        `;

        // Füge Event Listener für Klick auf die Zeile hinzu
        row.addEventListener('click', function() {
            console.log("Row clicked in 'Alle Ergebnisse':", this); 
            console.log("data-player1-id:", this.dataset.player1Id);
            console.log("data-player2-id:", this.dataset.player2Id);

            // Entferne 'selected' Klasse von allen anderen Zeilen
            document.querySelectorAll('#all-matches-table-container .match-results-table tr.selected').forEach(r => {
                r.classList.remove('selected');
            });
            // Füge 'selected' Klasse zur geklickten Zeile hinzu
            this.classList.add('selected');
            // Speichere die ausgewählte Zeile global
            selectedAllMatchesRow = this;
            console.log("selectedAllMatchesRow after click:", selectedAllMatchesRow); 
        });

        tbody.appendChild(row);
    });

    tableContainer.appendChild(table);
}

//---------------------------------------
async function xxxdeleteMatchResult() {
//---------------------------------------
// Funktion zum Löschen eines Matches (jetzt für "Alle Ergebnisse" Sektion)

    console.log("deleteMatchResult called from 'Alle Ergebnisse' section."); 
    if (!selectedAllMatchesRow) {
        showPopup('Bitte zuerst ein Ergebnis aus der Tabelle zum Löschen auswählen.', 'error');
        console.warn("No row selected for deletion (selectedAllMatchesRow is null)."); 
        return;
    }

    // Hole die originalen Spieler-IDs aus dem data-attribut der ausgewählten Zeile
    const player1IdToDelete = selectedAllMatchesRow.dataset.player1Id;
    const player2IdToDelete = selectedAllMatchesRow.dataset.player2Id;
    const matchLabelToDelete = selectedAllMatchesRow.querySelector('td:first-child').textContent; // Hole den Match-Namen für die Bestätigung

    console.log(`Attempting to delete match: ${matchLabelToDelete} (IDs: ${player1IdToDelete}, ${player2IdToDelete})`); 

    const confirmationMessage = `Möchten Sie das Ergebnis für das Match "${matchLabelToDelete}" wirklich löschen?`;

    // Zeige benutzerdefiniertes Bestätigungs-Pop-up
    showConfirmationPopup(confirmationMessage, async () => {
        console.log("Confirmation 'Yes' clicked. Proceeding with deletion."); 
        let popupSpinner = document.getElementById('popup-spinner');
        if (!popupSpinner) {
            popupSpinner = document.createElement('div');
            popupSpinner.id = 'popup-spinner';
            popupSpinner.classList.add('_spinner');
            appPopup.insertBefore(popupSpinner, popupMessage);
        } else {
            popupSpinner.classList.add('_spinner');
        }
        popupSpinner.style.display = 'block';

        popupCloseButton.style.display = 'none';
        showPopup('Lösche Ergebnis...', 'info');

        try {
            const response = await google.script.run
                .withSuccessHandler(res => {
                    console.log("Backend deletion successful:", res); 
                    popupSpinner.style.display = 'none';
                    let checkmark = document.createElement('div');
                    checkmark.classList.add('checkmark');
                    let existingCheckmark = appPopup.querySelector('.checkmark');
                    if (existingCheckmark) {
                        existingCheckmark.remove();
                    }
                    appPopup.insertBefore(checkmark, popupMessage);

                    showPopup(res.message, res.type);
                    popupCloseButton.style.display = 'block';

                    // Aktualisiere gecachte Daten im Frontend
                    const s1IdIndex = allErgebnisseHeaders.indexOf('Spieler1_ID');
                    const s2IdIndex = allErgebnisseHeaders.indexOf('Spieler2_ID');

                    allErgebnisseDataRaw = allErgebnisseDataRaw.filter(row => {
                        const rowSpieler1Id = String(row[s1IdIndex]).trim();
                        const rowSpieler2Id = String(row[s2IdIndex]).trim();
                        // Prüfe beide Reihenfolgen, da die IDs im Backend nicht sortiert sind
                        return !((rowSpieler1Id === player1IdToDelete && rowSpieler2Id === player2IdToDelete) ||
                                 (rowSpieler1Id === player2IdToDelete && rowSpieler2Id === player1IdToDelete));
                    });

                    // Setze die Auswahl zurück und lade die Tabelle neu
                    selectedAllMatchesRow = null;
                    displayAlleErgebnisse(allErgebnisseDataRaw, allErgebnisseHeaders); // Tabelle neu laden
                    
                    // Spielerstatistiken neu berechnen und speichern, da sich Ergebnisse geändert haben
                    calculateAndSavePlayerStats();

                    setTimeout(() => {
                        if (checkmark.parentNode) {
                            checkmark.parentNode.removeChild(checkmark);
                        }
                    }, 2000);
                })
                .withFailureHandler(err => {
                    console.error("Backend deletion failed:", err); 
                    popupSpinner.style.display = 'none';
                    showPopup('Fehler beim Löschen des Ergebnisses: ' + err.message, 'error');
                    popupCloseButton.style.display = 'block';
                    console.error(err);
                })
                .deleteErgebnis(player1IdToDelete, player2IdToDelete); // Übergabe der IDs an Backend

        } catch (e) {
            console.error("Unexpected error during deletion:", e); 
            popupSpinner.style.display = 'none';
            showPopup('Ein unerwarteter Fehler ist aufgetreten: ' + e.message, 'error');
            popupCloseButton.style.display = 'block';
            console.error(e);
        }
    }); // Ende showConfirmationPopup
}
