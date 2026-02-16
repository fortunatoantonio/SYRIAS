# Dashboard ARIMA - Automazione Previsione

Dashboard web per analisi automatica di serie temporali con modelli ARIMA.

## Caratteristiche

- Upload file CSV/XLSX (formato: colonne 'data' e 'y')
- Visualizzazione serie storica con grafici interattivi
- Split configurabile training/test
- Selezione automatica miglior modello ARIMA basata su R²_test e MAPE_test
- Output completo modello: coefficienti, stderr, p-values, CI
- Export risultati: PDF, Excel, JSON

## Installazione e Setup

Se ricevi questo progetto senza il venv incluso, segui questi passaggi per configurarlo:

```bash
# 1. Crea un nuovo ambiente virtuale Python
python3 -m venv venv

# 2. Attiva l'ambiente virtuale
# Su macOS/Linux:
source venv/bin/activate
# Su Windows:
# venv\Scripts\activate

# 3. Installa tutte le dipendenze
pip install -r requirements.txt

# 4. Configura le variabili d'ambiente (opzionale ma consigliato in produzione)
# Copia .env.example in .env e imposta almeno SECRET_KEY (es. openssl rand -hex 32).
# Non committare mai il file .env su Git.

# Note: 
# - Le cartelle necessarie (data/uploads, data/exports, data/ai_images, instance) 
#   vengono create automaticamente all'avvio dell'applicazione
# - Il database SQLite viene inizializzato automaticamente al primo avvio
#   (tutte le tabelle vengono create se non esistono già)
```

## Avvio

```bash
# Attiva l'ambiente virtuale (se non già attivo)
source venv/bin/activate

# Avvia il server Flask
cd backend
python app.py
```

######se gia avviato bisogna prima chiuderlo######

```bash
lsof -ti:5001 | xargs kill -9
```

L'applicazione sarà disponibile su: **http://localhost:5001**

## Struttura Progetto

```
dash/
├── backend/              # Backend Flask (logica server)
│   ├── app.py           # Entry point principale + creazione app Flask
│   ├── routes.py        # API endpoints (/api/*)
│   ├── models.py        # Modelli database (User, ModelRun, etc.)
│   ├── database.py      # Configurazione SQLite
│   ├── services.py      # Logica business (ARIMA, analisi)
│   ├── ai_service.py    # Servizi AI/ML
│   ├── pdf_service.py   # Generazione PDF report
│   ├── paper_service.py # Gestione paper/articoli
│   └── config.py        # Configurazioni app
│
├── frontend/            # Frontend web (interfaccia utente)
│   ├── templates/       # HTML templates
│   │   ├── dashboard.html  # Pagina principale dashboard
│   │   └── paper.html      # Pagina paper/articoli
│   └── static/          # File statici
│       ├── css/style.css   # Stili CSS
│       └── js/main.js      # JavaScript frontend
│
├── automation/          # Automazioni e scheduler
│   └── scheduler.py    # Scheduler per task automatici
│
├── data/               # Dati dell'applicazione
│   ├── uploads/        # File CSV/XLSX caricati dagli utenti
│   └── exports/        # File esportati (PDF, Excel, JSON)
│
├── instance/           # Database SQLite
│   └── dash.db         # Database con utenti e run dei modelli
│
├── venv/               # Ambiente virtuale Python (dipendenze)
├── requirements.txt    # Dipendenze Python
└── README.md           # Documentazione
```
