import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

class AIProcessor:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        # Using the new google-genai SDK
        self.client = genai.Client(api_key=api_key)
        # Using gemini-2.0-flash for better performance and availability
        self.model_id = 'gemini-2.0-flash'
        
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
        """
        try:
            prompt = "Process this audio chunk for transcription and translation."
            
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=f"{self.system_prompt}\n\nInput: {prompt}",
                config={
                    'response_mime_type': 'application/json'
                }
            )
            
            return json.loads(response.text)
        except Exception as e:
            error_msg = str(e)
            print(f"AI Processing Error: {error_msg}")
            if "429" in error_msg:
                return {"error": "429 Quota Exceeded"}
            return None
