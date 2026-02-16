"""Servizio per generare PDF con tutti i risultati del modello"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
import os
import json
import matplotlib
matplotlib.use('Agg')  # Usa backend non-interattivo
import matplotlib.pyplot as plt
import pandas as pd
from datetime import datetime
import numpy as np
from io import BytesIO
from config import Config

class PDFExportService:
    """Servizio per esportare risultati modello in PDF"""
    
    @staticmethod
    def generate_model_pdf(model_run, file_record, model, output_path):
        """
        Genera PDF completo con tutti i risultati del modello
        
        Args:
            model_run: ModelRun object
            file_record: File object
            model: Model object
            output_path: Path dove salvare il PDF
        """
        doc = SimpleDocTemplate(output_path, pagesize=A4)
        story = []
        styles = getSampleStyleSheet()
        
        # Stili personalizzati
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=HexColor('#1f4788'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=HexColor('#1f4788'),
            spaceAfter=12,
            spaceBefore=12
        )
        
        # Titolo
        story.append(Paragraph("Report Analisi SARIMAX", title_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Informazioni generali
        story.append(Paragraph("Informazioni Generali", heading_style))
        info_data = [
            ['File:', file_record.file_name],
            ['Data Analisi:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
            ['Utente:', f"{file_record.user.name} {file_record.user.surname}"],
            ['Osservazioni Totali:', str(file_record.n_observations)]
        ]
        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), HexColor('#f0f0f0')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
        ]))
        story.append(info_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Configurazione utilizzata
        story.append(Paragraph("Configurazione Utilizzata", heading_style))
        config = json.loads(model_run.configuration) if model_run.configuration else {}
        
        config_data = [
            ['Smoothing Window:', str(config.get('smoothing_window', 1))],
            ['Trasformazione Log:', 'Sì' if config.get('log_transform', False) else 'No'],
            ['Differenziazione:', f"Ordine {config.get('differencing_order', 0)}"],
            ['Split Training/Test:', f"{config.get('train_obs', 'N/A')} osservazioni training"],
            ['Parametri SARIMAX:', f"({model.p}, {model.d}, {model.q})"],
        ]
        
        if model.is_seasonal:
            config_data.append(['Parametri Stagionali:', f"({model.seasonal_p}, {model.seasonal_d}, {model.seasonal_q}, {model.seasonal_m})"])
        
        config_data.append(['Trend:', str(config.get('trend', 'n'))])
        
        config_table = Table(config_data, colWidths=[2.5*inch, 3.5*inch])
        config_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), HexColor('#e8f5e9')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
        ]))
        story.append(config_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Metriche
        story.append(Paragraph("Metriche di Performance", heading_style))
        metrics_data = [['Metrica', 'Training', 'Test']]
        
        train_metrics = next((m for m in model.metrics if m.metric_type == 'training'), None)
        test_metrics = next((m for m in model.metrics if m.metric_type == 'test'), None)
        
        if train_metrics and test_metrics:
            metrics_data.extend([
                ['R²', f"{train_metrics.r_squared:.4f}" if train_metrics.r_squared else 'N/A', 
                 f"{test_metrics.r_squared:.4f}" if test_metrics.r_squared else 'N/A'],
                ['MAE', f"{train_metrics.mae:.4f}" if train_metrics.mae else 'N/A',
                 f"{test_metrics.mae:.4f}" if test_metrics.mae else 'N/A'],
                ['RMSE', f"{train_metrics.rmse:.4f}" if train_metrics.rmse else 'N/A',
                 f"{test_metrics.rmse:.4f}" if test_metrics.rmse else 'N/A'],
                ['MAPE', f"{train_metrics.mape_percent:.2f}%" if train_metrics.mape_percent else 'N/A',
                 f"{test_metrics.mape_percent:.2f}%" if test_metrics.mape_percent else 'N/A']
            ])
        
        metrics_table = Table(metrics_data, colWidths=[2*inch, 2*inch, 2*inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1f4788')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f9f9f9'))
        ]))
        story.append(metrics_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Summary modello
        if model.model_summary:
            story.append(Paragraph("Summary Modello", heading_style))
            summary_text = model.model_summary[:2000]  # Limita lunghezza
            story.append(Paragraph(summary_text.replace('\n', '<br/>'), styles['Normal']))
            story.append(Spacer(1, 0.3*inch))
        
        # Nota: I grafici verranno aggiunti in una versione successiva
        # Per ora includiamo solo testo e tabelle
        
        story.append(PageBreak())
        
        # Build PDF
        doc.build(story)
        return output_path

