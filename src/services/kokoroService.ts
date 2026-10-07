// Kokoro TTS Service — Free Local Neural Speech Engine on Apple Silicon
import { useSettingsStore } from '../state/settingsStore';
import { useRobotStore } from '../state/robotStore';
import { useConversationStore } from '../state/conversationStore';

export interface KokoroVoice {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  traits: string;
  rating: string;
}

export const KOKORO_VOICES: KokoroVoice[] = [
  { id: 'af_heart', name: 'Heart (Warm & Youthful)', gender: 'Female', traits: '❤️ Natural & Sweet', rating: 'Grade A' },
  { id: 'af_bella', name: 'Bella (Energetic & Lively)', gender: 'Female', traits: '🔥 Cheerful & Upbeat', rating: 'Grade A-' },
  { id: 'af_nicole', name: 'Nicole (Chill & Conversational)', gender: 'Female', traits: '🎧 Relaxed & Smooth', rating: 'Grade B+' },
  { id: 'af_sarah', name: 'Sarah (Soft & Sweet)', gender: 'Female', traits: '🌸 Gentle & Warm', rating: 'Grade B+' },
  { id: 'af_sky', name: 'Sky (Playful & Light)', gender: 'Female', traits: '☁️ Upbeat & Crisp', rating: 'Grade B' },
  { id: 'am_adam', name: 'Adam (Youthful Male)', gender: 'Male', traits: '👦 Friendly & Active', rating: 'Grade B' },
  { id: 'am_michael', name: 'Michael (Warm Male)', gender: 'Male', traits: '🎙️ Clear & Natural', rating: 'Grade B+' },
  { id: 'bf_emma', name: 'Emma (British Companion)', gender: 'Female', traits: '🇬🇧 Elegant & Cheerful', rating: 'Grade B+' },
];

class KokoroService {
  private audioContext: AudioContext | null = null;
  private currentSourceNode: AudioBufferSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isSpeakingActive: boolean = false;
  private animFrameId: number | null = null;
  private isKokoroOnline: boolean = false;
  private lastHealthCheck: number = 0;

  constructor() {
    this.checkHealth();
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  // Health check against local Kokoro server
  async checkHealth(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastHealthCheck < 3000 && this.isKokoroOnline) {
      return this.isKokoroOnline;
    }
    this.lastHealthCheck = now;

    try {
      const endpoints = ['/api/tts/health', 'http://127.0.0.1:5182/health'];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, { signal: AbortSignal.timeout(1500) });
          if (res.ok) {
            const data = await res.json();
            this.isKokoroOnline = data.status === 'ready' || data.ready === true;
            useSettingsStore.getState().updateSettings({
              kokoroStatus: this.isKokoroOnline ? 'ready' : 'loading',
            });
            return this.isKokoroOnline;
          }
        } catch (e) {}
      }
      this.isKokoroOnline = false;
      useSettingsStore.getState().updateSettings({ kokoroStatus: 'offline' });
      return false;
    } catch (e) {
      this.isKokoroOnline = false;
      useSettingsStore.getState().updateSettings({ kokoroStatus: 'offline' });
      return false;
    }
  }

  // Stop current audio immediately
  stop() {
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
        this.currentSourceNode.disconnect();
      } catch (e) {}
      this.currentSourceNode = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.isSpeakingActive = false;
    useConversationStore.getState().setSpeaking(false);
    useConversationStore.getState().setCurrentSpeechText('');
    useRobotStore.getState().setSpeechAmplitude(0);

    if (useRobotStore.getState().animationState === 'speaking') {
      useRobotStore.getState().setAnimationState('idle');
    }
  }

  // Main Speak function with Kokoro Neural TTS & Real-time Viseme / Audio Analyser
  async speak(text: string, onEndCallback?: () => void): Promise<boolean> {
    const settings = useSettingsStore.getState();
    if (!settings.autoSpeakResponse || settings.isMuted) {
      if (onEndCallback) onEndCallback();
      return true;
    }

    this.stop();

    const cleanText = text
      .replace(/[*_#`~[\]()]/g, '')
      .replace(/•/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) {
      if (onEndCallback) onEndCallback();
      return true;
    }

    // Check if Kokoro is active or user explicitly chose Kokoro engine
    const isReady = await this.checkHealth();

    if (!isReady || settings.ttsEngine === 'system') {
      console.log('[KokoroService] Kokoro not available or system selected. Using macOS Speech fallback.');
      return false; // Signals caller to use native speech fallback
    }

    try {
      const voice = settings.kokoroVoice || 'af_heart';
      const speed = settings.kokoroSpeed || 1.05;

      // Update states
      useConversationStore.getState().setSpeaking(true);
      useConversationStore.getState().setCurrentSpeechText(cleanText);

      const currentAnim = useRobotStore.getState().animationState;
      if (currentAnim === 'idle' || currentAnim === 'listening' || currentAnim === 'thinking') {
        useRobotStore.getState().setAnimationState('speaking');
      }

      // 1. Fetch WAV audio stream from local Kokoro server
      const endpoints = ['/api/tts/synthesize', 'http://127.0.0.1:5182/synthesize'];
      let response: Response | null = null;

      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText, voice, speed }),
          });
          if (res.ok) {
            response = res;
            break;
          }
        } catch (e) {}
      }

      if (!response || !response.ok) {
        throw new Error('Failed to reach local Kokoro TTS server');
      }

      const arrayBuffer = await response.arrayBuffer();
      const ctx = this.getAudioContext();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // 2. Setup Web Audio Graph: Source -> Analyser -> Destination
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      source.connect(analyser);
      analyser.connect(ctx.destination);
      this.currentSourceNode = source;
      this.analyserNode = analyser;
      this.isSpeakingActive = true;

      // 3. Real-Time Mouth Animation Loop synced to audio playback
      const updateVisemes = () => {
        if (!this.isSpeakingActive) return;

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalizedAmp = Math.min(1.0, (avg / 128) * 1.4);

        useRobotStore.getState().setSpeechAmplitude(normalizedAmp);
        useRobotStore.getState().setAudioFrequencyData([
          (dataArray[0] || 0) / 255,
          (dataArray[2] || 0) / 255,
          (dataArray[4] || 0) / 255,
          (dataArray[6] || 0) / 255,
          (dataArray[8] || 0) / 255,
          (dataArray[10] || 0) / 255,
        ]);

        this.animFrameId = requestAnimationFrame(updateVisemes);
      };

      updateVisemes();

      // 4. Handle End of Audio
      source.onended = () => {
        this.stop();
        if (onEndCallback) onEndCallback();
      };

      source.start(0);
      return true;
    } catch (err) {
      console.warn('[KokoroService] Kokoro synthesis error, falling back to system speech:', err);
      this.stop();
      return false; // Fallback to native speech
    }
  }

  // Voice Preview Helper
  async previewVoice(voiceId: string, speed = 1.05) {
    const previewPhrases: Record<string, string> = {
      af_heart: "Yay, hello Razaq! I'm NEO, your warm companion with Kokoro Heart voice!",
      af_bella: "Hey! Ready for high energy actions! Let's build something awesome!",
      af_nicole: "Hey there. Smooth and relaxed. How can I help you today?",
      af_sarah: "Hello! Everything is peaceful and ready for your daily tasks.",
      af_sky: "Up in the clouds! Light and cheerful robot friend right here!",
      am_adam: "What's up! Adam voice ready for coding and adventures!",
      am_michael: "Hello Razaq, Michael voice active with clear crisp acoustic tone.",
      bf_emma: "Splendid day! Emma companion voice calibrated and ready.",
    };

    const phrase = previewPhrases[voiceId] || "Hello! Testing Kokoro neural speech!";
    const prevVoice = useSettingsStore.getState().kokoroVoice;
    useSettingsStore.getState().updateSettings({ kokoroVoice: voiceId, kokoroSpeed: speed });

    const success = await this.speak(phrase);
    if (!success) {
      // Fallback
      window.speechSynthesis?.speak(new SpeechSynthesisUtterance(phrase));
    }
  }
}

export const kokoroService = new KokoroService();
