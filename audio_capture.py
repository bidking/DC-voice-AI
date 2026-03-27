import sounddevice as sd
import numpy as np
import threading
import queue

class AudioCapture:
    def __init__(self, sample_rate=16000, chunk_duration=5):
        self.sample_rate = sample_rate
        self.chunk_duration = chunk_duration
        self.chunk_size = int(sample_rate * chunk_duration)
        self.audio_queue = queue.Queue()
        self.is_recording = False
        self.stream = None

    def get_wasapi_loopback_device(self):
        """
        Finds the WASAPI loopback device on Windows.
        """
        devices = sd.query_devices()
        for i, dev in enumerate(devices):
            if "WASAPI" in dev.get('hostapi_name', '') and dev.get('max_input_channels') > 0:
                # Usually "Stereo Mix" or "Speakers (Loopback)"
                if "Loopback" in dev.get('name') or "Output" in dev.get('name'):
                    return i
        return sd.default.device[0]

    def _audio_callback(self, indata, frames, time, status):
        if status:
            print(status)
        self.audio_queue.put(indata.copy())

    def start(self):
        self.is_recording = True
        device_id = self.get_wasapi_loopback_device()
        print(f"Starting capture on device {device_id}")
        
        self.stream = sd.InputStream(
            device=device_id,
            channels=1,
            samplerate=self.sample_rate,
            callback=self._audio_callback
        )
        self.stream.start()

    def stop(self):
        self.is_recording = False
        if self.stream:
            self.stream.stop()
            self.stream.close()

    def get_next_chunk(self):
        """
        Collects enough samples for a full chunk.
        """
        samples = []
        current_size = 0
        while current_size < self.chunk_size and self.is_recording:
            try:
                data = self.audio_queue.get(timeout=1)
                samples.append(data)
                current_size += len(data)
            except queue.Empty:
                continue
        
        if not samples:
            return None
            
        return np.concatenate(samples)[:self.chunk_size]
