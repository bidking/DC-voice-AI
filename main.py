import customtkinter as ctk
import threading
import asyncio
from audio_capture import AudioCapture
from ai_processor import AIProcessor
from overlay import OverlayWindow

class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        self.title("Discord AI Companion - Setup")
        self.geometry("400x300")
        ctk.set_appearance_mode("dark")
        
        self.capture = AudioCapture()
        self.processor = AIProcessor()
        self.overlay = None
        
        # UI Elements
        self.label = ctk.CTkLabel(self, text="Discord AI Live Companion", font=("Inter", 20, "bold"))
        self.label.pack(pady=20)
        
        self.start_btn = ctk.CTkButton(self, text="Start Companion", command=self.toggle_companion)
        self.start_btn.pack(pady=10)
        
        self.status_label = ctk.CTkLabel(self, text="Status: Idle", text_color="gray")
        self.status_label.pack(pady=5)
        
        self.is_running = False

    def toggle_companion(self):
        if not self.is_running:
            self.start_companion()
        else:
            self.stop_companion()

    def start_companion(self):
        self.is_running = True
        self.start_btn.configure(text="Stop Companion", fg_color="#d32f2f")
        self.status_label.configure(text="Status: Active", text_color="#4CAF50")
        
        if not self.overlay:
            self.overlay = OverlayWindow(self)
            
        self.capture.start()
        threading.Thread(target=self.processing_loop, daemon=True).start()

    def stop_companion(self):
        self.is_running = False
        self.start_btn.configure(text="Start Companion", fg_color=ctk.ThemeManager.theme["CTkButton"]["fg_color"])
        self.status_label.configure(text="Status: Idle", text_color="gray")
        self.capture.stop()
        if self.overlay:
            self.overlay.withdraw()

    def processing_loop(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        while self.is_running:
            chunk = self.capture.get_next_chunk()
            
            if chunk == "SILENT":
                self.overlay.set_status("● Silence...", "gray")
                continue
                
            if chunk is not None:
                self.overlay.set_status("● Processing...", "#FFC107")
                result = loop.run_until_complete(self.processor.process_audio_chunk(chunk, self.capture.sample_rate))
                
                if result:
                    if "error" in result and "429" in result["error"]:
                        self.overlay.set_status("● Quota Full (Wait 20s)", "#F44336")
                        import time
                        time.sleep(20) # Wait for quota reset
                    else:
                        self.overlay.update_content(result)
                        self.overlay.set_status("● Listening...", "#4CAF50")
                else:
                    self.overlay.set_status("● Error", "#F44336")

if __name__ == "__main__":
    app = App()
    app.mainloop()
