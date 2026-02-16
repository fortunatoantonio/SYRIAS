import pandas as pd
import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX
from database import db
from models import *
from utils import split_train_test, calculate_statistics
from utils import validate_file_format
import json
import os
from datetime import datetime
from config import Config, BASE_DIR

def get_absolute_path(relative_path):
    """Converte un percorso relativo in assoluto usando BASE_DIR del progetto"""
    if relative_path is None:
        return None
    # Se è già un percorso assoluto, restituiscilo così com'è
    if os.path.isabs(relative_path):
        return relative_path
    # Altrimenti, combinalo con BASE_DIR
    return os.path.join(BASE_DIR, relative_path)

class FileService:
    @staticmethod
    def load_and_validate(file_path):
        """Carica e valida file CSV"""
        # Converti percorso relativo in assoluto
        file_path = get_absolute_path(file_path)
        
        try:
            if not file_path.endswith('.csv'):
                raise ValueError("Solo file CSV sono supportati")
            
            # Leggi CSV con encoding UTF-8 e gestione errori
            # Prova prima UTF-8, poi latin-1 se fallisce
            try:
                df = pd.read_csv(file_path, encoding='utf-8', on_bad_lines='skip', engine='python')
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, encoding='latin-1', on_bad_lines='skip', engine='python')
            
            # Verifica che il DataFrame non sia vuoto
            if df.empty:
                raise ValueError("Il file è vuoto o non contiene dati validi")
            
            # Rimuovi righe completamente vuote
            df = df.dropna(how='all')
            
            if df.empty:
                raise ValueError("Il file non contiene dati validi dopo la pulizia")
            
            return validate_file_format(df)
        except pd.errors.EmptyDataError:
            raise ValueError("Il file è vuoto")
        except pd.errors.ParserError as e:
            raise ValueError(f"Errore nel parsing del file CSV: {str(e)}")
        except ValueError as e:
            # Rilancia ValueError così com'è (sono i nostri errori di validazione)
            raise e
        except Exception as e:
            raise ValueError(f"Errore nel caricamento del file: {str(e)}")
    
    @staticmethod
    def save_file(file, user_id, train_ratio=0.8):
        """Salva file e crea split training/test"""
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        filename = f"{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # Carica e valida
        df = FileService.load_and_validate(filepath)
        
        # Split training/test (usa train_ratio per calcolare train_obs)
        n = len(df)
        train_obs = int(n * train_ratio) if train_ratio else None
        train_df, test_df = split_train_test(df, train_obs)
        
        # Salva nel database
        file_record = File(
            user_id=user_id,
            file_name=file.filename,
            file_path=filepath,
            n_observations=len(df),
            train_split_ratio=train_ratio,
            train_start_date=train_df['data'].min(),
            train_end_date=train_df['data'].max(),
            test_start_date=test_df['data'].min(),
            test_end_date=test_df['data'].max()
        )
        db.session.add(file_record)
        db.session.commit()
        
        # Calcola statistiche
        StatisticsService.calculate_and_save(file_record.file_id, train_df, test_df)
        
        return file_record

class StatisticsService:
    @staticmethod
    def calculate_and_save(file_id, train_df, test_df):
        """Calcola e salva statistiche per training e test"""
        train_stats = calculate_statistics(train_df)
        test_stats = calculate_statistics(test_df)
        
        stats = Statistics(
            file_id=file_id,
            train_mean=train_stats['mean'],
            train_std=train_stats['std'],
            train_min=train_stats['min'],
            train_max=train_stats['max'],
            train_obs_count=train_stats['obs_count'],
            test_mean=test_stats['mean'],
            test_std=test_stats['std'],
            test_min=test_stats['min'],
            test_max=test_stats['max'],
            test_obs_count=test_stats['obs_count']
        )
        db.session.add(stats)
        db.session.commit()

class SarimaxService:
    """Servizio SARIMAX per modelli configurati manualmente"""
    
    @staticmethod
    def fit_model(file_id, order, seasonal_order, trend, enforce_stationarity=True, enforce_invertibility=True, cov_type='robust_approx'):
        """
        Addestra modello SARIMAX con parametri specificati manualmente
        
        Args:
            file_id: ID del file
            order: tuple (p, d, q) o lista per AR selettivo [1,3] per esempio
            seasonal_order: tuple (P, D, Q, m) o None
            trend: str o lista, es. 'n', 'c', 't', 'ct' o [0,1,0,0] per drift lineare
            enforce_stationarity: bool
            enforce_invertibility: bool
            cov_type: str, tipo di covarianza ('robust_approx', 'opg', etc.)
        
        Returns:
            model (Model), fitted_results (SARIMAXResults)
        """
        file_record = File.query.get(file_id)
        if not file_record:
            raise ValueError("File non trovato")
        
        if file_record.train_start_date is None:
            raise ValueError("Split non ancora applicato")
        
        # Carica dati seguendo la catena di trasformazioni: diff -> log -> smoothed -> original
        # L'ordine di applicazione è: smoothing -> log -> diff
        # Quindi per SARIMAX usiamo: diff se presente, altrimenti log, altrimenti smoothed, altrimenti original
        if file_record.differenced_file_path and os.path.exists(file_record.differenced_file_path):
            df = FileService.load_and_validate(file_record.differenced_file_path)
        elif file_record.log_transformed_file_path and os.path.exists(file_record.log_transformed_file_path):
            df = FileService.load_and_validate(file_record.log_transformed_file_path)
        elif file_record.smoothed_file_path and os.path.exists(file_record.smoothed_file_path):
            df = FileService.load_and_validate(file_record.smoothed_file_path)
        else:
            df = FileService.load_and_validate(file_record.file_path)
        
        # Calcola train_obs da train_split_ratio (per retrocompatibilità)
        # train_split_ratio è salvato come float (es. 0.8 per 80%)
        n_total = len(df)
        if file_record.train_split_ratio:
            train_obs = int(n_total * file_record.train_split_ratio)
            # Assicura che ci sia almeno 1 osservazione nel test set
            if train_obs >= n_total:
                train_obs = n_total - 1
        else:
            # Default: 80% del dataset
            train_obs = int(n_total * 0.8)
        
        # Applica split usando train_obs
        train_df, test_df = split_train_test(df, train_obs)
        train_series = train_df.set_index('data')['y']
        
        # Crea modello nel DB
        model = Model(file_id=file_id, status='running')
        db.session.add(model)
        db.session.commit()
        
        try:
            # Converti order se necessario (gestisce AR selettivo)
            if isinstance(order, list):
                # AR selettivo, es. [1,3] significa solo lag 1 e 3
                # Per SARIMAX, se order è lista, il primo elemento è la lista dei lag AR
                order_tuple = (order, order[1] if len(order) > 1 else 0, 0)  # (p_list, d, q)
                p_val = order
            else:
                order_tuple = order
                p_val = order[0] if isinstance(order, (tuple, list)) and len(order) > 0 else 0
            
            # Converti seasonal_order
            if seasonal_order is None or seasonal_order == (0, 0, 0, 0):
                seasonal_order_tuple = (0, 0, 0, 0)
                is_seasonal = False
            else:
                seasonal_order_tuple = seasonal_order
                is_seasonal = True
            
            # Converti trend
            if isinstance(trend, str):
                trend_param = trend
            elif isinstance(trend, list):
                trend_param = trend
            else:
                trend_param = 'n'
            
            # Crea e addestra modello SARIMAX
            sarimax_model = SARIMAX(
                train_series,
                order=order_tuple,
                seasonal_order=seasonal_order_tuple,
                trend=trend_param,
                enforce_stationarity=enforce_stationarity,
                enforce_invertibility=enforce_invertibility
            )
            
            # Fit modello
            fitted_results = sarimax_model.fit(disp=False, cov_type=cov_type)
            
            # Salva parametri modello
            if isinstance(p_val, list):
                model.p = None  # AR selettivo
                model.model_order_string = f"AR{order}, d={order_tuple[1] if isinstance(order_tuple, tuple) else 0}, q={order_tuple[2] if isinstance(order_tuple, tuple) else 0}"
            else:
                model.p = order_tuple[0] if isinstance(order_tuple, tuple) else 0
                model.model_order_string = str(order_tuple)
            
            model.d = order_tuple[1] if isinstance(order_tuple, tuple) else (order[1] if isinstance(order, list) and len(order) > 1 else 0)
            model.q = order_tuple[2] if isinstance(order_tuple, tuple) else 0
            
            if is_seasonal:
                model.seasonal_p = seasonal_order_tuple[0]
                model.seasonal_d = seasonal_order_tuple[1]
                model.seasonal_q = seasonal_order_tuple[2]
                model.seasonal_m = seasonal_order_tuple[3]
                model.seasonal_order_string = str(seasonal_order_tuple)
                model.is_seasonal = True
            
            model.aic = float(fitted_results.aic)
            model.bic = float(fitted_results.bic) if hasattr(fitted_results, 'bic') else None
            
            # Estrai output completo
            SarimaxService._extract_model_output(model, fitted_results)
            
            db.session.commit()
            
            # Genera previsioni e calcola metriche
            SarimaxService._generate_forecasts_and_metrics(model, fitted_results, train_df, test_df, order_tuple)
            
            model.status = 'completed'
            db.session.commit()
            
            return model, fitted_results
            
        except Exception as e:
            model.status = 'failed'
            db.session.commit()
            import traceback
            traceback.print_exc()
            raise e
    
    @staticmethod
    def _extract_model_output(model, fitted_results):
        """Estrae output completo dal modello SARIMAX"""
        try:
            # Coefficienti stimati
            if hasattr(fitted_results, 'params'):
                params = fitted_results.params
                model.estimated_params = json.dumps(
                    {str(name): float(value) for name, value in params.items()}
                )
            
            # Standard errors
            if hasattr(fitted_results, 'bse'):
                bse = fitted_results.bse
                model.param_standard_errors = json.dumps(
                    {str(name): float(value) for name, value in bse.items()}
                )
            
            # P-values
            if hasattr(fitted_results, 'pvalues'):
                pvalues = fitted_results.pvalues
                model.param_pvalues = json.dumps(
                    {str(name): float(value) for name, value in pvalues.items()}
                )
            
            # T-values
            if hasattr(fitted_results, 'tvalues'):
                tvalues = fitted_results.tvalues
                model.param_tvalues = json.dumps(
                    {str(name): float(value) for name, value in tvalues.items()}
                )
            elif hasattr(fitted_results, 'params') and hasattr(fitted_results, 'bse'):
                # Calcola t-values
                params = fitted_results.params
                bse = fitted_results.bse
                tvalues_dict = {}
                for param_name in params.index:
                    if param_name in bse.index and bse[param_name] != 0:
                        tvalues_dict[str(param_name)] = float(params[param_name] / bse[param_name])
                if tvalues_dict:
                    model.param_tvalues = json.dumps(tvalues_dict)
            
            # Intervalli di confidenza
            if hasattr(fitted_results, 'conf_int'):
                conf_int = fitted_results.conf_int()
                conf_dict = {}
                for idx in conf_int.index:
                    try:
                        conf_dict[str(idx)] = {
                            'lower': float(conf_int.loc[idx, 0]),
                            'upper': float(conf_int.loc[idx, 1])
                        }
                    except:
                        pass
                model.param_confidence_intervals = json.dumps(conf_dict)
            
            # Summary completo
            if hasattr(fitted_results, 'summary'):
                try:
                    summary = fitted_results.summary()
                    if hasattr(summary, 'as_text'):
                        model.model_summary = summary.as_text()
                    else:
                        model.model_summary = str(summary)
                except:
                    model.model_summary = str(fitted_results.summary())
        
        except Exception as e:
            print(f"Errore estrazione output: {e}")
            import traceback
            traceback.print_exc()
    
    @staticmethod
    def _calculate_lost_observations(order, seasonal_order):
        """Calcola osservazioni perse nella differenziazione"""
        try:
            if isinstance(order, list):
                d = order[1] if len(order) > 1 else 0
            elif isinstance(order, tuple):
                d = order[1] if len(order) > 1 else 0
            else:
                d = 0
            
            D = 0
            m = 0
            if seasonal_order and len(seasonal_order) > 1:
                D = seasonal_order[1]
                if len(seasonal_order) > 3:
                    m = seasonal_order[3]
            
            lost_obs = d + (D * m if D > 0 and m > 0 else 0)
            return lost_obs
        except:
            return 0
    
    @staticmethod
    def _align_forecasts_with_dates(forecasts, dates_series, lost_observations=0):
        """
        Allinea i fitted values/forecasts con le date originali, rimuovendo
        le osservazioni perse nella differenziazione.
        
        Questo risolve il problema dello sfasamento quando ARIMA differenzia
        internamente e perde le prime osservazioni.
        
        Args:
            forecasts: array o Series con i valori fitted/forecast
            dates_series: Series con le date originali (indice o valori)
            lost_observations: numero di osservazioni perse nella differenziazione
        
        Returns:
            pandas Series con forecasts allineati alle date corrette
        """
        import pandas as pd
        
        # Ottieni date originali
        if isinstance(dates_series, pd.Series) and isinstance(dates_series.index, pd.DatetimeIndex):
            original_dates = dates_series.index
        elif isinstance(dates_series, pd.Series):
            original_dates = pd.to_datetime(dates_series.values)
        else:
            original_dates = pd.to_datetime(dates_series)
        
        # Converti forecasts in Series se necessario
        if not isinstance(forecasts, pd.Series):
            forecasts = pd.Series(forecasts)
        
        # Se forecasts ha già un indice datetime (da statsmodels/pmdarima)
        if isinstance(forecasts.index, pd.DatetimeIndex):
            # Usa direttamente l'indice datetime e trova l'intersezione con le date originali
            # Rimuovi le prime 'lost_observations' date originali
            if lost_observations > 0:
                dates_to_align = original_dates[lost_observations:]
            else:
                dates_to_align = original_dates
            
            # Trova date comuni tra forecasts e dates_to_align
            common_dates = forecasts.index.intersection(dates_to_align)
            if len(common_dates) > 0:
                # Usa solo le date comuni
                aligned = forecasts.loc[common_dates]
            else:
                # Se non ci sono date comuni, allinea per posizione
                if len(forecasts) <= len(dates_to_align):
                    aligned = pd.Series(forecasts.values, index=dates_to_align[:len(forecasts)])
                else:
                    aligned = pd.Series(forecasts.values[:len(dates_to_align)], index=dates_to_align)
        else:
            # Se forecasts non ha indice datetime, allinea per posizione
            # Rimuovi le prime 'lost_observations' date
            if lost_observations > 0:
                dates_to_align = original_dates[lost_observations:]
            else:
                dates_to_align = original_dates
            
            # Allinea per posizione
            if len(forecasts) <= len(dates_to_align):
                aligned = pd.Series(forecasts.values, index=dates_to_align[:len(forecasts)])
            else:
                aligned = pd.Series(forecasts.values[:len(dates_to_align)], index=dates_to_align)
        
        return aligned
    
    @staticmethod
    def _generate_forecasts_and_metrics(model, fitted_results, train_df, test_df, order):
        """Genera previsioni e calcola metriche su training e test"""
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
        import numpy as np
        
        # Calcola osservazioni perse
        seasonal_order = (model.seasonal_p, model.seasonal_d, model.seasonal_q, model.seasonal_m) if model.is_seasonal else (0, 0, 0, 0)
        lost_obs = SarimaxService._calculate_lost_observations(order, seasonal_order)
        
        # Previsioni training (in-sample)
        train_series = train_df.set_index('data')['y']
        train_fitted = fitted_results.fittedvalues
        
        # Allinea fitted values
        train_fitted_aligned = SarimaxService._align_forecasts_with_dates(
            train_fitted, train_series, lost_obs
        )
        
        # Date comuni
        common_dates = train_fitted_aligned.index.intersection(train_series.index)
        train_actual_aligned = train_series.loc[common_dates]
        train_fitted_aligned = train_fitted_aligned.loc[common_dates]
        
        # Previsioni test (out-of-sample)
        n_test = len(test_df)
        test_forecast_obj = fitted_results.get_forecast(steps=n_test)
        test_forecasts = test_forecast_obj.predicted_mean
        test_conf_int = test_forecast_obj.conf_int()
        
        # Allinea previsioni test con date test
        test_dates = test_df.set_index('data').index
        test_forecasts.index = test_dates
        test_conf_int.index = test_dates
        test_actual = test_df['y'].values
        
        # Salva previsioni training
        for date in common_dates:
            actual = train_actual_aligned.loc[date]
            fitted = train_fitted_aligned.loc[date]
            forecast_record = Forecast(
                model_id=model.model_id,
                forecast_date=pd.to_datetime(date),
                forecasted_value=float(fitted),
                actual_value=float(actual),
                category='train'
            )
            db.session.add(forecast_record)
        
        # Salva previsioni test
        for i, date in enumerate(test_dates):
            actual = test_actual[i]
            forecast = test_forecasts.iloc[i]
            ci_lower = test_conf_int.iloc[i, 0]
            ci_upper = test_conf_int.iloc[i, 1]
            
            forecast_record = Forecast(
                model_id=model.model_id,
                forecast_date=pd.to_datetime(date),
                forecasted_value=float(forecast),
                actual_value=float(actual),
                ci_lower=float(ci_lower),
                ci_upper=float(ci_upper),
                category='test'
            )
            db.session.add(forecast_record)
        
        db.session.commit()
        
        # Calcola metriche training
        train_actual_values = train_actual_aligned.values
        train_fitted_values = train_fitted_aligned.values
        train_mae = mean_absolute_error(train_actual_values, train_fitted_values)
        train_rmse = np.sqrt(mean_squared_error(train_actual_values, train_fitted_values))
        train_r2 = r2_score(train_actual_values, train_fitted_values)
        train_mape = np.mean(np.abs((train_actual_values - train_fitted_values) / train_actual_values)) * 100
        
        train_metrics = Metrics(
            model_id=model.model_id,
            metric_type='training',
            mae=train_mae,
            rmse=train_rmse,
            r_squared=train_r2,
            mape=train_mape,
            mape_percent=train_mape
        )
        db.session.add(train_metrics)
        
        # Calcola metriche test
        test_mae = mean_absolute_error(test_actual, test_forecasts)
        test_rmse = np.sqrt(mean_squared_error(test_actual, test_forecasts))
        test_r2 = r2_score(test_actual, test_forecasts)
        test_mape = np.mean(np.abs((test_actual - test_forecasts) / test_actual)) * 100
        
        test_metrics = Metrics(
            model_id=model.model_id,
            metric_type='test',
            mae=test_mae,
            rmse=test_rmse,
            r_squared=test_r2,
            mape=test_mape,
            mape_percent=test_mape
        )
        db.session.add(test_metrics)
        
        # Salva test_r2 e test_mape anche nel modello per accesso rapido
        model.test_r2 = test_r2
        model.test_mape = test_mape
        
        # Calcola score combinato: R² test - (MAPE test / 100)
        # R² va da -inf a 1 (più alto è meglio), MAPE va da 0 a inf (più basso è meglio)
        # Normalizziamo MAPE dividendo per 100 (dato che è in percentuale)
        # e lo sottraiamo da R² per bilanciare i due metriche
        if test_r2 is not None and test_mape is not None:
            # Formula: R² - (MAPE/100) per bilanciare R² (più alto meglio) e MAPE (più basso meglio)
            combined_score = test_r2 - (test_mape / 100.0)
            model.test_score = combined_score
        else:
            model.test_score = None
        
        db.session.commit()

class VisualizationService:
    """Servizio per generare grafici"""
    
    @staticmethod
    def get_plot_base64(file_id):
        """Genera grafico e restituisce come base64 per embedding HTML"""
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import base64
        import io
        
        file_record = File.query.get(file_id)
        if not file_record:
            raise ValueError("File non trovato")
        
        # Carica dati (solo CSV)
        df = pd.read_csv(file_record.file_path)
        
        df['data'] = pd.to_datetime(df['data'])
        df = df.sort_values('data').reset_index(drop=True)
        
        # Crea grafico
        plt.figure(figsize=(12, 6))
        plt.plot(df['data'], df['y'], linewidth=2, color='#1f4788', marker='o', markersize=3)
        plt.title('Serie Storica Completa', fontsize=16, fontweight='bold')
        plt.xlabel('Data', fontsize=12)
        plt.ylabel('Valore (y)', fontsize=12)
        plt.grid(True, alpha=0.3)
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        # Converti in base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        plt.close()
        
        return f"data:image/png;base64,{image_base64}"


