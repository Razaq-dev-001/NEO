// Speech Service: Full Web Speech STT and TTS with phoneme/amplitude callbacks and Web Audio Mic Analyser
import { useConversationStore } from '../state/conversationStore';
import { useRobotStore } from '../state/robotStore';
import { useSettingsStore } from '../state/settingsStore';
import { soundFx } from './audioSynthesizer';
import { kokoroService } from './kokoroService';

type SpeechCallback = (transcript: string) => void;

class SpeechService {
  private recognition: any = null;
  private isListeningActive: boolean = false;
  private shouldKeepListening: boolean = false;
  private onResultCallback: SpeechCallback | null = null;
  private audioAnimInterval: any = null;
  private availableVoices: SpeechSynthesisVoice[] = [];

  // Web Audio Mic Analyser
  private micStream: MediaStream | null = null;
  private micAudioContext: AudioContext | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micDataArray: Uint8Array | null = null;
  private micAnimFrame: number | null = null;

  constructor() {
    this.initVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.initVoices();
      };
    }
  }

  private initVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.availableVoices = window.speechSynthesis.getVoices();
    }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (this.availableVoices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.availableVoices = window.speechSynthesis.getVoices();
    }
    return this.availableVoices;
  }

  isSTTSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    );
  }

  isTTSSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  // Request real hardware microphone access and start frequency analyzer
  async requestMicAccess(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        if (!this.micStream) {
          this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            this.micAudioContext = new AudioCtx();
            const source = this.micAudioContext.createMediaStreamSource(this.micStream);
            this.micAnalyser = this.micAudioContext.createAnalyser();
            this.micAnalyser.fftSize = 64;
            source.connect(this.micAnalyser);
            this.micDataArray = new Uint8Array(this.micAnalyser.frequencyBinCount);
            this.startMicMeterLoop();
          }
        }
        return true;
      } catch (err) {
        console.warn('Microphone permission denied or unavailable:', err);
        return false;
      }
    }
    return false;
  }

  private startMicMeterLoop() {
    if (this.micAnimFrame) cancelAnimationFrame(this.micAnimFrame);

    const updateMeter = () => {
      if (this.isListeningActive && this.micAnalyser && this.micDataArray) {
        this.micAnalyser.getByteFrequencyData(this.micDataArray as any);
        let sum = 0;
        for (let i = 0; i < this.micDataArray.length; i++) {
          sum += this.micDataArray[i];
        }
        const avg = sum / this.micDataArray.length;
        const normalized = Math.min(1.0, Math.max(0.1, avg / 80));
        useConversationStore.getState().setAudioInputLevel(normalized);
      }
      this.micAnimFrame = requestAnimationFrame(updateMeter);
    };

    updateMeter();
  }

  // Start continuous voice listening
  async startListening(onResult: SpeechCallback, continuous = true) {
    // 1. Request hardware mic access
    await this.requestMicAccess();

    if (!this.isSTTSupported()) {
      console.warn('SpeechRecognition API not available in this browser.');
      return false;
    }

    this.shouldKeepListening = continuous;
    this.cancelSpeech(); // stop speaking when listening starts

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    try {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (e) {}
      }

      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = continuous;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.onResultCallback = onResult;

      this.recognition.onstart = () => {
        this.isListeningActive = true;
        useConversationStore.getState().setListening(true);
        useRobotStore.getState().setAnimationState('listening');
        soundFx.playListeningChirp();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece;
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        const displayTranscript = finalTranscript || interimTranscript;
        useConversationStore.getState().setLiveTranscript(displayTranscript);

        if (finalTranscript.trim().length > 0) {
          const cleaned = finalTranscript.trim();
          useConversationStore.getState().setLiveTranscript('');
          if (this.onResultCallback) {
            this.onResultCallback(cleaned);
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event.error);
      };

      this.recognition.onend = () => {
        this.isListeningActive = false;
        // Auto-restart if continuous mode is enabled and robot is not speaking
        if (this.shouldKeepListening && !useConversationStore.getState().isSpeaking) {
          setTimeout(() => {
            if (this.shouldKeepListening && !this.isListeningActive) {
              try {
                this.recognition.start();
              } catch (e) {}
            }
          }, 350);
        } else {
          useConversationStore.getState().setListening(false);
          useConversationStore.getState().setAudioInputLevel(0);
          if (useRobotStore.getState().animationState === 'listening') {
            useRobotStore.getState().setAnimationState('idle');
          }
        }
      };

      this.recognition.start();
      return true;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      return false;
    }
  }

  stopListening() {
    this.shouldKeepListening = false;
    this.isListeningActive = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    useConversationStore.getState().setListening(false);
    useConversationStore.getState().setAudioInputLevel(0);
    if (useRobotStore.getState().animationState === 'listening') {
      useRobotStore.getState().setAnimationState('idle');
    }
  }

  // Cancel any ongoing speech synthesis immediately
  cancelSpeech() {
    kokoroService.stop();
    if (this.isTTSSupported()) {
      window.speechSynthesis.cancel();
    }
    clearInterval(this.audioAnimInterval);
    useConversationStore.getState().setSpeaking(false);
    useConversationStore.getState().setCurrentSpeechText('');
    useRobotStore.getState().setSpeechAmplitude(0);
    if (useRobotStore.getState().animationState === 'speaking') {
      useRobotStore.getState().setAnimationState('idle');
    }
  }

  // Speak text with Kokoro Neural TTS as primary and macOS Web Speech as fallback
  async speak(text: string, onEndCallback?: () => void): Promise<void> {
    const settings = useSettingsStore.getState();
    if (!settings.autoSpeakResponse || settings.isMuted) {
      if (onEndCallback) onEndCallback();
      return;
    }

    this.cancelSpeech();

    // 1. Try Kokoro Neural TTS on Apple Silicon
    if (settings.ttsEngine === 'kokoro') {
      const kokoroSuccess = await kokoroService.speak(text, onEndCallback);
      if (kokoroSuccess) {
        return; // Successfully synthesized and played with Kokoro
      }
    }

    // 2. Resilient Fallback: macOS Native Web Speech Synthesis
    return new Promise((resolve) => {
      if (!this.isTTSSupported()) {
        resolve();
        if (onEndCallback) onEndCallback();
        return;
      }

      const cleanText = text
        .replace(/[*_#`~[\]()]/g, '')
        .replace(/•/g, '')
        .replace(/\n+/g, '. ')
        .trim();

      if (!cleanText) {
        resolve();
        return;
      }

      console.log('[SpeechService] Using macOS Native Speech Synthesis fallback for:', cleanText.slice(0, 30));

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = settings.ttsRate || 1.15;
      utterance.pitch = settings.ttsPitch || 1.5;
      utterance.volume = settings.ttsVolume || 0.95;

      const voices = this.getAvailableVoices();
      if (settings.ttsVoice) {
        const matching = voices.find((v) => v.name === settings.ttsVoice || v.voiceURI === settings.ttsVoice);
        if (matching) utterance.voice = matching;
      } else {
        const preferred = voices.find(
          (v) =>
            (v.name.includes('Junior') ||
              v.name.includes('Flo') ||
              v.name.includes('Sandy') ||
              v.name.includes('Shelley') ||
              v.name.includes('Samantha') ||
              v.name.includes('Google US English') ||
              v.name.includes('Victoria') ||
              v.name.includes('Zarvox')) &&
            v.lang.startsWith('en')
        );
        if (preferred) utterance.voice = preferred;
      }

      utterance.onstart = () => {
        useConversationStore.getState().setSpeaking(true);
        useConversationStore.getState().setCurrentSpeechText(text);

        // DO NOT overwrite active motor actions (waving, dancing, jumping, walking, clapping)!
        const currentAnim = useRobotStore.getState().animationState;
        if (currentAnim === 'idle' || currentAnim === 'listening' || currentAnim === 'thinking') {
          useRobotStore.getState().setAnimationState('speaking');
        }

        clearInterval(this.audioAnimInterval);
        this.audioAnimInterval = setInterval(() => {
          const amp = 0.4 + Math.random() * 0.6;
          useRobotStore.getState().setSpeechAmplitude(amp);
          useRobotStore.getState().setAudioFrequencyData([
            amp * 0.8,
            amp * 1.0,
            amp * 0.6,
            amp * 0.9,
            amp * 0.4,
            amp * 0.7,
          ]);
        }, 100);
      };

      utterance.onboundary = () => {
        useRobotStore.getState().setSpeechAmplitude(1.0);
      };

      utterance.onend = () => {
        clearInterval(this.audioAnimInterval);
        useConversationStore.getState().setSpeaking(false);
        useConversationStore.getState().setCurrentSpeechText('');
        useRobotStore.getState().setSpeechAmplitude(0);
        if (useRobotStore.getState().animationState === 'speaking') {
          useRobotStore.getState().setAnimationState('idle');
        }
        resolve();
        if (onEndCallback) onEndCallback();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis error:', e);
        clearInterval(this.audioAnimInterval);
        useConversationStore.getState().setSpeaking(false);
        useRobotStore.getState().setSpeechAmplitude(0);
        if (useRobotStore.getState().animationState === 'speaking') {
          useRobotStore.getState().setAnimationState('idle');
        }
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }
}

export const speechService = new SpeechService();
