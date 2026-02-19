import os
from dotenv import load_dotenv

load_dotenv()

# Directory base del progetto (parent di backend/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    # Database: usa sempre il percorso assoluto nella root del progetto
    INSTANCE_DIR = os.path.join(BASE_DIR, 'instance')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', f'sqlite:///{os.path.join(BASE_DIR, "instance", "dash.db")}')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # File Upload - percorso assoluto
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', os.path.join(BASE_DIR, 'data', 'uploads'))
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    # AI Images - percorso assoluto
    AI_IMAGES_FOLDER = os.getenv('AI_IMAGES_FOLDER', os.path.join(BASE_DIR, 'data', 'ai_images'))
    
    # Export PDF - percorso assoluto
    EXPORT_FOLDER = os.getenv('EXPORT_FOLDER', os.path.join(BASE_DIR, 'data', 'exports'))
    
    # Ollama Configuration
    OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
    OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llava')

