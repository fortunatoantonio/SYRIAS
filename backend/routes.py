from flask import Blueprint, request, jsonify, send_file, render_template
from flask_login import login_user, logout_user, login_required, current_user
from database import db
from models import *
from services import FileService, SarimaxService, StatisticsService, get_absolute_path
import os
import json
import pandas as pd
from datetime import datetime
from config import Config, BASE_DIR

api = Blueprint('api', __name__)

# ========== AUTENTICAZIONE ==========
@api.route('/register', methods=['POST'])
def register():
    """Registra un nuovo utente"""
    data = request.json
    name = data.get('name', '').strip()
    surname = data.get('surname', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    # Validazione
    if not name or not surname or not email or not password:
        return jsonify({'error': 'Tutti i campi sono obbligatori'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'La password deve essere di almeno 6 caratteri'}), 400
    
    # Verifica se email già esiste
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email già registrata'}), 400
    
    try:
        # Crea nuovo utente
        user = User(name=name, surname=surname, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        # Login automatico dopo registrazione
        login_user(user, remember=True)
        
        return jsonify({
            'success': True,
            'user': {
                'user_id': user.user_id,
                'name': user.name,
                'surname': user.surname,
                'email': user.email
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Errore durante la registrazione: {str(e)}'}), 500

@api.route('/login', methods=['POST'])
def login():
    """Login utente"""
    data = request.json
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email e password sono obbligatori'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'error': 'Email non trovata'}), 401
    
    if user.check_password(password):
        login_user(user, remember=True)
        return jsonify({
            'success': True,
            'user': {
                'user_id': user.user_id,
                'name': user.name,
                'surname': user.surname,
                'email': user.email
            }
        }), 200
    else:
        return jsonify({'error': 'Password errata'}), 401

@api.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout utente"""
    logout_user()
    return jsonify({'success': True, 'message': 'Logout effettuato'}), 200

@api.route('/user/current', methods=['GET'])
@login_required
def get_current_user():
    """Ottiene informazioni utente corrente"""
    return jsonify({
        'user_id': current_user.user_id,
        'name': current_user.name,
        'surname': current_user.surname,
        'email': current_user.email
    })

@api.route('/user/profile', methods=['PUT'])
@login_required
def update_user_profile():
    """Aggiorna i dati del profilo utente (nome, cognome, email)"""
    data = request.json
    name = data.get('name', '').strip()
    surname = data.get('surname', '').strip()
    email = data.get('email', '').strip().lower()
    
    # Validazione
    if not name or not surname or not email:
        return jsonify({'error': 'Tutti i campi sono obbligatori'}), 400
    
    # Verifica se email è già usata da un altro utente
    existing_user = User.query.filter_by(email=email).first()
    if existing_user and existing_user.user_id != current_user.user_id:
        return jsonify({'error': 'Email già registrata da un altro utente'}), 400
    
    try:
        current_user.name = name
        current_user.surname = surname
        current_user.email = email
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profilo aggiornato con successo',
            'user': {
                'user_id': current_user.user_id,
                'name': current_user.name,
                'surname': current_user.surname,
                'email': current_user.email
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Errore nell\'aggiornamento del profilo: {str(e)}'}), 500

@api.route('/user/password', methods=['PUT'])
@login_required
def change_user_password():
    """Cambia la password dell'utente"""
    data = request.json
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    confirm_password = data.get('confirm_password', '')
    
    # Validazione
    if not current_password or not new_password or not confirm_password:
        return jsonify({'error': 'Tutti i campi sono obbligatori'}), 400
    
    # Verifica password attuale
    if not current_user.check_password(current_password):
        return jsonify({'error': 'Password attuale non corretta'}), 400
    
    # Verifica nuova password
    if len(new_password) < 6:
        return jsonify({'error': 'La nuova password deve essere di almeno 6 caratteri'}), 400
    
    # Verifica conferma password
    if new_password != confirm_password:
        return jsonify({'error': 'Le nuove password non corrispondono'}), 400
    
    # Verifica che la nuova password sia diversa da quella attuale
    if current_user.check_password(new_password):
        return jsonify({'error': 'La nuova password deve essere diversa da quella attuale'}), 400
    
    try:
        current_user.set_password(new_password)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Password cambiata con successo'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Errore nel cambio password: {str(e)}'}), 500, 200

# ========== FRONTEND ==========
# Route principale senza prefix (gestita direttamente in app.py)

# ========== UPLOAD FILE ==========
@api.route('/upload-temp', methods=['POST'])
@login_required
def upload_file_temp():
    """Upload file senza applicare split (solo validazione)"""
    if 'file' not in request.files:
        return jsonify({'error': 'Nessun file'}), 400
    
    file = request.files['file']
    user_id = current_user.user_id
    
    if file.filename == '':
        return jsonify({'error': 'File vuoto'}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'Solo file CSV sono supportati'}), 400
    
    try:
        # Salva file temporaneamente
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        filename = f"{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # Valida formato con gestione errori dettagliata
        try:
            df = FileService.load_and_validate(filepath)
        except ValueError as ve:
            # Rimuovi file se validazione fallisce
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'error': f'Errore validazione: {str(ve)}'}), 400
        except Exception as e:
            # Rimuovi file se errore
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'error': f'Errore nel caricamento file: {str(e)}'}), 400
        
        # Crea record file (senza split ancora)
        file_record = File(
            user_id=user_id,
            file_name=file.filename,
            file_path=filepath,
            n_observations=len(df),
            train_split_ratio=0.8  # Default, verrà aggiornato
        )
        db.session.add(file_record)
        db.session.commit()
        
        return jsonify({
            'file_id': file_record.file_id,
            'file_name': file_record.file_name,
            'n_observations': file_record.n_observations
        }), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Errore upload: {error_details}")
        return jsonify({'error': f'Errore server: {str(e)}'}), 500

# ========== DATI FILE (prima dello split) ==========
@api.route('/file/<int:file_id>/data', methods=['GET'])
@login_required
def get_file_data(file_id):
    """Ottiene i dati completi del file ORIGINALE (sempre, non trasformati) con ACF/PACF"""
    file = File.query.get_or_404(file_id)
    
    # SEMPRE carica dati originali (non trasformati) per la visualizzazione iniziale
    file_path = file.file_path
    
    df = FileService.load_and_validate(file_path)
    
    # Calcola statistiche descrittive complete
    from utils import calculate_statistics, calculate_acf_pacf
    stats = calculate_statistics(df)
    
    # Calcola ACF/PACF
    try:
        acf_pacf = calculate_acf_pacf(df['y'], nlags=min(40, len(df) // 4))
    except Exception as e:
        print(f"Errore calcolo ACF/PACF: {e}")
        acf_pacf = None
    
    # Prepara dati per grafico (downsample se necessario per performance)
    n_points = len(df)
    if n_points > 1000:
        step = n_points // 500
        df_plot = df.iloc[::step].copy()
    else:
        df_plot = df.copy()
    
    return jsonify({
        'data': [
            {
                'date': row['data'].isoformat() if isinstance(row['data'], datetime) else str(row['data']),
                'value': float(row['y'])
            }
            for _, row in df_plot.iterrows()
        ],
        'statistics': {
            'mean': stats['mean'],
            'std': stats['std'],
            'min': stats['min'],
            'max': stats['max'],
            'median': stats['median'],
            'q25': stats['q25'],
            'q75': stats['q75'],
            'obs_count': stats['obs_count']
        },
        'acf_pacf': acf_pacf,
        'date_range': {
            'start': df['data'].min().isoformat() if isinstance(df['data'].min(), datetime) else str(df['data'].min()),
            'end': df['data'].max().isoformat() if isinstance(df['data'].max(), datetime) else str(df['data'].max())
        },
        'is_smoothed': file.smoothing_window > 1 if file.smoothing_window else False
    }), 200

# ========== APPLICA SMOOTHING ==========
@api.route('/file/<int:file_id>/apply-smoothing', methods=['POST'])
@login_required
def apply_smoothing(file_id):
    """Applica smoothing (media mobile) alla serie storica"""
    file_record = File.query.get_or_404(file_id)
    
    # Verifica che il file appartenga all'utente corrente
    if file_record.user_id != current_user.user_id:
        return jsonify({'error': 'Non autorizzato ad accedere a questo file'}), 403
    
    data = request.json
    window_size = int(data.get('window_size', 1))
    
    if window_size < 1 or window_size > 20:
        return jsonify({'error': 'window_size deve essere tra 1 e 20'}), 400
    
    try:
        # Carica dati originali
        df = FileService.load_and_validate(file_record.file_path)
        
        # Applica smoothing
        from utils import apply_smoothing, calculate_statistics, calculate_acf_pacf
        df_smoothed = apply_smoothing(df, window_size)
        
        # Salva file smussato
        smoothed_file_name = f"smoothed_{window_size}_{file_record.file_name}"
        smoothed_file_path = os.path.join(Config.UPLOAD_FOLDER, smoothed_file_name)
        
        # Salva come CSV
        df_smoothed_copy = df_smoothed.copy()
        if pd.api.types.is_datetime64_any_dtype(df_smoothed_copy['data']):
            df_smoothed_copy['data'] = df_smoothed_copy['data'].dt.strftime('%Y-%m-%d')
        df_smoothed_copy.to_csv(smoothed_file_path, index=False)
        
        # Aggiorna file record
        file_record.smoothing_window = window_size
        file_record.smoothed_file_path = smoothed_file_path
        db.session.commit()
        
        # Calcola statistiche serie smussata
        smoothed_stats = calculate_statistics(df_smoothed)
        
        # Calcola ACF/PACF serie smussata
        try:
            smoothed_acf_pacf = calculate_acf_pacf(df_smoothed['y'], nlags=min(40, len(df_smoothed) // 4))
        except Exception as e:
            print(f"Errore calcolo ACF/PACF serie smussata: {e}")
            smoothed_acf_pacf = None
        
        # Prepara dati per grafico confronto
        # Allinea le date: la serie smussata inizia dopo (window_size-1) osservazioni
        # Crea un DataFrame con entrambe le serie allineate per data
        df_original = df.copy()
        df_original['type'] = 'original'
        
        df_smoothed_comp = df_smoothed.copy()
        df_smoothed_comp['type'] = 'smoothed'
        
        # Unisci per data per avere confronto allineato
        df_merged = pd.merge(
            df_original[['data', 'y']].rename(columns={'y': 'original'}),
            df_smoothed_comp[['data', 'y']].rename(columns={'y': 'smoothed'}),
            on='data',
            how='outer'
        ).sort_values('data').reset_index(drop=True)
        
        # Prepara dati per grafico (downsample se necessario)
        max_points = 1000
        step = max(1, len(df_merged) // max_points)
        
        original_data = []
        smoothed_data = []
        
        for idx, row in df_merged.iterrows():
            if idx % step == 0:
                date_str = row['data'].strftime('%Y-%m-%d') if hasattr(row['data'], 'strftime') else str(row['data'])
                
                if pd.notna(row['original']):
                    original_data.append({
                        'date': date_str,
                        'value': float(row['original'])
                    })
                
                if pd.notna(row['smoothed']):
                    smoothed_data.append({
                        'date': date_str,
                        'value': float(row['smoothed'])
                    })
        
        return jsonify({
            'file_id': file_record.file_id,
            'window_size': window_size,
            'n_observations': len(df_smoothed),
            'original_obs': len(df),
            'smoothed_file': smoothed_file_name,
            'statistics': smoothed_stats,
            'acf_pacf': smoothed_acf_pacf,
            'comparison_data': {
                'original': original_data,
                'smoothed': smoothed_data
            }
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ========== APPLICA TRASFORMAZIONE LOGARITMICA ==========
@api.route('/file/<int:file_id>/apply-log-transform', methods=['POST'])
@login_required
def apply_log_transform_endpoint(file_id):
    """Applica trasformazione logaritmica alla serie storica (dopo smoothing se presente)"""
    file_record = File.query.get_or_404(file_id)
    
    # Verifica che il file appartenga all'utente corrente
    if file_record.user_id != current_user.user_id:
        return jsonify({'error': 'Non autorizzato ad accedere a questo file'}), 403
    
    data = request.json
    apply_log = data.get('apply_log', False)
    
    try:
        # Determina quale serie usare come base (catena: smoothing -> log -> diff)
        # La log va applicata dopo lo smoothing se presente
        if file_record.smoothed_file_path and os.path.exists(get_absolute_path(file_record.smoothed_file_path)):
            base_df = FileService.load_and_validate(file_record.smoothed_file_path)
            base_prefix = 'smoothed'
        else:
            base_df = FileService.load_and_validate(file_record.file_path)
            base_prefix = 'original'
        
        # Se apply_log = False, rimuovi trasformazione log se presente
        if not apply_log:
            if file_record.log_transformed_file_path and os.path.exists(get_absolute_path(file_record.log_transformed_file_path)):
                os.remove(get_absolute_path(file_record.log_transformed_file_path))
            file_record.log_transform = False
            file_record.log_transformed_file_path = None
            db.session.commit()
            return jsonify({
                'file_id': file_record.file_id,
                'log_applied': False,
                'message': 'Trasformazione logaritmica rimossa'
            }), 200
        
        # Applica trasformazione logaritmica
        from utils import apply_log_transform, calculate_statistics, calculate_acf_pacf
        df_log = apply_log_transform(base_df)
        
        # Salva file trasformato
        log_file_name = f"log_{file_record.file_name}"
        log_file_path = os.path.join(Config.UPLOAD_FOLDER, log_file_name)
        
        # Salva come CSV
        df_log_copy = df_log.copy()
        if pd.api.types.is_datetime64_any_dtype(df_log_copy['data']):
            df_log_copy['data'] = df_log_copy['data'].dt.strftime('%Y-%m-%d')
        df_log_copy.to_csv(log_file_path, index=False)
        
        # Aggiorna file record
        file_record.log_transform = True
        file_record.log_transformed_file_path = log_file_path
        db.session.commit()
        
        # Calcola statistiche serie trasformata
        log_stats = calculate_statistics(df_log)
        
        # Calcola ACF/PACF serie trasformata
        try:
            log_acf_pacf = calculate_acf_pacf(df_log['y'], nlags=min(40, len(df_log) // 4))
        except Exception as e:
            print(f"Errore calcolo ACF/PACF serie log: {e}")
            log_acf_pacf = None
        
        # Prepara dati per grafico (downsample se necessario per performance)
        n_points = len(df_log)
        if n_points > 1000:
            step = n_points // 500
            df_plot = df_log.iloc[::step].copy()
        else:
            df_plot = df_log.copy()
        
        # Prepara dati serie trasformata per il grafico
        log_data = [
            {
                'date': row['data'].isoformat() if isinstance(row['data'], datetime) else str(row['data']),
                'value': float(row['y'])
            }
            for _, row in df_plot.iterrows()
        ]
        
        return jsonify({
            'file_id': file_record.file_id,
            'log_applied': True,
            'n_observations': len(df_log),
            'original_obs': len(base_df),
            'log_file': log_file_name,
            'statistics': log_stats,
            'acf_pacf': log_acf_pacf,
            'data': log_data  # Dati serie trasformata per il grafico
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ========== APPLICA DIFFERENZIAZIONE ==========
@api.route('/file/<int:file_id>/apply-differencing', methods=['POST'])
@login_required
def apply_differencing_endpoint(file_id):
    """Applica differenziazione alla serie storica (dopo log se presente, altrimenti dopo smoothing)"""
    file_record = File.query.get_or_404(file_id)
    
    data = request.json
    order = int(data.get('order', 0))
    
    if order < 0 or order > 5:
        return jsonify({'error': 'order deve essere tra 0 e 5'}), 400
    
    try:
        # Determina quale serie usare come base (catena: smoothing -> log -> diff)
        if file_record.log_transformed_file_path and os.path.exists(get_absolute_path(file_record.log_transformed_file_path)):
            base_df = FileService.load_and_validate(file_record.log_transformed_file_path)
            base_prefix = 'log'
        elif file_record.smoothed_file_path and os.path.exists(get_absolute_path(file_record.smoothed_file_path)):
            base_df = FileService.load_and_validate(file_record.smoothed_file_path)
            base_prefix = 'smoothed'
        else:
            base_df = FileService.load_and_validate(file_record.file_path)
            base_prefix = 'original'
        
        # Se order = 0, rimuovi differenziazione
        if order == 0:
            if file_record.differenced_file_path and os.path.exists(get_absolute_path(file_record.differenced_file_path)):
                os.remove(get_absolute_path(file_record.differenced_file_path))
            file_record.differencing_order = 0
            file_record.differenced_file_path = None
            db.session.commit()
            return jsonify({
                'file_id': file_record.file_id,
                'order': 0,
                'message': 'Differenziazione rimossa'
            }), 200
        
        # Applica differenziazione
        from utils import apply_differencing, calculate_statistics, calculate_acf_pacf
        df_diff = apply_differencing(base_df, order)
        
        # Salva file differenziato
        diff_file_name = f"diff_{order}_{file_record.file_name}"
        diff_file_path = os.path.join(Config.UPLOAD_FOLDER, diff_file_name)
        
        # Salva come CSV
        df_diff_copy = df_diff.copy()
        if pd.api.types.is_datetime64_any_dtype(df_diff_copy['data']):
            df_diff_copy['data'] = df_diff_copy['data'].dt.strftime('%Y-%m-%d')
        df_diff_copy.to_csv(diff_file_path, index=False)
        
        # Aggiorna file record
        file_record.differencing_order = order
        file_record.differenced_file_path = diff_file_path
        db.session.commit()
        
        # Calcola statistiche serie differenziata
        diff_stats = calculate_statistics(df_diff)
        
        # Calcola ACF/PACF serie differenziata
        try:
            diff_acf_pacf = calculate_acf_pacf(df_diff['y'], nlags=min(40, len(df_diff) // 4))
        except Exception as e:
            print(f"Errore calcolo ACF/PACF serie differenziata: {e}")
            diff_acf_pacf = None
        
        # Prepara dati per grafico (downsample se necessario per performance)
        n_points = len(df_diff)
        if n_points > 1000:
            step = n_points // 500
            df_plot = df_diff.iloc[::step].copy()
        else:
            df_plot = df_diff.copy()
        
        # Prepara dati serie differenziata per il grafico
        diff_data = [
            {
                'date': row['data'].isoformat() if isinstance(row['data'], datetime) else str(row['data']),
                'value': float(row['y'])
            }
            for _, row in df_plot.iterrows()
        ]
        
        return jsonify({
            'file_id': file_record.file_id,
            'order': order,
            'n_observations': len(df_diff),
            'original_obs': len(base_df),
            'removed_obs': len(base_df) - len(df_diff),
            'diff_file': diff_file_name,
            'statistics': diff_stats,
            'acf_pacf': diff_acf_pacf,
            'data': diff_data  # Dati serie differenziata per il grafico
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ========== APPLICA SPLIT ==========
@api.route('/file/<int:file_id>/apply-split', methods=['POST'])
@login_required
def apply_split(file_id):
    """Applica solo lo split training/test (usa serie finale dopo tutte le trasformazioni)"""
    try:
        data = request.json
        train_obs = data.get('train_obs')
        
        # Valida che train_obs sia presente e valido
        if train_obs is None:
            return jsonify({'error': 'train_obs è obbligatorio'}), 400
        
        try:
            train_obs = int(train_obs)
        except (ValueError, TypeError):
            return jsonify({'error': 'train_obs deve essere un numero intero'}), 400
        
        file_record = File.query.get_or_404(file_id)
        
        # Verifica che il file appartenga all'utente corrente
        if file_record.user_id != current_user.user_id:
            return jsonify({'error': 'Non autorizzato ad accedere a questo file'}), 403
        
        # Carica dati seguendo la catena di trasformazioni: diff -> log -> smoothed -> original
        # L'ordine di applicazione è: smoothing -> log -> diff
        # Quindi per lo split usiamo: diff se presente, altrimenti log, altrimenti smoothed, altrimenti original
        df = None
        file_used = None
        
        if file_record.differenced_file_path and os.path.exists(get_absolute_path(file_record.differenced_file_path)):
            df = FileService.load_and_validate(file_record.differenced_file_path)
            file_used = 'differenced'
        elif file_record.log_transformed_file_path and os.path.exists(get_absolute_path(file_record.log_transformed_file_path)):
            df = FileService.load_and_validate(file_record.log_transformed_file_path)
            file_used = 'log_transformed'
        elif file_record.smoothed_file_path and os.path.exists(get_absolute_path(file_record.smoothed_file_path)):
            df = FileService.load_and_validate(file_record.smoothed_file_path)
            file_used = 'smoothed'
        else:
            df = FileService.load_and_validate(file_record.file_path)
            file_used = 'original'
        
        if df is None or len(df) == 0:
            return jsonify({'error': 'Impossibile caricare i dati del file'}), 500
        
        n_total = len(df)
        
        # Valida che train_obs sia valido
        if train_obs < 1:
            return jsonify({'error': f'train_obs deve essere almeno 1, ricevuto: {train_obs}'}), 400
        if train_obs >= n_total:
            return jsonify({'error': f'train_obs deve essere minore del numero totale di osservazioni ({n_total}), ricevuto: {train_obs}'}), 400
        
        # Applica split
        from utils import split_train_test
        train_df, test_df = split_train_test(df, train_obs)
        
        # Calcola train_ratio per retrocompatibilità nel database
        train_ratio = len(train_df) / n_total
        
        # Aggiorna solo le date di split nel file record
        file_record.train_split_ratio = train_ratio
        file_record.train_start_date = train_df['data'].min()
        file_record.train_end_date = train_df['data'].max()
        file_record.test_start_date = test_df['data'].min()
        file_record.test_end_date = test_df['data'].max()
        
        # Aggiorna o crea le statistiche con train_obs_count corretto
        # Statistics è già importato con 'from models import *' all'inizio del file
        if file_record.statistics:
            stats = file_record.statistics
        else:
            stats = Statistics(file_id=file_id)
            db.session.add(stats)
        
        # Aggiorna train_obs_count e test_obs_count
        stats.train_obs_count = len(train_df)
        stats.test_obs_count = len(test_df)
        
        # Calcola statistiche descrittive
        stats.train_mean = float(train_df['y'].mean())
        stats.train_std = float(train_df['y'].std())
        stats.train_min = float(train_df['y'].min())
        stats.train_max = float(train_df['y'].max())
        stats.test_mean = float(test_df['y'].mean())
        stats.test_std = float(test_df['y'].std())
        stats.test_min = float(test_df['y'].min())
        stats.test_max = float(test_df['y'].max())
        
        db.session.commit()
        
        return jsonify({
            'file_id': file_record.file_id,
            'train_obs': len(train_df),
            'test_obs': len(test_df),
            'total_obs': n_total,
            'train_ratio': train_ratio,  # Per retrocompatibilità
            'train_start': train_df['data'].min().isoformat() if isinstance(train_df['data'].min(), datetime) else str(train_df['data'].min()),
            'train_end': train_df['data'].max().isoformat() if isinstance(train_df['data'].max(), datetime) else str(train_df['data'].max()),
            'test_start': test_df['data'].min().isoformat() if isinstance(test_df['data'].min(), datetime) else str(test_df['data'].min()),
            'test_end': test_df['data'].max().isoformat() if isinstance(test_df['data'].max(), datetime) else str(test_df['data'].max())
        }), 200
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Errore in apply_split per file_id {file_id}: {error_details}")
        return jsonify({'error': f'Errore nell\'applicazione dello split: {str(e)}'}), 500

# ========== ANALISI AI ACF/PACF ==========
@api.route('/file/<int:file_id>/analyze-acf-pacf-ai', methods=['POST'])
def analyze_acf_pacf_ai(file_id):
    """Analizza ACF/PACF usando Ollama LLaVA e suggerisce modello ARIMA"""
    file_record = File.query.get_or_404(file_id)
    
    try:
        from ai_service import AIService
        from services import FileService
        
        # Determina quale serie analizzare (originale, smoothed, log, o diff)
        data = request.json or {}
        series_type = data.get('series_type', 'original')
        
        # Se richiesta serie specifica, verifica che esista
        if series_type == 'diff':
            if not file_record.differenced_file_path or not os.path.exists(get_absolute_path(file_record.differenced_file_path)):
                return jsonify({
                    'success': False,
                    'error': 'Serie differenziata non disponibile. Applica prima la differenziazione.',
                    'description': None,
                    'recommendation': None
                }), 400
            df = FileService.load_and_validate(file_record.differenced_file_path)
            prefix = 'diff'
        elif series_type == 'log':
            if not file_record.log_transformed_file_path or not os.path.exists(get_absolute_path(file_record.log_transformed_file_path)):
                return jsonify({
                    'success': False,
                    'error': 'Serie trasformata log non disponibile. Applica prima la trasformazione logaritmica.',
                    'description': None,
                    'recommendation': None
                }), 400
            df = FileService.load_and_validate(file_record.log_transformed_file_path)
            prefix = 'log'
        elif series_type == 'smoothed':
            if not file_record.smoothed_file_path or not os.path.exists(get_absolute_path(file_record.smoothed_file_path)):
                return jsonify({
                    'success': False,
                    'error': 'Serie smussata non disponibile. Applica prima lo smoothing.',
                    'description': None,
                    'recommendation': None
                }), 400
            df = FileService.load_and_validate(file_record.smoothed_file_path)
            prefix = 'smoothed'
        else:
            # Default: usa sempre serie originale per l'analisi AI iniziale
            df = FileService.load_and_validate(file_record.file_path)
            prefix = 'original'
        
        # Inizializza servizio AI
        ai_service = AIService()
        
        # Calcola ACF/PACF numerici invece di usare immagini
        from utils import calculate_acf_pacf
        try:
            acf_pacf_data = calculate_acf_pacf(df['y'], nlags=min(40, len(df) // 4))
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Errore nel calcolo ACF/PACF: {str(e)}',
                'description': None,
                'recommendation': None
            }), 500
        
        # Genera anche le immagini per visualizzazione (opzionale, per il frontend)
        acf_path = os.path.join(ai_service.images_folder, f'{file_id}_{prefix}_acf.png')
        pacf_path = os.path.join(ai_service.images_folder, f'{file_id}_{prefix}_pacf.png')
        
        # Genera immagini ACF/PACF solo se non esistono già (per visualizzazione)
        if not os.path.exists(acf_path) or not os.path.exists(pacf_path):
            try:
                acf_path, pacf_path, combined_path = ai_service.generate_acf_pacf_images(
                    df['y'], 
                    file_id, 
                    prefix=prefix
                )
            except Exception as e:
                print(f"Errore nella generazione immagini (non critico): {e}")
        
        # Analizza con euristica locale usando valori numerici
        from utils import adf_stationarity_test
        series_info = {
            'n_observations': len(df),
            'mean': float(df['y'].mean()),
            'std': float(df['y'].std()),
            'series_type': series_type
        }
        # Aggiungi test di stazionarietà solo per la serie originale
        if series_type == 'original':
            try:
                adf_result = adf_stationarity_test(df['y'])
                series_info['adf_pvalue'] = adf_result.get('pvalue')
            except Exception as e:
                from flask import current_app
                current_app.logger.warning(f'Errore test ADF per analisi automatica: {str(e)}')
        
        analysis_result = ai_service.analyze_acf_pacf_with_ollama(
            acf_pacf_data, 
            series_info=series_info
        )
        
        if analysis_result['success']:
            return jsonify({
                'success': True,
                'description': analysis_result['description'],
                'recommendation': analysis_result['recommendation'],
                'acf_image': f'/api/file/{file_id}/ai-image/acf',
                'pacf_image': f'/api/file/{file_id}/ai-image/pacf'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': analysis_result.get('error', 'Errore sconosciuto'),
                'description': None,
                'recommendation': None
            }), 500
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ========== SERVI IMMAGINI AI ==========
@api.route('/file/<int:file_id>/ai-image/<image_type>', methods=['GET'])
def get_ai_image(file_id, image_type):
    """Serve le immagini ACF/PACF generate per l'analisi AI"""
    from flask import send_file
    from ai_service import AIService
    
    ai_service = AIService()
    file_record = File.query.get_or_404(file_id)
    
    # Determina prefisso dal query parameter o default
    series_type = request.args.get('series_type', 'original')
    if series_type == 'smoothed':
        if not file_record.smoothed_file_path or not os.path.exists(get_absolute_path(file_record.smoothed_file_path)):
            return jsonify({'error': 'Serie smussata non disponibile'}), 404
        prefix = 'smoothed'
    else:
        # Default: usa smoothed se disponibile, altrimenti original
        prefix = 'smoothed' if (file_record.smoothed_file_path and os.path.exists(get_absolute_path(file_record.smoothed_file_path))) else 'original'
    
    # Costruisci path immagine
    if image_type == 'acf':
        image_path = os.path.join(ai_service.images_folder, f'{file_id}_{prefix}_acf.png')
    elif image_type == 'pacf':
        image_path = os.path.join(ai_service.images_folder, f'{file_id}_{prefix}_pacf.png')
    else:
        return jsonify({'error': 'Tipo immagine non valido'}), 400
    
    if os.path.exists(image_path):
        return send_file(image_path, mimetype='image/png')
    else:
        return jsonify({'error': 'Immagine non trovata'}), 404

# ========== ESEGUI SARIMAX ==========
@api.route('/file/<int:file_id>/fit-sarimax', methods=['POST'])
@login_required
def fit_sarimax(file_id):
    """Addestra modello SARIMAX con parametri specificati manualmente"""
    file_record = File.query.get_or_404(file_id)
    
    # Verifica che il file appartenga all'utente corrente
    if file_record.user_id != current_user.user_id:
        return jsonify({'error': 'Non autorizzato ad accedere a questo file'}), 403
    
    # Verifica che lo split sia stato applicato
    if file_record.train_start_date is None:
        return jsonify({'error': 'Split non ancora applicato. Applica prima lo split.'}), 400
    
    try:
        data = request.json
        
        # Estrai parametri
        p = int(data.get('p', 0))
        d = int(data.get('d', 0))
        q = int(data.get('q', 0))
        
        # Parametri stagionali
        P = int(data.get('P', 0))
        D = int(data.get('D', 0))
        Q = int(data.get('Q', 0))
        m = int(data.get('m', 0))
        
        # Trend
        trend = data.get('trend', 'n')
        
        # Opzioni avanzate
        enforce_stationarity = data.get('enforce_stationarity', True)
        enforce_invertibility = data.get('enforce_invertibility', True)
        cov_type = data.get('cov_type', 'robust_approx')
        
        # Gestisci AR selettivo
        if isinstance(data.get('p'), list):
            order = data.get('p')
        else:
            order = (p, d, q)
        
        # Gestisci trend
        if isinstance(trend, list):
            trend_param = trend
        elif trend in ['n', 'c', 't', 'ct']:
            trend_param = trend
        else:
            trend_param = 'n'
        
        # Seasonal order
        if m > 0 and (P > 0 or D > 0 or Q > 0):
            seasonal_order = (P, D, Q, m)
        else:
            seasonal_order = (0, 0, 0, 0)
        
        # Addestra modello SARIMAX
        model, fitted_results = SarimaxService.fit_model(
            file_id=file_id,
            order=order,
            seasonal_order=seasonal_order,
            trend=trend_param,
            enforce_stationarity=enforce_stationarity,
            enforce_invertibility=enforce_invertibility,
            cov_type=cov_type
        )
        
        # Calcola train_obs dalle statistiche o dal ratio
        train_obs = None
        if file_record.statistics and file_record.statistics.train_obs_count:
            train_obs = file_record.statistics.train_obs_count
        elif file_record.train_split_ratio and file_record.n_observations:
            train_obs = int(file_record.train_split_ratio * file_record.n_observations)
        
        # Salva configurazione utilizzata
        # Recupera le analisi ACF/PACF fatte dal frontend (se inviate)
        acf_pacf_analyses = data.get('acf_pacf_analyses', {})
        # Filtra solo le analisi non-null (quelle effettivamente calcolate)
        saved_analyses = {}
        if acf_pacf_analyses:
            if acf_pacf_analyses.get('original'):
                saved_analyses['original'] = acf_pacf_analyses['original']
            if acf_pacf_analyses.get('smoothed'):
                saved_analyses['smoothed'] = acf_pacf_analyses['smoothed']
            if acf_pacf_analyses.get('log'):
                saved_analyses['log'] = acf_pacf_analyses['log']
            if acf_pacf_analyses.get('diff'):
                saved_analyses['diff'] = acf_pacf_analyses['diff']
        
        configuration = {
            'smoothing_window': file_record.smoothing_window,
            'log_transform': file_record.log_transform,
            'differencing_order': file_record.differencing_order,
            'train_obs': train_obs,
            'sarimax_params': {
                'p': p,
                'd': d,
                'q': q,
                'P': P,
                'D': D,
                'Q': Q,
                'm': m
            },
            'trend': trend_param,
            'enforce_stationarity': enforce_stationarity,
            'enforce_invertibility': enforce_invertibility,
            'cov_type': cov_type,
            'acf_pacf_analyses': saved_analyses  # Salva solo le analisi effettivamente calcolate
        }
        
        # Crea ModelRun
        model_run = ModelRun(
            model_id=model.model_id,
            file_id=file_id,
            user_id=current_user.user_id,
            configuration=json.dumps(configuration)
        )
        db.session.add(model_run)
        db.session.commit()
        
        # Il paper è sempre disponibile dinamicamente, salviamo l'URL
        try:
            model_run.paper_path = f'/paper?run_id={model_run.run_id}'
            db.session.commit()
        except Exception as e:
            from flask import current_app
            current_app.logger.error(f'Errore salvataggio paper path: {str(e)}')
            # Non bloccare la risposta se il paper path non viene salvato
        
        return jsonify({
            'model_id': model.model_id,
            'run_id': model_run.run_id,
            'status': model.status,
            'order': model.model_order_string,
            'seasonal_order': model.seasonal_order_string if model.is_seasonal else None,
            'aic': model.aic,
            'bic': model.bic,
            'is_seasonal': model.is_seasonal
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ========== GET RISULTATI ==========
@api.route('/file/<int:file_id>/model', methods=['GET'])
@login_required
def get_model(file_id):
    """Ottiene il modello con output completo"""
    file = File.query.get_or_404(file_id)
    
    # Verifica che il file appartenga all'utente corrente
    if file.user_id != current_user.user_id:
        return jsonify({'error': 'Non autorizzato ad accedere a questo file'}), 403
    model = file.model
    
    if not model:
        return jsonify({'status': 'no_model'}), 200
    
    # Estrai coefficienti e statistiche
    estimated_params = json.loads(model.estimated_params) if model.estimated_params else {}
    standard_errors = json.loads(model.param_standard_errors) if model.param_standard_errors else {}
    pvalues = json.loads(model.param_pvalues) if model.param_pvalues else {}
    tvalues = json.loads(model.param_tvalues) if model.param_tvalues else {}
    conf_intervals = json.loads(model.param_confidence_intervals) if model.param_confidence_intervals else {}
    
    # Prepara output coefficienti
    coefficients = []
    param_names = set(list(estimated_params.keys()) + list(standard_errors.keys()) + list(pvalues.keys()))
    
    for param_name in param_names:
        coefficients.append({
            'parameter': param_name,
            'coefficient': estimated_params.get(param_name),
            'std_error': standard_errors.get(param_name),
            't_value': tvalues.get(param_name),
            'p_value': pvalues.get(param_name),
            'ci_lower': conf_intervals.get(param_name, {}).get('lower') if isinstance(conf_intervals.get(param_name), dict) else None,
            'ci_upper': conf_intervals.get(param_name, {}).get('upper') if isinstance(conf_intervals.get(param_name), dict) else None
        })
    
    metrics = {m.metric_type: {
        'r_squared': m.r_squared,
        'mape': m.mape_percent,
        'mae': m.mae,
        'rmse': m.rmse
    } for m in model.metrics}
    
    # Prepara informazioni di configurazione dal file corrente
    config_info = {}
    if file:
        config_info = {
            'smoothing_window': file.smoothing_window,
            'log_transform': file.log_transform,
            'differencing_order': file.differencing_order,
            'train_obs': file.statistics.train_obs_count if file.statistics and file.statistics.train_obs_count else (int(file.train_split_ratio * file.n_observations) if file.train_split_ratio and file.n_observations else None)
        }
    
    return jsonify({
        'model_id': model.model_id,
        'status': model.status,
        'order': model.model_order_string,
        'seasonal_order': model.seasonal_order_string if model.is_seasonal else None,
        'aic': model.aic,
        'bic': model.bic,
        'is_seasonal': model.is_seasonal,
        'file_name': file.file_name if file else None,
        'selection_score': {
            'test_r2': model.test_r2,
            'test_mape': model.test_mape,
            'combined_score': model.test_score if model.test_score is not None else (
                (model.test_r2 - (model.test_mape / 100.0)) if (model.test_r2 is not None and model.test_mape is not None) else None
            )
        } if model.test_r2 else None,
        'coefficients': coefficients,
        'model_summary': model.model_summary,
        'config_info': config_info,  # Aggiunto informazioni di configurazione
        'metrics': metrics,
        'forecasts_count': len(model.forecasts) if model.forecasts else 0
    }), 200

@api.route('/model/<int:model_id>/forecasts', methods=['GET'])
def get_forecasts(model_id):
    """Ottiene previsioni di un modello"""
    model = Model.query.get_or_404(model_id)
    forecasts = model.forecasts
    
    return jsonify({
        'forecasts': [
            {
                'date': fc.forecast_date.isoformat() if isinstance(fc.forecast_date, datetime) else str(fc.forecast_date),
                'forecasted': fc.forecasted_value,
                'actual': fc.actual_value,
                'ci_lower': fc.ci_lower,
                'ci_upper': fc.ci_upper,
                'category': fc.category
            }
            for fc in forecasts
        ]
    }), 200

@api.route('/model/<int:model_id>/results', methods=['GET'])
@login_required
def get_model_results(model_id):
    """Ottiene i risultati completi di un modello specifico"""
    try:
        model = Model.query.get_or_404(model_id)
        
        # Verifica che il modello appartenga all'utente corrente
        file_record = File.query.get(model.file_id) if model.file_id else None
        if not file_record or file_record.user_id != current_user.user_id:
            return jsonify({'error': 'Non autorizzato ad accedere a questo modello'}), 403
        
        # Estrai coefficienti e statistiche
        estimated_params = json.loads(model.estimated_params) if model.estimated_params else {}
        standard_errors = json.loads(model.param_standard_errors) if model.param_standard_errors else {}
        pvalues = json.loads(model.param_pvalues) if model.param_pvalues else {}
        tvalues = json.loads(model.param_tvalues) if model.param_tvalues else {}
        conf_intervals = json.loads(model.param_confidence_intervals) if model.param_confidence_intervals else {}
        
        # Prepara output coefficienti
        coefficients = []
        param_names = set(list(estimated_params.keys()) + list(standard_errors.keys()) + list(pvalues.keys()))
        
        for param_name in param_names:
            coefficients.append({
                'parameter': param_name,
                'coefficient': estimated_params.get(param_name),
                'std_error': standard_errors.get(param_name),
                't_value': tvalues.get(param_name),
                'p_value': pvalues.get(param_name),
                'ci_lower': conf_intervals.get(param_name, {}).get('lower') if isinstance(conf_intervals.get(param_name), dict) else None,
                'ci_upper': conf_intervals.get(param_name, {}).get('upper') if isinstance(conf_intervals.get(param_name), dict) else None
            })
        
        # Gestisci metrics in modo sicuro
        metrics = {}
        if model.metrics:
            try:
                metrics = {m.metric_type: {
                    'r_squared': m.r_squared,
                    'mape': m.mape_percent,
                    'mae': m.mae,
                    'rmse': m.rmse
                } for m in model.metrics}
            except Exception as e:
                print(f"Errore nel processare metrics: {e}")
                metrics = {}
        
        # Prepara informazioni di configurazione dal file
        config_info = {}
        sarimax_params = {}
        model_run = ModelRun.query.filter_by(model_id=model_id, user_id=current_user.user_id).order_by(ModelRun.created_at.desc()).first()
        
        # Se c'è un ModelRun, usa i valori dalla sua configurazione (più accurati)
        if model_run and model_run.configuration:
            run_config = json.loads(model_run.configuration)
            sarimax_params = run_config.get('sarimax_params', {})
            config_info = {
                'smoothing_window': run_config.get('smoothing_window', file_record.smoothing_window if file_record else 1),
                'log_transform': run_config.get('log_transform', file_record.log_transform if file_record else False),
                'differencing_order': run_config.get('differencing_order', file_record.differencing_order if file_record else 0),
                'train_obs': run_config.get('train_obs', file_record.statistics.train_obs_count if file_record and file_record.statistics and file_record.statistics.train_obs_count else (int(file_record.train_split_ratio * file_record.n_observations) if file_record and file_record.train_split_ratio and file_record.n_observations else None)),
                'trend': run_config.get('trend', 'n')
            }
            if 'trend' in run_config:
                sarimax_params['trend'] = run_config.get('trend')
            if 'enforce_stationarity' in run_config:
                sarimax_params['enforce_stationarity'] = run_config.get('enforce_stationarity')
            if 'enforce_invertibility' in run_config:
                sarimax_params['enforce_invertibility'] = run_config.get('enforce_invertibility')
            if 'cov_type' in run_config:
                sarimax_params['cov_type'] = run_config.get('cov_type')
        elif file_record:
            config_info = {
                'smoothing_window': file_record.smoothing_window,
                'log_transform': file_record.log_transform,
                'differencing_order': file_record.differencing_order,
                'train_obs': file_record.statistics.train_obs_count if file_record.statistics and file_record.statistics.train_obs_count else (int(file_record.train_split_ratio * file_record.n_observations) if file_record.train_split_ratio and file_record.n_observations else None),
                'trend': 'n'
            }
        
        return jsonify({
            'model_id': model.model_id,
            'status': model.status,
            'order': model.model_order_string,
            'seasonal_order': model.seasonal_order_string if model.is_seasonal else None,
            'aic': model.aic,
            'bic': model.bic,
            'is_seasonal': model.is_seasonal,
            'file_name': file_record.file_name if file_record else None,
            'selection_score': {
                'test_r2': model.test_r2,
                'test_mape': model.test_mape,
                'combined_score': model.test_score if model.test_score is not None else (
                    (model.test_r2 - (model.test_mape / 100.0)) if (model.test_r2 is not None and model.test_mape is not None) else None
                )
            } if model.test_r2 else None,
            'coefficients': coefficients,
            'model_summary': model.model_summary,
            'config_info': config_info,
            'sarimax_params': sarimax_params,
            'metrics': metrics,
            'forecasts_count': len(model.forecasts) if model.forecasts else 0
        }), 200
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Errore in get_model_results per model_id {model_id}: {error_details}")
        return jsonify({'error': f'Errore nel recupero risultati: {str(e)}'}), 500

@api.route('/model/<int:model_id>/forecasts-chart', methods=['GET'])
@login_required
def get_forecasts_for_chart(model_id):
    """Ottiene previsioni organizzate per grafici (train vs test)"""
    model = Model.query.get_or_404(model_id)
    
    # Verifica che il modello appartenga all'utente corrente
    file_record = File.query.get(model.file_id) if model.file_id else None
    if not file_record or file_record.user_id != current_user.user_id:
        return jsonify({'error': 'Non autorizzato ad accedere a questo modello'}), 403
    
    forecasts = model.forecasts
    
    # Separa training e test
    train_data = []
    test_data = []
    
    for fc in forecasts:
        forecast_item = {
            'date': fc.forecast_date.isoformat() if isinstance(fc.forecast_date, datetime) else str(fc.forecast_date),
            'forecasted': fc.forecasted_value,
            'actual': fc.actual_value,
            'ci_lower': fc.ci_lower,
            'ci_upper': fc.ci_upper
        }
        
        if fc.category == 'train':
            train_data.append(forecast_item)
        elif fc.category == 'test':
            test_data.append(forecast_item)
    
    return jsonify({
        'training': {
            'data': train_data,
            'label': 'Training Set'
        },
        'test': {
            'data': test_data,
            'label': 'Test Set'
        }
    }), 200

# ========== STATISTICHE ==========
@api.route('/file/<int:file_id>/statistics', methods=['GET'])
def get_statistics(file_id):
    file = File.query.get_or_404(file_id)
    stats = file.statistics
    
    if not stats:
        return jsonify({'error': 'Statistiche non disponibili'}), 404
    
    return jsonify({
        'training': {
            'mean': stats.train_mean,
            'std': stats.train_std,
            'min': stats.train_min,
            'max': stats.train_max,
            'obs_count': stats.train_obs_count
        },
        'test': {
            'mean': stats.test_mean,
            'std': stats.test_std,
            'min': stats.test_min,
            'max': stats.test_max,
            'obs_count': stats.test_obs_count
        }
    }), 200

# Export PDF rimosso come richiesto

# ========== LISTA FILE UTENTE ==========
@api.route('/user/files', methods=['GET'])
@login_required
def get_user_files():
    """Ottiene tutti i file caricati dall'utente corrente"""
    files = File.query.filter_by(user_id=current_user.user_id).order_by(File.uploaded_at.desc()).all()
    
    files_data = []
    for file in files:
        files_data.append({
            'file_id': file.file_id,
            'file_name': file.file_name,
            'n_observations': file.n_observations,
            'uploaded_at': file.uploaded_at.isoformat() if file.uploaded_at else None,
            'has_model': file.model is not None
        })
    
    return jsonify({'files': files_data}), 200

# ========== LISTA MODELLI PROVATI ==========
def get_transformed_observations_count(file_record, transform_config=None):
    """
    Calcola il numero di osservazioni dopo le trasformazioni (smoothing, log, differencing)
    
    Args:
        file_record: Record del file dal database
        transform_config: Dict opzionale con configurazione trasformazioni da usare invece di file_record
                         (utile quando si ricarica un modello con trasformazioni diverse)
                         Deve contenere: smoothing_window, log_transform, differencing_order
    """
    if not file_record:
        return None
    
    try:
        from flask import current_app
        
        # Usa configurazione fornita o quella del file_record
        smoothing_window = transform_config.get('smoothing_window') if transform_config else file_record.smoothing_window
        log_transform = transform_config.get('log_transform') if transform_config else file_record.log_transform
        differencing_order = transform_config.get('differencing_order') if transform_config else file_record.differencing_order
        
        # Determina quale file usare (catena: smoothing -> log -> diff)
        # L'ordine di applicazione è: smoothing -> log -> diff
        # Quindi per il conteggio usiamo: diff se presente, altrimenti log, altrimenti smoothed, altrimenti original
        file_path = None
        
        # Controlla differencing (ultima trasformazione applicata)
        if differencing_order and differencing_order > 0:
            if file_record.differenced_file_path and os.path.exists(get_absolute_path(file_record.differenced_file_path)):
                file_path = file_record.differenced_file_path
                current_app.logger.debug(f'Usando file differenziato: {file_path} (order={differencing_order})')
        
        # Se non c'è differencing, controlla log transform
        if not file_path and log_transform:
            if file_record.log_transformed_file_path and os.path.exists(get_absolute_path(file_record.log_transformed_file_path)):
                file_path = file_record.log_transformed_file_path
                current_app.logger.debug(f'Usando file log trasformato: {file_path}')
        
        # Se non c'è log, controlla smoothing
        if not file_path and smoothing_window and smoothing_window > 1:
            if file_record.smoothed_file_path and os.path.exists(get_absolute_path(file_record.smoothed_file_path)):
                file_path = file_record.smoothed_file_path
                current_app.logger.debug(f'Usando file smoothed: {file_path} (window={smoothing_window})')
        
        # Se non abbiamo trovato un file trasformato, usa quello originale
        if not file_path:
            file_path = file_record.file_path
            current_app.logger.debug(f'Usando file originale: {file_path}')
        
        if not os.path.exists(file_path):
            current_app.logger.warning(f'File non trovato: {file_path}, uso n_observations originale')
            return file_record.n_observations if file_record else None
        
        df = FileService.load_and_validate(file_path)
        count = len(df)
        current_app.logger.debug(f'Osservazioni dopo trasformazioni: {count} (originale: {file_record.n_observations}, smoothing: {smoothing_window}, log: {log_transform}, diff: {differencing_order})')
        return count
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f'Errore calcolo osservazioni trasformate: {str(e)}', exc_info=True)
        # Fallback: usa n_observations originale
        return file_record.n_observations if file_record else None

@api.route('/user/model-runs', methods=['GET'])
@login_required
def get_all_user_model_runs():
    """Ottiene lista di TUTTI i modelli provati dall'utente corrente (per tutti i file)"""
    # Verifica che l'utente sia correttamente autenticato
    if not current_user or not current_user.is_authenticated:
        return jsonify({'error': 'Utente non autenticato'}), 401
    
    user_id = current_user.user_id
    print(f"get_all_user_model_runs: Ricerca modelli per user_id={user_id}")
    
    model_runs = ModelRun.query.filter_by(user_id=user_id).order_by(ModelRun.created_at.desc()).all()
    print(f"get_all_user_model_runs: Trovati {len(model_runs)} modelli per user_id={user_id}")
    
    runs_data = []
    for run in model_runs:
        config = json.loads(run.configuration) if run.configuration else {}
        
        # Ottieni informazioni sul file
        file_record = File.query.get(run.file_id) if run.file_id else None
        
        # Calcola osservazioni totali DOPO le trasformazioni usando la configurazione salvata nel ModelRun
        # Questo è importante perché le trasformazioni del file_record potrebbero essere cambiate
        transform_config = {
            'smoothing_window': config.get('smoothing_window', 1),
            'log_transform': config.get('log_transform', False),
            'differencing_order': config.get('differencing_order', 0)
        }
        total_obs_after_transforms = get_transformed_observations_count(file_record, transform_config=transform_config)
        train_obs = config.get('train_obs')
        test_obs = total_obs_after_transforms - train_obs if total_obs_after_transforms and train_obs else None
        
        # Ottieni informazioni dal modello associato
        model = run.model if run.model else None
        sarimax_params = config.get('sarimax_params', {})
        
        # Recupera test_r2 e test_mape dal modello o dalle metrics come fallback
        test_r2 = None
        test_mape = None
        if model:
            # Prova prima dal modello
            test_r2 = model.test_r2
            test_mape = model.test_mape
            
            # Se non sono nel modello, recupera dalle metrics
            if test_r2 is None or test_mape is None:
                # Metrics è già importato con 'from models import *' all'inizio del file
                test_metrics = Metrics.query.filter_by(model_id=model.model_id, metric_type='test').first()
                if test_metrics:
                    if test_r2 is None:
                        test_r2 = test_metrics.r_squared
                    if test_mape is None:
                        test_mape = test_metrics.mape_percent
        
        runs_data.append({
            'run_id': run.run_id,
            'model_id': run.model_id,
            'file_id': run.file_id,
            'created_at': run.created_at.isoformat() if run.created_at else None,
            'file_name': file_record.file_name if file_record else 'File non trovato',
            'smoothing_window': config.get('smoothing_window', 1),
            'log_transform': config.get('log_transform', False),
            'differencing_order': config.get('differencing_order', 0),
            'train_obs': config.get('train_obs'),
            'total_obs': total_obs_after_transforms,
            'test_obs': test_obs,
            'sarimax_params': sarimax_params,
            'trend': config.get('trend', 'n'),
            'enforce_stationarity': config.get('enforce_stationarity', True),
            'enforce_invertibility': config.get('enforce_invertibility', True),
            'cov_type': config.get('cov_type', 'opg'),
            'aic': model.aic if model else None,
            'bic': model.bic if model else None,
            'test_r2': test_r2,
            'test_mape': test_mape,
            'order_string': model.model_order_string if model else None,
            'seasonal_order_string': model.seasonal_order_string if model and model.is_seasonal else None,
            'is_seasonal': model.is_seasonal if model else False,
            'paper_path': run.paper_path if run.paper_path else None,
            'trend': config.get('trend', 'n')  # Assicurati che trend sia sempre presente
        })
    
    return jsonify({'runs': runs_data}), 200

@api.route('/file/<int:file_id>/model-runs', methods=['GET'])
@login_required
def get_model_runs(file_id):
    """Ottiene lista di tutti i modelli provati per un file specifico"""
    file_record = File.query.get_or_404(file_id)
    
    # Verifica che il file appartenga all'utente corrente
    if file_record.user_id != current_user.user_id:
        return jsonify({'error': 'Non autorizzato'}), 403
    
    model_runs = ModelRun.query.filter_by(file_id=file_id, user_id=current_user.user_id).order_by(ModelRun.created_at.desc()).all()
    
    runs_data = []
    for run in model_runs:
        config = json.loads(run.configuration) if run.configuration else {}
        
        # Calcola osservazioni totali DOPO le trasformazioni usando la configurazione salvata nel ModelRun
        # Questo è importante perché le trasformazioni del file_record potrebbero essere cambiate
        transform_config = {
            'smoothing_window': config.get('smoothing_window', 1),
            'log_transform': config.get('log_transform', False),
            'differencing_order': config.get('differencing_order', 0)
        }
        total_obs_after_transforms = get_transformed_observations_count(file_record, transform_config=transform_config)
        train_obs = config.get('train_obs')
        test_obs = total_obs_after_transforms - train_obs if total_obs_after_transforms and train_obs else None
        
        # Ottieni informazioni dal modello associato
        model = run.model if run.model else None
        sarimax_params = config.get('sarimax_params', {})
        
        # Recupera test_r2 e test_mape dal modello o dalle metrics come fallback
        test_r2 = None
        test_mape = None
        if model:
            # Prova prima dal modello
            test_r2 = model.test_r2
            test_mape = model.test_mape
            
            # Se non sono nel modello, recupera dalle metrics
            if test_r2 is None or test_mape is None:
                # Metrics è già importato con 'from models import *' all'inizio del file
                test_metrics = Metrics.query.filter_by(model_id=model.model_id, metric_type='test').first()
                if test_metrics:
                    if test_r2 is None:
                        test_r2 = test_metrics.r_squared
                    if test_mape is None:
                        test_mape = test_metrics.mape_percent
        
        runs_data.append({
            'run_id': run.run_id,
            'model_id': run.model_id,
            'created_at': run.created_at.isoformat() if run.created_at else None,
            'file_name': file_record.file_name,
            'smoothing_window': config.get('smoothing_window', 1),
            'log_transform': config.get('log_transform', False),
            'differencing_order': config.get('differencing_order', 0),
            'train_obs': config.get('train_obs'),
            'total_obs': total_obs_after_transforms,
            'test_obs': test_obs,
            'sarimax_params': sarimax_params,
            'trend': config.get('trend', 'n'),
            'enforce_stationarity': config.get('enforce_stationarity', True),
            'enforce_invertibility': config.get('enforce_invertibility', True),
            'cov_type': config.get('cov_type', 'opg'),
            'aic': model.aic if model else None,
            'bic': model.bic if model else None,
            'test_r2': test_r2,
            'test_mape': test_mape,
            'order_string': model.model_order_string if model else None,
            'seasonal_order_string': model.seasonal_order_string if model and model.is_seasonal else None,
            'is_seasonal': model.is_seasonal if model else False,
            'trend': config.get('trend', 'n')  # Assicurati che trend sia sempre presente
        })
    
    return jsonify({'runs': runs_data}), 200

# ========== ELIMINA MODELLO ==========
@api.route('/model-run/<int:run_id>', methods=['DELETE'])
@login_required
def delete_model_run(run_id):
    """Elimina un modello provato dallo storico"""
    model_run = ModelRun.query.get_or_404(run_id)
    
    # Verifica che il model_run appartenga all'utente corrente
    if model_run.user_id != current_user.user_id:
        return jsonify({'error': 'Non autorizzato'}), 403
    
    try:
        # Elimina il ModelRun (il Model associato rimane nel database per eventuali riferimenti)
        db.session.delete(model_run)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Modello eliminato con successo'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Errore durante l\'eliminazione: {str(e)}'}), 500

# ========== PAPER GENERATION ==========
@api.route('/model-run/<int:run_id>/generate-paper', methods=['POST'])
@login_required
def generate_paper(run_id):
    """Genera il paper HTML per un modello"""
    model_run = ModelRun.query.get_or_404(run_id)
    
    # Verifica che il model_run appartenga all'utente corrente
    if model_run.user_id != current_user.user_id:
        return jsonify({'error': 'Non autorizzato'}), 403
    
    try:
        # Il paper è sempre disponibile dinamicamente, non serve generare un file
        # Salviamo semplicemente un flag che indica che il paper è stato "generato" (cioè accessibile)
        # Il paper viene servito dinamicamente tramite il template HTML
        
        # Imposta paper_path come URL relativo per indicare che il paper è disponibile
        model_run.paper_path = f'/paper?run_id={run_id}'
        db.session.commit()
        
        return jsonify({
            'success': True,
            'paper_path': model_run.paper_path,
            'paper_url': model_run.paper_path
        }), 200
    except Exception as e:
        db.session.rollback()
        from flask import current_app
        current_app.logger.error(f'Errore generazione paper: {str(e)}')
        return jsonify({'error': f'Errore nella generazione del paper: {str(e)}'}), 500

@api.route('/model-run/<int:run_id>/paper-data', methods=['GET'])
@login_required
def get_paper_data(run_id):
    """Ottiene i dati per popolare il paper HTML"""
    model_run = ModelRun.query.get_or_404(run_id)
    
    # Verifica che il model_run appartenga all'utente corrente
    if model_run.user_id != current_user.user_id:
        return jsonify({'error': 'Non autorizzato'}), 403
    
    try:
        model = model_run.model
        file_record = model_run.file
        config = json.loads(model_run.configuration) if model_run.configuration else {}
        
        # Prepara i dati del paper
        # Usa la configurazione del ModelRun per calcolare le osservazioni corrette
        transform_config = {
            'smoothing_window': config.get('smoothing_window', 1),
            'log_transform': config.get('log_transform', False),
            'differencing_order': config.get('differencing_order', 0)
        }
        total_obs = get_transformed_observations_count(file_record, transform_config=transform_config)
        
        paper_data = {
            'file_name': file_record.file_name if file_record else 'N/A',
            'order': model.model_order_string if model else 'N/A',
            'seasonal_order': model.seasonal_order_string if model and model.is_seasonal else None,
            'created_at': model_run.created_at.isoformat() if model_run.created_at else None,
            'config_info': {
                'smoothing_window': config.get('smoothing_window', 1),
                'log_transform': config.get('log_transform', False),
                'differencing_order': config.get('differencing_order', 0),
                'train_obs': config.get('train_obs'),
                'total_obs': total_obs,
                'test_obs': total_obs - config.get('train_obs') if total_obs and config.get('train_obs') else None,
                'original_obs': file_record.n_observations if file_record else None,
                'trend': config.get('trend', 'n')  # Aggiungi trend al paper
            },
            'sarimax_params': config.get('sarimax_params', {}),
            'metrics': {},
            'coefficients': [],
            'model_summary': None,
            'aic': None,
            'bic': None,
            'test_r2': None,
            'test_mape': None,
            'original_series': None,
            'transformed_series': None,
            'ai_recommendation': None,
            'ai_recommendations': []
        }
        
        # Serie originale: dati, statistiche, ACF/PACF
        try:
            from services import FileService
            from utils import calculate_statistics, calculate_acf_pacf, apply_smoothing, apply_log_transform, apply_differencing
            from ai_service import AIService
            
            df_orig = FileService.load_and_validate(file_record.file_path)
            
            # Assumi colonne standard 'data' e 'y'
            dates_orig = df_orig['data'].astype(str).tolist()
            values_orig = df_orig['y'].astype(float).tolist()
            
            stats_orig = calculate_statistics(df_orig)
            acf_pacf_orig = calculate_acf_pacf(df_orig['y'])
            
            paper_data['original_series'] = {
                'dates': dates_orig,
                'values': values_orig,
                'stats': stats_orig,
                'acf_pacf': {
                    'lags': acf_pacf_orig['lags'],
                    'acf': acf_pacf_orig['acf'],
                    'pacf': acf_pacf_orig['pacf']
                }
            }
            
            # Serie trasformata (se presenti trasformazioni)
            df_trans = df_orig.copy()
            has_transformations = transform_config['smoothing_window'] > 1 or \
                transform_config['log_transform'] or \
                transform_config['differencing_order'] > 0
            
            if has_transformations:
                if transform_config['smoothing_window'] > 1:
                    df_trans = apply_smoothing(df_trans, window_size=transform_config['smoothing_window'])
                if transform_config['log_transform']:
                    df_trans = apply_log_transform(df_trans)
                if transform_config['differencing_order'] > 0:
                    df_trans = apply_differencing(df_trans, order=transform_config['differencing_order'])
                
                dates_trans = df_trans['data'].astype(str).tolist()
                values_trans = df_trans['y'].astype(float).tolist()
                
                stats_trans = calculate_statistics(df_trans)
                acf_pacf_trans = calculate_acf_pacf(df_trans['y'])
                
                paper_data['transformed_series'] = {
                    'dates': dates_trans,
                    'values': values_trans,
                    'stats': stats_trans,
                    'acf_pacf': {
                        'lags': acf_pacf_trans['lags'],
                        'acf': acf_pacf_trans['acf'],
                        'pacf': acf_pacf_trans['pacf']
                    }
                }
            
            # Usa solo le analisi ACF/PACF salvate nel ModelRun (se presenti)
            # Non ricalcoliamo le analisi, mostriamo solo quelle che erano state calcolate quando il modello è stato creato
            # config è già definito sopra (riga 1590)
            saved_analyses = config.get('acf_pacf_analyses', {})
            ai_recommendations = []
            
            # Mappa i nomi delle serie per il paper
            series_names = {
                'original': 'Serie originale',
                'smoothed': f'Serie smussata (finestra {transform_config.get("smoothing_window", 1)})' if transform_config.get('smoothing_window', 1) > 1 else None,
                'log': 'Serie trasformata logaritmica',
                'diff': f'Serie differenziata (ordine {transform_config.get("differencing_order", 0)})' if transform_config.get('differencing_order', 0) > 0 else None
            }
            
            # Aggiungi solo le analisi salvate (quelle effettivamente calcolate)
            if saved_analyses.get('original'):
                ai_recommendations.append({
                    'series_type': 'original',
                    'series_name': series_names['original'],
                    'recommendation': saved_analyses['original']
                })
            
            if saved_analyses.get('smoothed') and series_names['smoothed']:
                ai_recommendations.append({
                    'series_type': 'smoothed',
                    'series_name': series_names['smoothed'],
                    'recommendation': saved_analyses['smoothed']
                })
            
            if saved_analyses.get('log'):
                ai_recommendations.append({
                    'series_type': 'log',
                    'series_name': series_names['log'],
                    'recommendation': saved_analyses['log']
                })
            
            if saved_analyses.get('diff') and series_names['diff']:
                ai_recommendations.append({
                    'series_type': 'diff',
                    'series_name': series_names['diff'],
                    'recommendation': saved_analyses['diff']
                })
            
            # Salva tutte le raccomandazioni (solo quelle salvate)
            if ai_recommendations:
                paper_data['ai_recommendations'] = ai_recommendations
                # Mantieni anche il vecchio campo per retrocompatibilità (usa la serie finale se presente)
                if has_transformations:
                    # Cerca la raccomandazione per la serie finale (diff > log > smoothed)
                    final_rec = None
                    for rec in reversed(ai_recommendations):  # Inverti per dare priorità a diff
                        if rec['series_type'] in ['diff', 'log', 'smoothed']:
                            final_rec = rec['recommendation']
                            break
                    if final_rec:
                        paper_data['ai_recommendation'] = final_rec
                else:
                    # Se non ci sono trasformazioni, usa la serie originale
                    orig_rec = next((r for r in ai_recommendations if r['series_type'] == 'original'), None)
                    if orig_rec:
                        paper_data['ai_recommendation'] = orig_rec['recommendation']
        except Exception as e:
            from flask import current_app
            current_app.logger.warning(f'Errore preparazione serie/analisi per paper: {str(e)}')
        
        # Aggiungi metriche
        if model:
            try:
                # Usa la stessa logica di get_model_results
                metrics_dict = {m.metric_type: {
                    'r_squared': m.r_squared,
                    'mape': m.mape_percent,  # Usa mape_percent invece di mape
                    'mae': m.mae,
                    'rmse': m.rmse
                } for m in model.metrics}
                
                paper_data['metrics'] = {
                    'training': metrics_dict.get('training', {}),
                    'test': metrics_dict.get('test', {})
                }
            except Exception as e:
                from flask import current_app
                current_app.logger.warning(f'Errore recupero metriche: {str(e)}')
                paper_data['metrics'] = {'training': {}, 'test': {}}
            
            # Aggiungi coefficienti (dai campi JSON del modello)
            try:
                estimated_params = json.loads(model.estimated_params) if model.estimated_params else {}
                standard_errors = json.loads(model.param_standard_errors) if model.param_standard_errors else {}
                pvalues = json.loads(model.param_pvalues) if model.param_pvalues else {}
                tvalues = json.loads(model.param_tvalues) if model.param_tvalues else {}
                conf_intervals = json.loads(model.param_confidence_intervals) if model.param_confidence_intervals else {}
                
                # Prepara output coefficienti
                param_names = set(list(estimated_params.keys()) + list(standard_errors.keys()) + list(pvalues.keys()))
                
                paper_data['coefficients'] = []
                for param_name in param_names:
                    ci_data = conf_intervals.get(param_name, {})
                    ci_lower = ci_data.get('lower') if isinstance(ci_data, dict) else None
                    ci_upper = ci_data.get('upper') if isinstance(ci_data, dict) else None
                    
                    paper_data['coefficients'].append({
                        'parameter': param_name,
                        'coefficient': estimated_params.get(param_name),
                        'std_error': standard_errors.get(param_name),
                        't_value': tvalues.get(param_name),
                        'p_value': pvalues.get(param_name),
                        'ci_lower': ci_lower,
                        'ci_upper': ci_upper
                    })
            except Exception as e:
                from flask import current_app
                current_app.logger.warning(f'Errore recupero coefficienti: {str(e)}')
                paper_data['coefficients'] = []
            
            # Aggiungi informazioni del modello
            try:
                paper_data['model_summary'] = model.model_summary if model.model_summary else None
                paper_data['aic'] = float(model.aic) if model.aic is not None else None
                paper_data['bic'] = float(model.bic) if model.bic is not None else None
                paper_data['test_r2'] = float(model.test_r2) if model.test_r2 is not None else None
                paper_data['test_mape'] = float(model.test_mape) if model.test_mape is not None else None
                
                # Aggiungi dati per i grafici di previsione
                forecasts = Forecast.query.filter_by(model_id=model.model_id).order_by(Forecast.forecast_date).all()
                
                train_data = []
                test_data = []
                
                for f in forecasts:
                    data_point = {
                        'date': f.forecast_date.isoformat() if f.forecast_date else None,
                        'forecasted': float(f.forecasted_value) if f.forecasted_value is not None else None,
                        'actual': float(f.actual_value) if f.actual_value is not None else None
                    }
                    
                    if f.category == 'train':
                        train_data.append(data_point)
                    elif f.category == 'test':
                        test_data.append(data_point)
                
                paper_data['charts'] = {
                    'train': train_data,
                    'test': test_data
                }
            except Exception as e:
                from flask import current_app
                current_app.logger.warning(f'Errore recupero info modello/grafici: {str(e)}')
                paper_data['charts'] = {'train': [], 'test': []}
        
        return jsonify(paper_data), 200
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f'Errore get_paper_data: {str(e)}', exc_info=True)
        return jsonify({'error': f'Errore nel recupero dati paper: {str(e)}'}), 500

@api.route('/model/<int:model_id>/paper-data', methods=['GET'])
@login_required
def get_model_paper_data(model_id):
    """Ottiene i dati per popolare il paper HTML da un model_id"""
    model = Model.query.get_or_404(model_id)
    
    # Verifica che il modello appartenga all'utente corrente
    model_run = ModelRun.query.filter_by(model_id=model_id, user_id=current_user.user_id).first()
    if not model_run:
        return jsonify({'error': 'Non autorizzato'}), 403
    
    # Usa la stessa logica della route precedente
    return get_paper_data(model_run.run_id)
