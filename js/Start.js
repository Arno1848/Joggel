// "Start.js" - 15.05.2026  ----------

// ***** GLOBALE VARIABLEN *****

let selectedPlayerId = null;
let selectedPlayerName = null;
let currentMatchesData = []; 
let selectedMatch = null; 
 
let allSpielerDataRaw = []; 
let allSpielerHeaders = []; 

let allErgebnisseDataRaw = []; 
let allErgebnisseHeaders = []; 

// Globale Deklaration der Popup-Elemente (werden später im DOMContentLoaded initialisiert)
let appPopup;
let popupMessage;
let popupCloseButton;
let appPopupOverlay;

let confirmationPopup;
let confirmationMessage;
let confirmationButtons;
let confirmYesButton;
let confirmNoButton;
let confirmationOverlay;
let confirmCallback = null; // Speichert die Funktion, die bei "Ja" ausgeführt werden soll

window.onload = loadInitialData;

//let TESTVERSION = false; // Standardwert

//---------------------------------------------------------------------------------------------
function apiCall(action, payload) {
//---------------------------------------------------------------------------------------------
  return new Promise((resolve, reject) => {
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action, payload }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP-Fehler! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data && data.error) {
        reject(new Error(data.error));
      } else {
        resolve(data);
      }
    })
    .catch(error => {
      console.error("API-Anfrage fehlgeschlagen:", error);
      reject(error);
    });
  });
}

// ----------------------------------
function loadInitialData() {
// ----------------------------------
    console.log("loadInitialData aufgerufen. Start fetching via apiCall...");

    setSpinnerState("spinner-spieler", true);

    // Umstellung von google.script.run auf apiCall
    apiCall('getSpielerDataFull')
        .then(fullData => {
            console.log("Spielerdaten erfolgreich geladen.");
            if (fullData && fullData.length > 0) {
                allSpielerHeaders = fullData[0];
                allSpielerDataRaw = fullData.slice(1);
            } else {
                allSpielerHeaders = ['ID', 'Name', 'Telefon', 'Spiele', 'Punkte'];
                allSpielerDataRaw = [];
            }
            setSpinnerState("spinner-spieler", false);

            // Nächster Schritt: Ergebnisse laden
            loadAllErgebnisseInitial();
        })
        .catch(error => {
            console.error("Fehler beim Laden der Spielerdaten:", error);
            document.getElementById("loading-overlay").classList.add("hidden");
            handleError(error);
        });
}

// ----------------------------------
function loadAllErgebnisseInitial() {
// ----------------------------------
    setSpinnerState("spinner-ergebnisse", true);

    // Umstellung von google.script.run auf apiCall
    apiCall('getAllErgebnisseDataFull')
        .then(fullData => {
            console.log("Ergebnisdaten erfolgreich geladen.");
            if (fullData && fullData.length > 0) {
                allErgebnisseHeaders = fullData[0];
                allErgebnisseDataRaw = fullData.slice(1);
            } else {
                allErgebnisseHeaders = ['Nr', 'Spieler1_ID', 'Spieler2_ID', 'Spieler1', 'Spieler2', 'Punkte', 'Ergebnis', 'Datum'];
                allErgebnisseDataRaw = [];
            }

            setSpinnerState("spinner-ergebnisse", false);
            document.getElementById("loading-overlay").classList.add("hidden");

            // Statistiken berechnen (lokal im Frontend oder via weiterem API Call)
            if (typeof calculateAndSavePlayerStats === 'function') {
                calculateAndSavePlayerStats();
            }

            showSection('ergebnis-eingabe');
        })
        .catch(error => {
            console.error("Fehler beim Laden der Ergebnisdaten:", error);
            setSpinnerState("spinner-ergebnisse", false);
            document.getElementById("loading-overlay").classList.add("hidden");
            handleError(error);
        });
}

//---------------------------------------------------------------------------------------------
function setSpinnerState(id, loading) {
//---------------------------------------------------------------------------------------------
    const el = document.getElementById(id);
    if (!el) return;
    if (loading) {
        el.classList.remove("checkmark");
        el.classList.add("spinner", "small");
        el.innerText = "";
    } else {
        el.classList.remove("spinner", "small");
        el.classList.add("checkmark");
        el.innerText = "✓";
    }
}


// ***** DOMContentLoaded Event Listener (für Elemente, die im HTML vorhanden sind) *****
//---------------------------------------
document.addEventListener('DOMContentLoaded', function() {
//---------------------------------------
    // Initialisiere Popup-Elemente hier, nachdem der DOM geladen ist
    appPopup = document.createElement('div');
    appPopup.id = 'app-popup';
    appPopup.className = 'app-popup hidden';
    popupMessage = document.createElement('p');
    popupMessage.id = 'popup-message';
    popupCloseButton = document.createElement('button');
    popupCloseButton.id = 'popup-close-button';
    popupCloseButton.textContent = 'OK';
    appPopup.appendChild(popupMessage);
    appPopup.appendChild(popupCloseButton);
    document.body.appendChild(appPopup);

    appPopupOverlay = document.createElement('div');
    appPopupOverlay.className = 'app-popup-overlay hidden';
    document.body.appendChild(appPopupOverlay);

    // Initialisiere Confirmation Popup-Elemente hier
    confirmationPopup = document.createElement('div');
    confirmationPopup.id = 'confirmation-popup';
    confirmationPopup.className = 'app-popup hidden'; // Nutzt die gleichen Basis-Stile wie app-popup
    confirmationMessage = document.createElement('p');
    confirmationMessage.id = 'confirmation-message';
    confirmationButtons = document.createElement('div');
    confirmationButtons.className = 'confirmation-buttons';
    confirmYesButton = document.createElement('button');
    confirmYesButton.textContent = 'Ja';
    confirmYesButton.className = 'confirm-yes-button';
    confirmNoButton = document.createElement('button');
    confirmNoButton.textContent = 'Nein';
    confirmNoButton.className = 'confirm-no-button';

    confirmationButtons.appendChild(confirmYesButton);
    confirmationButtons.appendChild(confirmNoButton);
    confirmationPopup.appendChild(confirmationMessage);
    confirmationPopup.appendChild(confirmationButtons);
    document.body.appendChild(confirmationPopup);

    confirmationOverlay = document.createElement('div');
    confirmationOverlay.className = 'app-popup-overlay hidden';
    document.body.appendChild(confirmationOverlay);

    // Event Listener für NAVIGATIONSLINKS
    document.querySelectorAll('.main-nav a').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const sectionId = this.dataset.section;
            showSection(sectionId);
        });
    });

    // Event Listener für SPIELER SELECT
    const spielerSelect = document.getElementById('spieler-select');
    if (spielerSelect) { // Nur spielerSelect prüfen
        spielerSelect.addEventListener('change', function() {
            selectedPlayerId = this.value; // 'this' bezieht sich auf das select-Element
            selectedPlayerName = this.options[this.selectedIndex].textContent;

            if (selectedPlayerId) {
                const matchDisplayDiv = document.getElementById('match-display');
                if (matchDisplayDiv) matchDisplayDiv.classList.remove('hidden');
                loadPlayerMatches(selectedPlayerId);
            } else {
                // Wenn "--- Spieler wählen ---" ausgewählt ist, die Match-Ansicht ausblenden
                document.getElementById('match-display').classList.add('hidden');
                document.getElementById('match-entry-form').classList.add('hidden'); // Formular auch verstecken
                showPopup('Bitte wählen Sie einen Spieler aus.', 'error');

            }
        });
    }

    // Event Listener für SAVE RESULT BUTTON (bleibt hier, wird später gefüllt)
    const saveResultButton = document.getElementById('save-single-match-button');
    if (saveResultButton) {
        saveResultButton.addEventListener('click', function() {
            // saveMatchResult() wird in script-sections.html definiert
            // Hier nur ein Platzhalter, falls saveMatchResult noch nicht geladen ist
            if (typeof saveMatchResult === 'function') {
                saveMatchResult(); 
            } else {
                console.warn("saveMatchResult ist noch nicht geladen.");
            }
        });
    }

});


//---------------------------------------
function showSection(sectionId) {
//---------------------------------------
// ***** HAUPTFUNKTION FÜR NAVIGATION UND SEKTIONSWECHSEL ---
// Diese Funktion muss in script-start.html bleiben, da sie die Sektionen steuert
    // Alle Sektionen ausblenden
    document.querySelectorAll('.app-section').forEach(section => {
        section.classList.add('hidden');
        section.classList.remove('active');
    });

    // Die gewünschte Sektion anzeigen
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('active');
    } else {
        console.error(`Sektion mit ID "${sectionId}" nicht gefunden.`);
        return;
    }

    // Aktiven Navigationslink markieren
    document.querySelectorAll('.main-nav a').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) {
            link.classList.add('active');
        }
    });

    // Spezifische Daten für jede Sektion laden, wenn sie aktiv wird
    if (sectionId === 'spieler-uebersicht') {
        displaySpielerUebersicht(allSpielerDataRaw, allSpielerHeaders);

    } else if (sectionId === 'ergebnis-eingabe') {
        loadPlayersForSelection();
        populatePlayerSelect(allSpielerDataRaw);

    } else if (sectionId === 'alle-ergebnisse') {
        displayAlleErgebnisse(allErgebnisseDataRaw, allErgebnisseHeaders);
    }
}

// ***** POPUP FUNKTIONEN / ERROR-HANDLING (Globale Funktionen) ---
//---------------------------------------
function showPopup(msg, type = 'info') {
//---------------------------------------
    popupMessage.textContent = msg;
    appPopup.className = `app-popup ${type} visible`;
    appPopupOverlay.classList.add('visible');
    // Sicherstellen, dass die Listener nur einmal hinzugefügt werden
    if (!popupCloseButton._hasListener) {
        popupCloseButton.addEventListener('click', hidePopup);
        popupCloseButton._hasListener = true;
    }
    if (!appPopupOverlay._hasListener) {
        appPopupOverlay.addEventListener('click', hidePopup);
        appPopupOverlay._hasListener = true;
    }
}

//---------------------------------------
function hidePopup() {
//---------------------------------------
    appPopup.classList.remove('visible', 'success', 'error', 'info');
    appPopup.classList.add('hidden');
    appPopupOverlay.classList.remove('visible');
    appPopupOverlay.classList.add('hidden');
}

//---------------------------------------
function showConfirmationPopup(msg, callback) {
//---------------------------------------
    confirmationMessage.textContent = msg;
    confirmationPopup.classList.remove('hidden');
    confirmationPopup.classList.add('visible');
    confirmationOverlay.classList.remove('hidden');
    confirmationOverlay.classList.add('visible');
    confirmCallback = callback; // Speichere den Callback

    // Event Listener für die Bestätigungsbuttons (sicherstellen, dass sie nur einmal hinzugefügt werden)
    // WICHTIG: Callback wird VOR dem Verstecken des Popups ausgeführt
    if (!confirmYesButton._hasListener) {
        confirmYesButton.onclick = () => {
            if (confirmCallback) { // Führe den gespeicherten Callback aus
                console.log('**********showConfirmationPopup 4:'); // Log zur Verifizierung
                confirmCallback(); 
            }
            hideConfirmationPopup(); // Popup verstecken und Callback auf null setzen
            console.log('**********showConfirmationPopup 3:'); // Log zur Verifizierung
        };
        confirmYesButton._hasListener = true;
    }
    if (!confirmNoButton._hasListener) {
        confirmNoButton.onclick = () => {
            hideConfirmationPopup();
        };
        confirmNoButton._hasListener = true;
    }
    if (!confirmationOverlay._hasListener) {
        confirmationOverlay.onclick = () => { // Overlay-Klick schließt auch
            hideConfirmationPopup();
        };
        confirmationOverlay._hasListener = true;
    }
}

//---------------------------------------
function hideConfirmationPopup() {
//---------------------------------------
    confirmationPopup.classList.remove('visible');
    confirmationPopup.classList.add('hidden');
    confirmationOverlay.classList.remove('visible');
    confirmationOverlay.classList.add('hidden');
    confirmCallback = null; // Callback zurücksetzen
}

//---------------------------------------
function handleError(error) {
//---------------------------------------
    showPopup('Fehler: ' + error.message, 'error');
    console.error('Apps Script Error:', error);
}
