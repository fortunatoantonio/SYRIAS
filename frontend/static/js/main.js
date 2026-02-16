let currentFileId = null;
let currentModelId = null;
let fileData = null;
let splitApplied = false;
let totalObservations = null;
let currentUser = null;
let isAuthenticated = false;

// SISTEMA NOTIFICHE TOAST
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        // Fallback a alert se il container non esiste
        alert(message);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icone SVG professionali per tipo
    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" fill="currentColor"/></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" fill="currentColor"/></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" fill="currentColor"/></svg>'
    };
    
    const icon = icons[type] || icons.info;
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-content">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Chiudi notifica">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Rimuovi automaticamente dopo la durata specificata
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }
    
    return toast;
}

// FUNZIONI AUTENTICAZIONE

function showRegisterForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authStatus = document.getElementById('auth-status');
    
    // Animazione fade out del login
    loginForm.style.opacity = '0';
    loginForm.style.transform = 'translateX(-20px)';
    
    setTimeout(() => {
        loginForm.style.display = 'none';
        authStatus.innerHTML = '';
        
        // Animazione fade in della registrazione
        registerForm.style.display = 'block';
        registerForm.style.opacity = '0';
        registerForm.style.transform = 'translateX(20px)';
        
        // Trigger reflow per forzare l'animazione
        registerForm.offsetHeight;
        
        setTimeout(() => {
            registerForm.style.opacity = '1';
            registerForm.style.transform = 'translateX(0)';
        }, 10);
    }, 300);
}
function showLoginForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const registerStatus = document.getElementById('register-status');
    
    // Animazione fade out della registrazione
    registerForm.style.opacity = '0';
    registerForm.style.transform = 'translateX(20px)';
    
    setTimeout(() => {
        registerForm.style.display = 'none';
        registerStatus.innerHTML = '';
        
        // Animazione fade in del login
        loginForm.style.display = 'block';
        loginForm.style.opacity = '0';
        loginForm.style.transform = 'translateX(-20px)';
        
        // Trigger reflow per forzare l'animazione
        loginForm.offsetHeight;
        
        setTimeout(() => {
            loginForm.style.opacity = '1';
            loginForm.style.transform = 'translateX(0)';
        }, 10);
    }, 300);
}
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/user/current', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const user = await response.json();
            isAuthenticated = true;
            currentUser = user;
            showDashboard();
            
            // NON caricare automaticamente l'ultimo file al ricaricamento della pagina
            // L'utente deve caricare un file per vedere le sezioni dalla 2 in poi
            // Carica solo lo storico modelli (sezione 10)
            await loadModelRuns();
        } else {
            isAuthenticated = false;
            currentUser = null;
            showLoginOnly();
        }
    } catch (error) {
        console.error('Errore verifica stato login:', error);
        isAuthenticated = false;
        currentUser = null;
        showLoginOnly();
    }
}

// Funzione per pulire i campi del form di autenticazione
function clearAuthForms() {
    // Pulisci form login
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';
    
    // Pulisci form registrazione
    const registerName = document.getElementById('register-name');
    const registerSurname = document.getElementById('register-surname');
    const registerEmail = document.getElementById('register-email');
    const registerPassword = document.getElementById('register-password');
    if (registerName) registerName.value = '';
    if (registerSurname) registerSurname.value = '';
    if (registerEmail) registerEmail.value = '';
    if (registerPassword) registerPassword.value = '';
    
    // Pulisci i messaggi di stato
    const authStatus = document.getElementById('auth-status');
    const registerStatus = document.getElementById('register-status');
    if (authStatus) {
        authStatus.innerHTML = '';
        authStatus.style.display = 'none';
    }
    if (registerStatus) {
        registerStatus.innerHTML = '';
        registerStatus.style.display = 'none';
    }
}
function showLoginOnly() {
    // Aggiungi classe per sfondo trading
    document.body.classList.add('auth-page');
    
    // Reset scroll position
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Reset delle dimensioni del body
    document.body.style.width = '';
    document.body.style.maxWidth = '';
    document.body.style.overflow = '';
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'auto';
    
    // Nascondi l'header (importante per smartphone)
    const headerEl = document.querySelector('.header');
    if (headerEl) {
        headerEl.style.display = 'none';
        headerEl.style.visibility = 'hidden';
        // Reset delle dimensioni dell'header
        headerEl.style.width = '';
        headerEl.style.maxWidth = '';
        headerEl.style.height = '';
    }
    
    // Reset delle dimensioni del container
    const containerEl = document.querySelector('.container');
    if (containerEl) {
        containerEl.style.width = '';
        containerEl.style.maxWidth = '';
        containerEl.style.padding = '';
    }
    
    // Pulisci i campi del form per privacy
    clearAuthForms();
    
    // NASCONDI TUTTE LE SEZIONI - inizializza completamente la schermata
    const allSections = [
        'upload-section',
        'data-visualization-section',
        'smoothing-section',
        'log-transform-section',
        'differencing-section',
        'split-section',
        'sarimax-section',
        'results-section',
        'charts-section',
        'model-runs-section' // Anche lo storico modelli deve essere nascosto
    ];
    
    allSections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    });
    
    // Mostra solo la sezione di autenticazione
    document.getElementById('auth-section').style.display = 'block';
    const userHeaderEl = document.getElementById('user-header');
    if (userHeaderEl) {
        userHeaderEl.style.display = 'none';
    }
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    
    // Reset tutte le variabili globali
    currentFileId = null;
    currentModelId = null;
    fileData = null;
    splitApplied = false;
    totalObservations = null;
    currentUser = null;
    isAuthenticated = false;
    
    // Pulisci tutti i grafici e i risultati
    clearPreviousResults(true);
    
    // Disabilita l'interattività del titolo quando non si è loggati
    const titleEl = document.getElementById('dashboard-title');
    if (titleEl) {
        titleEl.style.cursor = 'default';
        titleEl.onclick = null;
        titleEl.removeAttribute('onclick');
    }
    
    // Nascondi anche le sezioni senza ID specifico (come "Upload File")
    const allCardSections = document.querySelectorAll('.card');
    allCardSections.forEach(section => {
        if (section.id !== 'auth-section') {
            section.style.display = 'none';
        }
    });
}

// RESET OPZIONI
function resetAllOptions() {
    // Reset smoothing
    const smoothingSelect = document.getElementById('smoothing-window');
    if (smoothingSelect) {
        smoothingSelect.value = 1; // Nessuno (serie originale)
    }
    
    // Reset log transform
    const logCheckbox = document.getElementById('apply-log-checkbox');
    if (logCheckbox) {
        logCheckbox.checked = false;
    }
    
    // Reset differencing
    const diffSelect = document.getElementById('differencing-order');
    if (diffSelect) {
        diffSelect.value = 0; // Nessuna (0)
    }
    
    // Reset train obs
    const trainObsInput = document.getElementById('train-obs');
    if (trainObsInput) {
        trainObsInput.value = '';
    }
    const trainObsDisplay = document.getElementById('train-obs-display');
    if (trainObsDisplay) {
        trainObsDisplay.textContent = '';
    }
    
    // Reset parametri SARIMAX
    const pInput = document.getElementById('sarimax-p');
    const dInput = document.getElementById('sarimax-d');
    const qInput = document.getElementById('sarimax-q');
    const PInput = document.getElementById('sarimax-P');
    const DInput = document.getElementById('sarimax-D');
    const QInput = document.getElementById('sarimax-Q');
    const mInput = document.getElementById('sarimax-m');
    const trendSelect = document.getElementById('sarimax-trend');
    const enforceStationarityCheck = document.getElementById('sarimax-enforce-stationarity');
    const enforceInvertibilityCheck = document.getElementById('sarimax-enforce-invertibility');
    const covTypeSelect = document.getElementById('sarimax-cov-type');
    
    if (pInput) pInput.value = 1;
    if (dInput) dInput.value = 1;
    if (qInput) qInput.value = 1;
    if (PInput) PInput.value = 0;
    if (DInput) DInput.value = 0;
    if (QInput) QInput.value = 0;
    if (mInput) mInput.value = 0;
    if (trendSelect) trendSelect.value = 'n';
    if (enforceStationarityCheck) enforceStationarityCheck.checked = true;
    if (enforceInvertibilityCheck) enforceInvertibilityCheck.checked = true;
    if (covTypeSelect) covTypeSelect.value = 'robust_approx';
}
function showDashboard() {
    // Rimuovi classe per sfondo trading - IMPORTANTE: deve essere rimosso PRIMA di mostrare l'header
    document.body.classList.remove('auth-page');
    
    // Reset delle dimensioni del body per evitare problemi su smartphone
    document.body.style.width = '';
    document.body.style.maxWidth = '';
    document.body.style.overflow = '';
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'auto';
    
    // Reset scroll position - IMPORTANTE per smartphone
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Forza un reflow per assicurare che la rimozione della classe abbia effetto
    document.body.offsetHeight;
    
    // Mostra l'header (importante per smartphone) - forza la visibilità
    const headerEl = document.querySelector('.header');
    if (headerEl) {
        // Rimuovi eventuali classi che potrebbero nascondere l'header
        headerEl.classList.remove('hidden');
        // Forza la visibilità con stili inline importanti
        headerEl.style.setProperty('display', 'block', 'important');
        headerEl.style.setProperty('visibility', 'visible', 'important');
        headerEl.style.setProperty('opacity', '1', 'important');
        // Reset delle dimensioni dell'header
        headerEl.style.width = '';
        headerEl.style.maxWidth = '';
        headerEl.style.height = '';
        // Forza il rendering
        headerEl.offsetHeight; // Trigger reflow
        
        // Doppio check dopo un breve delay per assicurarsi che sia visibile
        setTimeout(() => {
            if (headerEl) {
                headerEl.style.setProperty('display', 'block', 'important');
                headerEl.style.setProperty('visibility', 'visible', 'important');
            }
        }, 50);
    }
    
    // Reset delle dimensioni del container
    const containerEl = document.querySelector('.container');
    if (containerEl) {
        containerEl.style.width = '';
        containerEl.style.maxWidth = '';
        containerEl.style.padding = '';
    }
    
    // Mostra info utente nell'header e nascondi form login/registrazione
    document.getElementById('auth-section').style.display = 'none';
    const userHeaderEl = document.getElementById('user-header');
    if (userHeaderEl) {
        userHeaderEl.style.display = 'flex';
    }
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    
    // Abilita l'interattività del titolo quando si è loggati
    const titleEl = document.getElementById('dashboard-title');
    if (titleEl) {
        titleEl.style.cursor = 'pointer';
        titleEl.onclick = goToDashboard;
        titleEl.title = 'Torna alla Dash';
    }
    
    if (currentUser) {
        document.getElementById('user-name-header').textContent = `${currentUser.name} ${currentUser.surname}`;
    }
    
    // Reset tutte le opzioni
    resetAllOptions();
    
    // Mostra SOLO la sezione upload (sezione 1) inizialmente
    document.getElementById('upload-section').style.display = 'block';
    
    // Nascondi TUTTE le sezioni dalla 2 in poi (dalla visualizzazione in poi)
    // NOTA: model-runs-section NON viene nascosta qui perché viene mostrata automaticamente
    // quando si carica lo storico modelli
    const sectionsToHide = [
        'data-visualization-section',      // Sezione 2
        'smoothing-section',               // Sezione 3
        'log-transform-section',           // Sezione 4
        'differencing-section',            // Sezione 5
        'split-section',                   // Sezione 6
        'sarimax-section',                 // Sezione 7
        'results-section',                 // Sezione 8
        'charts-section'                   // Sezione 9
        // model-runs-section viene gestita separatamente in loadModelRuns()
    ];
    
    sectionsToHide.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    });
    
    // Reset delle variabili globali per assicurarsi che tutto sia pulito
    currentFileId = null;
    currentModelId = null;
    totalObservations = null;
    splitApplied = false;
    clearPreviousResults(true);
}
async function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const statusEl = document.getElementById('auth-status');
    
    if (!email || !password) {
        statusEl.style.display = 'none';
        showToast('Email e password sono obbligatori', 'warning');
        return;
    }
    
    try {
        // Nascondi il messaggio durante il caricamento
        statusEl.style.display = 'none';
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Non mostrare messaggio di successo - passa direttamente alla dashboard
            statusEl.style.display = 'none';
            isAuthenticated = true;
            currentUser = result.user;
            showDashboard();
            
            // Carica solo lo storico modelli (sezione 10) dopo il login
            await loadModelRuns();
        } else {
            statusEl.style.display = 'none';
            // Determina il tipo di errore per mostrare la notifica appropriata
            const errorMessage = result.error || 'Errore durante il login';
            if (errorMessage.includes('Password errata')) {
                showToast('Password errata', 'error');
            } else if (errorMessage.includes('Email non trovata')) {
                showToast('Email non trovata', 'error');
            } else {
                showToast(errorMessage, 'error');
            }
        }
    } catch (error) {
        console.error('Errore login:', error);
        statusEl.style.display = 'none';
        showToast('Errore di connessione al server', 'error');
    }
}
async function register() {
    const name = document.getElementById('register-name').value.trim();
    const surname = document.getElementById('register-surname').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const statusEl = document.getElementById('register-status');
    
    if (!name || !surname || !email || !password) {
        statusEl.className = 'status-message status-error';
        statusEl.style.display = 'block';
        statusEl.innerHTML = '❌ Tutti i campi sono obbligatori';
        return;
    }
    
    if (password.length < 6) {
        statusEl.className = 'status-message status-error';
        statusEl.style.display = 'block';
        statusEl.innerHTML = '❌ La password deve essere di almeno 6 caratteri';
        return;
    }
    
    try {
        statusEl.className = 'status-message status-info';
        statusEl.style.display = 'block';
        statusEl.innerHTML = '🔄 Registrazione in corso...';
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, surname, email, password }),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            statusEl.className = 'status-message status-success';
            statusEl.innerHTML = `✅ Registrazione e login effettuati! Benvenuto ${result.user.name}!`;
            isAuthenticated = true;
            currentUser = result.user;
            showDashboard();
            
            // Carica solo lo storico modelli (sezione 10) dopo la registrazione
            await loadModelRuns();
        } else {
            statusEl.className = 'status-message status-error';
            statusEl.innerHTML = `❌ ${result.error || 'Errore durante la registrazione'}`;
        }
    } catch (error) {
        console.error('Errore registrazione:', error);
        statusEl.className = 'status-message status-error';
        statusEl.innerHTML = `❌ Errore: ${error.message}`;
    }
}
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            isAuthenticated = false;
            currentUser = null;
            currentFileId = null;
            currentModelId = null;
            fileData = null;
            splitApplied = false;
            totalObservations = null;
            
            // Pulisci i campi del form per privacy
            clearAuthForms();
            
            showLoginOnly();
            showToast('Sessione terminata correttamente', 'success');
        } else {
            const error = await response.json();
            showToast(`Errore logout: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Errore logout:', error);
        showToast(`Errore logout: ${error.message}`, 'error');
    }
}

// AREA PERSONALE / PROFILO
function showProfile() {
    if (!isAuthenticated || !currentUser) {
        showToast('Devi prima effettuare il login!', 'warning');
        return;
    }
    
    // Carica i dati utente nei campi
    document.getElementById('profile-name').value = currentUser.name || '';
    document.getElementById('profile-surname').value = currentUser.surname || '';
    document.getElementById('profile-email').value = currentUser.email || '';
    
    // Pulisci i campi password
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    
    // Pulisci i messaggi di stato
    const profileStatus = document.getElementById('profile-status');
    const passwordStatus = document.getElementById('password-status');
    profileStatus.style.display = 'none';
    passwordStatus.style.display = 'none';
    
    // Nascondi tutte le sezioni della dashboard principale e dei risultati del modello
    const dashboardSections = [
        'upload-section',
        'data-visualization-section',
        'smoothing-section',
        'log-transform-section',
        'differencing-section',
        'split-section',
        'sarimax-section',
        'results-section', // Sezione principale risultati modello (contiene model-info, model-output-section, model-summary-section, metrics-display)
        'model-results-section',
        'forecast-section',
        'selection-score-section',
        'performance-metrics-section',
        'model-output-section', // Div interno (già dentro results-section ma meglio essere sicuri)
        'model-summary-section', // Div interno (già dentro results-section ma meglio essere sicuri)
        'charts-section',
        'paper-section',
        'ai-analysis-section',
        'model-runs-section'
    ];
    
    // Nascondi tutte le sezioni
    dashboardSections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    });
    
    // Nascondi anche i div interni che potrebbero essere visibili
    const internalDivs = [
        'model-info',
        'metrics-display',
        'coefficients-table',
        'model-summary-text'
    ];
    
    internalDivs.forEach(divId => {
        const div = document.getElementById(divId);
        if (div) {
            div.style.display = 'none';
        }
    });
    
    // Mostra la sezione profilo
    document.getElementById('profile-section').style.display = 'block';
    
    // Assicurati che le sezioni dei risultati rimangano nascoste anche se vengono mostrate dinamicamente
    // Usa un observer per monitorare eventuali cambiamenti
    setTimeout(() => {
        const resultsSection = document.getElementById('results-section');
        const chartsSection = document.getElementById('charts-section');
        if (resultsSection && resultsSection.style.display !== 'none') {
            resultsSection.style.display = 'none';
        }
        if (chartsSection && chartsSection.style.display !== 'none') {
            chartsSection.style.display = 'none';
        }
    }, 100);
    
    // Scroll alla sezione profilo
    document.getElementById('profile-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function hideProfile() {
    document.getElementById('profile-section').style.display = 'none';
    goToDashboard();
}
async function goToDashboard() {
    // Nascondi la sezione profilo
    document.getElementById('profile-section').style.display = 'none';
    
    // Mostra sempre la sezione upload
    document.getElementById('upload-section').style.display = 'block';
    
    // Se c'è un file caricato, ricarica tutte le sezioni normalmente visibili
    if (currentFileId) {
        // Ricarica la visualizzazione dei dati (mostra tutte le sezioni appropriate)
        await loadDataVisualization();
        
        // Verifica se lo split è stato applicato per mostrare la sezione SARIMAX
        try {
            const fileResponse = await fetch(`/api/file/${currentFileId}`, {
                credentials: 'include'
            });
            if (fileResponse.ok) {
                const fileData = await fileResponse.json();
                // Se lo split è applicato (train_split_ratio presente), mostra la sezione SARIMAX
                if (fileData.train_split_ratio && fileData.train_split_ratio > 0) {
                    document.getElementById('sarimax-section').style.display = 'block';
                    const runBtn = document.getElementById('run-sarimax-btn');
                    if (runBtn) {
                        runBtn.disabled = false;
                    }
                    splitApplied = true;
                }
            }
        } catch (error) {
            console.warn('Errore verifica stato file:', error);
        }
    }
    
    // Mostra sempre lo storico modelli (sezione 10)
    await loadModelRuns();
    
    // Scroll alla sezione upload
    document.getElementById('upload-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function updateProfile() {
    if (!isAuthenticated) {
        showToast('Devi prima effettuare il login!', 'warning');
        return;
    }
    
    const name = document.getElementById('profile-name').value.trim();
    const surname = document.getElementById('profile-surname').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    const statusEl = document.getElementById('profile-status');
    
    if (!name || !surname || !email) {
        statusEl.className = 'status-message status-error';
        statusEl.style.display = 'block';
        statusEl.innerHTML = '❌ Tutti i campi sono obbligatori';
        return;
    }
    
    try {
        statusEl.className = 'status-message status-info';
        statusEl.style.display = 'block';
        statusEl.innerHTML = '🔄 Aggiornamento profilo in corso...';
        
        const response = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, surname, email }),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            statusEl.className = 'status-message status-success';
            statusEl.innerHTML = '✅ Profilo aggiornato con successo!';
            
            // Aggiorna i dati utente locali
            currentUser = result.user;
            
            // Aggiorna l'header
            if (currentUser) {
                document.getElementById('user-name-header').textContent = `${currentUser.name} ${currentUser.surname}`;
            }
        } else {
            statusEl.className = 'status-message status-error';
            statusEl.innerHTML = `❌ ${result.error || 'Errore durante l\'aggiornamento del profilo'}`;
        }
    } catch (error) {
        console.error('Errore aggiornamento profilo:', error);
        statusEl.className = 'status-message status-error';
        statusEl.innerHTML = `❌ Errore: ${error.message}`;
    }
}
async function changePassword() {
    if (!isAuthenticated) {
        showToast('Devi prima effettuare il login!', 'warning');
        return;
    }
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const statusEl = document.getElementById('password-status');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        statusEl.className = 'status-message status-error';
        statusEl.style.display = 'block';
        statusEl.innerHTML = '❌ Tutti i campi sono obbligatori';
        return;
    }
    
    if (newPassword.length < 6) {
        statusEl.className = 'status-message status-error';
        statusEl.style.display = 'block';
        statusEl.innerHTML = '❌ La nuova password deve essere di almeno 6 caratteri';
        return;
    }
    
    if (newPassword !== confirmPassword) {
        statusEl.className = 'status-message status-error';
        statusEl.style.display = 'block';
        statusEl.innerHTML = '❌ Le nuove password non corrispondono';
        return;
    }
    
    try {
        statusEl.className = 'status-message status-info';
        statusEl.style.display = 'block';
        statusEl.innerHTML = '🔄 Cambio password in corso...';
        
        const response = await fetch('/api/user/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword
            }),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            statusEl.className = 'status-message status-success';
            statusEl.innerHTML = '✅ Password cambiata con successo!';
            
            // Pulisci i campi password
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        } else {
            statusEl.className = 'status-message status-error';
            statusEl.innerHTML = `❌ ${result.error || 'Errore durante il cambio password'}`;
        }
    } catch (error) {
        console.error('Errore cambio password:', error);
        statusEl.className = 'status-message status-error';
        statusEl.innerHTML = `❌ Errore: ${error.message}`;
    }
}

// Aggiorna display split quando cambia il numero di osservazioni training
// Listener per il resize della finestra per ridisegnare i grafici
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        // Gestisci cambio layout tabella coefficienti su smartphone
        const coeffTableEl = document.getElementById('coefficients-table');
        if (coeffTableEl) {
            const cardsContainer = coeffTableEl.querySelector('.coefficients-cards');
            const tableWrapper = coeffTableEl.querySelector('.coefficients-table-wrapper');
            if (cardsContainer && tableWrapper) {
                if (window.innerWidth <= 480) {
                    cardsContainer.style.display = 'block';
                    tableWrapper.style.display = 'none';
                } else {
                    cardsContainer.style.display = 'none';
                    tableWrapper.style.display = 'block';
                }
            }
        }
        
        // Ridisegna tutti i grafici Plotly quando la finestra viene ridimensionata
        const plotlyContainers = [
            'time-series-plot',
            'smoothing-comparison-chart',
            'log-transform-chart',
            'differencing-chart',
            'acf-plot',
            'pacf-plot',
            'smoothing-acf-plot',
            'smoothing-pacf-plot',
            'log-transform-acf-plot',
            'log-transform-pacf-plot',
            'differencing-acf-plot',
            'differencing-pacf-plot',
            'train-chart',
            'test-chart'
        ];
        
        plotlyContainers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container && container.querySelector('.plotly')) {
                try {
                    Plotly.Plots.resize(containerId);
                } catch (e) {
                    // Ignora errori se il grafico non è ancora inizializzato
                }
            }
        });
    }, 250);
});

// Migliora il rendering durante lo scroll per evitare sezioni bianche
let scrollTimeout;
window.addEventListener('scroll', function() {
    // Previeni lo scroll oltre i limiti per evitare spazio bianco
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    
    // Se si è scrollato troppo in alto, ferma lo scroll
    if (scrollTop < 0) {
        window.scrollTo(0, 0);
        return;
    }
    
    // Se si è scrollato troppo in basso, ferma lo scroll
    if (scrollTop + clientHeight > scrollHeight - 1) {
        window.scrollTo(0, scrollHeight - clientHeight);
        return;
    }
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(function() {
        // Forza il re-rendering degli elementi visibili durante lo scroll
        const sections = document.querySelectorAll('#metrics-display, #plot-container, #descriptive-stats, #model-output-section, #model-summary-section, #train-chart, #test-chart, .card');
        sections.forEach(section => {
            if (section && isElementInViewport(section)) {
                // Forza un reflow per mantenere il rendering
                section.style.transform = 'translateZ(0)';
                // Assicura che il background sia sempre visibile
                if (section.style.backgroundColor === '' || section.style.backgroundColor === 'transparent') {
                    section.style.backgroundColor = '';
                }
            }
        });
    }, 50);
}, { passive: false });

// Funzione helper per verificare se un elemento è visibile
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

document.addEventListener('DOMContentLoaded', function() {
    // Reset tutte le opzioni al caricamento della pagina
    resetAllOptions();
    
    // Verifica stato login e mostra/nascondi sezioni di conseguenza
    checkLoginStatus();
    
    // Gestione label animate per i field-wrapper
    const authInputs = document.querySelectorAll('#auth-section .field-wrapper input');
    authInputs.forEach(input => {
        // Se l'input ha già un valore al caricamento, la label rimane in alto
        if (input.value) {
            input.classList.add('has-value');
        }
        
        input.addEventListener('input', () => {
            if (input.value) {
                input.classList.add('has-value');
            } else {
                input.classList.remove('has-value');
            }
        });
    });
    
    const trainObsInput = document.getElementById('train-obs');
    if (trainObsInput) {
        trainObsInput.addEventListener('input', function(e) {
            const trainObs = parseInt(e.target.value);
            const totalObs = totalObservations;
            
            if (totalObs && !isNaN(trainObs) && trainObs > 0) {
                const testObs = totalObs - trainObs;
                const trainPercent = Math.round((trainObs / totalObs) * 100);
                const testPercent = Math.round((testObs / totalObs) * 100);
                
                if (testObs >= 1) {
                    document.getElementById('train-obs-display').textContent = 
                        `→ Test Set: ${testObs} osservazioni (${trainPercent}% / ${testPercent}%)`;
                    document.getElementById('train-obs-display').style.color = '#28a745';
                } else {
                    document.getElementById('train-obs-display').textContent = 
                        `⚠️ Test Set troppo piccolo (minimo 1 osservazione richiesta)`;
                    document.getElementById('train-obs-display').style.color = '#dc3545';
                }
            } else {
                document.getElementById('train-obs-display').textContent = '';
            }
        });
    }
    
    // Dropzone drag and drop
    const dropzone = document.getElementById('upload-dropzone');
    if (dropzone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.add('dragover');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.remove('dragover');
            });
        });
        
        // Funzione per mostrare il file selezionato
        function showSelectedFile(fileName, fileSize) {
            const dropzoneContent = dropzone.querySelector('.dropzone-content-compact');
            if (dropzoneContent) {
                const sizeKB = (fileSize / 1024).toFixed(1);
                dropzoneContent.innerHTML = `
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <div class="file-selected-info">
                        <p class="file-name">${fileName}</p>
                        <span class="file-size">${sizeKB} KB - Pronto per il caricamento</span>
                    </div>
                `;
                dropzone.classList.add('file-ready');
            }
        }
        
        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const fileInput = document.getElementById('file-input');
                fileInput.files = files;
                showSelectedFile(files[0].name, files[0].size);
            }
        });
        
        // Update dropzone text when file is selected via click
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    showSelectedFile(fileInput.files[0].name, fileInput.files[0].size);
                }
            });
        }
    }
});

async function uploadFile() {
    if (!isAuthenticated) {
        showToast('Devi prima effettuare il login!', 'warning');
        return;
    }
    
    const input = document.getElementById('file-input');
    
    if (!input.files[0]) {
        showToast('Seleziona un file', 'warning');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', input.files[0]);
    
    const statusEl = document.getElementById('upload-status');
    
    try {
        statusEl.className = 'status-message status-info';
        statusEl.style.display = 'block';
        statusEl.innerHTML = '🔄 Caricamento in corso...';
        
        const uploadUrl = '/api/upload-temp';
        
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            credentials: 'include',
            body: formData
            // Non aggiungere Content-Type, fetch lo gestisce automaticamente per FormData
        });
        
        if (!uploadResponse.ok) {
            let errorMessage = 'Errore nel caricamento';
            try {
                const errorData = await uploadResponse.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = `Errore HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const uploadData = await uploadResponse.json();
        
        // Pulisci risultati precedenti quando si carica un nuovo file
        clearPreviousResults();
        currentModelId = null;
        
        // Reset tutte le opzioni quando si carica un nuovo file
        resetAllOptions();
        
        currentFileId = uploadData.file_id;
        totalObservations = uploadData.n_observations;
        splitApplied = false;
        
        // Aggiorna display osservazioni totali nella sezione split
        const totalObsDisplay = document.getElementById('total-obs-display');
        if (totalObsDisplay) {
            totalObsDisplay.textContent = totalObservations;
        }
        
        // Imposta valore di default per train_obs (80% del totale)
        const trainObsInput = document.getElementById('train-obs');
        if (trainObsInput && totalObservations) {
            const defaultTrainObs = Math.floor(totalObservations * 0.8);
            trainObsInput.max = totalObservations - 1; // Massimo: totale - 1 (almeno 1 per test)
            trainObsInput.value = defaultTrainObs;
            // Trigger evento per aggiornare display
            trainObsInput.dispatchEvent(new Event('input'));
        }
        
        statusEl.className = 'status-message status-success';
        statusEl.innerHTML = 
            `✅ File caricato: ${uploadData.file_name}<br>
             Osservazioni totali: ${uploadData.n_observations}`;
        
        await loadDataVisualization();
        
        // Carica lo storico dei modelli per questo file
        await loadModelRuns();
        
    } catch (error) {
        console.error('Errore upload:', error);
        const statusEl = document.getElementById('upload-status');
        statusEl.className = 'status-message status-error';
        statusEl.style.display = 'block';
        statusEl.innerHTML = `❌ Errore: ${error.message}`;
    }
}
async function loadDataVisualization() {
    try {
        const dataResponse = await fetch(`/api/file/${currentFileId}/data`, {
            credentials: 'include'
        });
        if (!dataResponse.ok) {
            throw new Error('Errore nel caricamento dati');
        }
        
        const data = await dataResponse.json();
        fileData = data;
        
        document.getElementById('data-visualization-section').style.display = 'block';
        
        createTimeSeriesPlot(data.data);
        displayDescriptiveStats(data.statistics);
        
        // Visualizza ACF/PACF se disponibili
        if (data.acf_pacf) {
            createACFPlot(data.acf_pacf, 'acf-plot');
            createPACFPlot(data.acf_pacf, 'pacf-plot');
        }
        
        document.getElementById('date-range-info').innerHTML = 
            `<strong>Periodo:</strong> ${new Date(data.date_range.start).toLocaleDateString()} - ${new Date(data.date_range.end).toLocaleDateString()}`;
        
        // Mostra sezioni trasformazioni (prima dello split) - ordine: smoothing -> log -> diff -> split
        document.getElementById('smoothing-section').style.display = 'block';
        document.getElementById('log-transform-section').style.display = 'block';
        document.getElementById('differencing-section').style.display = 'block';
        document.getElementById('split-section').style.display = 'block';
        // La sezione SARIMAX sarà mostrata dopo lo split
        
    } catch (error) {
        console.error('Errore visualizzazione:', error);
        showToast('Errore nel caricamento della visualizzazione: ' + error.message, 'error');
    }
}
function createTimeSeriesPlot(dataPoints, containerId = 'time-series-plot', title = 'Serie Temporale') {
    const dates = dataPoints.map(d => d.date);
    const values = dataPoints.map(d => d.value);
    
    const trace = {
        x: dates,
        y: values,
        type: 'scatter',
        mode: 'lines+markers',
        name: title,
        line: {
            color: '#1f4788',
            width: 2
        },
        marker: {
            size: 4,
            color: '#1f4788'
        },
        hovertemplate: '<b>' + title + '</b><br>' +
                      'Data: %{x|%d %B %Y}<br>' +
                      'Valore: %{y:.4f}<extra></extra>'
    };
    
    const layout = {
        xaxis: {
            title: 'Data',
            type: 'date'
        },
        yaxis: {
            title: 'Valore (y)'
        },
        hovermode: 'closest',
        showlegend: false,
        height: 400,
        margin: { l: 60, r: 30, t: 20, b: 60 }
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        toImageButtonOptions: {
            format: 'png',
            filename: title.toLowerCase().replace(/\s+/g, '_'),
            height: 800,
            width: 1200,
            scale: 2
        }
    };
    
    // Pulisci il grafico precedente se esiste
    const chartEl = document.getElementById(containerId);
    if (chartEl) {
        Plotly.purge(containerId);
        Plotly.newPlot(containerId, [trace], layout, config);
    } else {
        // Fallback al container di default se non trovato
        Plotly.newPlot('time-series-plot', [trace], layout, config);
    }
}
async function applySmoothing() {
    if (!isAuthenticated) {
        showToast('Devi prima effettuare il login!', 'warning');
        return;
    }
    
    if (!currentFileId) {
        showToast('Devi prima caricare un file!', 'warning');
        return;
    }
    
    // Cancella risultati precedenti quando cambia smoothing
    clearPreviousResults();
    
    const windowSize = parseInt(document.getElementById('smoothing-window').value);
    
    try {
        document.getElementById('smoothing-status').innerHTML = '🔄 Applicazione smoothing in corso...';
        document.getElementById('apply-smoothing-btn').disabled = true;
        
        const response = await fetch(`/api/file/${currentFileId}/apply-smoothing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                window_size: windowSize
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Errore nell\'applicazione smoothing');
        }
        
        const result = await response.json();
        
        const windowText = windowSize === 1 ? 'Nessuno (serie originale)' : `${windowSize} termini`;
        const lostObs = result.original_obs - result.n_observations;
        const lostText = lostObs > 0 ? ` (rimosse ${lostObs} osservazioni iniziali)` : '';
        
        // Aggiorna il numero totale di osservazioni dopo lo smoothing
        totalObservations = result.n_observations;
        
        // Aggiorna display osservazioni totali nella sezione split
        const totalObsDisplay = document.getElementById('total-obs-display');
        if (totalObsDisplay) {
            totalObsDisplay.textContent = totalObservations;
        }
        
        // Aggiorna il max dell'input train_obs
        const trainObsInput = document.getElementById('train-obs');
        if (trainObsInput) {
            trainObsInput.max = totalObservations - 1;
            // Se il valore attuale è maggiore del nuovo max, aggiornalo
            if (parseInt(trainObsInput.value) >= totalObservations) {
                const newDefault = Math.floor(totalObservations * 0.8);
                trainObsInput.value = newDefault;
                trainObsInput.dispatchEvent(new Event('input'));
            }
        }
        
        // Mostra sezioni successive (log e diff) dopo lo smoothing
        document.getElementById('log-transform-section').style.display = 'block';
        document.getElementById('differencing-section').style.display = 'block';
        
        document.getElementById('smoothing-status').innerHTML = 
            `✅ Smoothing applicato con successo!<br>
             <strong>Finestra:</strong> ${windowText}<br>
             <strong>Osservazioni dopo smoothing:</strong> ${result.n_observations} (originali: ${result.original_obs})${lostText}`;
        
        // Mostra grafico confronto e statistiche se smoothing applicato (window > 1)
        if (windowSize > 1 && result.comparison_data) {
            createSmoothingComparisonChart(result.comparison_data);
            displaySmoothingStats(result.statistics);
            
            // Mostra ACF/PACF serie smussata
            if (result.acf_pacf) {
                createACFPlot(result.acf_pacf, 'smoothing-acf-plot');
                createPACFPlot(result.acf_pacf, 'smoothing-pacf-plot');
                document.getElementById('smoothing-acf-pacf').style.display = 'block';
            }
        } else {
            // Nascondi sezioni se nessun smoothing
            document.getElementById('smoothing-comparison').style.display = 'none';
            document.getElementById('smoothing-stats').style.display = 'none';
            document.getElementById('smoothing-acf-pacf').style.display = 'none';
        }
        
        document.getElementById('apply-smoothing-btn').disabled = false;
        
        // Ricarica visualizzazione dati (ora con serie smussata)
        await loadDataVisualization();
        
        // Nascondi sezioni risultati (8 e 9) quando si modifica lo smoothing
        hideResultsSections();
        
    } catch (error) {
        document.getElementById('smoothing-status').innerHTML = 
            `<span style="color:red;">❌ Errore: ${error.message}</span>`;
        document.getElementById('apply-smoothing-btn').disabled = false;
    }
}
function createACFPlot(acfPacfData, containerId) {
    const lags = acfPacfData.lags;
    const acf = acfPacfData.acf;
    const confint = acfPacfData.acf_confint;
    
    // Crea barre per ACF
    const acfTrace = {
        x: lags,
        y: acf,
        type: 'bar',
        name: 'ACF',
        marker: {
            color: '#1f4788'
        }
    };
    
    // Aggiungi intervalli di confidenza se disponibili
    // Gli intervalli di confidenza sono bande orizzontali intorno a zero
    // per testare se l'autocorrelazione è significativamente diversa da zero
    const traces = [acfTrace];
    if (confint && confint.length > 0) {
        // Gli intervalli di confidenza dovrebbero essere costanti (bande orizzontali)
        // Prendi il primo valore come riferimento (dovrebbero essere tutti uguali)
        const upperCIValue = confint[0][1];
        const lowerCIValue = confint[0][0];
        
        // Crea linee orizzontali per gli intervalli di confidenza
        traces.push({
            x: [lags[0], lags[lags.length - 1]],
            y: [upperCIValue, upperCIValue],
            type: 'scatter',
            mode: 'lines',
            name: 'Upper CI (95%)',
            line: { color: 'rgba(255, 0, 0, 0.5)', width: 1, dash: 'dot' },
            showlegend: true,
            legendgroup: 'ci'
        });
        
        traces.push({
            x: [lags[0], lags[lags.length - 1]],
            y: [lowerCIValue, lowerCIValue],
            type: 'scatter',
            mode: 'lines',
            name: 'Lower CI (95%)',
            line: { color: 'rgba(255, 0, 0, 0.5)', width: 1, dash: 'dot' },
            fill: 'tonexty',
            fillcolor: 'rgba(255, 0, 0, 0.1)',
            showlegend: true,
            legendgroup: 'ci'
        });
    }
    
    // Linea orizzontale a 0
    traces.push({
        x: [lags[0], lags[lags.length - 1]],
        y: [0, 0],
        type: 'scatter',
        mode: 'lines',
        line: { color: 'black', width: 1, dash: 'dash' },
        showlegend: false,
        hoverinfo: 'skip'
    });
    
    const layout = {
        xaxis: {
            title: 'Lag',
            zeroline: false
        },
        yaxis: {
            title: 'Autocorrelation',
            range: [-1.1, 1.1]
        },
        hovermode: 'closest',
        height: 300,
        margin: { l: 50, r: 20, t: 20, b: 50 }
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        toImageButtonOptions: {
            format: 'png',
            filename: 'acf_plot',
            height: 600,
            width: 1000,
            scale: 2
        }
    };
    
    // Assicurati che il container sia visibile prima di creare il grafico
    const containerEl = document.getElementById(containerId);
    if (containerEl) {
        // Trova il parent che potrebbe essere nascosto
        let parent = containerEl.parentElement;
        while (parent && parent !== document.body) {
            if (parent.style.display === 'none') {
                parent.style.display = 'block';
            }
            parent = parent.parentElement;
        }
        
        // Pulisci il grafico precedente se esiste
        Plotly.purge(containerId);
        
        // Crea il grafico dopo un breve delay
        setTimeout(() => {
            Plotly.newPlot(containerId, traces, layout, config);
            
            // Forza il ridisegno dopo che il grafico è stato creato
            setTimeout(() => {
                Plotly.Plots.resize(containerId);
            }, 100);
        }, 50);
    }
}
function createPACFPlot(acfPacfData, containerId) {
    const lags = acfPacfData.lags;
    const pacf = acfPacfData.pacf;
    const confint = acfPacfData.pacf_confint;
    
    // Crea barre per PACF
    const pacfTrace = {
        x: lags,
        y: pacf,
        type: 'bar',
        name: 'PACF',
        marker: {
            color: '#28a745'
        }
    };
    
    // Aggiungi intervalli di confidenza se disponibili
    // Gli intervalli di confidenza sono bande orizzontali intorno a zero
    // per testare se l'autocorrelazione parziale è significativamente diversa da zero
    const traces = [pacfTrace];
    if (confint && confint.length > 0) {
        // Gli intervalli di confidenza dovrebbero essere costanti (bande orizzontali)
        // Prendi il primo valore come riferimento (dovrebbero essere tutti uguali)
        const upperCIValue = confint[0][1];
        const lowerCIValue = confint[0][0];
        
        // Crea linee orizzontali per gli intervalli di confidenza
        traces.push({
            x: [lags[0], lags[lags.length - 1]],
            y: [upperCIValue, upperCIValue],
            type: 'scatter',
            mode: 'lines',
            name: 'Upper CI (95%)',
            line: { color: 'rgba(255, 0, 0, 0.5)', width: 1, dash: 'dot' },
            showlegend: true,
            legendgroup: 'ci'
        });
        
        traces.push({
            x: [lags[0], lags[lags.length - 1]],
            y: [lowerCIValue, lowerCIValue],
            type: 'scatter',
            mode: 'lines',
            name: 'Lower CI (95%)',
            line: { color: 'rgba(255, 0, 0, 0.5)', width: 1, dash: 'dot' },
            fill: 'tonexty',
            fillcolor: 'rgba(255, 0, 0, 0.1)',
            showlegend: true,
            legendgroup: 'ci'
        });
    }
    
    // Linea orizzontale a 0
    traces.push({
        x: [lags[0], lags[lags.length - 1]],
        y: [0, 0],
        type: 'scatter',
        mode: 'lines',
        line: { color: 'black', width: 1, dash: 'dash' },
        showlegend: false,
        hoverinfo: 'skip'
    });
    
    const layout = {
        xaxis: {
            title: 'Lag',
            zeroline: false
        },
        yaxis: {
            title: 'Partial Autocorrelation',
            range: [-1.1, 1.1]
        },
        hovermode: 'closest',
        height: 300,
        margin: { l: 50, r: 20, t: 20, b: 50 }
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        toImageButtonOptions: {
            format: 'png',
            filename: 'pacf_plot',
            height: 600,
            width: 1000,
            scale: 2
        }
    };
    
    // Assicurati che il container sia visibile prima di creare il grafico
    const containerEl = document.getElementById(containerId);
    if (containerEl) {
        // Trova il parent che potrebbe essere nascosto
        let parent = containerEl.parentElement;
        while (parent && parent !== document.body) {
            if (parent.style.display === 'none') {
                parent.style.display = 'block';
            }
            parent = parent.parentElement;
        }
        
        // Pulisci il grafico precedente se esiste
        Plotly.purge(containerId);
        
        // Crea il grafico dopo un breve delay
        setTimeout(() => {
            Plotly.newPlot(containerId, traces, layout, config);
            
            // Forza il ridisegno dopo che il grafico è stato creato
            setTimeout(() => {
                Plotly.Plots.resize(containerId);
            }, 100);
        }, 50);
    }
}
function createSmoothingComparisonChart(comparisonData) {
    const original = comparisonData.original;
    const smoothed = comparisonData.smoothed;
    
    const dates = original.map(d => d.date);
    const originalValues = original.map(d => d.value);
    const smoothedValues = smoothed.map(d => d.value);
    
    const traceOriginal = {
        x: dates,
        y: originalValues,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Serie Originale',
        line: { color: '#1f4788', width: 2 },
        marker: { size: 3 },
        hovertemplate: '<b>Serie Originale</b><br>' +
                      'Data: %{x|%d %B %Y}<br>' +
                      'Valore: %{y:.4f}<extra></extra>'
    };
    
    const traceSmoothed = {
        x: dates,
        y: smoothedValues,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Serie Smussata',
        line: { color: '#28a745', width: 2, dash: 'dash' },
        marker: { size: 3 },
        hovertemplate: '<b>Serie Smussata</b><br>' +
                      'Data: %{x|%d %B %Y}<br>' +
                      'Valore: %{y:.4f}<extra></extra>'
    };
    
    const layout = {
        xaxis: {
            title: 'Data',
            type: 'date'
        },
        yaxis: {
            title: 'Valore'
        },
        hovermode: 'closest',
        legend: {
            x: 0,
            y: 1,
            bgcolor: 'rgba(255,255,255,0.8)'
        },
        height: 400,
        margin: { l: 60, r: 30, t: 20, b: 60 }
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        toImageButtonOptions: {
            format: 'png',
            filename: 'smoothing_comparison',
            height: 800,
            width: 1200,
            scale: 2
        }
    };
    
    // Mostra prima il container per permettere a Plotly di calcolare le dimensioni
    const comparisonEl = document.getElementById('smoothing-comparison');
    if (comparisonEl) {
        comparisonEl.style.display = 'block';
        
        // Pulisci il grafico precedente se esiste
        Plotly.purge('smoothing-comparison-chart');
        
        // Crea il grafico dopo un breve delay per assicurarsi che il container sia renderizzato
        setTimeout(() => {
            Plotly.newPlot('smoothing-comparison-chart', [traceOriginal, traceSmoothed], layout, config);
            
            // Forza il ridisegno dopo che il grafico è stato creato
            setTimeout(() => {
                Plotly.Plots.resize('smoothing-comparison-chart');
            }, 100);
        }, 50);
    }
}
function displaySmoothingStats(stats) {
    const statsHtml = `
        <table class="stats-table" style="border-collapse: collapse;">
            <tr>
                <th style="border-right: 1px solid #dee2e6; padding: 8px;">Statistiche</th>
                <th style="padding: 8px;">Valore</th>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Numero Osservazioni</strong></td>
                <td style="padding: 8px;">${stats.obs_count}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Media</strong></td>
                <td style="padding: 8px;">${stats.mean.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Deviazione Standard</strong></td>
                <td style="padding: 8px;">${stats.std.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Minimo</strong></td>
                <td style="padding: 8px;">${stats.min.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Massimo</strong></td>
                <td style="padding: 8px;">${stats.max.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Mediana</strong></td>
                <td style="padding: 8px;">${stats.median.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Primo Quartile (Q25)</strong></td>
                <td style="padding: 8px;">${stats.q25.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Terzo Quartile (Q75)</strong></td>
                <td style="padding: 8px;">${stats.q75.toFixed(4)}</td>
            </tr>
        </table>
    `;
    
    document.getElementById('smoothing-stats-table').innerHTML = statsHtml;
    document.getElementById('smoothing-stats').style.display = 'block';
}
function displayDescriptiveStats(stats) {
    const statsHtml = `
        <table class="stats-table" style="border-collapse: collapse;">
            <tr>
                <th style="border-right: 1px solid #dee2e6; padding: 8px;">Statistiche</th>
                <th style="padding: 8px;">Valore</th>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Numero Osservazioni</strong></td>
                <td style="padding: 8px;">${stats.obs_count}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Media</strong></td>
                <td style="padding: 8px;">${stats.mean.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Deviazione Standard</strong></td>
                <td style="padding: 8px;">${stats.std.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Minimo</strong></td>
                <td style="padding: 8px;">${stats.min.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Massimo</strong></td>
                <td style="padding: 8px;">${stats.max.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Mediana</strong></td>
                <td style="padding: 8px;">${stats.median.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Primo Quartile (Q25)</strong></td>
                <td style="padding: 8px;">${stats.q25.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Terzo Quartile (Q75)</strong></td>
                <td style="padding: 8px;">${stats.q75.toFixed(4)}</td>
            </tr>
        </table>
    `;
    
    document.getElementById('stats-table').innerHTML = statsHtml;
}
async function applySplit() {
    const trainObsInput = document.getElementById('train-obs');
    if (!trainObsInput) {
        showToast('Errore: elemento input non trovato', 'error');
        return;
    }
    
    const trainObs = parseInt(trainObsInput.value);
    
    // Valida che train_obs sia un numero valido
    if (isNaN(trainObs) || trainObs < 1) {
        showToast('Inserisci un numero valido di osservazioni per il training set (minimo 1)', 'warning');
        return;
    }
    
    if (!totalObservations) {
        showToast('Errore: numero totale di osservazioni non disponibile', 'error');
        return;
    }
    
    if (trainObs >= totalObservations) {
        showToast(`Il numero di osservazioni per il training deve essere minore del totale (${totalObservations}). Il test set deve avere almeno 1 osservazione.`, 'warning');
        return;
    }
    
    if (!currentFileId) {
        showToast('Devi prima caricare un file!', 'warning');
        return;
    }
    
    const statusEl = document.getElementById('split-status');
    
    try {
        statusEl.className = 'status-message status-info';
        statusEl.style.display = 'block';
        statusEl.innerHTML = '🔄 Applicazione split in corso...';
        
        const splitResponse = await fetch(`/api/file/${currentFileId}/apply-split`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({train_obs: trainObs})
        });
        
        if (!splitResponse.ok) {
            const error = await splitResponse.json();
            throw new Error(error.error || 'Errore nell\'applicazione dello split');
        }
        
        const splitData = await splitResponse.json();
        splitApplied = true;
        
        // Calcola percentuali per display
        const totalObs = splitData.total_obs || (splitData.train_obs + splitData.test_obs);
        const trainPercent = Math.round((splitData.train_obs / totalObs) * 100);
        const testPercent = Math.round((splitData.test_obs / totalObs) * 100);
        
        statusEl.className = 'status-message status-success';
        statusEl.innerHTML = 
            `Split applicato con successo!<br>
             <strong>Training Set:</strong> ${splitData.train_obs} osservazioni (${trainPercent}%)
             (${new Date(splitData.train_start).toLocaleDateString()} - ${new Date(splitData.train_end).toLocaleDateString()})<br>
             <strong>Test Set:</strong> ${splitData.test_obs} osservazioni (${testPercent}%)
             (${new Date(splitData.test_start).toLocaleDateString()} - ${new Date(splitData.test_end).toLocaleDateString()})`;
        
        document.getElementById('run-sarimax-btn').disabled = false;
        document.getElementById('sarimax-section').style.display = 'block';
        
        // Nascondi sezioni risultati (8 e 9) quando si modifica lo split
        hideResultsSections();
        
    } catch (error) {
        statusEl.className = 'status-message status-error';
        statusEl.style.display = 'block';
        statusEl.innerHTML = `❌ Errore: ${error.message}`;
        splitApplied = false;
    }
}
async function runSARIMAX() {
    if (!splitApplied) {
        showToast('Devi prima applicare lo split!', 'warning');
        return;
    }
    
    // Verifica che gli elementi esistano
    const statusEl = document.getElementById('sarimax-status');
    const btnEl = document.getElementById('run-sarimax-btn');
    
    if (!statusEl || !btnEl) {
        console.error('Elementi SARIMAX non trovati');
        showToast('Errore: elementi interfaccia non trovati. Ricarica la pagina.', 'error');
        return;
    }
    
    try {
        statusEl.innerHTML = '🔄 Esecuzione SARIMAX in corso...';
        btnEl.disabled = true;
        
        // Raccogli parametri dal form (verifica che esistano)
        const getEl = (id) => {
            const el = document.getElementById(id);
            if (!el) {
                console.error(`Elemento ${id} non trovato`);
                return null;
            }
            return el;
        };
        
        const params = {
            p: parseInt(getEl('sarimax-p')?.value || 0) || 0,
            d: parseInt(getEl('sarimax-d')?.value || 0) || 0,
            q: parseInt(getEl('sarimax-q')?.value || 0) || 0,
            P: parseInt(getEl('sarimax-P')?.value || 0) || 0,
            D: parseInt(getEl('sarimax-D')?.value || 0) || 0,
            Q: parseInt(getEl('sarimax-Q')?.value || 0) || 0,
            m: parseInt(getEl('sarimax-m')?.value || 0) || 0,
            trend: getEl('sarimax-trend')?.value || 'n',
            enforce_stationarity: getEl('sarimax-enforce-stationarity')?.checked ?? true,
            enforce_invertibility: getEl('sarimax-enforce-invertibility')?.checked ?? true,
            cov_type: getEl('sarimax-cov-type')?.value || 'robust_approx',
            acf_pacf_analyses: acfPacfAnalyses  // Invia le analisi ACF/PACF fatte
        };
        
        const response = await fetch(`/api/file/${currentFileId}/fit-sarimax`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });
        
        if (!response.ok) {
            let errorMessage = 'Errore nell\'esecuzione SARIMAX';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = `Errore HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        statusEl.innerHTML = 
            `✅ SARIMAX completato con successo!<br>
             Modello: ${result.order}${result.seasonal_order ? ` x ${result.seasonal_order}` : ''}<br>
             AIC: ${result.aic ? result.aic.toFixed(2) : 'N/A'}`;
        
        // Pulisci risultati precedenti (senza resettare currentModelId ancora)
        clearPreviousResults(false);
        
        // Imposta il nuovo model_id DOPO aver pulito
        currentModelId = result.model_id;
        currentRunId = result.run_id; // Salva anche il run_id per il paper
        
        // Carica risultati e grafici del nuovo modello usando il model_id specifico
        await loadResults(result.model_id);
        await loadForecastCharts(result.model_id);
        
        // Aggiorna i pulsanti del paper (con delay per assicurarsi che la sezione sia visibile)
        setTimeout(async () => {
            await updatePaperButtons(result.run_id);
        }, 500);
        
        // Aggiorna lista storico modelli
        await loadModelRuns();
        
        // Riabilita il pulsante per permettere nuovi tentativi
        btnEl.disabled = false;
        
    } catch (error) {
        console.error('Errore SARIMAX:', error);
        statusEl.innerHTML = 
            `<span style="color:red;">❌ Errore SARIMAX: ${error.message}</span>`;
        btnEl.disabled = false;
    }
}
function hideResultsSections() {
    // Nascondi le sezioni 8 (Risultati Modello) e 9 (Grafici Confronto)
    const resultsSection = document.getElementById('results-section');
    const chartsSection = document.getElementById('charts-section');
    
    // Reset dei pulsanti del paper quando si nascondono le sezioni
    const generateBtn = document.getElementById('generate-paper-btn');
    const openBtn = document.getElementById('open-paper-btn');
    if (generateBtn) generateBtn.style.display = 'none';
    if (openBtn) openBtn.style.display = 'none';
    
    if (resultsSection) {
        resultsSection.style.display = 'none';
    }
    if (chartsSection) {
        chartsSection.style.display = 'none';
    }
}
function clearPreviousResults(resetModelId = true) {
    // Pulisci tutti i risultati precedenti
    const modelInfoEl = document.getElementById('model-info');
    const coeffTableEl = document.getElementById('coefficients-table');
    const summaryTextEl = document.getElementById('model-summary-text');
    const metricsDisplayEl = document.getElementById('metrics-display');
    const trainChartEl = document.getElementById('train-chart');
    const testChartEl = document.getElementById('test-chart');
    
    if (modelInfoEl) {
        modelInfoEl.innerHTML = '';
        modelInfoEl.style.display = 'none';
    }
    if (coeffTableEl) {
        coeffTableEl.innerHTML = '';
        coeffTableEl.style.display = 'none';
    }
    if (summaryTextEl) {
        summaryTextEl.textContent = 'Summary non disponibile.';
        summaryTextEl.style.display = 'none';
    }
    
    // Nascondi il pulsante di export quando si puliscono i risultati
    const exportBtn = document.getElementById('export-summary-btn');
    if (exportBtn) {
        exportBtn.style.display = 'none';
    }
    const exportStatus = document.getElementById('export-summary-status');
    if (exportStatus) {
        exportStatus.style.display = 'none';
    }
    if (metricsDisplayEl) {
        metricsDisplayEl.innerHTML = '';
        metricsDisplayEl.style.display = 'none';
        // Assicurati che l'elemento sia completamente resettato
        metricsDisplayEl.style.visibility = '';
        metricsDisplayEl.style.opacity = '';
    }
    
    // Pulisci i grafici Plotly precedenti
    if (trainChartEl) {
        try {
            Plotly.purge(trainChartEl);
            trainChartEl.innerHTML = '';
        } catch (e) {
            console.warn('Errore pulizia grafico training:', e);
        }
    }
    if (testChartEl) {
        try {
            Plotly.purge(testChartEl);
            testChartEl.innerHTML = '';
        } catch (e) {
            console.warn('Errore pulizia grafico test:', e);
        }
    }
    
    // Reset model ID solo se richiesto (default: true per retrocompatibilità)
    if (resetModelId) {
        currentModelId = null;
    }
}
async function loadResults(modelId = null, populateOptions = false) {
    // Verifica che gli elementi esistano prima di accedervi
    const modelInfoEl = document.getElementById('model-info');
    const coeffTableEl = document.getElementById('coefficients-table');
    const summaryTextEl = document.getElementById('model-summary-text');
    const metricsDisplayEl = document.getElementById('metrics-display');
    
    if (!modelInfoEl) {
        console.error('Elemento model-info non trovato');
        return;
    }
    
    // Usa model_id specifico se fornito, altrimenti usa il modello corrente del file
    let url = `/api/file/${currentFileId}/model`;
    if (modelId) {
        url = `/api/model/${modelId}/results`;
    }
    
    let response;
    try {
        response = await fetch(url, {
        credentials: 'include'
    });
    } catch (error) {
        console.error('Errore di rete nel caricamento risultati:', error);
        showToast('Errore di connessione al server', 'error');
        return;
    }
    
    if (!response.ok) {
        console.error('Errore nel caricamento risultati:', response.status);
        let errorMessage = 'Errore nel caricamento dei risultati del modello';
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMessage = errorData.error;
            }
        } catch (e) {
            // Ignora se non è JSON
        }
        showToast(errorMessage, 'error');
        return;
    }
    
    const model = await response.json();
    
    if (model.status === 'no_model') {
        modelInfoEl.innerHTML = 'Nessun modello disponibile';
        return null;
    }
    
    // Aggiorna currentModelId se non era già impostato o se modelId è stato passato esplicitamente
    if (model.model_id) {
        if (modelId || !currentModelId) {
            currentModelId = model.model_id;
        }
    }
    
    // Se non abbiamo currentRunId ma abbiamo currentModelId, recuperalo dal backend
    // IMPORTANTE: Se modelId è stato passato esplicitamente, cerca il runId corrispondente
    if (currentModelId) {
        // Se modelId è stato passato esplicitamente o currentRunId non corrisponde, recuperalo
        if (modelId && modelId !== currentModelId) {
            // Il modelId passato è diverso, quindi dobbiamo trovare il runId corrispondente
            currentModelId = modelId;
            currentRunId = null; // Reset per forzare il recupero
        }
        
        if (!currentRunId || (modelId && modelId === currentModelId)) {
            try {
                const runsResponse = await fetch('/api/user/model-runs', {
                    credentials: 'include'
                });
                if (runsResponse.ok) {
                    const runsData = await runsResponse.json();
                    // Trova il run più recente per questo modelId
                    const runs = runsData.runs.filter(r => r.model_id === currentModelId);
                    if (runs.length > 0) {
                        // Prendi il più recente (il primo nella lista se ordinata per data desc)
                        const run = runs[0];
                        currentRunId = run.run_id;
                        console.log('loadResults: run_id recuperato per modelId', currentModelId, ':', currentRunId);
                    }
                }
            } catch (error) {
                console.warn('loadResults: Errore recupero run_id:', error);
            }
        }
    }
    
    // Mostra le sezioni dei risultati
    if (modelInfoEl) modelInfoEl.style.display = 'block';
    if (coeffTableEl) coeffTableEl.style.display = 'block';
    if (summaryTextEl) summaryTextEl.style.display = 'block';
    if (metricsDisplayEl) metricsDisplayEl.style.display = 'block';
    
    // Non mostrare le sezioni se siamo nell'area personale
    const profileSection = document.getElementById('profile-section');
    const isInProfile = profileSection && profileSection.style.display === 'block';
    
    // Mostra le sezioni results e charts solo se non siamo nell'area personale
    if (!isInProfile) {
        const resultsSectionEl = document.getElementById('results-section');
        const chartsSectionEl = document.getElementById('charts-section');
        if (resultsSectionEl) resultsSectionEl.style.display = 'block';
        if (chartsSectionEl) chartsSectionEl.style.display = 'block';
    }
    
    let selectionInfo = '';
    if (model.selection_score) {
        const testR2 = model.selection_score.test_r2;
        const testMape = model.selection_score.test_mape;
        const combinedScore = model.selection_score.combined_score;
        
        selectionInfo = `
            <div class="selection-score-box">
                <strong>Score Selezione Modello:</strong><br>
                R² Test: ${testR2 !== null && testR2 !== undefined ? testR2.toFixed(4) : 'N/A'}<br>
                MAPE Test: ${testMape !== null && testMape !== undefined ? testMape.toFixed(4) + '%' : 'N/A'}<br>
                Score Combinato: ${combinedScore !== null && combinedScore !== undefined ? combinedScore.toFixed(4) : 'N/A'}
            </div>
        `;
    }
    
    const aicValue = model.aic !== null && model.aic !== undefined ? model.aic.toFixed(4) : 'N/A';
    const bicValue = model.bic !== null && model.bic !== undefined ? model.bic.toFixed(4) : 'N/A';
    
    // Prepara informazioni file
    let fileInfo = '';
    if (model.file_name) {
        fileInfo = `<p><strong>File:</strong> ${model.file_name}</p>`;
    }
    
    modelInfoEl.innerHTML = `
        <div class="model-info-box">
            ${fileInfo}
            <p><strong>Modello ARIMA:</strong> ${model.order || 'N/A'}</p>
            ${model.seasonal_order ? `<p><strong>Stagionale:</strong> ${model.seasonal_order}</p>` : ''}
            <p><strong>AIC:</strong> ${aicValue}</p>
            ${model.bic !== null && model.bic !== undefined ? `<p><strong>BIC:</strong> ${bicValue}</p>` : ''}
            <p><strong>Stato:</strong> ${model.status || 'N/A'}</p>
            ${selectionInfo}
        </div>
    `;
    
    // Popola le sezioni delle trasformazioni con i valori utilizzati nel modello
    // SOLO se populateOptions è true (quando si carica un modello dallo storico)
    if (populateOptions && model.config_info) {
        const config = model.config_info;
        
        // Popola smoothing
        if (config.smoothing_window !== undefined && config.smoothing_window !== null) {
            const smoothingSelect = document.getElementById('smoothing-window');
            if (smoothingSelect) {
                const smoothingValue = parseInt(config.smoothing_window) || 1;
                smoothingSelect.value = smoothingValue.toString();
            }
        }
        
        // Popola log transform
        const logCheckbox = document.getElementById('apply-log-checkbox');
        if (logCheckbox) {
            // Gestisci diversi formati possibili (boolean, number, string)
            // IMPORTANTE: controlla esplicitamente per null/undefined, non usare || che fallisce con false/0
            let logValue = false;
            if (config.log_transform !== undefined && config.log_transform !== null) {
                if (typeof config.log_transform === 'boolean') {
                    logValue = config.log_transform;
                } else if (typeof config.log_transform === 'number') {
                    logValue = config.log_transform !== 0 && config.log_transform !== null;
                } else if (typeof config.log_transform === 'string') {
                    logValue = config.log_transform.toLowerCase() === 'true' || config.log_transform === '1';
                }
            }
            logCheckbox.checked = logValue;
        }
        
        // Popola differencing
        const diffSelect = document.getElementById('differencing-order');
        if (diffSelect) {
            // IMPORTANTE: gestisci esplicitamente 0 come valore valido
            let diffValue = 0;
            if (config.differencing_order !== undefined && config.differencing_order !== null) {
                // Converti a numero e assicurati che sia valido
                const parsed = parseInt(config.differencing_order);
                if (!isNaN(parsed) && parsed >= 0) {
                    diffValue = parsed;
                }
            }
            // Imposta sempre il valore, anche se è 0
            diffSelect.value = diffValue.toString();
        }
        
        // Popola trend
        const trendSelect = document.getElementById('sarimax-trend');
        if (trendSelect && config.trend !== undefined && config.trend !== null) {
            trendSelect.value = config.trend || 'n';
        }
        
        // Popola train obs
        if (config.train_obs !== undefined && config.train_obs !== null) {
            const trainObsInput = document.getElementById('train-obs');
            if (trainObsInput) {
                trainObsInput.value = config.train_obs;
                // Aggiorna anche il display
                if (totalObservations) {
                    const testObs = totalObservations - config.train_obs;
                    const trainPercent = Math.round((config.train_obs / totalObservations) * 100);
                    const testPercent = Math.round((testObs / totalObservations) * 100);
                    const displayEl = document.getElementById('train-obs-display');
                    if (displayEl && testObs >= 1) {
                        displayEl.textContent = `→ Test Set: ${testObs} osservazioni (${trainPercent}% / ${testPercent}%)`;
                        displayEl.style.color = '#28a745';
                    }
                }
            }
        }
    }
    
    // Popola i parametri SARIMAX se disponibili
    // SOLO se populateOptions è true (quando si carica un modello dallo storico)
    if (populateOptions && model.sarimax_params) {
        const params = model.sarimax_params;
        
        // Parametri ARIMA
        const pInput = document.getElementById('sarimax-p');
        const dInput = document.getElementById('sarimax-d');
        const qInput = document.getElementById('sarimax-q');
        if (pInput && params.p !== undefined) pInput.value = params.p || 0;
        if (dInput && params.d !== undefined) dInput.value = params.d || 0;
        if (qInput && params.q !== undefined) qInput.value = params.q || 0;
        
        // Parametri stagionali
        const PInput = document.getElementById('sarimax-P');
        const DInput = document.getElementById('sarimax-D');
        const QInput = document.getElementById('sarimax-Q');
        const mInput = document.getElementById('sarimax-m');
        if (PInput && params.P !== undefined) PInput.value = params.P || 0;
        if (DInput && params.D !== undefined) DInput.value = params.D || 0;
        if (QInput && params.Q !== undefined) QInput.value = params.Q || 0;
        if (mInput && params.m !== undefined) mInput.value = params.m || 0;
        
        // Trend - controlla prima in config_info, poi in sarimax_params
        const trendSelect = document.getElementById('sarimax-trend');
        if (trendSelect) {
            // Prova prima da config_info (più affidabile quando si carica da storico)
            let trendValue = null;
            if (model.config_info && model.config_info.trend !== undefined) {
                trendValue = model.config_info.trend;
            } else if (params.trend !== undefined) {
                trendValue = params.trend;
            }
            if (trendValue !== null) {
                trendSelect.value = trendValue || 'n';
            }
        }
        
        // Opzioni avanzate
        const enforceStationarityCheck = document.getElementById('sarimax-enforce-stationarity');
        const enforceInvertibilityCheck = document.getElementById('sarimax-enforce-invertibility');
        const covTypeSelect = document.getElementById('sarimax-cov-type');
        
        if (enforceStationarityCheck && params.enforce_stationarity !== undefined) {
            enforceStationarityCheck.checked = params.enforce_stationarity !== false;
        }
        if (enforceInvertibilityCheck && params.enforce_invertibility !== undefined) {
            enforceInvertibilityCheck.checked = params.enforce_invertibility !== false;
        }
        if (covTypeSelect && params.cov_type !== undefined) {
            covTypeSelect.value = params.cov_type || 'robust_approx';
        }
    }
    
    if (model.coefficients && model.coefficients.length > 0) {
        let coeffHtml = '<div class="coefficients-container">';
        
        // Tabella per desktop/tablet
        coeffHtml += '<div class="coefficients-table-wrapper" style="overflow-x: auto;">';
        coeffHtml += '<table class="coefficients-table" style="border-collapse: collapse; width: 100%; min-width: 700px;">';
        coeffHtml += '<thead>';
        coeffHtml += '<tr>';
        coeffHtml += '<th style="border-right: 1px solid #dee2e6; padding: 8px; text-align: left;">Parametro</th>';
        coeffHtml += '<th style="border-right: 1px solid #dee2e6; padding: 8px; text-align: center;">Coefficiente</th>';
        coeffHtml += '<th class="hide-mobile" style="border-right: 1px solid #dee2e6; padding: 8px; text-align: center;">Std Error</th>';
        coeffHtml += '<th class="hide-mobile" style="border-right: 1px solid #dee2e6; padding: 8px; text-align: center;">t-value</th>';
        coeffHtml += '<th style="border-right: 1px solid #dee2e6; padding: 8px; text-align: center;">P-value</th>';
        coeffHtml += '<th class="hide-small" style="border-right: 1px solid #dee2e6; padding: 8px; text-align: center;">CI 95% Lower</th>';
        coeffHtml += '<th class="hide-small" style="padding: 8px; text-align: center;">CI 95% Upper</th>';
        coeffHtml += '</tr>';
        coeffHtml += '</thead>';
        coeffHtml += '<tbody>';
        
        model.coefficients.forEach(coeff => {
            const pValue = coeff.p_value;
            const pValueClass = pValue < 0.01 ? 'pvalue-significant' : 
                              pValue < 0.05 ? 'pvalue-moderate' : 
                              pValue < 0.1 ? 'pvalue-weak' : 'pvalue-not-significant';
            
            coeffHtml += '<tr>';
            coeffHtml += `<td style="border-right: 1px solid #dee2e6; padding: 8px; color: #000000;"><strong style="color: #000000;">${coeff.parameter}</strong></td>`;
            coeffHtml += `<td style="border-right: 1px solid #dee2e6; padding: 8px; text-align: center;">${coeff.coefficient !== null && coeff.coefficient !== undefined ? coeff.coefficient.toFixed(6) : 'N/A'}</td>`;
            coeffHtml += `<td class="hide-mobile" style="border-right: 1px solid #dee2e6; padding: 8px; text-align: center;">${coeff.std_error !== null && coeff.std_error !== undefined ? coeff.std_error.toFixed(6) : 'N/A'}</td>`;
            coeffHtml += `<td class="hide-mobile" style="border-right: 1px solid #dee2e6; padding: 8px; text-align: center;">${coeff.t_value !== null && coeff.t_value !== undefined ? coeff.t_value.toFixed(4) : 'N/A'}</td>`;
            coeffHtml += `<td class="${pValueClass}" style="border-right: 1px solid #dee2e6; padding: 8px; text-align: center;">${pValue !== null && pValue !== undefined ? pValue.toFixed(6) : 'N/A'}</td>`;
            coeffHtml += `<td class="hide-small" style="border-right: 1px solid #dee2e6; padding: 8px; text-align: center;">${coeff.ci_lower !== null && coeff.ci_lower !== undefined ? coeff.ci_lower.toFixed(6) : 'N/A'}</td>`;
            coeffHtml += `<td class="hide-small" style="padding: 8px; text-align: center;">${coeff.ci_upper !== null && coeff.ci_upper !== undefined ? coeff.ci_upper.toFixed(6) : 'N/A'}</td>`;
            coeffHtml += '</tr>';
        });
        
        coeffHtml += '</tbody>';
        coeffHtml += '</table>';
        coeffHtml += '</div>';
        
        // Layout a card per smartphone
        coeffHtml += '<div class="coefficients-cards">';
        model.coefficients.forEach(coeff => {
            const pValue = coeff.p_value;
            const pValueClass = pValue < 0.01 ? 'pvalue-significant' : 
                              pValue < 0.05 ? 'pvalue-moderate' : 
                              pValue < 0.1 ? 'pvalue-weak' : 'pvalue-not-significant';
            
            coeffHtml += '<div class="coefficient-card">';
            coeffHtml += `<div class="coefficient-card-header">`;
            coeffHtml += `<strong>${coeff.parameter}</strong>`;
            coeffHtml += `</div>`;
            coeffHtml += `<div class="coefficient-card-body">`;
            coeffHtml += `<div class="coefficient-info-row"><strong>Coefficiente:</strong> <span>${coeff.coefficient !== null && coeff.coefficient !== undefined ? coeff.coefficient.toFixed(6) : 'N/A'}</span></div>`;
            coeffHtml += `<div class="coefficient-info-row"><strong>Std Error:</strong> <span>${coeff.std_error !== null && coeff.std_error !== undefined ? coeff.std_error.toFixed(6) : 'N/A'}</span></div>`;
            coeffHtml += `<div class="coefficient-info-row"><strong>t-value:</strong> <span>${coeff.t_value !== null && coeff.t_value !== undefined ? coeff.t_value.toFixed(4) : 'N/A'}</span></div>`;
            coeffHtml += `<div class="coefficient-info-row ${pValueClass}"><strong>P-value:</strong> <span>${pValue !== null && pValue !== undefined ? pValue.toFixed(6) : 'N/A'}</span></div>`;
            coeffHtml += `<div class="coefficient-info-row"><strong>CI 95%:</strong> <span>[${coeff.ci_lower !== null && coeff.ci_lower !== undefined ? coeff.ci_lower.toFixed(6) : 'N/A'}, ${coeff.ci_upper !== null && coeff.ci_upper !== undefined ? coeff.ci_upper.toFixed(6) : 'N/A'}]</span></div>`;
            coeffHtml += `</div>`;
            coeffHtml += `</div>`;
        });
        coeffHtml += '</div>';
        
        coeffHtml += '</div>';
        
        if (coeffTableEl) {
            coeffTableEl.innerHTML = coeffHtml;
            coeffTableEl.style.display = 'block';
            
            // Forza la visualizzazione delle card su smartphone dopo il rendering
            setTimeout(() => {
                if (window.innerWidth <= 480) {
                    const cardsContainer = coeffTableEl.querySelector('.coefficients-cards');
                    if (cardsContainer) {
                        cardsContainer.style.display = 'block';
                    }
                    const tableWrapper = coeffTableEl.querySelector('.coefficients-table-wrapper');
                    if (tableWrapper) {
                        tableWrapper.style.display = 'none';
                    }
                }
            }, 100);
        }
    } else {
        if (coeffTableEl) {
            coeffTableEl.innerHTML = '<p>Nessun coefficiente disponibile</p>';
            coeffTableEl.style.display = 'block';
        }
    }
    
    if (summaryTextEl) {
        let summaryText = '';
        
        // Aggiungi informazioni di configurazione se disponibili
        if (model.config_info) {
            const config = model.config_info;
            summaryText += '=== CONFIGURAZIONE ===\n';
            summaryText += `Smoothing: ${config.smoothing_window > 1 ? `Finestra ${config.smoothing_window}` : 'Nessuno'}\n`;
            summaryText += `Log: ${config.log_transform ? 'Applicata' : 'Non applicata'}\n`;
            summaryText += `Differencing: Ordine ${config.differencing_order || 0}\n`;
            summaryText += `Train Obs: ${config.train_obs || 'N/A'}\n\n`;
        }
        
        // Aggiungi summary del modello
        if (model.model_summary) {
            summaryText += '=== SUMMARY MODELLO ===\n';
            summaryText += model.model_summary;
        } else {
            summaryText += 'Summary non disponibile';
        }
        
        summaryTextEl.textContent = summaryText;
        summaryTextEl.style.display = 'block';
        
        // Mostra il pulsante di export se c'è un summary valido
        const exportBtn = document.getElementById('export-summary-btn');
        if (exportBtn && summaryText && summaryText !== 'Summary non disponibile') {
            exportBtn.style.display = 'block';
            // Salva il summary nel dataset dell'elemento per l'export
            exportBtn.dataset.summary = summaryText;
            exportBtn.dataset.modelOrder = model.order || 'N/A';
            exportBtn.dataset.fileName = model.file_name || 'modello';
        } else if (exportBtn) {
            exportBtn.style.display = 'none';
        }
    }
    
    if (model.metrics) {
        let metricsHtml = '<h3>Metriche di Performance</h3><table class="metrics-table" style="border-collapse: collapse; width: 100%;"><thead><tr>';
        metricsHtml += '<th style="border-right: 1px solid #dee2e6; padding: 8px; text-align: left;">Metrica</th>';
        metricsHtml += '<th style="border-right: 1px solid #dee2e6; padding: 8px; text-align: center;">Training</th>';
        metricsHtml += '<th style="padding: 8px; text-align: center;">Test</th>';
        metricsHtml += '</tr></thead><tbody>';
        
        const metrics = ['r_squared', 'mape', 'mae', 'rmse'];
        const labels = {'r_squared': 'R²', 'mape': 'MAPE (%)', 'mae': 'MAE', 'rmse': 'RMSE'};
        
        metrics.forEach(metric => {
            const trainVal = model.metrics.training?.[metric];
            const testVal = model.metrics.test?.[metric];
            metricsHtml += `<tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px; color: #000000;"><strong>${labels[metric]}</strong></td>
                <td style="border-right: 1px solid #dee2e6; padding: 8px; text-align: center; color: #000000;">${trainVal !== undefined && trainVal !== null ? trainVal.toFixed(4) : 'N/A'}</td>
                <td style="padding: 8px; text-align: center; color: #000000;">${testVal !== undefined && testVal !== null ? testVal.toFixed(4) : 'N/A'}</td>
            </tr>`;
        });
        
        metricsHtml += '</tbody></table>';
        if (metricsDisplayEl) {
            metricsDisplayEl.innerHTML = metricsHtml;
            metricsDisplayEl.style.display = 'block';
            // Forza il rendering per evitare problemi di visualizzazione durante lo scroll
            metricsDisplayEl.offsetHeight; // Trigger reflow
            // Assicurati che rimanga visibile anche dopo lo scroll
            metricsDisplayEl.style.visibility = 'visible';
            metricsDisplayEl.style.opacity = '1';
            metricsDisplayEl.style.height = 'auto';
            // Forza un re-layout per assicurarsi che l'elemento sia completamente renderizzato
            requestAnimationFrame(() => {
                if (metricsDisplayEl) {
                    metricsDisplayEl.style.display = 'block';
                    metricsDisplayEl.style.visibility = 'visible';
                }
            });
        }
    } else {
        // Se non ci sono metriche, assicurati che l'elemento sia comunque gestito correttamente
        if (metricsDisplayEl) {
            metricsDisplayEl.style.display = 'none';
        }
    }
    
    // Mostra sezioni risultati (verifica che esistano)
    const resultsSection = document.getElementById('results-section');
    const chartsSection = document.getElementById('charts-section');
    
    if (resultsSection) {
        resultsSection.style.display = 'block';
    }
    
    if (chartsSection) {
        chartsSection.style.display = 'block';
        // Assicurati che i pulsanti del paper siano visibili quando la sezione charts è visibile
        setTimeout(() => {
            const generateBtn = document.getElementById('generate-paper-btn');
            if (generateBtn && (generateBtn.style.display === 'none' || generateBtn.style.display === '')) {
                generateBtn.style.display = 'inline-block';
            }
            if (currentRunId) {
                updatePaperButtons(currentRunId);
            } else {
                ensurePaperButtonsVisible();
            }
        }, 200);
    }
    
    // Carica e mostra grafici confronto (dopo aver mostrato le sezioni)
    // Usa un piccolo delay per assicurarsi che gli elementi siano visibili
    setTimeout(async () => {
        await loadForecastCharts();
        
        // Aggiorna i pulsanti del paper se abbiamo un run_id
        if (currentRunId) {
            // Aspetta un po' di più per assicurarsi che la sezione charts sia completamente renderizzata
            setTimeout(async () => {
                await updatePaperButtons(currentRunId);
            }, 300);
        } else {
            // Se non c'è runId ma c'è modelId, mostra comunque il pulsante
            ensurePaperButtonsVisible();
        }
    }, 150);
    
    // IMPORTANTE: restituisci i dati del modello
    return model;
}
async function loadForecastCharts(modelId = null) {
    const targetModelId = modelId || currentModelId;
    
    if (!targetModelId) {
        console.warn('Nessun model_id disponibile per caricare i grafici');
        return;
    }
    
    // Verifica che gli elementi esistano
    const trainChartEl = document.getElementById('train-chart');
    const testChartEl = document.getElementById('test-chart');
    
    if (!trainChartEl || !testChartEl) {
        console.warn('Elementi grafici non trovati, attendo che le sezioni siano visibili...');
        // Attendi un po' e riprova (max 5 tentativi)
        if (typeof loadForecastCharts.retryCount === 'undefined') {
            loadForecastCharts.retryCount = 0;
        }
        if (loadForecastCharts.retryCount < 5) {
            loadForecastCharts.retryCount++;
            setTimeout(() => loadForecastCharts(), 200);
        } else {
            loadForecastCharts.retryCount = 0;
            console.error('Impossibile caricare i grafici: elementi non trovati dopo 5 tentativi');
        }
        return;
    }
    
    // Reset retry counter se gli elementi sono stati trovati
    loadForecastCharts.retryCount = 0;
    
    try {
        const response = await fetch(`/api/model/${targetModelId}/forecasts-chart`, {
            credentials: 'include'
        });
        if (!response.ok) {
            console.error('Errore nel caricamento dati grafici:', response.status, response.statusText);
            return;
        }
        
        const data = await response.json();
        
        // Grafico Training Set
        if (data.training && data.training.data && data.training.data.length > 0) {
            createTrainingChart(data.training.data);
        } else {
            console.warn('Nessun dato training disponibile per il grafico');
            if (trainChartEl) {
                trainChartEl.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">Nessun dato training disponibile</p>';
            }
        }
        
        // Grafico Test Set
        if (data.test && data.test.data && data.test.data.length > 0) {
            createTestChart(data.test.data);
        } else {
            console.warn('Nessun dato test disponibile per il grafico');
            if (testChartEl) {
                testChartEl.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">Nessun dato test disponibile</p>';
            }
        }
        
    } catch (error) {
        console.error('Errore nel caricamento grafici:', error);
        if (trainChartEl) {
            trainChartEl.innerHTML = '<p style="padding: 20px; text-align: center; color: red;">Errore nel caricamento grafico training</p>';
        }
        if (testChartEl) {
            testChartEl.innerHTML = '<p style="padding: 20px; text-align: center; color: red;">Errore nel caricamento grafico test</p>';
        }
    }
}
function createTrainingChart(trainData) {
    const chartEl = document.getElementById('train-chart');
    if (!chartEl) {
        console.error('Elemento train-chart non trovato');
        return;
    }
    
    const dates = trainData.map(d => d.date);
    const actual = trainData.map(d => d.actual);
    const fitted = trainData.map(d => d.forecasted);
    
    const traceActual = {
        x: dates,
        y: actual,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Observed (Training)',
        line: { color: '#1f4788', width: 2 },
        marker: { size: 4 },
        hovertemplate: '<b>Observed (Training)</b><br>' +
                      'Data: %{x|%d %B %Y}<br>' +
                      'Valore: %{y:.4f}<extra></extra>'
    };
    
    const traceFitted = {
        x: dates,
        y: fitted,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Fitted (Training)',
        line: { color: '#28a745', width: 2, dash: 'dash' },
        marker: { size: 4 },
        hovertemplate: '<b>Fitted (Training)</b><br>' +
                      'Data: %{x|%d %B %Y}<br>' +
                      'Valore: %{y:.4f}<extra></extra>'
    };
    
    const layout = {
        xaxis: {
            title: 'Data',
            type: 'date'
        },
        yaxis: {
            title: 'Valore'
        },
        hovermode: 'closest',
        legend: {
            x: 0,
            y: 1,
            bgcolor: 'rgba(255,255,255,0.8)'
        },
        height: 400,
        margin: { l: 50, r: 20, t: 20, b: 50 }
    };
    
    // Pulisci il grafico precedente e disegna quello nuovo
    Plotly.purge(chartEl);
    const config = {
        responsive: true,
        displayModeBar: true,
        toImageButtonOptions: {
            format: 'png',
            filename: 'training_chart',
            height: 800,
            width: 1200,
            scale: 2
        }
    };
    Plotly.newPlot(chartEl, [traceActual, traceFitted], layout, config);
}
function createTestChart(testData) {
    const chartEl = document.getElementById('test-chart');
    if (!chartEl) {
        console.error('Elemento test-chart non trovato');
        return;
    }
    
    const dates = testData.map(d => d.date);
    const actual = testData.map(d => d.actual);
    const forecasted = testData.map(d => d.forecasted);
    const ciLower = testData.map(d => d.ci_lower).filter(v => v !== null);
    const ciUpper = testData.map(d => d.ci_upper).filter(v => v !== null);
    
    const traceActual = {
        x: dates,
        y: actual,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Observed (Test)',
        line: { color: '#1f4788', width: 2 },
        marker: { size: 5 },
        hovertemplate: '<b>Observed (Test)</b><br>' +
                      'Data: %{x|%d %B %Y}<br>' +
                      'Valore: %{y:.4f}<extra></extra>'
    };
    
    const traceForecast = {
        x: dates,
        y: forecasted,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Forecast (Test)',
        line: { color: '#dc3545', width: 2, dash: 'dash' },
        marker: { size: 5 },
        hovertemplate: '<b>Forecast (Test)</b><br>' +
                      'Data: %{x|%d %B %Y}<br>' +
                      'Valore: %{y:.4f}<extra></extra>'
    };
    
    const traces = [traceActual, traceForecast];
    
    // Aggiungi intervalli di confidenza se disponibili
    if (ciLower.length > 0 && ciUpper.length > 0) {
        const traceCIUpper = {
            x: dates,
            y: ciUpper,
            type: 'scatter',
            mode: 'lines',
            name: 'CI 95% Upper',
            line: { color: 'rgba(220, 53, 69, 0.3)', width: 1 },
            showlegend: false,
            hoverinfo: 'skip'
        };
        
        const traceCILower = {
            x: dates,
            y: ciLower,
            type: 'scatter',
            mode: 'lines',
            name: 'CI 95% Lower',
            line: { color: 'rgba(220, 53, 69, 0.3)', width: 1 },
            fill: 'tonexty',
            fillcolor: 'rgba(220, 53, 69, 0.1)',
            showlegend: true
        };
        
        traces.push(traceCIUpper, traceCILower);
    }
    
    const layout = {
        xaxis: {
            title: 'Data',
            type: 'date'
        },
        yaxis: {
            title: 'Valore'
        },
        hovermode: 'closest',
        legend: {
            x: 0,
            y: 1,
            bgcolor: 'rgba(255,255,255,0.8)'
        },
        height: 400,
        margin: { l: 50, r: 20, t: 20, b: 50 }
    };
    
    // Pulisci il grafico precedente e disegna quello nuovo
    Plotly.purge(chartEl);
    const config = {
        responsive: true,
        displayModeBar: true,
        toImageButtonOptions: {
            format: 'png',
            filename: 'test_chart',
            height: 800,
            width: 1200,
            scale: 2
        }
    };
    Plotly.newPlot(chartEl, traces, layout, config);
}

// TRASFORMAZIONE LOGARITMICA
async function applyLogTransform() {
    if (!currentFileId) {
        showToast('Devi prima caricare un file!', 'warning');
        return;
    }
    
    const applyLog = document.getElementById('apply-log-checkbox').checked;
    const statusEl = document.getElementById('log-transform-status');
    const btnEl = document.getElementById('apply-log-btn');
    const resultsEl = document.getElementById('log-transform-results');
    
    try {
        statusEl.innerHTML = 'Applicazione trasformazione log in corso...';
        btnEl.disabled = true;
        
        const response = await fetch(`/api/file/${currentFileId}/apply-log-transform`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                apply_log: applyLog
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Errore nell\'applicazione trasformazione log');
        }
        
        const result = await response.json();
        
        if (applyLog) {
            // Aggiorna numero totale osservazioni
            totalObservations = result.n_observations;
            const totalObsDisplay = document.getElementById('total-obs-display');
            if (totalObsDisplay) {
                totalObsDisplay.textContent = totalObservations;
            }
            
            // Aggiorna max train_obs
            const trainObsInput = document.getElementById('train-obs');
            if (trainObsInput) {
                trainObsInput.max = totalObservations - 1;
                if (parseInt(trainObsInput.value) >= totalObservations) {
                    const newDefault = Math.floor(totalObservations * 0.8);
                    trainObsInput.value = newDefault;
                    trainObsInput.dispatchEvent(new Event('input'));
                }
            }
            
            statusEl.innerHTML = 
                `✅ Trasformazione logaritmica applicata con successo!<br>
                 <strong>Osservazioni:</strong> ${result.n_observations} (originali: ${result.original_obs})`;
            
            // Mostra risultati
            resultsEl.style.display = 'block';
            
            // Mostra grafico serie trasformata
            if (result.data && result.data.length > 0) {
                // Assicurati che il container sia visibile prima di creare il grafico
                const chartContainer = document.getElementById('log-transform-chart');
                if (chartContainer) {
                    let parent = chartContainer.parentElement;
                    while (parent && parent !== document.body) {
                        if (parent.style.display === 'none') {
                            parent.style.display = 'block';
                        }
                        parent = parent.parentElement;
                    }
                }
                
                createTimeSeriesPlot(result.data, 'log-transform-chart', 'Serie Trasformata Log');
                
                // Forza il ridisegno dopo che il grafico è stato creato
                setTimeout(() => {
                    Plotly.Plots.resize('log-transform-chart');
                }, 150);
            }
            
            // Mostra statistiche
            if (result.statistics) {
                displayLogTransformStats(result.statistics);
            }
            
            // Mostra ACF/PACF
            if (result.acf_pacf) {
                createACFPlot(result.acf_pacf, 'log-transform-acf-plot');
                createPACFPlot(result.acf_pacf, 'log-transform-pacf-plot');
                document.getElementById('log-transform-acf-pacf').style.display = 'block';
            }
        } else {
            statusEl.innerHTML = '✅ Trasformazione logaritmica rimossa';
            resultsEl.style.display = 'none';
        }
        
        btnEl.disabled = false;
        
        // Nascondi sezioni risultati (8 e 9) quando si modifica la trasformazione log
        hideResultsSections();
        
    } catch (error) {
        console.error('Errore trasformazione log:', error);
        statusEl.innerHTML = 
            `<span style="color:red;">❌ Errore: ${error.message}</span>`;
        btnEl.disabled = false;
    }
}
function displayLogTransformStats(stats) {
    const statsHtml = `
        <table class="stats-table" style="border-collapse: collapse;">
            <tr>
                <th style="border-right: 1px solid #dee2e6; padding: 8px;">Statistiche</th>
                <th style="padding: 8px;">Valore</th>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Numero Osservazioni</strong></td>
                <td style="padding: 8px;">${stats.obs_count}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Media</strong></td>
                <td style="padding: 8px;">${stats.mean.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Deviazione Standard</strong></td>
                <td style="padding: 8px;">${stats.std.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Minimo</strong></td>
                <td style="padding: 8px;">${stats.min.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Massimo</strong></td>
                <td style="padding: 8px;">${stats.max.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Mediana</strong></td>
                <td style="padding: 8px;">${stats.median.toFixed(4)}</td>
            </tr>
        </table>
    `;
    document.getElementById('log-transform-stats').innerHTML = statsHtml;
}

// DIFFERENZIAZIONE
async function applyDifferencing() {
    if (!isAuthenticated) {
        showToast('Devi prima effettuare il login!', 'warning');
        return;
    }
    
    if (!currentFileId) {
        showToast('Devi prima caricare un file!', 'warning');
        return;
    }
    
    // Cancella risultati precedenti quando cambia differenziazione
    clearPreviousResults();
    
    const order = parseInt(document.getElementById('differencing-order').value);
    const statusEl = document.getElementById('differencing-status');
    const btnEl = document.getElementById('apply-differencing-btn');
    const resultsEl = document.getElementById('differencing-results');
    
    try {
        statusEl.innerHTML = 'Applicazione differenziazione in corso...';
        btnEl.disabled = true;
        
        const response = await fetch(`/api/file/${currentFileId}/apply-differencing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                order: order
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Errore nell\'applicazione differenziazione');
        }
        
        const result = await response.json();
        
        if (order > 0) {
            // Aggiorna numero totale osservazioni
            totalObservations = result.n_observations;
            const totalObsDisplay = document.getElementById('total-obs-display');
            if (totalObsDisplay) {
                totalObsDisplay.textContent = totalObservations;
            }
            
            // Aggiorna max train_obs
            const trainObsInput = document.getElementById('train-obs');
            if (trainObsInput) {
                trainObsInput.max = totalObservations - 1;
                if (parseInt(trainObsInput.value) >= totalObservations) {
                    const newDefault = Math.floor(totalObservations * 0.8);
                    trainObsInput.value = newDefault;
                    trainObsInput.dispatchEvent(new Event('input'));
                }
            }
            
            statusEl.innerHTML = 
                `✅ Differenziazione ordine ${order} applicata con successo!<br>
                 <strong>Osservazioni:</strong> ${result.n_observations} (originali: ${result.original_obs}, rimosse: ${result.removed_obs})`;
            
            // Mostra risultati
            resultsEl.style.display = 'block';
            
            // Mostra grafico serie differenziata
            if (result.data && result.data.length > 0) {
                // Assicurati che il container sia visibile prima di creare il grafico
                const chartContainer = document.getElementById('differencing-chart');
                if (chartContainer) {
                    let parent = chartContainer.parentElement;
                    while (parent && parent !== document.body) {
                        if (parent.style.display === 'none') {
                            parent.style.display = 'block';
                        }
                        parent = parent.parentElement;
                    }
                }
                
                createTimeSeriesPlot(result.data, 'differencing-chart', `Serie Differenziata (ordine ${order})`);
                
                // Forza il ridisegno dopo che il grafico è stato creato
                setTimeout(() => {
                    Plotly.Plots.resize('differencing-chart');
                }, 150);
            }
            
            // Mostra statistiche
            if (result.statistics) {
                displayDifferencingStats(result.statistics);
            }
            
            // Mostra ACF/PACF
            if (result.acf_pacf) {
                createACFPlot(result.acf_pacf, 'differencing-acf-plot');
                createPACFPlot(result.acf_pacf, 'differencing-pacf-plot');
                document.getElementById('differencing-acf-pacf').style.display = 'block';
            }
        } else {
            statusEl.innerHTML = '✅ Differenziazione rimossa';
            resultsEl.style.display = 'none';
        }
        
        btnEl.disabled = false;
        
        // Nascondi sezioni risultati (8 e 9) quando si modifica la differenziazione
        hideResultsSections();
        
    } catch (error) {
        console.error('Errore differenziazione:', error);
        statusEl.innerHTML = 
            `<span style="color:red;">❌ Errore: ${error.message}</span>`;
        btnEl.disabled = false;
    }
}
function displayDifferencingStats(stats) {
    const statsHtml = `
        <table class="stats-table" style="border-collapse: collapse;">
            <tr>
                <th style="border-right: 1px solid #dee2e6; padding: 8px;">Statistiche</th>
                <th style="padding: 8px;">Valore</th>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Numero Osservazioni</strong></td>
                <td style="padding: 8px;">${stats.obs_count}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Media</strong></td>
                <td style="padding: 8px;">${stats.mean.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Deviazione Standard</strong></td>
                <td style="padding: 8px;">${stats.std.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Minimo</strong></td>
                <td style="padding: 8px;">${stats.min.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Massimo</strong></td>
                <td style="padding: 8px;">${stats.max.toFixed(4)}</td>
            </tr>
            <tr>
                <td style="border-right: 1px solid #dee2e6; padding: 8px;"><strong>Mediana</strong></td>
                <td style="padding: 8px;">${stats.median.toFixed(4)}</td>
            </tr>
        </table>
    `;
    document.getElementById('differencing-stats').innerHTML = statsHtml;
}

// ANALISI AI ACF/PACF
let aiRecommendation = null;
let aiSmoothedRecommendation = null;
let aiLogRecommendation = null;
let aiDiffRecommendation = null;

// Oggetto per tracciare quali analisi sono state fatte (per salvarle nel ModelRun)
let acfPacfAnalyses = {
    original: null,
    smoothed: null,
    log: null,
    diff: null
};

// Funzione per mostrare un'analisi ACF/PACF salvata
function displaySavedACFAnalysis(seriesType, recommendation) {
    const isSmoothed = seriesType === 'smoothed';
    const isLog = seriesType === 'log';
    const isDiff = seriesType === 'diff';
    
    let resultEl, recEl;
    
    if (isSmoothed) {
        resultEl = document.getElementById('ai-analysis-smoothed-result');
        recEl = document.getElementById('ai-smoothed-recommendation-content');
    } else if (isLog) {
        resultEl = document.getElementById('ai-analysis-log-result');
        recEl = document.getElementById('ai-log-recommendation-content');
    } else if (isDiff) {
        resultEl = document.getElementById('ai-analysis-diff-result');
        recEl = document.getElementById('ai-diff-recommendation-content');
    } else {
        resultEl = document.getElementById('ai-analysis-result');
        recEl = document.getElementById('ai-recommendation-content');
    }
    
    if (!resultEl || !recEl || !recommendation) return;
    
    const rec = recommendation;
    
    let recHtml = '';
    const ts = rec.transform_suggestion || {};
    let transformLine = '';
    const transformParts = [];
    if (ts.suggest_differencing) {
        transformParts.push(`Differencing d=${ts.differencing_order != null ? ts.differencing_order : rec.d}`);
    }
    if (ts.suggest_smoothing && ts.recommended_smoothing_window) {
        transformParts.push(`Smoothing (finestra ${ts.recommended_smoothing_window})`);
    }
    if (transformParts.length === 0) {
        transformLine = '<p><strong>Trasformazioni consigliate:</strong> Nessuna trasformazione aggiuntiva consigliata.</p>';
    } else {
        transformLine = `<p><strong>Trasformazioni consigliate:</strong> ${transformParts.join(' e ')}</p>`;
    }
    
    if (rec.type === 'SARIMA') {
        recHtml = `
            <p><strong>Modello suggerito:</strong> SARIMA(${rec.p}, ${rec.d}, ${rec.q})(${rec.P}, ${rec.D}, ${rec.Q}, ${rec.m})</p>
            <p><strong>Parametri non stagionali:</strong> p=${rec.p}, d=${rec.d}, q=${rec.q}</p>
            <p><strong>Parametri stagionali:</strong> P=${rec.P}, D=${rec.D}, Q=${rec.Q}, m=${rec.m}</p>
            ${transformLine}
        `;
    } else {
        recHtml = `
            <p><strong>Modello suggerito:</strong> ARIMA(${rec.p}, ${rec.d}, ${rec.q})</p>
            <p><strong>Parametri:</strong> p=${rec.p}, d=${rec.d}, q=${rec.q}</p>
            ${transformLine}
        `;
    }
    
    recEl.innerHTML = recHtml;
    resultEl.style.display = 'block';
}
async function analyzeACFPACFWithAI(seriesType = 'original') {
    if (!currentFileId) {
        showToast('Devi prima caricare un file!', 'warning');
        return;
    }
    
    // Determina quale serie analizzare
    const isSmoothed = seriesType === 'smoothed';
    const isLog = seriesType === 'log';
    const isDiff = seriesType === 'diff';
    
    let statusEl, btnEl, resultEl, descEl, recEl, recContentEl;
    
    if (isSmoothed) {
        statusEl = document.getElementById('ai-analysis-smoothed-status');
        btnEl = document.getElementById('analyze-ai-smoothed-btn');
        resultEl = document.getElementById('ai-analysis-smoothed-result');
        descEl = document.getElementById('ai-smoothed-description');
        recEl = document.getElementById('ai-smoothed-recommendation-content');
    } else if (isLog) {
        statusEl = document.getElementById('ai-analysis-log-status');
        btnEl = document.getElementById('analyze-ai-log-btn');
        resultEl = document.getElementById('ai-analysis-log-result');
        descEl = document.getElementById('ai-log-description');
        recEl = document.getElementById('ai-log-recommendation-content');
    } else if (isDiff) {
        statusEl = document.getElementById('ai-analysis-diff-status');
        btnEl = document.getElementById('analyze-ai-diff-btn');
        resultEl = document.getElementById('ai-analysis-diff-result');
        descEl = document.getElementById('ai-diff-description');
        recEl = document.getElementById('ai-diff-recommendation-content');
    } else {
        statusEl = document.getElementById('ai-analysis-status');
        btnEl = document.getElementById('analyze-ai-btn');
        resultEl = document.getElementById('ai-analysis-result');
        descEl = document.getElementById('ai-description');
        recEl = document.getElementById('ai-recommendation-content');
    }
    
    if (!statusEl || !btnEl) {
        console.error('Elementi analisi AI non trovati');
        return;
    }
    
    try {
        statusEl.innerHTML = '🔄 Analisi automatica ACF/PACF in corso...';
        btnEl.disabled = true;
        if (resultEl) resultEl.style.display = 'none';
        if (descEl) {
            descEl.textContent = '';
            descEl.style.display = 'none';
        }
        
        // Invia il tipo di serie nel body della richiesta
        const response = await fetch(`/api/file/${currentFileId}/analyze-acf-pacf-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                series_type: seriesType  // 'original' o 'smoothed'
            })
        });
        
        if (!response.ok) {
            let errorMessage = 'Errore nell\'analisi AI';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = `Errore HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        if (result.success) {
            statusEl.innerHTML = '✅ Analisi automatica completata con successo!';
            
            // Mostra descrizione solo se fornita (altrimenti nascondi il box per evitare spazio vuoto)
            if (descEl) {
                if (result.description && result.description.trim().length > 0) {
                    descEl.textContent = result.description;
                    descEl.style.display = 'block';
                } else {
                    descEl.textContent = '';
                    descEl.style.display = 'none';
                }
            }
            
            // Mostra raccomandazione
            if (recEl && result.recommendation) {
                // Salva la raccomandazione nella variabile appropriata
                if (isSmoothed) {
                    aiSmoothedRecommendation = result.recommendation;
                    acfPacfAnalyses.smoothed = result.recommendation;
                } else if (isLog) {
                    aiLogRecommendation = result.recommendation;
                    acfPacfAnalyses.log = result.recommendation;
                } else if (isDiff) {
                    aiDiffRecommendation = result.recommendation;
                    acfPacfAnalyses.diff = result.recommendation;
                } else {
                    aiRecommendation = result.recommendation;
                    acfPacfAnalyses.original = result.recommendation;
                }
                
                const rec = result.recommendation;
                
                let recHtml = '';
                const ts = rec.transform_suggestion || {};
                let transformLine = '';
                const transformParts = [];
                if (ts.suggest_differencing) {
                    transformParts.push(`Differencing d=${ts.differencing_order != null ? ts.differencing_order : rec.d}`);
                }
                if (ts.suggest_smoothing && ts.recommended_smoothing_window) {
                    transformParts.push(`Smoothing (finestra ${ts.recommended_smoothing_window})`);
                }
                if (transformParts.length === 0) {
                    transformLine = '<p><strong>Trasformazioni consigliate:</strong> Nessuna trasformazione aggiuntiva consigliata.</p>';
                } else {
                    transformLine = `<p><strong>Trasformazioni consigliate:</strong> ${transformParts.join(' e ')}</p>`;
                }
                
                if (rec.type === 'SARIMA') {
                    recHtml = `
                        <p><strong>Modello suggerito:</strong> SARIMA(${rec.p}, ${rec.d}, ${rec.q})(${rec.P}, ${rec.D}, ${rec.Q}, ${rec.m})</p>
                        <p><strong>Parametri non stagionali:</strong> p=${rec.p}, d=${rec.d}, q=${rec.q}</p>
                        <p><strong>Parametri stagionali:</strong> P=${rec.P}, D=${rec.D}, Q=${rec.Q}, m=${rec.m}</p>
                        ${transformLine}
                    `;
                } else {
                    recHtml = `
                        <p><strong>Modello suggerito:</strong> ARIMA(${rec.p}, ${rec.d}, ${rec.q})</p>
                        <p><strong>Parametri:</strong> p=${rec.p}, d=${rec.d}, q=${rec.q}</p>
                        ${transformLine}
                    `;
                }
                recEl.innerHTML = recHtml;
            } else {
                if (recEl) {
                    recEl.innerHTML = '<p>Nessuna raccomandazione specifica disponibile. Consulta la descrizione per dettagli.</p>';
                }
            }
            
            if (resultEl) resultEl.style.display = 'block';
        } else {
            statusEl.innerHTML = `<span style="color:red;">❌ Errore: ${result.error || 'Errore sconosciuto'}</span>`;
        }
        
        btnEl.disabled = false;
        
    } catch (error) {
        console.error('Errore analisi AI:', error);
        statusEl.innerHTML = 
            `<span style="color:red;">❌ Errore analisi ACF/PACF: ${error.message}</span>`;
        btnEl.disabled = false;
    }
}
function applyAIRecommendation(seriesType = 'original') {
    const isSmoothed = seriesType === 'smoothed';
    const isLog = seriesType === 'log';
    const isDiff = seriesType === 'diff';
    
    let recommendation;
    if (isSmoothed) {
        recommendation = aiSmoothedRecommendation;
    } else if (isLog) {
        recommendation = aiLogRecommendation;
    } else if (isDiff) {
        recommendation = aiDiffRecommendation;
    } else {
        recommendation = aiRecommendation;
    }
    
    if (!recommendation) {
        showToast('Nessuna raccomandazione disponibile. Esegui prima l\'analisi AI.', 'warning');
        return;
    }
    
    // Compila automaticamente i campi SARIMAX con la raccomandazione
    const rec = recommendation;
    
    const pInput = document.getElementById('sarimax-p');
    const dInput = document.getElementById('sarimax-d');
    const qInput = document.getElementById('sarimax-q');
    const PInput = document.getElementById('sarimax-P');
    const DInput = document.getElementById('sarimax-D');
    const QInput = document.getElementById('sarimax-Q');
    const mInput = document.getElementById('sarimax-m');
    
    if (pInput) pInput.value = rec.p || 0;
    if (dInput) dInput.value = rec.d || 0;
    if (qInput) qInput.value = rec.q || 0;
    
    if (rec.type === 'SARIMA') {
        if (PInput) PInput.value = rec.P || 0;
        if (DInput) DInput.value = rec.D || 0;
        if (QInput) QInput.value = rec.Q || 0;
        if (mInput) mInput.value = rec.m || 0;
    } else {
        if (PInput) PInput.value = 0;
        if (DInput) DInput.value = 0;
        if (QInput) QInput.value = 0;
        if (mInput) mInput.value = 0;
    }
    
    // Mostra un messaggio di conferma
    let seriesTypeName = 'serie originale';
    if (isSmoothed) seriesTypeName = 'serie smussata';
    else if (isLog) seriesTypeName = 'serie trasformata log';
    else if (isDiff) seriesTypeName = 'serie differenziata';
    
    showToast(`Parametri ARIMA applicati (${seriesTypeName}): ${rec.type}(${rec.p}, ${rec.d}, ${rec.q})${rec.type === 'SARIMA' ? `(${rec.P}, ${rec.D}, ${rec.Q}, ${rec.m})` : ''}. Puoi ora eseguire il modello SARIMAX con questi parametri.`, 'success', 6000);
}

// GESTIONE STORICO MODELLI
async function loadModelRuns() {
    if (!isAuthenticated) {
        console.log('loadModelRuns: Utente non autenticato');
        return; // Non mostrare alert, semplicemente non fare nulla
    }
    
    const statusEl = document.getElementById('model-runs-status');
    const listEl = document.getElementById('model-runs-list');
    
    if (!statusEl || !listEl) {
        console.error('loadModelRuns: Elementi DOM non trovati');
        return;
    }
    
    try {
        console.log('loadModelRuns: Caricamento modelli per utente', currentUser?.user_id || 'unknown');
        statusEl.style.display = 'block';
        statusEl.className = 'status-message status-info';
        statusEl.innerHTML = 'Caricamento storico modelli in corso...';
        
        // Carica TUTTI i modelli dell'utente, non solo quelli del file corrente
        const response = await fetch('/api/user/model-runs', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('loadModelRuns: Response status', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('loadModelRuns: Errore response', response.status, errorText);
            throw new Error(`Errore nel caricamento dello storico modelli: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('loadModelRuns: Dati ricevuti', data.runs?.length || 0, 'modelli');
        
        if (data.runs && data.runs.length > 0) {
            // Inverti l'ordine per mostrare dal primo all'ultimo
            const runsReversed = [...data.runs].reverse();
            
            // Crea una tabella compatta con colonne separate (desktop) e card (mobile)
            let html = '<div class="model-runs-container" style="margin-top: 20px;">';
            
            // Tabella per desktop/tablet
            html += '<div class="model-runs-table-wrapper" style="overflow-x: auto; -webkit-overflow-scrolling: touch;">';
            html += '<table class="stats-table model-runs-table" style="font-size: 0.8rem; width: 100%; table-layout: fixed; border-collapse: collapse; min-width: 1150px;">';
            html += '<thead>';
            html += '<tr>';
            html += '<th class="col-num" style="width: 3%; text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px;">#</th>';
            html += '<th class="col-file" style="width: 11%; text-align: left; border-right: 1px solid #dee2e6; padding: 6px 4px;">File</th>';
            html += '<th class="col-model" style="width: 9%; text-align: left; border-right: 1px solid #dee2e6; padding: 6px 4px; font-family: monospace; font-size: 0.75rem;">Modello</th>';
            html += '<th class="col-total" style="width: 5%; text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px;">Total</th>';
            html += '<th class="col-train" style="width: 5%; text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px;">Train</th>';
            html += '<th class="col-test" style="width: 5%; text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px;">Test</th>';
            html += '<th class="col-smoothing" style="width: 5%; text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px;">Smooth</th>';
            html += '<th class="col-log" style="width: 3%; text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px;">Log</th>';
            html += '<th class="col-diff" style="width: 3%; text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px;">Diff</th>';
            html += '<th class="col-trend" style="width: 4%; text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px;">Trend</th>';
            html += '<th class="col-r2" style="width: 6%; text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px;">R² Test</th>';
            html += '<th class="col-mape" style="width: 6%; text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px;">MAPE</th>';
            // Colonna azioni con larghezza minima per rendere i pulsanti sempre cliccabili
            html += '<th class="col-actions" style="width: 10%; min-width: 110px; text-align: center; padding: 6px 4px;">Azioni</th>';
            html += '</tr>';
            html += '</thead>';
            html += '<tbody>';
            
            runsReversed.forEach((run, index) => {
                const date = new Date(run.created_at).toLocaleDateString('it-IT');
                const params = run.sarimax_params || {};
                const orderStr = run.is_seasonal 
                    ? `SARIMA(${params.p || 0},${params.d || 0},${params.q || 0})(${params.P || 0},${params.D || 0},${params.Q || 0},${params.m || 0})`
                    : `ARIMA(${params.p || 0},${params.d || 0},${params.q || 0})`;
                
                // Valori separati per le colonne
                const smoothingVal = (run.smoothing_window && run.smoothing_window > 1) ? run.smoothing_window : '-';
                const logVal = run.log_transform ? 'Sì' : 'No';
                const diffVal = (run.differencing_order && run.differencing_order > 0) ? run.differencing_order : '-';
                const trendVal = run.trend || 'n';
                const trainObsVal = (run.train_obs !== null && run.train_obs !== undefined) ? run.train_obs : '-';
                const totalObsVal = (run.total_obs !== null && run.total_obs !== undefined) ? run.total_obs : '-';
                const testObsVal = (run.test_obs !== null && run.test_obs !== undefined) ? run.test_obs : '-';
                
                const testR2 = (run.test_r2 !== null && run.test_r2 !== undefined) ? run.test_r2 : null;
                const testMape = (run.test_mape !== null && run.test_mape !== undefined) ? run.test_mape : null;
                
                html += '<tr>';
                html += `<td class="col-num" style="text-align: center; font-weight: bold; border-right: 1px solid #dee2e6; padding: 6px 4px;">${index + 1}</td>`;
                html += `<td class="col-file" style="text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-right: 1px solid #dee2e6; padding: 6px 4px; font-size: 0.75rem;" title="${run.file_name || 'N/A'}">${run.file_name || 'N/A'}</td>`;
                html += `<td class="col-model" style="text-align: left; font-family: monospace; font-size: 0.7rem; border-right: 1px solid #dee2e6; padding: 6px 4px;">${orderStr}</td>`;
                html += `<td class="col-total" style="text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px; font-size: 0.75rem;">${totalObsVal}</td>`;
                html += `<td class="col-train" style="text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px; font-size: 0.75rem;">${trainObsVal}</td>`;
                html += `<td class="col-test" style="text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px; font-size: 0.75rem;">${testObsVal}</td>`;
                html += `<td class="col-smoothing" style="text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px; font-size: 0.75rem;">${smoothingVal}</td>`;
                html += `<td class="col-log" style="text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px; font-size: 0.75rem;">${logVal}</td>`;
                html += `<td class="col-diff" style="text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px; font-size: 0.75rem;">${diffVal}</td>`;
                html += `<td class="col-trend" style="text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px; font-family: monospace; font-size: 0.7rem;">${trendVal}</td>`;
                html += `<td class="col-r2" style="text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px; font-size: 0.75rem;">${testR2 !== null ? testR2.toFixed(4) : 'N/A'}</td>`;
                html += `<td class="col-mape" style="text-align: center; border-right: 1px solid #dee2e6; padding: 6px 4px; font-size: 0.75rem;">${testMape !== null ? testMape.toFixed(2) + '%' : 'N/A'}</td>`;
                // Colonna azioni: layout flessibile che funziona bene sia su schermi piccoli che grandi
                html += '<td class="col-actions" style="text-align: center; padding: 6px 4px;">';
                html += '<div style="display: flex; flex-wrap: nowrap; justify-content: center; gap: 4px; align-items: center;">';
                html += `<button onclick="loadModelFromHistory(${run.run_id}, ${run.model_id}, ${run.file_id || 'null'})" class="btn-table-action btn-view" title="Visualizza risultati"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>`;
                if (run.paper_path) {
                    html += `<button onclick="openPaperFromHistory(${run.run_id})" class="btn-table-action btn-paper" title="Apri Paper"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>`;
                }
                html += `<button onclick="deleteModelRun(${run.run_id})" class="btn-table-action btn-delete" title="Elimina"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
                html += '</div>';
                html += '</td>';
                html += '</tr>';
            });
            
            html += '</tbody>';
            html += '</table>';
            html += '</div>';
            
            // Layout a card per smartphone
            html += '<div class="model-runs-cards">';
            runsReversed.forEach((run, index) => {
                const date = new Date(run.created_at).toLocaleDateString('it-IT');
                const params = run.sarimax_params || {};
                const orderStr = run.is_seasonal 
                    ? `SARIMA(${params.p || 0},${params.d || 0},${params.q || 0})(${params.P || 0},${params.D || 0},${params.Q || 0},${params.m || 0})`
                    : `ARIMA(${params.p || 0},${params.d || 0},${params.q || 0})`;
                
                const smoothingVal = (run.smoothing_window && run.smoothing_window > 1) ? run.smoothing_window : '-';
                const logVal = run.log_transform ? 'Sì' : 'No';
                const diffVal = (run.differencing_order && run.differencing_order > 0) ? run.differencing_order : '-';
                const trendVal = run.trend || 'n';
                const trainObsVal = (run.train_obs !== null && run.train_obs !== undefined) ? run.train_obs : '-';
                const totalObsVal = (run.total_obs !== null && run.total_obs !== undefined) ? run.total_obs : '-';
                const testObsVal = (run.test_obs !== null && run.test_obs !== undefined) ? run.test_obs : '-';
                
                const testR2 = (run.test_r2 !== null && run.test_r2 !== undefined) ? run.test_r2 : null;
                const testMape = (run.test_mape !== null && run.test_mape !== undefined) ? run.test_mape : null;
                
                html += '<div class="model-run-card">';
                html += `<div class="model-run-card-header">`;
                html += `<span class="model-run-number">#${index + 1}</span>`;
                html += `<span class="model-run-model">${orderStr}</span>`;
                html += `</div>`;
                html += `<div class="model-run-card-body">`;
                html += `<div class="model-run-info-row"><strong>File:</strong> <span>${run.file_name || 'N/A'}</span></div>`;
                html += `<div class="model-run-info-row"><strong>Osservazioni:</strong> <span>Total: ${totalObsVal}, Train: ${trainObsVal}, Test: ${testObsVal}</span></div>`;
                html += `<div class="model-run-info-row"><strong>Trasformazioni:</strong> <span>Smoothing: ${smoothingVal}, Log: ${logVal}, Diff: ${diffVal}, Trend: ${trendVal}</span></div>`;
                html += `<div class="model-run-metrics">`;
                html += `<div class="model-run-metric"><strong>R² Test:</strong> <span>${testR2 !== null ? testR2.toFixed(4) : 'N/A'}</span></div>`;
                html += `<div class="model-run-metric"><strong>MAPE Test:</strong> <span>${testMape !== null ? testMape.toFixed(2) + '%' : 'N/A'}</span></div>`;
                html += `</div>`;
                html += `</div>`;
                html += `<div class="model-run-card-actions">`;
                html += `<button onclick="loadModelFromHistory(${run.run_id}, ${run.model_id}, ${run.file_id || 'null'})" class="btn-card-action btn-view">Visualizza</button>`;
                if (run.paper_path) {
                    html += `<button onclick="openPaperFromHistory(${run.run_id})" class="btn-card-action btn-paper">Paper</button>`;
                }
                html += `<button onclick="deleteModelRun(${run.run_id})" class="btn-card-action btn-delete">Elimina</button>`;
                html += `</div>`;
                html += `</div>`;
            });
            html += '</div>';
            
            html += '</div>';
            listEl.innerHTML = html;
            statusEl.className = 'status-message status-success';
            statusEl.innerHTML = `${data.runs.length} ${data.runs.length === 1 ? 'modello trovato' : 'modelli trovati'} nello storico`;
            
            // Forza la visualizzazione delle card su smartphone dopo il rendering
            setTimeout(() => {
                const cardsContainer = listEl.querySelector('.model-runs-cards');
                const tableContainer = listEl.querySelector('.model-runs-table-wrapper');
                if (window.innerWidth <= 480) {
                    if (cardsContainer) {
                        cardsContainer.style.display = 'block !important';
                    }
                    if (tableContainer) {
                        tableContainer.style.display = 'none !important';
                    }
                }
            }, 100);
        } else {
            console.log('loadModelRuns: Nessun modello trovato');
            listEl.innerHTML = '<div class="empty-state"><p>Nessun modello presente nello storico</p><span>I modelli addestrati appariranno qui</span></div>';
            statusEl.className = 'status-message';
            statusEl.innerHTML = 'Storico vuoto';
        }
        
        // Mostra SEMPRE la sezione, anche se non ci sono modelli
        const sectionEl = document.getElementById('model-runs-section');
        if (sectionEl) {
            sectionEl.style.display = 'block';
            console.log('loadModelRuns: Sezione storico modelli mostrata');
        } else {
            console.error('loadModelRuns: Sezione model-runs-section non trovata');
        }
        
    } catch (error) {
        console.error('Errore caricamento modelli:', error);
        statusEl.style.display = 'block';
        statusEl.className = 'status-message status-error';
        statusEl.innerHTML = `Errore nel caricamento: ${error.message}`;
        listEl.innerHTML = '<div class="empty-state error"><p>Impossibile caricare lo storico modelli</p><span>Verifica la connessione e riprova</span></div>';
        
        // Mostra comunque la sezione per permettere all'utente di vedere l'errore
        const sectionEl = document.getElementById('model-runs-section');
        if (sectionEl) {
            sectionEl.style.display = 'block';
        }
    }
}

// Funzione downloadModelPDF rimossa - export PDF non più disponibile

// CARICA ULTIMO FILE E STORICO
async function loadLastFileAndHistory() {
    if (!isAuthenticated) {
        return;
    }
    
    try {
        // Ottieni tutti i file dell'utente
        const response = await fetch('/api/user/files', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.warn('Impossibile caricare i file dell\'utente');
            return;
        }
        
        const data = await response.json();
        
        if (data.files && data.files.length > 0) {
            // Prendi l'ultimo file caricato
            const lastFile = data.files[0];
            currentFileId = lastFile.file_id;
            totalObservations = lastFile.n_observations;
            
            // Aggiorna display osservazioni totali nella sezione split
            const totalObsDisplay = document.getElementById('total-obs-display');
            if (totalObsDisplay) {
                totalObsDisplay.textContent = lastFile.n_observations;
            }
            
            // Imposta valore di default per train_obs
            const trainObsInput = document.getElementById('train-obs');
            if (trainObsInput && lastFile.n_observations) {
                const defaultTrainObs = Math.floor(lastFile.n_observations * 0.8);
                trainObsInput.max = lastFile.n_observations - 1;
                trainObsInput.value = defaultTrainObs;
                trainObsInput.dispatchEvent(new Event('input'));
            }
            
            // Carica i dati di visualizzazione
            await loadDataVisualization();
            
            // Carica lo storico dei modelli
            await loadModelRuns();
        }
    } catch (error) {
        console.error('Errore caricamento ultimo file:', error);
    }
}

// MODAL CONFERMA ELIMINAZIONE
let pendingDeleteRunId = null;

function showDeleteConfirmModal(runId) {
    pendingDeleteRunId = runId;
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Aggiungi event listeners ai pulsanti
        const cancelBtn = document.getElementById('delete-confirm-cancel');
        const okBtn = document.getElementById('delete-confirm-ok');
        
        // Rimuovi eventuali listener precedenti
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newOkBtn = okBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        
        // Aggiungi nuovi listener
        newCancelBtn.addEventListener('click', hideDeleteConfirmModal);
        newOkBtn.addEventListener('click', confirmDeleteModel);
        
        // Chiudi cliccando sull'overlay
        const overlay = modal.querySelector('.confirm-modal-overlay');
        overlay.onclick = hideDeleteConfirmModal;
    }
}
function hideDeleteConfirmModal() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.style.display = 'none';
        pendingDeleteRunId = null;
    }
}
async function confirmDeleteModel() {
    if (!pendingDeleteRunId) {
        return;
    }
    
    const runId = pendingDeleteRunId;
    hideDeleteConfirmModal();
    
    if (!isAuthenticated) {
        showToast('Devi prima effettuare il login!', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/model-run/${runId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Errore durante l\'eliminazione');
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Modello eliminato con successo!', 'success');
            // Ricarica lo storico
            await loadModelRuns();
        } else {
            throw new Error(result.error || 'Errore durante l\'eliminazione');
        }
    } catch (error) {
        console.error('Errore eliminazione modello:', error);
        showToast(`Errore durante l'eliminazione: ${error.message}`, 'error');
    }
}

// ELIMINA MODELLO
async function deleteModelRun(runId) {
    if (!isAuthenticated) {
        showToast('Devi prima effettuare il login!', 'warning');
        return;
    }
    
    // Mostra modal di conferma personalizzato
    showDeleteConfirmModal(runId);
}

// CARICA MODELLO DALLO STORICO
async function loadModelFromHistory(runId, modelId, fileId = null) {
    if (!isAuthenticated) {
        showToast('Devi prima effettuare il login!', 'warning');
        return;
    }
    
    try {
        // Se il modello appartiene a un file diverso, carica quel file
        if (fileId && fileId !== currentFileId) {
            currentFileId = fileId;
            totalObservations = null; // Sarà aggiornato quando carichiamo i dati
            
            // Carica i dati del file
            await loadDataVisualization();
            
            // Ricarica lo storico per mostrare tutti i modelli
            await loadModelRuns();
        }
        
        // Recupera i dati del run per ripristinare correttamente le osservazioni (totali/train/test) salvate
        let runConfig = null;
        try {
            const runsResponse = await fetch('/api/user/model-runs', { credentials: 'include' });
            if (runsResponse.ok) {
                const runsData = await runsResponse.json();
                if (runsData.runs && runsData.runs.length > 0) {
                    const runMatch = runsData.runs.find(r => r.run_id === runId);
                    if (runMatch) {
                        runConfig = runMatch;
                        // Usa le osservazioni totali salvate nel ModelRun (già calcolate dopo le trasformazioni)
                        if (runMatch.total_obs) {
                            totalObservations = runMatch.total_obs;
                            const totalObsDisplay = document.getElementById('total-obs-display');
                            if (totalObsDisplay) totalObsDisplay.textContent = totalObservations;
                        }
                        // Ripristina train_obs salvato
                        const trainObsInput = document.getElementById('train-obs');
                        if (trainObsInput && runMatch.train_obs) {
                            trainObsInput.max = (totalObservations || runMatch.train_obs) - 1;
                            trainObsInput.value = runMatch.train_obs;
                            trainObsInput.dispatchEvent(new Event('input'));
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('loadModelFromHistory: impossibile recuperare run dal backend:', error);
        }
        
        // Se non abbiamo trovato totalObservations dal run, recuperalo dal file corrente come fallback
        if (!totalObservations && currentFileId) {
            try {
                const fileResponse = await fetch(`/api/file/${currentFileId}/data`, {
                    credentials: 'include'
                });
                if (fileResponse.ok) {
                    const fileData = await fileResponse.json();
                    if (fileData.data && fileData.data.length > 0) {
                        totalObservations = fileData.data.length;
                        const totalObsDisplay = document.getElementById('total-obs-display');
                        if (totalObsDisplay) totalObsDisplay.textContent = totalObservations;
                    }
                }
            } catch (error) {
                console.warn('Impossibile recuperare n_observations dal file:', error);
            }
        }
        
        // Pulisci risultati precedenti e nascondi tutti i grafici aperti
        clearPreviousResults();
        hideResultsSections();
        
        // Nascondi anche i grafici delle trasformazioni che potrebbero essere aperti
        const smoothingComparison = document.getElementById('smoothing-comparison');
        const smoothingStats = document.getElementById('smoothing-stats');
        const smoothingAcfPacf = document.getElementById('smoothing-acf-pacf');
        const logTransformResults = document.getElementById('log-transform-results');
        const differencingResults = document.getElementById('differencing-results');
        
        if (smoothingComparison) smoothingComparison.style.display = 'none';
        if (smoothingStats) smoothingStats.style.display = 'none';
        if (smoothingAcfPacf) smoothingAcfPacf.style.display = 'none';
        if (logTransformResults) logTransformResults.style.display = 'none';
        if (differencingResults) differencingResults.style.display = 'none';
        
        // Pulisci anche i grafici Plotly delle trasformazioni
        const smoothingChart = document.getElementById('smoothing-comparison-chart');
        const logChart = document.getElementById('log-transform-chart');
        const diffChart = document.getElementById('differencing-chart');
        const logAcfPlot = document.getElementById('log-acf-plot');
        const logPacfPlot = document.getElementById('log-pacf-plot');
        const diffAcfPlot = document.getElementById('diff-acf-plot');
        const diffPacfPlot = document.getElementById('diff-pacf-plot');
        
        if (smoothingChart) Plotly.purge('smoothing-comparison-chart');
        if (logChart) Plotly.purge('log-transform-chart');
        if (diffChart) Plotly.purge('differencing-chart');
        if (logAcfPlot) Plotly.purge('log-acf-plot');
        if (logPacfPlot) Plotly.purge('log-pacf-plot');
        if (diffAcfPlot) Plotly.purge('diff-acf-plot');
        if (diffPacfPlot) Plotly.purge('diff-pacf-plot');
        
        // Assicurati che le sezioni delle trasformazioni siano visibili
        document.getElementById('smoothing-section').style.display = 'block';
        document.getElementById('log-transform-section').style.display = 'block';
        document.getElementById('differencing-section').style.display = 'block';
        document.getElementById('split-section').style.display = 'block';
        document.getElementById('sarimax-section').style.display = 'block';
        
        // Aggiorna currentModelId e currentRunId
        currentModelId = modelId;
        currentRunId = runId; // IMPORTANTE: Aggiorna sempre il runId quando si carica un modello dallo storico
        
        // RESETTA le analisi ACF/PACF attuali
        aiRecommendation = null;
        aiSmoothedRecommendation = null;
        aiLogRecommendation = null;
        aiDiffRecommendation = null;
        acfPacfAnalyses = {
            original: null,
            smoothed: null,
            log: null,
            diff: null
        };
        
        // Nascondi tutte le sezioni di analisi ACF/PACF
        const aiAnalysisSections = [
            'ai-analysis-result',
            'ai-analysis-smoothed-result',
            'ai-analysis-log-result',
            'ai-analysis-diff-result'
        ];
        aiAnalysisSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) section.style.display = 'none';
        });
        
        // Carica risultati e popola le opzioni SENZA aprire i grafici
        const modelData = await loadResults(modelId, true); // true = popola le opzioni
        
        // Se loadResults ha fallito, interrompi
        if (!modelData) {
            console.error('loadModelFromHistory: Impossibile caricare i risultati del modello');
            showToast('Errore nel caricamento dei risultati del modello', 'error');
            return;
        }
        
        // Recupera config_info per impostare splitApplied
        let config = null;
        if (modelData && modelData.config_info) {
            config = modelData.config_info;
            // Imposta splitApplied se train_obs è disponibile
            if (config.train_obs) {
                splitApplied = true;
            }
            
            // Carica le analisi ACF/PACF salvate per questo modello
            if (config.acf_pacf_analyses) {
                const savedAnalyses = config.acf_pacf_analyses;
                
                // Carica e mostra le analisi salvate
                if (savedAnalyses.original) {
                    aiRecommendation = savedAnalyses.original;
                    acfPacfAnalyses.original = savedAnalyses.original;
                    displaySavedACFAnalysis('original', savedAnalyses.original);
                }
                if (savedAnalyses.smoothed) {
                    aiSmoothedRecommendation = savedAnalyses.smoothed;
                    acfPacfAnalyses.smoothed = savedAnalyses.smoothed;
                    displaySavedACFAnalysis('smoothed', savedAnalyses.smoothed);
                }
                if (savedAnalyses.log) {
                    aiLogRecommendation = savedAnalyses.log;
                    acfPacfAnalyses.log = savedAnalyses.log;
                    displaySavedACFAnalysis('log', savedAnalyses.log);
                }
                if (savedAnalyses.diff) {
                    aiDiffRecommendation = savedAnalyses.diff;
                    acfPacfAnalyses.diff = savedAnalyses.diff;
                    displaySavedACFAnalysis('diff', savedAnalyses.diff);
                }
            }
        }
        
        // Applica automaticamente le trasformazioni salvate nella configurazione
        // Ordine: smoothing -> log -> diff (come nella catena di trasformazioni)
        if (config) {
            try {
                // 1. Applica/rimuovi smoothing
                const smoothingWindow = (config.smoothing_window !== undefined && config.smoothing_window !== null) 
                    ? parseInt(config.smoothing_window) || 1 
                    : 1;
                
                const smoothingSelect = document.getElementById('smoothing-window');
                if (smoothingSelect && smoothingSelect.value !== smoothingWindow.toString()) {
                    smoothingSelect.value = smoothingWindow.toString();
                }
                
                // Applica smoothing (anche se window=1 per rimuovere smoothing precedente)
                const smoothingResponse = await fetch(`/api/file/${currentFileId}/apply-smoothing`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ window_size: smoothingWindow })
                });
                
                if (smoothingResponse.ok) {
                    const smoothingResult = await smoothingResponse.json();
                    totalObservations = smoothingResult.n_observations;
                    const totalObsDisplay = document.getElementById('total-obs-display');
                    if (totalObsDisplay) totalObsDisplay.textContent = totalObservations;
                    
                    const trainObsInput = document.getElementById('train-obs');
                    if (trainObsInput) {
                        trainObsInput.max = totalObservations - 1;
                    }
                }
                
                // 2. Applica/rimuovi log transform
                const logTransform = (config.log_transform !== undefined && config.log_transform !== null) 
                    ? (typeof config.log_transform === 'boolean' ? config.log_transform 
                       : (typeof config.log_transform === 'number' ? config.log_transform !== 0 
                          : (typeof config.log_transform === 'string' ? config.log_transform.toLowerCase() === 'true' || config.log_transform === '1' 
                             : false)))
                    : false;
                
                const logCheckbox = document.getElementById('apply-log-checkbox');
                if (logCheckbox && logCheckbox.checked !== logTransform) {
                    logCheckbox.checked = logTransform;
                }
                
                // Applica/rimuovi log transform
                const logResponse = await fetch(`/api/file/${currentFileId}/apply-log-transform`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ apply_log: logTransform })
                });
                
                if (logResponse.ok) {
                    const logResult = await logResponse.json();
                    if (logTransform) {
                        totalObservations = logResult.n_observations;
                        const totalObsDisplay = document.getElementById('total-obs-display');
                        if (totalObsDisplay) totalObsDisplay.textContent = totalObservations;
                        
                        const trainObsInput = document.getElementById('train-obs');
                        if (trainObsInput) {
                            trainObsInput.max = totalObservations - 1;
                        }
                    }
                }
                
                // 3. Applica/rimuovi differencing
                const diffOrder = (config.differencing_order !== undefined && config.differencing_order !== null) 
                    ? (parseInt(config.differencing_order) || 0)
                    : 0;
                
                const diffSelect = document.getElementById('differencing-order');
                if (diffSelect && diffSelect.value !== diffOrder.toString()) {
                    diffSelect.value = diffOrder.toString();
                }
                
                // Applica/rimuovi differencing
                const diffResponse = await fetch(`/api/file/${currentFileId}/apply-differencing`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ order: diffOrder })
                });
                
                if (diffResponse.ok) {
                    const diffResult = await diffResponse.json();
                    if (diffOrder > 0) {
                        totalObservations = diffResult.n_observations;
                        const totalObsDisplay = document.getElementById('total-obs-display');
                        if (totalObsDisplay) totalObsDisplay.textContent = totalObservations;
                        
                        const trainObsInput = document.getElementById('train-obs');
                        if (trainObsInput) {
                            trainObsInput.max = totalObservations - 1;
                        }
                    }
                }
                
                // Aggiorna train_obs dopo tutte le trasformazioni
                const trainObsInput = document.getElementById('train-obs');
                if (trainObsInput && config.train_obs) {
                    trainObsInput.max = totalObservations - 1;
                    trainObsInput.value = config.train_obs;
                    trainObsInput.dispatchEvent(new Event('input'));
                    
                    // Applica automaticamente lo split se train_obs è presente
                    try {
                        const splitResponse = await fetch(`/api/file/${currentFileId}/apply-split`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            credentials: 'include',
                            body: JSON.stringify({train_obs: config.train_obs})
                        });
                        
                        if (splitResponse.ok) {
                            const splitData = await splitResponse.json();
                            splitApplied = true;
                            
                            // Aggiorna display split
                            const statusEl = document.getElementById('split-status');
                            if (statusEl) {
                                const totalObs = splitData.total_obs || (splitData.train_obs + splitData.test_obs);
                                const trainPercent = Math.round((splitData.train_obs / totalObs) * 100);
                                const testPercent = Math.round((splitData.test_obs / totalObs) * 100);
                                
                                statusEl.className = 'status-message status-success';
                                statusEl.style.display = 'block';
                                statusEl.innerHTML = 
                                    `Split applicato con successo!<br>
                                     <strong>Training Set:</strong> ${splitData.train_obs} osservazioni (${trainPercent}%)
                                     (${new Date(splitData.train_start).toLocaleDateString()} - ${new Date(splitData.train_end).toLocaleDateString()})<br>
                                     <strong>Test Set:</strong> ${splitData.test_obs} osservazioni (${testPercent}%)
                                     (${new Date(splitData.test_start).toLocaleDateString()} - ${new Date(splitData.test_end).toLocaleDateString()})`;
                            }
                            
                            // Abilita pulsante SARIMAX
                            const runBtn = document.getElementById('run-sarimax-btn');
                            if (runBtn) runBtn.disabled = false;
                        } else {
                            // Se lo split fallisce, mostra un messaggio ma non bloccare
                            const errorData = await splitResponse.json().catch(() => ({}));
                            console.warn('Errore nell\'applicazione automatica dello split:', splitResponse.status, errorData);
                            const statusEl = document.getElementById('split-status');
                            if (statusEl) {
                                statusEl.className = 'status-message status-warning';
                                statusEl.style.display = 'block';
                                statusEl.innerHTML = `⚠️ Impossibile applicare automaticamente lo split. Puoi applicarlo manualmente.`;
                            }
                        }
                    } catch (splitError) {
                        console.warn('Errore nell\'applicazione automatica dello split:', splitError);
                        // Non bloccare il caricamento se c'è un errore nello split
                    }
                }
                
            } catch (error) {
                console.warn('Errore nell\'applicazione automatica delle trasformazioni:', error);
                // Non bloccare il caricamento se c'è un errore nelle trasformazioni
            }
        }
        
        // Carica solo i grafici dei risultati del modello (training e test)
        await loadForecastCharts(modelId);
        
        // Non mostrare le sezioni se siamo nell'area personale
        const profileSection = document.getElementById('profile-section');
        const isInProfile = profileSection && profileSection.style.display === 'block';
        
        // Mostra le sezioni dei risultati solo se non siamo nell'area personale
        if (!isInProfile) {
            const resultsSection = document.getElementById('results-section');
            const chartsSection = document.getElementById('charts-section');
            if (resultsSection) resultsSection.style.display = 'block';
            if (chartsSection) chartsSection.style.display = 'block';
            
            // Aggiorna i pulsanti del paper con il nuovo runId (forza l'aggiornamento)
            console.log('loadModelFromHistory: Aggiornamento pulsanti paper con runId:', runId);
            setTimeout(async () => {
                await updatePaperButtons(runId);
            }, 300);
            
            // Scrolla alle sezioni dei risultati
            if (resultsSection) {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        
    } catch (error) {
        console.error('Errore caricamento modello dallo storico:', error);
        showToast(`Errore nel caricamento del modello: ${error.message}`, 'error');
    }
}

// EXPORT SUMMARY MODELLO
function exportModelSummary() {
    try {
        const exportBtn = document.getElementById('export-summary-btn');
        const summaryTextEl = document.getElementById('model-summary-text');
        
        if (!exportBtn || !summaryTextEl) {
            showToast('Errore: elementi non trovati', 'error');
            return;
        }
        
        // Recupera il summary dal dataset o dall'elemento
        let summaryText = exportBtn.dataset.summary || summaryTextEl.textContent;
        
        if (!summaryText || summaryText.trim() === '' || summaryText === 'Summary non disponibile') {
            showToast('Nessun summary disponibile per l\'export', 'warning');
            return;
        }
        
        // Prepara il nome del file
        const modelOrder = exportBtn.dataset.modelOrder || 'N/A';
        const fileName = exportBtn.dataset.fileName || 'modello';
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const sanitizedOrder = modelOrder.replace(/[^a-zA-Z0-9()]/g, '_');
        const filename = `summary_${sanitizedOrder}_${fileName}_${date}.txt`;
        
        // Crea il contenuto completo del file
        let fileContent = '='.repeat(80) + '\n';
        fileContent += `SUMMARY MODELLO ARIMA/SARIMA\n`;
        fileContent += `SYRIAS DASH - Export Summary\n`;
        fileContent += `Data Export: ${new Date().toLocaleString('it-IT')}\n`;
        fileContent += '='.repeat(80) + '\n\n';
        fileContent += summaryText;
        fileContent += '\n\n' + '='.repeat(80) + '\n';
        fileContent += `Fine Summary\n`;
        fileContent += '='.repeat(80) + '\n';
        
        // Crea il blob e il link di download
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        // Aggiungi al DOM, clicca e rimuovi
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Rilascia l'URL del blob
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
        
        // Mostra messaggio di successo
        const statusEl = document.getElementById('export-summary-status');
        if (statusEl) {
            statusEl.textContent = '✅ Summary esportato con successo!';
            statusEl.style.color = '#28a745';
            statusEl.style.display = 'block';
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 3000);
        }
        
    } catch (error) {
        console.error('Errore export summary:', error);
        showToast(`Errore durante l'export del summary: ${error.message}`, 'error');
    }
}

// PAPER GENERATION
let currentRunId = null;

async function generatePaper() {
    console.log('generatePaper chiamato, currentModelId:', currentModelId, 'currentRunId:', currentRunId);
    
    if (!currentModelId) {
        showToast('Nessun modello disponibile per generare il paper', 'warning');
        console.warn('generatePaper: currentModelId mancante');
        return;
    }
    
    // Se currentRunId non è disponibile, recuperalo dal backend usando currentModelId
    let runIdToUse = currentRunId;
    if (!runIdToUse) {
        console.log('generatePaper: currentRunId non disponibile, recupero dal backend...');
        try {
            const response = await fetch('/api/user/model-runs', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                // Trova il run_id associato al currentModelId
                const run = data.runs.find(r => r.model_id === currentModelId);
                if (run) {
                    runIdToUse = run.run_id;
                    currentRunId = run.run_id; // Salva anche per uso futuro
                    console.log('generatePaper: run_id recuperato:', runIdToUse);
                } else {
                    showToast('Errore: modello non trovato nello storico', 'error');
                    console.error('generatePaper: Modello non trovato nello storico');
                    return;
                }
            } else {
                throw new Error('Errore nel recupero dello storico modelli');
            }
        } catch (error) {
            console.error('generatePaper: Errore recupero run_id:', error);
            showToast(`Errore: ${error.message}`, 'error');
            return;
        }
    }
    
    const generateBtn = document.getElementById('generate-paper-btn');
    const openBtn = document.getElementById('open-paper-btn');
    const statusEl = document.getElementById('paper-status');
    
    if (!generateBtn) {
        console.error('generatePaper: Pulsante generate-paper-btn non trovato');
        showToast('Errore: elemento non trovato', 'error');
        return;
    }
    
    generateBtn.disabled = true;
    generateBtn.textContent = '🔄 Generazione in corso...';
    
    if (statusEl) {
        statusEl.className = 'status-message status-info';
        statusEl.style.display = 'block';
        statusEl.textContent = 'Generazione paper in corso...';
    }
    
    try {
        console.log('generatePaper: Chiamata API per run_id', runIdToUse);
        const response = await fetch(`/api/model-run/${runIdToUse}/generate-paper`, {
            method: 'POST',
            credentials: 'include'
        });
        
        console.log('generatePaper: Response status', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('generatePaper: Errore response', response.status, errorText);
            throw new Error(`Errore ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        const result = await response.json();
        console.log('generatePaper: Result', result);
        
        if (result.success) {
            if (statusEl) {
                statusEl.className = 'status-message status-success';
                statusEl.textContent = '✅ Paper generato con successo!';
            }
            
            generateBtn.style.display = 'none';
            if (openBtn) {
                openBtn.style.display = 'block';
            }
            
            showToast('Paper generato con successo!', 'success');
        } else {
            throw new Error(result.error || 'Errore nella generazione del paper');
        }
    } catch (error) {
        console.error('Errore generazione paper:', error);
        if (statusEl) {
            statusEl.className = 'status-message status-error';
            statusEl.textContent = `❌ Errore: ${error.message}`;
        }
        showToast(`Errore nella generazione del paper: ${error.message}`, 'error');
        
        generateBtn.disabled = false;
        generateBtn.textContent = '📄 Genera Paper';
    }
}
async function openPaper() {
    console.log('openPaper chiamato, currentModelId:', currentModelId, 'currentRunId:', currentRunId);
    
    // Verifica che currentRunId sia aggiornato correttamente
    let runIdToUse = currentRunId;
    
    // Se currentRunId non è disponibile o non corrisponde al modelId corrente, recuperalo
    if (!runIdToUse && currentModelId) {
        console.log('openPaper: currentRunId non disponibile, recupero dal backend...');
        try {
            const response = await fetch('/api/user/model-runs', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                // Trova il run_id associato al currentModelId (più recente)
                const runs = data.runs.filter(r => r.model_id === currentModelId);
                if (runs.length > 0) {
                    // Prendi il più recente
                    const run = runs[0];
                    runIdToUse = run.run_id;
                    currentRunId = run.run_id; // Aggiorna anche la variabile globale
                    console.log('openPaper: run_id recuperato:', runIdToUse);
                } else {
                    showToast('Errore: modello non trovato nello storico', 'error');
                    console.error('openPaper: Modello non trovato nello storico');
                    return;
                }
            } else {
                throw new Error('Errore nel recupero dello storico modelli');
            }
        } catch (error) {
            console.error('openPaper: Errore recupero run_id:', error);
            showToast(`Errore: ${error.message}`, 'error');
            return;
        }
    }
    
    if (!runIdToUse) {
        showToast('Nessun paper disponibile. Genera prima il paper per questo modello.', 'warning');
        console.warn('openPaper: runIdToUse mancante');
        return;
    }
    
    // Apri il paper in una nuova finestra con il runId corretto
    const paperUrl = `/paper?run_id=${runIdToUse}`;
    console.log('openPaper: Apertura URL', paperUrl, 'per runId:', runIdToUse);
    window.open(paperUrl, '_blank');
}
function openPaperFromHistory(runId) {
    if (!runId) {
        showToast('ID modello non valido', 'error');
        return;
    }
    
    // Apri il paper in una nuova finestra
    const paperUrl = `/paper?run_id=${runId}`;
    window.open(paperUrl, '_blank');
}

// Aggiorna i pulsanti del paper in base allo stato
async function updatePaperButtons(runId) {
    console.log('updatePaperButtons chiamato con runId:', runId, 'currentRunId:', currentRunId);
    
    // Assicurati che currentRunId sia aggiornato
    if (runId && runId !== currentRunId) {
        console.log('updatePaperButtons: Aggiornamento currentRunId da', currentRunId, 'a', runId);
        currentRunId = runId;
    }
    
    // Usa currentRunId se runId non è fornito
    const runIdToCheck = runId || currentRunId;
    
    if (!runIdToCheck) {
        console.warn('updatePaperButtons: Nessun runId disponibile');
        // Mostra comunque il pulsante di generazione come fallback
        const generateBtn = document.getElementById('generate-paper-btn');
        if (generateBtn) {
            generateBtn.style.display = 'inline-block';
        }
        const openBtn = document.getElementById('open-paper-btn');
        if (openBtn) {
            openBtn.style.display = 'none';
        }
        return;
    }
    
    const generateBtn = document.getElementById('generate-paper-btn');
    const openBtn = document.getElementById('open-paper-btn');
    
    if (!generateBtn) {
        console.error('updatePaperButtons: Pulsante generate-paper-btn non trovato nel DOM');
        return;
    }
    
    if (!openBtn) {
        console.error('updatePaperButtons: Pulsante open-paper-btn non trovato nel DOM');
        // Mostra comunque il pulsante di generazione
        generateBtn.style.display = 'inline-block';
        return;
    }
    
    console.log('updatePaperButtons: Verifica paper per runId', runIdToCheck);
    
    // Verifica se il paper esiste già
    try {
        const response = await fetch(`/api/user/model-runs`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            const run = data.runs.find(r => r.run_id === runIdToCheck);
            
            console.log('updatePaperButtons: Run trovato', run ? 'sì' : 'no', run ? {run_id: run.run_id, paper_path: run.paper_path} : '');
            
            if (run && run.paper_path) {
                // Paper già esistente
                console.log('updatePaperButtons: Paper esistente, mostra pulsante Apri');
                generateBtn.style.display = 'none';
                openBtn.style.display = 'inline-block';
            } else {
                // Paper non ancora generato
                console.log('updatePaperButtons: Paper non esistente, mostra pulsante Genera');
                generateBtn.style.display = 'inline-block';
                openBtn.style.display = 'none';
            }
        } else {
            console.warn('updatePaperButtons: Errore response', response.status);
            // Mostra comunque il pulsante di generazione
            generateBtn.style.display = 'inline-block';
            openBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Errore verifica paper:', error);
        // Mostra comunque il pulsante di generazione
        generateBtn.style.display = 'inline-block';
        openBtn.style.display = 'none';
    }
}

// Funzione per assicurarsi che i pulsanti siano visibili quando c'è un modello
function ensurePaperButtonsVisible() {
    const generateBtn = document.getElementById('generate-paper-btn');
    const openBtn = document.getElementById('open-paper-btn');
    
    if (!generateBtn || !openBtn) {
        console.warn('ensurePaperButtonsVisible: Pulsanti non trovati');
        return;
    }
    
    // Se abbiamo un currentRunId, mostra almeno un pulsante
    if (currentRunId) {
        // Se nessun pulsante è visibile, mostra quello di generazione
        if (generateBtn.style.display === 'none' && openBtn.style.display === 'none') {
            console.log('ensurePaperButtonsVisible: Nessun pulsante visibile, mostro Genera Paper');
            generateBtn.style.display = 'inline-block';
        }
    }
}

