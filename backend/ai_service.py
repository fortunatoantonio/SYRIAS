"""
Servizio per analisi automatica ACF/PACF (euristica locale, senza IA esterna).
"""
import os
import matplotlib
matplotlib.use('Agg')  # Usa backend non-interattivo
import matplotlib.pyplot as plt
from utils import calculate_acf_pacf
import numpy as np


class AIService:
    """Servizio per grafici ACF/PACF e suggerimento modello basato su ACF/PACF (locale)."""
    
    def __init__(self):
        """Inizializza il servizio e la cartella per le immagini ACF/PACF."""
        self.images_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'ai_images')
        os.makedirs(self.images_folder, exist_ok=True)
    
    def generate_acf_pacf_images(self, series, file_id, prefix='original'):
        """
        Genera immagini ACF e PACF e le salva come PNG
        
        Args:
            series: pandas Series o array con valori della serie
            file_id: ID del file per naming
            prefix: Prefisso per il nome file ('original' o 'smoothed')
        
        Returns:
            tuple: (path_acf_image, path_pacf_image)
        """
        # Calcola ACF/PACF
        acf_pacf_data = calculate_acf_pacf(series)
        
        # Crea figure
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))
        
        # Plot ACF
        lags = acf_pacf_data['lags']
        acf_values = acf_pacf_data['acf']
        acf_confint = acf_pacf_data['acf_confint']
        
        ax1.bar(lags, acf_values, width=0.3, alpha=0.7, color='steelblue')
        ax1.axhline(y=0, color='black', linestyle='-', linewidth=0.5)
        
        # Aggiungi bande di confidenza
        if acf_confint:
            ci_lower = [ci[0] for ci in acf_confint]
            ci_upper = [ci[1] for ci in acf_confint]
            ax1.fill_between(lags, ci_lower, ci_upper, alpha=0.2, color='red', label='95% CI')
            ax1.axhline(y=ci_upper[0] if ci_upper else 0, color='red', linestyle='--', linewidth=1, alpha=0.7)
            ax1.axhline(y=ci_lower[0] if ci_lower else 0, color='red', linestyle='--', linewidth=1, alpha=0.7)
        
        ax1.set_xlabel('Lag')
        ax1.set_ylabel('Autocorrelation')
        ax1.set_title('Autocorrelation Function (ACF)')
        ax1.grid(True, alpha=0.3)
        ax1.legend()
        
        # Plot PACF
        pacf_values = acf_pacf_data['pacf']
        pacf_confint = acf_pacf_data['pacf_confint']
        
        ax2.bar(lags, pacf_values, width=0.3, alpha=0.7, color='darkgreen')
        ax2.axhline(y=0, color='black', linestyle='-', linewidth=0.5)
        
        # Aggiungi bande di confidenza
        if pacf_confint:
            ci_lower = [ci[0] for ci in pacf_confint]
            ci_upper = [ci[1] for ci in pacf_confint]
            ax2.fill_between(lags, ci_lower, ci_upper, alpha=0.2, color='red', label='95% CI')
            ax2.axhline(y=ci_upper[0] if ci_upper else 0, color='red', linestyle='--', linewidth=1, alpha=0.7)
            ax2.axhline(y=ci_lower[0] if ci_lower else 0, color='red', linestyle='--', linewidth=1, alpha=0.7)
        
        ax2.set_xlabel('Lag')
        ax2.set_ylabel('Partial Autocorrelation')
        ax2.set_title('Partial Autocorrelation Function (PACF)')
        ax2.grid(True, alpha=0.3)
        ax2.legend()
        
        plt.tight_layout()
        
        # Salva immagine combinata
        image_path = os.path.join(self.images_folder, f'{file_id}_{prefix}_acf_pacf.png')
        plt.savefig(image_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        # Crea anche immagini separate per maggiore chiarezza
        # ACF separato
        fig_acf, ax_acf = plt.subplots(figsize=(10, 4))
        ax_acf.bar(lags, acf_values, width=0.3, alpha=0.7, color='steelblue')
        ax_acf.axhline(y=0, color='black', linestyle='-', linewidth=0.5)
        if acf_confint:
            ci_lower = [ci[0] for ci in acf_confint]
            ci_upper = [ci[1] for ci in acf_confint]
            ax_acf.fill_between(lags, ci_lower, ci_upper, alpha=0.2, color='red', label='95% CI')
            ax_acf.axhline(y=ci_upper[0] if ci_upper else 0, color='red', linestyle='--', linewidth=1, alpha=0.7)
            ax_acf.axhline(y=ci_lower[0] if ci_lower else 0, color='red', linestyle='--', linewidth=1, alpha=0.7)
        ax_acf.set_xlabel('Lag')
        ax_acf.set_ylabel('Autocorrelation')
        ax_acf.set_title('Autocorrelation Function (ACF)')
        ax_acf.grid(True, alpha=0.3)
        ax_acf.legend()
        
        acf_path = os.path.join(self.images_folder, f'{file_id}_{prefix}_acf.png')
        fig_acf.savefig(acf_path, dpi=150, bbox_inches='tight')
        plt.close(fig_acf)
        
        # PACF separato
        fig_pacf, ax_pacf = plt.subplots(figsize=(10, 4))
        ax_pacf.bar(lags, pacf_values, width=0.3, alpha=0.7, color='darkgreen')
        ax_pacf.axhline(y=0, color='black', linestyle='-', linewidth=0.5)
        if pacf_confint:
            ci_lower = [ci[0] for ci in pacf_confint]
            ci_upper = [ci[1] for ci in pacf_confint]
            ax_pacf.fill_between(lags, ci_lower, ci_upper, alpha=0.2, color='red', label='95% CI')
            ax_pacf.axhline(y=ci_upper[0] if ci_upper else 0, color='red', linestyle='--', linewidth=1, alpha=0.7)
            ax_pacf.axhline(y=ci_lower[0] if ci_lower else 0, color='red', linestyle='--', linewidth=1, alpha=0.7)
        ax_pacf.set_xlabel('Lag')
        ax_pacf.set_ylabel('Partial Autocorrelation')
        ax_pacf.set_title('Partial Autocorrelation Function (PACF)')
        ax_pacf.grid(True, alpha=0.3)
        ax_pacf.legend()
        
        pacf_path = os.path.join(self.images_folder, f'{file_id}_{prefix}_pacf.png')
        fig_pacf.savefig(pacf_path, dpi=150, bbox_inches='tight')
        plt.close(fig_pacf)
        
        return acf_path, pacf_path, image_path
    
    def create_combined_acf_pacf_image(self, series, file_id, prefix='original'):
        """
        Crea un'immagine combinata con ACF e PACF affiancati per maggiore compatibilità con Ollama
        
        Args:
            series: pandas Series o array con valori della serie
            file_id: ID del file per naming
            prefix: Prefisso per il nome file ('original' o 'smoothed')
        
        Returns:
            path all'immagine combinata
        """
        # Calcola ACF/PACF
        acf_pacf_data = calculate_acf_pacf(series)
        
        # Crea figura con due subplot affiancati
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))
        
        # Plot ACF
        lags = acf_pacf_data['lags']
        acf_values = acf_pacf_data['acf']
        acf_confint = acf_pacf_data['acf_confint']
        
        ax1.bar(lags, acf_values, width=0.3, alpha=0.7, color='steelblue')
        ax1.axhline(y=0, color='black', linestyle='-', linewidth=0.5)
        
        if acf_confint:
            ci_lower = [ci[0] for ci in acf_confint]
            ci_upper = [ci[1] for ci in acf_confint]
            ax1.fill_between(lags, ci_lower, ci_upper, alpha=0.2, color='red', label='95% CI')
            ax1.axhline(y=ci_upper[0] if ci_upper else 0, color='red', linestyle='--', linewidth=1, alpha=0.7)
            ax1.axhline(y=ci_lower[0] if ci_lower else 0, color='red', linestyle='--', linewidth=1, alpha=0.7)
        
        ax1.set_xlabel('Lag')
        ax1.set_ylabel('Autocorrelation')
        ax1.set_title('Autocorrelation Function (ACF)')
        ax1.grid(True, alpha=0.3)
        ax1.legend()
        
        # Plot PACF
        pacf_values = acf_pacf_data['pacf']
        pacf_confint = acf_pacf_data['pacf_confint']
        
        ax2.bar(lags, pacf_values, width=0.3, alpha=0.7, color='darkgreen')
        ax2.axhline(y=0, color='black', linestyle='-', linewidth=0.5)
        
        if pacf_confint:
            ci_lower = [ci[0] for ci in pacf_confint]
            ci_upper = [ci[1] for ci in pacf_confint]
            ax2.fill_between(lags, ci_lower, ci_upper, alpha=0.2, color='red', label='95% CI')
            ax2.axhline(y=ci_upper[0] if ci_upper else 0, color='red', linestyle='--', linewidth=1, alpha=0.7)
            ax2.axhline(y=ci_lower[0] if ci_lower else 0, color='red', linestyle='--', linewidth=1, alpha=0.7)
        
        ax2.set_xlabel('Lag')
        ax2.set_ylabel('Partial Autocorrelation')
        ax2.set_title('Partial Autocorrelation Function (PACF)')
        ax2.grid(True, alpha=0.3)
        ax2.legend()
        
        plt.tight_layout()
        
        # Salva immagine combinata
        combined_path = os.path.join(self.images_folder, f'{file_id}_{prefix}_combined_acf_pacf.png')
        plt.savefig(combined_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        return combined_path
    
    def analyze_acf_pacf_with_ollama(self, acf_pacf_data, series_info=None, retry_with_fallback=True):
        """
        Analizza i valori numerici ACF/PACF e suggerisce modello ARIMA.
        ATTENZIONE: per evitare blocchi e uso eccessivo di risorse, questa implementazione
        usa una regola deterministica locale basata su ACF/PACF, senza chiamare Ollama.
        
        Args:
            acf_pacf_data: dict con valori ACF/PACF (da calculate_acf_pacf)
            series_info: Dict con informazioni sulla serie (opzionale)
            retry_with_fallback: Se True, prova con un modello alternativo in caso di errore
        
        Returns:
            dict con 'description' e 'recommendation'
        """
        # --- Modalità leggera: raccomandazione deterministica locale, senza Ollama ---
        try:
            import numpy as np
            n_obs = acf_pacf_data.get('n_observations') or len(acf_pacf_data.get('acf', [])) or 1
            acf_vals = np.array(acf_pacf_data.get('acf', []), dtype=float)
            pacf_vals = np.array(acf_pacf_data.get('pacf', []), dtype=float)
            # Usa più lag per un'analisi più dettagliata (fino a 20)
            max_lag = min(20, len(acf_vals) - 1) if len(acf_vals) > 1 else 0
            
            if max_lag <= 0:
                # Serie troppo corta: fallback ARIMA(1,0,0)
                rec = {
                    'type': 'ARIMA',
                    'p': 1, 'd': 0, 'q': 0,
                    'P': 0, 'D': 0, 'Q': 0, 'm': 0
                }
            else:
                # Soglia di significatività approssimativa (più conservativa per analisi più precisa)
                threshold = 2.0 / np.sqrt(n_obs)
                strong_threshold = 2.5 / np.sqrt(n_obs)
                sig_acf = np.abs(acf_vals) > threshold
                sig_pacf = np.abs(pacf_vals) > threshold
                
                def leading_significant(sig):
                    p = 0
                    for lag in range(1, max_lag + 1):
                        if sig[lag]:
                            p = lag
                        else:
                            break
                    return p
                
                # Ordini grezzi da PACF e ACF
                raw_p = leading_significant(sig_pacf) if len(pacf_vals) > 1 else 0
                raw_q = leading_significant(sig_acf) if len(acf_vals) > 1 else 0
                
                # Valuta il tipo di decadimento di ACF e PACF (lento vs cut-off)
                def slow_decay(sig):
                    # Considera "lento" se abbiamo molti lag significativi
                    return sig[1:max_lag + 1].sum() >= max(3, max_lag // 3)
                
                acf_slow = slow_decay(sig_acf)
                pacf_slow = slow_decay(sig_pacf)
                
                # Stima iniziale p,q in base ai pattern classici:
                # - PACF cut-off, ACF lenta -> AR
                # - ACF cut-off, PACF lenta -> MA
                # - Entrambe lente o entrambe cut-off -> ARMA
                if pacf_slow and not acf_slow:
                    # pattern da MA: ACF cut-off, PACF lenta
                    p = 0
                    q = raw_q or 1
                elif acf_slow and not pacf_slow:
                    # pattern da AR: PACF cut-off, ACF lenta
                    p = raw_p or 1
                    q = 0
                else:
                    # pattern misto o poco chiaro: ARMA
                    p = raw_p
                    q = raw_q
                
                # Imposta limiti ragionevoli (massimo 3 per parametro)
                p = int(max(0, min(p, 3)))
                q = int(max(0, min(q, 3)))
                
                # Stima d in modo più robusto:
                # - se ACF1 molto alta oppure molti lag bassi ma positivi (trend) -> d=1
                d = 0
                if len(acf_vals) > 1:
                    acf1 = acf_vals[1]
                    if abs(acf1) > 0.8:
                        d = 1
                    else:
                        # Se i primi lag sono tutti positivi e sopra soglia debole, probabile presenza di trend
                        positive_lags = [x for x in acf_vals[1:max_lag + 1] if x > 0]
                        if len(positive_lags) >= max(3, max_lag // 4) and np.mean(positive_lags) > threshold:
                            d = 1
                
                # Se non emerge nulla di significativo, usa un default ragionevole
                if p == 0 and q == 0:
                    p, q = 1, 1
                
                # Rilevamento stagionalità: cerca picchi ACF a lag >=4 (fino a 24) e scegli il più forte
                seasonal_m = 0
                candidate_ms = []
                max_search_lag = min(max_lag, 24)
                for lag in range(4, max_search_lag + 1):
                    if abs(acf_vals[lag]) > strong_threshold:
                        candidate_ms.append(lag)
                if candidate_ms:
                    # Scegli il lag con autocorrelazione assoluta più alta
                    seasonal_m = max(candidate_ms, key=lambda m: abs(acf_vals[m]))
                
                if seasonal_m > 0:
                    # Stima ordini stagionali di base
                    P = 1 if abs(acf_vals[seasonal_m]) > threshold * 2 else 0
                    Q = 1 if abs(pacf_vals[seasonal_m]) > threshold * 2 else 0
                    D = 1 if d == 1 else 0
                    # Limita anche i parametri stagionali a massimo 3 (D massimo 1)
                    P = int(max(0, min(P, 3)))
                    Q = int(max(0, min(Q, 3)))
                    D = int(max(0, min(D, 1)))
                    rec = {
                        'type': 'SARIMA',
                        'p': p, 'd': d, 'q': q,
                        'P': P, 'D': D, 'Q': Q, 'm': seasonal_m
                    }
                else:
                    rec = {
                        'type': 'ARIMA',
                        'p': p, 'd': d, 'q': q,
                        'P': 0, 'D': 0, 'Q': 0, 'm': 0
                    }
            
            # Suggerimenti di trasformazione (solo per serie originale con test ADF)
            transform_suggestion = {
                'suggest_smoothing': False,
                'suggest_differencing': False,
                'differencing_order': d,
                'recommended_smoothing_window': None
            }
            if series_info:
                series_type = series_info.get('series_type')
                adf_pvalue = series_info.get('adf_pvalue')
                if series_type == 'original' and adf_pvalue is not None:
                    # Considera non stazionaria se p-value > 0.05
                    if adf_pvalue > 0.05:
                        # Se d è già 1, suggerisci differencing; altrimenti smoothing leggero
                        if d >= 1:
                            transform_suggestion['suggest_differencing'] = True
                            transform_suggestion['differencing_order'] = d
                        else:
                            transform_suggestion['suggest_smoothing'] = True
                            # Finestra suggerita in base alla lunghezza serie (max 7)
                            if isinstance(n_obs, (int, float)) and n_obs > 0:
                                window = max(3, min(7, int(n_obs // 100)))
                            else:
                                window = 5
                            transform_suggestion['recommended_smoothing_window'] = window
            
            return {
                'success': True,
                # Nessuna descrizione lunga: solo modello consigliato + eventuali suggerimenti
                'description': '',
                'recommendation': {
                    **rec,
                    'transform_suggestion': transform_suggestion
                }
            }
        except Exception as e:
            # Se anche la modalità locale fallisce, restituisci errore generico
            return {
                'success': False,
                'error': f"Errore nell'analisi locale ACF/PACF: {str(e)}",
                'description': None,
                'recommendation': None
            }
    def _extract_arima_recommendation(self, text):
        """Estrae raccomandazione ARIMA dal testo della risposta AI"""
        # Cerca pattern come "ARIMA(p, d, q)" o "SARIMA(p, d, q)(P, D, Q, m)"
        import re
        
        # Cerca prima nella sezione "RACCOMANDAZIONE FINALE" se presente (priorità)
        final_section = re.search(r'RACCOMANDAZIONE FINALE:?\s*(.*?)(?:\n\n|\Z)', text, re.IGNORECASE | re.DOTALL)
        search_text = final_section.group(1) if final_section else text
        
        # Pattern per SARIMA (più specifico, controlla prima)
        sarima_pattern = r'SARIMA\s*\(?\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)?\s*\(?\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)?'
        match = re.search(sarima_pattern, search_text, re.IGNORECASE)
        
        if match:
            p, d, q, P, D, Q, m = match.groups()
            return {
                'type': 'SARIMA',
                'p': int(p),
                'd': int(d),
                'q': int(q),
                'P': int(P),
                'D': int(D),
                'Q': int(Q),
                'm': int(m)
            }
        
        # Pattern per ARIMA
        arima_pattern = r'ARIMA\s*\(?\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)?'
        match = re.search(arima_pattern, search_text, re.IGNORECASE)
        
        if match:
            p, d, q = match.groups()
            return {
                'type': 'ARIMA',
                'p': int(p),
                'd': int(d),
                'q': int(q),
                'P': 0,
                'D': 0,
                'Q': 0,
                'm': 0
            }
        
        # Se non trova nella sezione finale, cerca nel primo modello consigliato
        models_section = re.search(r'MODELLI CONSIGLIATI:?\s*(.*?)(?:\n\n|RACCOMANDAZIONE|$)', text, re.IGNORECASE | re.DOTALL)
        if models_section:
            models_text = models_section.group(1)
            # Cerca il primo modello nella lista (di solito il migliore)
            match = re.search(sarima_pattern, models_text, re.IGNORECASE)
            if match:
                p, d, q, P, D, Q, m = match.groups()
                return {
                    'type': 'SARIMA',
                    'p': int(p),
                    'd': int(d),
                    'q': int(q),
                    'P': int(P),
                    'D': int(D),
                    'Q': int(Q),
                    'm': int(m)
                }
            match = re.search(arima_pattern, models_text, re.IGNORECASE)
            if match:
                p, d, q = match.groups()
                return {
                    'type': 'ARIMA',
                    'p': int(p),
                    'd': int(d),
                    'q': int(q),
                    'P': 0,
                    'D': 0,
                    'Q': 0,
                    'm': 0
                }
        
        # Cerca in tutto il testo come fallback
        match = re.search(sarima_pattern, text, re.IGNORECASE)
        if match:
            p, d, q, P, D, Q, m = match.groups()
            return {
                'type': 'SARIMA',
                'p': int(p),
                'd': int(d),
                'q': int(q),
                'P': int(P),
                'D': int(D),
                'Q': int(Q),
                'm': int(m)
            }
        
        match = re.search(arima_pattern, text, re.IGNORECASE)
        if match:
            p, d, q = match.groups()
            return {
                'type': 'ARIMA',
                'p': int(p),
                'd': int(d),
                'q': int(q),
                'P': 0,
                'D': 0,
                'Q': 0,
                'm': 0
            }
        
        # Ultimo tentativo: cerca numeri nel testo (meno affidabile)
        numbers = re.findall(r'\d+', search_text)
        if len(numbers) >= 3:
            return {
                'type': 'ARIMA',
                'p': int(numbers[0]),
                'd': int(numbers[1]) if len(numbers) > 1 else 0,
                'q': int(numbers[2]) if len(numbers) > 2 else 0,
                'P': 0,
                'D': 0,
                'Q': 0,
                'm': 0
            }
        
        return None

