from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
from flask_login import LoginManager
from config import Config
from database import db, init_db
from routes import api
from models import User
import os
import sys

login_manager = LoginManager()
login_manager.login_view = 'api.login'
login_manager.session_protection = 'strong'

@login_manager.user_loader
def load_user(user_id):
    # Usa db.session.get() invece di User.query.get() per SQLAlchemy 2.0
    return db.session.get(User, int(user_id))

@login_manager.unauthorized_handler
def unauthorized():
    """Handler per richieste non autorizzate - restituisce JSON invece di redirect per API"""
    # Se è una richiesta API (inizia con /api), restituisci JSON
    if request.path.startswith('/api'):
        return jsonify({'error': 'Autenticazione richiesta', 'authenticated': False}), 401
    # Altrimenti, usa il comportamento di default (redirect)
    return redirect(url_for('api.login', next=request.path))

def create_app():
    app = Flask(__name__, 
                template_folder='../frontend/templates',
                static_folder='../frontend/static')
    app.config.from_object(Config)
    
    # Abilita CORS con supporto per cookie e credenziali
    CORS(app, 
         resources={r"/api/*": {
             "origins": "*",
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True
         }},
         supports_credentials=True)
    
    # Inizializza Flask-Login
    login_manager.init_app(app)
    
    # Crea cartelle necessarie
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(Config.EXPORT_FOLDER, exist_ok=True)
    
    init_db(app)
    app.register_blueprint(api, url_prefix='/api')
    
    # Route principale dashboard
    @app.route('/')
    def index():
        return render_template('dashboard.html')
    
    # Route per il paper HTML
    @app.route('/paper')
    def paper():
        return render_template('paper.html')
    
    return app

# Entry point principale
if __name__ == '__main__':
    # Aggiungi la directory corrente al Python path se necessario
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
    
    app = create_app()
    
    # Avvia scheduler automazioni (opzionale)
    try:
        from automation.scheduler import AutomationScheduler
        scheduler = AutomationScheduler()
        scheduler.start()
    except ImportError:
        scheduler = None
    
    try:
        print("=" * 50)
        print("Dashboard ARIMA - Server avviato")
        print("Accessibile su: http://localhost:5001")
        print("=" * 50)
        
        # use_reloader=False per evitare problemi con SQLAlchemy (doppia definizione tabelle)
        use_reloader = os.getenv('FLASK_USE_RELOADER', 'False').lower() == 'true'
        app.run(debug=True, host='0.0.0.0', port=5001, use_reloader=use_reloader)
    except KeyboardInterrupt:
        print("\nArresto server...")
        if scheduler:
            scheduler.stop()
