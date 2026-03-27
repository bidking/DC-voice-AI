import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class AIProcessor:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        self.system_prompt = """
        You are a real-time voice assistant for Discord. 
        You will receive audio transcription or raw audio data.
        Your task:
        1. Transcribe the speech to English (if not already provided).
        2. Translate the English text to casual, natural Indonesian (Jakarta slang/informal is preferred).
        3. Generate 2 short, relevant reply suggestions in English.
        
        Output MUST be in valid JSON format:
        {
            "original": "English text",
            "translation": "Indonesian translation",
            "replies": ["Suggestion 1", "Suggestion 2"]
        }
        """

    async def process_audio_chunk(self, audio_data, sample_rate):
        """
        Processes a chunk of audio data using Gemini.
        Note: For a real implementation, you'd convert numpy array to bytes/wav.
        """
        try:
            # In a real local app, we'd send the audio bytes.
            # For this example, we'll assume we're sending a prompt with the context.
            # Gemini 1.5 Flash supports audio input directly.
            
            # Placeholder for audio-to-text logic
            # response = await self.model.generate_content([self.system_prompt, audio_part])
            
            # For the sake of the template, let's assume we're using text-based simulation 
            # if audio processing isn't fully configured.
            prompt = "Process this audio chunk for transcription and translation."
            response = self.model.generate_content(
                f"{self.system_prompt}\n\nInput: {prompt}",
                generation_config={"response_mime_type": "application/json"}
            )
            
            return json.loads(response.text)
        except Exception as e:
            print(f"AI Processing Error: {e}")
            return None
