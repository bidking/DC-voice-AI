import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Settings, 
  Download, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  ExternalLink,
  Terminal,
  Cpu,
  Monitor,
  MessageSquare,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
interface TranscriptionResult {
  original: string;
  translation: string;
  replies: string[];
}

// --- Components ---

const StatusBadge = ({ active }: { active: boolean }) => (
  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
    active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
  }`}>
    <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
    {active ? 'LIVE' : 'IDLE'}
  </div>
);

const CodeBlock = ({ code, language }: { code: string, language: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{language}</span>
        <button 
          onClick={handleCopy}
          className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
        >
          {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono text-zinc-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [results, setResults] = useState<TranscriptionResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  const processAudioWithGemini = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [
            {
              parts: [
                {
                  text: "You are a Discord live companion. Transcribe this audio to English, translate it to casual Indonesian, and provide 2 short English reply suggestions. Output ONLY JSON: { \"original\": \"...\", \"translation\": \"...\", \"replies\": [\"...\", \"...\"] }"
                },
                {
                  inlineData: {
                    mimeType: audioBlob.type,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json"
          }
        });

        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text) as TranscriptionResult;
          setResults(prev => [parsed, ...prev].slice(0, 5));
        }
        setIsProcessing(false);
      };
    } catch (err) {
      console.error("Gemini Error:", err);
      setError("Failed to process audio. Check your API key.");
      setIsProcessing(false);
    }
  };

  const startCapture = async () => {
    try {
      // Note: In a web environment, we use getDisplayMedia for system audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Required for system audio in most browsers
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      // Stop video track immediately, we only want audio
      stream.getVideoTracks().forEach(track => track.stop());

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processAudioWithGemini(audioBlob);
      };

      // Record in 5-second chunks
      mediaRecorder.start();
      setIsListening(true);
      
      const interval = setInterval(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          mediaRecorder.start();
        } else {
          clearInterval(interval);
        }
      }, 6000);

    } catch (err) {
      console.error("Capture Error:", err);
      setError("Permission denied or capture failed.");
    }
  };

  const stopCapture = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/50 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Mic size={18} className="text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg">Discord AI Companion</span>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setShowOriginal(!showOriginal)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                showOriginal ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'
              }`}
            >
              {showOriginal ? 'Original: ON' : 'Original: OFF'}
            </button>
            <a href="#setup" className="text-sm text-zinc-400 hover:text-white transition-colors">Setup Guide</a>
            <a href="#desktop" className="text-sm text-zinc-400 hover:text-white transition-colors">Desktop App</a>
            <StatusBadge active={isListening} />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* Left Column: Web Simulator */}
          <div className="lg:col-span-7 space-y-8">
            <section>
              <div className="mb-8">
                <h1 className="text-5xl font-extrabold tracking-tighter mb-4 bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                  Real-time Translation <br />for Discord Voice.
                </h1>
                <p className="text-zinc-400 text-lg max-w-xl leading-relaxed">
                  Capture system audio, translate English speech to Indonesian, and get AI-powered reply suggestions instantly.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Cpu size={120} />
                </div>
                
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Web Preview</h3>
                    <p className="text-xs text-zinc-500">Test the capture logic directly in your browser</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={isListening ? stopCapture : startCapture}
                      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                        isListening 
                          ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
                      }`}
                    >
                      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                      {isListening ? 'Stop' : 'Start Web Capture'}
                    </button>
                    {isListening && (
                      <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`p-3 rounded-xl border font-bold transition-all ${
                          isPaused 
                            ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500' 
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {isPaused ? 'Resume' : 'Pause'}
                      </button>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <div className="space-y-4 min-h-[300px]">
                  <AnimatePresence mode="popLayout">
                    {results.length === 0 && !isProcessing && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-[300px] flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-2xl"
                      >
                        <Monitor size={48} strokeWidth={1} className="mb-4" />
                        <p className="text-sm">Click start and select "System Audio" to begin</p>
                      </motion.div>
                    )}

                    {isProcessing && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-4"
                      >
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                        <span className="text-sm font-medium text-indigo-400">AI is processing speech...</span>
                      </motion.div>
                    )}

                    {results.map((res, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-6 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-4">
                          {showOriginal && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                <MessageSquare size={10} /> Original (EN)
                              </div>
                              <p className="text-sm font-medium">{res.original}</p>
                            </div>
                          )}
                          <div className="text-[10px] text-zinc-600 font-mono ml-auto">JUST NOW</div>
                        </div>

                        <div className="mb-6 space-y-1">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                            <Languages size={10} /> Translation (ID)
                          </div>
                          <p className="text-sm italic text-zinc-300">"{res.translation}"</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {res.replies.map((reply, j) => (
                            <button
                              key={j}
                              onClick={() => navigator.clipboard.writeText(reply)}
                              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] font-medium hover:bg-zinc-800 hover:border-zinc-500 transition-all flex items-center gap-2 group"
                            >
                              {reply}
                              <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            {/* Setup Guide Section */}
            <section id="setup" className="pt-12 border-t border-zinc-800">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Info size={28} className="text-indigo-500" />
                Setup Guide
              </h2>
              
              <div className="space-y-10">
                <div className="relative pl-8 border-l border-zinc-800">
                  <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full bg-indigo-500" />
                  <h4 className="font-bold text-lg mb-2">1. Install Dependencies</h4>
                  <p className="text-zinc-400 text-sm mb-4">You'll need Python 3.10+ and FFmpeg installed on your machine.</p>
                  <CodeBlock language="bash" code="pip install -r requirements.txt" />
                </div>

                <div className="relative pl-8 border-l border-zinc-800">
                  <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full bg-indigo-500" />
                  <h4 className="font-bold text-lg mb-2">2. Configure Audio Loopback</h4>
                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                      <h5 className="font-bold text-sm mb-2 text-indigo-400">Windows</h5>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Enable "Stereo Mix" in Sound Settings or use WASAPI loopback (handled automatically by the script).
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                      <h5 className="font-bold text-sm mb-2 text-indigo-400">macOS</h5>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Install <a href="https://github.com/ExistentialAudio/BlackHole" className="underline hover:text-white">BlackHole</a> and create a Multi-Output Device in Audio MIDI Setup.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative pl-8 border-l border-zinc-800">
                  <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full bg-indigo-500" />
                  <h4 className="font-bold text-lg mb-2">3. API Key</h4>
                  <p className="text-zinc-400 text-sm mb-4">Create a `.env` file and add your Gemini API Key.</p>
                  <CodeBlock language="env" code="GEMINI_API_KEY=your_key_here" />
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Desktop App Details */}
          <div className="lg:col-span-5 space-y-8">
            <div className="sticky top-24">
              <div id="desktop" className="p-8 rounded-3xl bg-indigo-600/5 border border-indigo-500/20 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">Desktop Edition</h3>
                  <Download size={24} className="text-indigo-500" />
                </div>
                <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                  The desktop version provides a transparent, always-on-top overlay that sits directly over your Discord or games.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    "No Discord Bot required",
                    "Transparent Overlay UI",
                    "Low-latency local capture",
                    "Customizable reply shortcuts",
                    "Privacy-focused local processing"
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                      <CheckCircle2 size={16} className="text-green-500" />
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Project Files</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { name: 'main.py', desc: 'App entry & UI' },
                      { name: 'audio_capture.py', desc: 'Loopback logic' },
                      { name: 'ai_processor.py', desc: 'Gemini integration' },
                      { name: 'overlay.py', desc: 'Transparent window' },
                    ].map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-zinc-800 hover:border-zinc-700 transition-colors">
                        <div className="flex items-center gap-3">
                          <Terminal size={14} className="text-zinc-500" />
                          <div>
                            <div className="text-xs font-mono font-bold">{file.name}</div>
                            <div className="text-[10px] text-zinc-600">{file.desc}</div>
                          </div>
                        </div>
                        <Download size={14} className="text-zinc-700" />
                      </div>
                    ))}
                  </div>
                </div>

                <button className="w-full mt-8 py-4 rounded-2xl bg-white text-black font-bold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2">
                  Download Project Source
                  <ExternalLink size={16} />
                </button>
              </div>

              {/* Tips Card */}
              <div className="mt-8 p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
                <h4 className="font-bold mb-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-yellow-500" />
                  Pro Tips
                </h4>
                <ul className="text-xs text-zinc-500 space-y-3 leading-relaxed">
                  <li>• Use a 5-7 second chunk size for the best balance of context and speed.</li>
                  <li>• If you experience lag, try reducing the sample rate to 16000Hz.</li>
                  <li>• The overlay is set to "click-through" so it doesn't interfere with your game.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-24 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-zinc-500 text-sm">
            © 2026 Discord AI Companion. Built with Google Gemini.
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-zinc-500 hover:text-white transition-colors"><Terminal size={20} /></a>
            <a href="#" className="text-zinc-500 hover:text-white transition-colors"><Monitor size={20} /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
