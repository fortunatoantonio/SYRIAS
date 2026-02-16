from database import db
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
import json
from datetime import datetime

class User(UserMixin, db.Model):
    __tablename__ = 'user'
    user_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    surname = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    files = db.relationship('File', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def get_id(self):
        return str(self.user_id)
    
    def set_password(self, password):
        self.password = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password, password)

class File(db.Model):
    """File caricato - formato fisso: colonne 'data' e 'y'"""
    __tablename__ = 'file'
    file_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    n_observations = db.Column(db.Integer)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Trasformazioni (opzionali, prima dello split) - ordine: smoothing -> log -> diff
    smoothing_window = db.Column(db.Integer, default=1, nullable=False)  # 1 = nessuno smoothing
    smoothed_file_path = db.Column(db.String(500), nullable=True)  # Path file smussato se applicato
    
    # Trasformazione logaritmica (applicata dopo smoothing se presente)
    log_transform = db.Column(db.Boolean, default=False, nullable=False)  # True se applicata
    log_transformed_file_path = db.Column(db.String(500), nullable=True)  # Path file trasformato log
    
    # Differenziazione (applicata dopo log se presente, altrimenti dopo smoothing)
    differencing_order = db.Column(db.Integer, default=0, nullable=False)  # 0 = nessuna differenziazione
    differenced_file_path = db.Column(db.String(500), nullable=True)  # Path file differenziato
    
    # Split training/test (unica configurazione utente)
    train_split_ratio = db.Column(db.Float, default=0.8)  # 80% training, 20% test
    train_start_date = db.Column(db.DateTime)
    train_end_date = db.Column(db.DateTime)
    test_start_date = db.Column(db.DateTime)
    test_end_date = db.Column(db.DateTime)
    
    # Relazioni
    statistics = db.relationship('Statistics', backref='file', uselist=False, lazy=True, cascade='all, delete-orphan')
    model = db.relationship('Model', backref='file', uselist=False, lazy=True, cascade='all, delete-orphan')

class Statistics(db.Model):
    """Statistiche descrittive"""
    __tablename__ = 'statistics'
    stat_id = db.Column(db.Integer, primary_key=True)
    file_id = db.Column(db.Integer, db.ForeignKey('file.file_id'), nullable=False)
    
    # Training set stats
    train_mean = db.Column(db.Float)
    train_std = db.Column(db.Float)
    train_min = db.Column(db.Float)
    train_max = db.Column(db.Float)
    train_obs_count = db.Column(db.Integer)
    
    # Test set stats
    test_mean = db.Column(db.Float)
    test_std = db.Column(db.Float)
    test_min = db.Column(db.Float)
    test_max = db.Column(db.Float)
    test_obs_count = db.Column(db.Integer)

class Model(db.Model):
    """Modello ARIMA ottimale (auto-generato, non configurabile)"""
    __tablename__ = 'model'
    model_id = db.Column(db.Integer, primary_key=True)
    file_id = db.Column(db.Integer, db.ForeignKey('file.file_id'), nullable=False)
    
    # Parametri modello (auto-determinati)
    p = db.Column(db.Integer)
    d = db.Column(db.Integer)
    q = db.Column(db.Integer)
    seasonal_p = db.Column(db.Integer)  # Stagionale P
    seasonal_d = db.Column(db.Integer)  # Stagionale D
    seasonal_q = db.Column(db.Integer)  # Stagionale Q
    seasonal_m = db.Column(db.Integer)  # Periodo stagionale m
    
    model_order_string = db.Column(db.String(50))  # "(p,d,q)"
    seasonal_order_string = db.Column(db.String(50))  # "(seasonal_p,seasonal_d,seasonal_q,seasonal_m)"
    is_seasonal = db.Column(db.Boolean, default=False)
    
    # Metriche selezione
    aic = db.Column(db.Float)
    bic = db.Column(db.Float)
    
    # Metriche test usate per selezione
    test_r2 = db.Column(db.Float)  # R² sul test set
    test_mape = db.Column(db.Float)  # MAPE sul test set
    test_score = db.Column(db.Float)  # Score combinato usato per selezione
    
    # Output modello completo (JSON)
    estimated_params = db.Column(db.Text)  # Coefficienti stimati
    param_standard_errors = db.Column(db.Text)  # Standard errors
    param_pvalues = db.Column(db.Text)  # P-values
    param_tvalues = db.Column(db.Text)  # T-values
    param_confidence_intervals = db.Column(db.Text)  # Intervalli di confidenza
    
    # Summary completo del modello (testo)
    model_summary = db.Column(db.Text)  # Summary completo da statsmodels
    
    # Status
    status = db.Column(db.String(50), default='pending')  # pending, running, completed, failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relazioni
    residuals = db.relationship('Residuals', backref='model', uselist=False, lazy=True, cascade='all, delete-orphan')
    forecasts = db.relationship('Forecast', backref='model', lazy=True, cascade='all, delete-orphan')
    metrics = db.relationship('Metrics', backref='model', lazy=True, cascade='all, delete-orphan')

class Residuals(db.Model):
    """Residui del modello"""
    __tablename__ = 'residuals'
    residual_id = db.Column(db.Integer, primary_key=True)
    model_id = db.Column(db.Integer, db.ForeignKey('model.model_id'), nullable=False)
    
    mean = db.Column(db.Float)
    std = db.Column(db.Float)
    min = db.Column(db.Float)
    max = db.Column(db.Float)
    
    # Test diagnostici
    ljung_box_stat = db.Column(db.Float)
    ljung_box_pvalue = db.Column(db.Float)
    jarque_bera_stat = db.Column(db.Float)
    jarque_bera_pvalue = db.Column(db.Float)
    normality_passed = db.Column(db.Boolean)
    
    model_summary = db.Column(db.Text)

class Forecast(db.Model):
    """Previsioni"""
    __tablename__ = 'forecast'
    forecast_id = db.Column(db.Integer, primary_key=True)
    model_id = db.Column(db.Integer, db.ForeignKey('model.model_id'), nullable=False)
    
    forecast_date = db.Column(db.DateTime, nullable=False)
    forecasted_value = db.Column(db.Float, nullable=False)
    actual_value = db.Column(db.Float)  # Se disponibile (test set)
    
    ci_lower = db.Column(db.Float)
    ci_upper = db.Column(db.Float)
    confidence_level = db.Column(db.Float, default=0.95)
    
    category = db.Column(db.String(50))  # 'train', 'test', 'future'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Metrics(db.Model):
    """Metriche di performance"""
    __tablename__ = 'metrics'
    metric_id = db.Column(db.Integer, primary_key=True)
    model_id = db.Column(db.Integer, db.ForeignKey('model.model_id'), nullable=False)
    
    metric_type = db.Column(db.String(50))  # 'training' o 'test'
    
    # Metriche regressione
    r_squared = db.Column(db.Float)
    mape = db.Column(db.Float)  # Mean Absolute Percentage Error
    mae = db.Column(db.Float)   # Mean Absolute Error
    rmse = db.Column(db.Float)  # Root Mean Squared Error
    mape_percent = db.Column(db.Float)  # MAPE in percentuale

class ModelRun(db.Model):
    """Salva ogni modello provato con tutte le informazioni per export PDF"""
    __tablename__ = 'model_run'
    run_id = db.Column(db.Integer, primary_key=True)
    model_id = db.Column(db.Integer, db.ForeignKey('model.model_id'), nullable=False)
    file_id = db.Column(db.Integer, db.ForeignKey('file.file_id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    
    # Configurazione utilizzata (JSON)
    configuration = db.Column(db.Text)  # JSON con: smoothing, log_transform, differencing, split, sarimax_params
    
    # Path al PDF generato
    pdf_path = db.Column(db.String(500), nullable=True)
    
    # Path al Paper HTML generato
    paper_path = db.Column(db.String(500), nullable=True)
    
    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relazioni
    model = db.relationship('Model', backref='runs', lazy=True)
    file = db.relationship('File', backref='model_runs', lazy=True)
    user = db.relationship('User', backref='model_runs', lazy=True)

