import pyaudio
import numpy as np
import threading
import tinytuya

class AudioVisualizer:
    def __init__(self, bulb_device):
        self.bulb = bulb_device
        self.running = False
        self.CHUNK = 1024
        self.RATE = 44100
        self.p = pyaudio.PyAudio()
        
    def start_audio_visualizer(self):
        """Simple audio visualizer using microphone"""
        self.running = True
        stream = self.p.open(format=pyaudio.paInt16,
                            channels=1,
                            rate=self.RATE,
                            input=True,
                            frames_per_buffer=self.CHUNK)
        
        try:
            self.bulb.turn_on()
            
            while self.running:
                # Read audio data
                data = np.frombuffer(stream.read(self.CHUNK), dtype=np.int16)
                
                # Calculate volume (RMS)
                volume = np.sqrt(np.mean(data**2))
                
                # Map volume to brightness (0-100%)
                brightness = min(100, int(volume / 100))
                
                # Map frequency to temperature
                # Simple FFT approximation
                fft_data = np.abs(np.fft.rfft(data))
                freq = np.argmax(fft_data) * self.RATE / self.CHUNK
                
                # Map frequency to temperature (bass=warm, treble=cool)
                if freq < 100:  # Bass
                    kelvin = 2700  # Warm
                elif freq < 1000:  # Mid
                    kelvin = 4500  # Neutral
                else:  # Treble
                    kelvin = 6500  # Cool
                
                # Update bulb
                self.bulb.set_brightness_percentage(max(10, brightness))
                self.bulb.set_colourtemp(self._kelvin_to_tuya(kelvin))
                
        except Exception as e:
            print(f"Audio error: {e}")
        finally:
            stream.stop_stream()
            stream.close()