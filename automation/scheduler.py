import schedule
import time
from threading import Thread

class AutomationScheduler:
    def __init__(self):
        self.running = False
        self.thread = None
    
    def start(self):
        """Avvia scheduler"""
        self.running = True
        self.thread = Thread(target=self._run_loop)
        self.thread.daemon = True
        self.thread.start()
    
    def _run_loop(self):
        """Loop principale scheduler"""
        while self.running:
            schedule.run_pending()
            time.sleep(60)  # Controlla ogni minuto
    
    def stop(self):
        """Ferma scheduler"""
        self.running = False

