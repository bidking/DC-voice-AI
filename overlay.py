import customtkinter as ctk
import tkinter as tk

class OverlayWindow(ctk.CTkToplevel):
    def __init__(self, master):
        super().__init__(master)
        
        # Window Setup
        self.title("Discord AI Companion Overlay")
        self.geometry("400x250+100+100")
        self.overrideredirect(True)  # Frameless
        self.attributes("-topmost", True)
        self.attributes("-transparentcolor", "black")
        self.config(bg="black")
        
        # Main Frame
        self.frame = ctk.CTkFrame(self, fg_color=("#2b2b2b", "#1a1a1a"), corner_radius=15, border_width=1, border_color="#333333")
        self.frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        # Header
        self.status_label = ctk.CTkLabel(self.frame, text="● Listening...", font=("Inter", 10, "bold"), text_color="#4CAF50")
        self.status_label.pack(anchor="w", padx=15, pady=(10, 5))
        
        # Content
        self.original_text = ctk.CTkLabel(self.frame, text="Waiting for speech...", font=("Inter", 13), wraplength=350, justify="left")
        self.original_text.pack(anchor="w", padx=15, pady=2)
        
        self.translation_text = ctk.CTkLabel(self.frame, text="", font=("Inter", 13, "italic"), text_color="#aaaaaa", wraplength=350, justify="left")
        self.translation_text.pack(anchor="w", padx=15, pady=2)
        
        # Replies
        self.replies_frame = ctk.CTkFrame(self.frame, fg_color="transparent")
        self.replies_frame.pack(fill="x", padx=15, pady=10)
        
        self.reply_btns = []

    def update_content(self, data):
        if not data: return
        
        self.original_text.configure(text=data.get("original", ""))
        self.translation_text.configure(text=data.get("translation", ""))
        
        # Clear old buttons
        for btn in self.reply_btns:
            btn.destroy()
        self.reply_btns = []
        
        # Add new buttons
        for reply in data.get("replies", []):
            btn = ctk.CTkButton(
                self.replies_frame, 
                text=reply, 
                height=28, 
                font=("Inter", 11),
                fg_color="#333333",
                hover_color="#444444",
                command=lambda r=reply: self.copy_to_clipboard(r)
            )
            btn.pack(side="left", padx=2)
            self.reply_btns.append(btn)

    def copy_to_clipboard(self, text):
        self.clipboard_clear()
        self.clipboard_append(text)
        print(f"Copied: {text}")

    def set_status(self, text, color="#4CAF50"):
        self.status_label.configure(text=text, text_color=color)
