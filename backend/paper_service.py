"""
Servizio per la generazione del paper HTML del modello
"""
import os
import json
from datetime import datetime
from config import Config
from models import Model, File, ModelRun, Metrics


class PaperService:
    """Servizio per generare e gestire i paper HTML dei modelli"""
    
    @staticmethod
    def generate_paper(run_id, model, file_record, configuration):
        """
        Genera il paper HTML per un modello e lo salva
        
        Args:
            run_id: ID del ModelRun
            model: Oggetto Model
            file_record: Oggetto File
            configuration: Dizionario con la configurazione del modello
            
        Returns:
            str: Path del file paper generato
        """
        # Crea la cartella papers se non esiste
        papers_folder = os.path.join(Config.EXPORT_FOLDER, 'papers')
        os.makedirs(papers_folder, exist_ok=True)
        
        # Nome del file paper
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        paper_filename = f"paper_run_{run_id}_{timestamp}.html"
        paper_path = os.path.join(papers_folder, paper_filename)
        
        # Il paper HTML viene servito dinamicamente tramite il template
        # Qui salviamo solo il path per riferimento
        # Il contenuto viene generato dinamicamente quando viene richiesto
        
        return paper_path
    
    @staticmethod
    def get_paper_data(run_id):
        """
        Recupera tutti i dati necessari per popolare il paper
        
        Args:
            run_id: ID del ModelRun
            
        Returns:
            dict: Dizionario con tutti i dati del paper
        """
        model_run = ModelRun.query.get(run_id)
        if not model_run:
            return None
        
        model = model_run.model
        file_record = model_run.file
        config = json.loads(model_run.configuration) if model_run.configuration else {}
        
        # Prepara i dati
        data = {
            'file_name': file_record.file_name if file_record else 'N/A',
            'order': model.model_order_string if model else 'N/A',
            'seasonal_order': model.seasonal_order_string if model and model.is_seasonal else None,
            'created_at': model_run.created_at.isoformat() if model_run.created_at else None,
            'config_info': {
                'smoothing_window': config.get('smoothing_window', 1),
                'log_transform': config.get('log_transform', False),
                'differencing_order': config.get('differencing_order', 0),
                'train_obs': config.get('train_obs'),
                'trend': config.get('trend', 'n')  # Aggiungi trend se presente nella configurazione
            },
            'sarimax_params': config.get('sarimax_params', {}),
            'metrics': {},
            'coefficients': [],
            'model_summary': None,
            'aic': model.aic if model else None,
            'bic': model.bic if model else None,
            'test_r2': model.test_r2 if model else None,
            'test_mape': model.test_mape if model else None
        }
        
        # Aggiungi metriche
        if model:
            metrics = Metrics.query.filter_by(model_id=model.model_id).first()
            if metrics:
                data['metrics'] = {
                    'training': {
                        'r_squared': metrics.train_r_squared,
                        'mape': metrics.train_mape,
                        'mae': metrics.train_mae,
                        'rmse': metrics.train_rmse
                    },
                    'test': {
                        'r_squared': metrics.test_r_squared,
                        'mape': metrics.test_mape,
                        'mae': metrics.test_mae,
                        'rmse': metrics.test_rmse
                    }
                }
            
            # Aggiungi coefficienti dai campi JSON del modello
            estimated_params = json.loads(model.estimated_params) if model.estimated_params else {}
            standard_errors = json.loads(model.param_standard_errors) if model.param_standard_errors else {}
            pvalues = json.loads(model.param_pvalues) if model.param_pvalues else {}
            tvalues = json.loads(model.param_tvalues) if model.param_tvalues else {}
            conf_intervals = json.loads(model.param_confidence_intervals) if model.param_confidence_intervals else {}
            
            param_names = set(list(estimated_params.keys()) + list(standard_errors.keys()) + list(pvalues.keys()))
            
            for param_name in param_names:
                ci_data = conf_intervals.get(param_name, {})
                ci_lower = ci_data.get('lower') if isinstance(ci_data, dict) else None
                ci_upper = ci_data.get('upper') if isinstance(ci_data, dict) else None
                
                data['coefficients'].append({
                    'parameter': param_name,
                    'coefficient': estimated_params.get(param_name),
                    'std_error': standard_errors.get(param_name),
                    't_value': tvalues.get(param_name),
                    'p_value': pvalues.get(param_name),
                    'ci_lower': ci_lower,
                    'ci_upper': ci_upper
                })
            
            data['model_summary'] = model.model_summary
        
        return data

