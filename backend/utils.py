import pandas as pd
import numpy as np
from datetime import datetime

def validate_file_format(df):
    """
    Valida che il file abbia esattamente le colonne 'data' e 'y'
    """
    required_columns = ['data', 'y']
    
    # Normalizza nomi colonne (rimuovi spazi, converti in minuscolo)
    df.columns = df.columns.str.strip().str.lower()
    
    if list(df.columns) != required_columns:
        raise ValueError(
            f"File deve contenere esattamente le colonne: {required_columns}. "
            f"Trovate: {list(df.columns)}"
        )
    
    # Valida che 'data' sia datetime
    try:
        # Prova prima con formato esplicito
        if df['data'].dtype == 'object':
            # Converti stringhe a datetime
            df['data'] = pd.to_datetime(df['data'], format='%Y-%m-%d', errors='coerce')
        else:
            df['data'] = pd.to_datetime(df['data'], errors='coerce')
        
        # Verifica che non ci siano date non valide (NaT)
        invalid_dates = df['data'].isna().sum()
        if invalid_dates > 0:
            raise ValueError(f"Colonna 'data' contiene {invalid_dates} date non valide. Formato richiesto: YYYY-MM-DD")
    except ValueError as e:
        raise e
    except Exception as e:
        raise ValueError(f"Errore nel parsing date: {str(e)}")
    
    # Valida che 'y' sia numerica
    # Prova a convertire se non è già numerica
    if not pd.api.types.is_numeric_dtype(df['y']):
        try:
            df['y'] = pd.to_numeric(df['y'], errors='coerce')
            if df['y'].isna().any():
                raise ValueError("Colonna 'y' contiene valori non numerici")
        except:
            raise ValueError("Colonna 'y' deve essere numerica")
    
    # Valida che non ci siano valori mancanti
    missing_data = df['data'].isna().sum()
    missing_y = df['y'].isna().sum()
    if missing_data > 0 or missing_y > 0:
        raise ValueError(f"File contiene valori mancanti: {missing_data} date, {missing_y} valori y")
    
    # Valida che ci siano almeno 20 osservazioni
    if len(df) < 20:
        raise ValueError(f"File deve contenere almeno 20 osservazioni. Trovate: {len(df)}")
    
    # Ordina per data
    df = df.sort_values('data').reset_index(drop=True)
    
    return df

def split_train_test(df, train_obs=None):
    """
    Divide il dataset in training e test set basandosi sul numero di osservazioni
    
    Args:
        df: DataFrame con colonne 'data' e 'y'
        train_obs: Numero di osservazioni per il training set.
                   Se None, usa default 80% del dataset.
                   Deve essere tra 1 e n-1 (dove n è il numero totale di osservazioni)
    
    Returns:
        train_df, test_df: DataFrames separati
    """
    n = len(df)
    
    # Se train_obs non è specificato, usa default 80%
    if train_obs is None:
        train_obs = int(n * 0.8)
    
    # Converti a int se necessario
    train_obs = int(train_obs)
    
    # Valida train_obs
    if train_obs < 1:
        raise ValueError(f"train_obs deve essere almeno 1, ricevuto: {train_obs}")
    if train_obs >= n:
        raise ValueError(f"train_obs deve essere minore del numero totale di osservazioni ({n}), ricevuto: {train_obs}")
    
    # Usa train_obs direttamente come indice di split
    split_idx = train_obs
    
    train_df = df.iloc[:split_idx].copy()
    test_df = df.iloc[split_idx:].copy()
    
    return train_df, test_df

def calculate_statistics(df):
    """Calcola statistiche descrittive"""
    return {
        'mean': float(df['y'].mean()),
        'std': float(df['y'].std()),
        'min': float(df['y'].min()),
        'max': float(df['y'].max()),
        'median': float(df['y'].median()),
        'q25': float(df['y'].quantile(0.25)),
        'q75': float(df['y'].quantile(0.75)),
        'obs_count': len(df)
    }

def adf_stationarity_test(series):
    """
    Esegue un semplice test di stazionarietà (ADF) sulla serie.
    
    Returns:
        dict con 'statistic', 'pvalue', 'critical_values'
    """
    from statsmodels.tsa.stattools import adfuller
    import numpy as np
    
    values = series.values if hasattr(series, 'values') else np.array(series)
    values = values[~np.isnan(values)]
    result = adfuller(values, autolag='AIC')
    statistic, pvalue, _, _, critical_values, _ = result
    return {
        'statistic': float(statistic),
        'pvalue': float(pvalue),
        'critical_values': {k: float(v) for k, v in critical_values.items()}
    }

def apply_smoothing(df, window_size=1):
    """
    Applica media mobile (smoothing) alla serie storica
    
    La media mobile con finestra N richiede N osservazioni per calcolare il primo valore,
    quindi le prime (window_size - 1) osservazioni vengono rimosse.
    
    Args:
        df: DataFrame con colonne 'data' e 'y'
        window_size: Dimensione finestra media mobile (1 = nessuno smoothing)
    
    Returns:
        DataFrame con serie smussata (con meno osservazioni rispetto all'originale)
    """
    if window_size <= 1:
        return df.copy()
    
    df_smoothed = df.copy()
    
    # Applica media mobile con min_periods=window_size
    # Questo significa che le prime (window_size-1) osservazioni saranno NaN
    df_smoothed['y'] = df_smoothed['y'].rolling(window=window_size, min_periods=window_size).mean()
    
    # Rimuovi le osservazioni NaN (prime window_size-1 osservazioni)
    df_smoothed = df_smoothed.dropna(subset=['y']).reset_index(drop=True)
    
    return df_smoothed

def calculate_acf_pacf(series, nlags=None, alpha=0.05):
    """
    Calcola ACF e PACF per una serie temporale
    
    Args:
        series: pandas Series o array con valori della serie
        nlags: Numero di lag da calcolare (default: min(40, len(series)//4))
        alpha: Livello di confidenza per intervalli (default: 0.05 = 95%)
    
    Returns:
        dict con 'acf', 'pacf', 'acf_confint', 'pacf_confint', 'lags'
    """
    from statsmodels.tsa.stattools import acf, pacf
    import numpy as np
    
    # Converti in array se necessario
    if isinstance(series, pd.Series):
        values = series.values
    else:
        values = np.array(series)
    
    # Rimuovi NaN
    values = values[~np.isnan(values)]
    
    if len(values) < 10:
        raise ValueError("Serie troppo corta per calcolare ACF/PACF (minimo 10 osservazioni)")
    
    # Calcola numero di lag se non specificato
    if nlags is None:
        nlags = min(40, len(values) // 4)
    
    nlags = min(nlags, len(values) - 1)
    
    # Calcola ACF
    acf_values, acf_confint = acf(values, nlags=nlags, alpha=alpha, fft=True, bartlett_confint=True)
    
    # Calcola PACF
    pacf_values, pacf_confint = pacf(values, nlags=nlags, alpha=alpha, method='ywadjusted')
    
    # Per testare significatività, gli intervalli di confidenza dovrebbero essere
    # bande orizzontali intorno a zero, non intorno ai valori ACF/PACF
    # Calcola intervalli di confidenza standard: ±1.96/sqrt(n) per testare se != 0
    from scipy import stats
    n = len(values)
    z_critical = stats.norm.ppf(1 - alpha / 2.0)  # 1.96 per alpha=0.05
    se_acf = 1.0 / np.sqrt(n)  # Standard error per ACF (assumendo white noise)
    se_pacf = 1.0 / np.sqrt(n)  # Standard error per PACF
    
    # Crea intervalli di confidenza intorno a zero per testare significatività
    acf_ci_lower = [-z_critical * se_acf] * (nlags + 1)
    acf_ci_upper = [z_critical * se_acf] * (nlags + 1)
    
    pacf_ci_lower = [-z_critical * se_pacf] * (nlags + 1)
    pacf_ci_upper = [z_critical * se_pacf] * (nlags + 1)
    
    # Crea array di lag
    lags = np.arange(0, nlags + 1)
    
    return {
        'acf': [float(x) for x in acf_values],
        'pacf': [float(x) for x in pacf_values],
        'acf_confint': [[float(acf_ci_lower[i]), float(acf_ci_upper[i])] for i in range(len(lags))],
        'pacf_confint': [[float(pacf_ci_lower[i]), float(pacf_ci_upper[i])] for i in range(len(lags))],
        'lags': [int(x) for x in lags],
        'acf_confint_raw': acf_confint.tolist() if hasattr(acf_confint, 'tolist') else (acf_confint if acf_confint is not None else None),  # Intervalli di confidenza raw da statsmodels
        'pacf_confint_raw': pacf_confint.tolist() if hasattr(pacf_confint, 'tolist') else (pacf_confint if pacf_confint is not None else None),  # Intervalli di confidenza raw da statsmodels
        'n_observations': n  # Numero di osservazioni per calcoli successivi
    }

def format_acf_pacf_numerical(acf_pacf_data, max_lags=20):
    """
    Formatta i valori numerici ACF/PACF in una stringa leggibile per l'IA
    Basato sulla funzione in lozi2.py
    
    Args:
        acf_pacf_data: dict con 'acf', 'pacf', 'acf_confint_raw', 'pacf_confint_raw', 'lags'
        max_lags: Numero massimo di lag da mostrare (default: 20)
    
    Returns:
        stringa formattata con valori ACF/PACF
    """
    import numpy as np
    
    acf_values = np.array(acf_pacf_data['acf'])
    pacf_values = np.array(acf_pacf_data['pacf'])
    lags = acf_pacf_data['lags']
    
    # Calcola bound di confidenza come in lozi2.py
    # Usa n_observations se disponibile, altrimenti approssima con len(acf_values)
    n = acf_pacf_data.get('n_observations', len(acf_values))
    standard_bound = 1.96 / np.sqrt(n)
    
    # Calcola bound di confidenza dai confint raw se disponibili
    if 'acf_confint_raw' in acf_pacf_data and acf_pacf_data['acf_confint_raw'] is not None:
        acf_confint_raw = np.array(acf_pacf_data['acf_confint_raw'])
        acf_conf_bound = np.abs(acf_confint_raw[:, 1] - acf_values)
    else:
        acf_conf_bound = np.array([standard_bound] * len(acf_values))
    
    if 'pacf_confint_raw' in acf_pacf_data and acf_pacf_data['pacf_confint_raw'] is not None:
        pacf_confint_raw = np.array(acf_pacf_data['pacf_confint_raw'])
        pacf_conf_bound = np.abs(pacf_confint_raw[:, 1] - pacf_values)
    else:
        pacf_conf_bound = np.array([standard_bound] * len(pacf_values))
    
    # Limita al numero massimo di lag richiesto
    max_lags = min(max_lags, len(lags) - 1)
    
    # Crea tabella formattata
    lines = []
    lines.append("=" * 80)
    lines.append(f"ACF/PACF - VALORI NUMERICI (Lag 0-{max_lags})")
    lines.append("=" * 80)
    lines.append(f"{'Lag':<6} {'ACF':<15} {'Sign.':<8} {'PACF':<15} {'Sign.':<8}")
    lines.append("-" * 80)
    
    for lag in range(max_lags + 1):
        acf_val = acf_values[lag]
        pacf_val = pacf_values[lag]
        acf_bound = acf_conf_bound[lag] if lag < len(acf_conf_bound) else standard_bound
        pacf_bound = pacf_conf_bound[lag] if lag < len(pacf_conf_bound) else standard_bound
        
        acf_sig = "SÌ" if abs(acf_val) > acf_bound else "NO"
        pacf_sig = "SÌ" if abs(pacf_val) > pacf_bound else "NO"
        
        lines.append(f"{lag:<6} {acf_val:>14.4f}  {acf_sig:<8} {pacf_val:>14.4f}  {pacf_sig:<8}")
    
    lines.append("=" * 80)
    lines.append(f"Bound confidenza (95%):")
    lines.append(f"  Standard: ±{standard_bound:.4f}")
    
    if len(acf_conf_bound) > max_lags:
        acf_bound_mean = np.mean(acf_conf_bound[:max_lags + 1])
        pacf_bound_mean = np.mean(pacf_conf_bound[:max_lags + 1])
        lines.append(f"  ACF (media lag 0-{max_lags}): ±{acf_bound_mean:.4f}")
        lines.append(f"  PACF (media lag 0-{max_lags}): ±{pacf_bound_mean:.4f}")
    
    lines.append("")
    
    return "\n".join(lines)

def apply_log_transform(df):
    """
    Applica trasformazione logaritmica alla serie storica
    
    Args:
        df: DataFrame con colonne 'data' e 'y'
    
    Returns:
        DataFrame con serie trasformata logaritmicamente
    """
    df_log = df.copy()
    
    # Verifica che tutti i valori siano positivi (necessario per log)
    if (df_log['y'] <= 0).any():
        raise ValueError("La trasformazione logaritmica richiede tutti i valori positivi. La serie contiene valori <= 0.")
    
    # Applica log naturale
    df_log['y'] = np.log(df_log['y'])
    
    return df_log

def apply_differencing(df, order=1):
    """
    Applica differenziazione alla serie storica
    
    Args:
        df: DataFrame con colonne 'data' e 'y'
        order: Ordine di differenziazione (1, 2, 3, etc.)
    
    Returns:
        DataFrame con serie differenziata (con meno osservazioni rispetto all'originale)
    """
    if order <= 0:
        return df.copy()
    
    df_diff = df.copy()
    
    # Applica differenziazione
    for i in range(order):
        df_diff['y'] = df_diff['y'].diff()
    
    # Rimuovi le osservazioni NaN (prime 'order' osservazioni)
    df_diff = df_diff.dropna(subset=['y']).reset_index(drop=True)
    
    return df_diff

