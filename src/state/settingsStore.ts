import { create } from 'zustand';

export interface UserSettings {
  geminiApiKey: string;
  geminiModel: string;
  wakePhrase: string;
  isWakeWordEnabled: boolean;
  ttsEngine: 'kokoro' | 'system'; // 'kokoro' (primary local AI voice) or 'system' (fallback)
  kokoroVoice: string; // 'af_heart' (default), 'af_bella', 'af_nicole', 'af_sarah', 'af_sky', 'am_adam', 'am_michael', 'bf_emma'
  kokoroSpeed: number; // 0.7 - 1.5
  kokoroStatus: 'ready' | 'loading' | 'offline' | 'error';
  ttsVoice: string;
  ttsRate: number; // 0.8 - 1.4
  ttsPitch: number; // 0.8 - 1.8 (Childish robot pitch: 1.45)
  ttsVolume: number; // 0 - 1
  isMuted: boolean;
  soundEffects: boolean;
  companionMode: 'full' | 'compact';
  theme: 'studio' | 'cyber'; // 'studio' matches the exact image background
  isAlwaysOnTop: boolean;
  transparentBackground: boolean;
  userName: string;
  userLocation: string;
  autoSpeakResponse: boolean;
  isDevMode: boolean;
  activeDrawer: 'tasks' | 'memories' | 'news' | 'settings' | 'none';
}

interface SettingsState extends UserSettings {
  updateSettings: (updates: Partial<UserSettings>) => void;
  setActiveDrawer: (drawer: 'tasks' | 'memories' | 'news' | 'settings' | 'none') => void;
  toggleDrawer: (drawer: 'tasks' | 'memories' | 'news' | 'settings') => void;
  toggleDevMode: () => void;
  loadStoredSettings: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  geminiApiKey: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) || '',
  geminiModel: 'gemini-1.5-flash',
  wakePhrase: 'hey neo',
  isWakeWordEnabled: true,
  ttsEngine: 'kokoro',
  kokoroVoice: 'af_heart', // Natural, warm, youthful companion voice
  kokoroSpeed: 1.05,
  kokoroStatus: 'ready',
  ttsVoice: '',
  ttsRate: 1.15, // Cheerful bouncy cadence
  ttsPitch: 1.5, // Childish cute robot voice pitch
  ttsVolume: 0.95,
  isMuted: false,
  soundEffects: true,
  companionMode: 'full',
  theme: 'studio', // Studio backdrop matching exact reference image
  isAlwaysOnTop: false,
  transparentBackground: false,
  userName: 'Razaq',
  userLocation: 'Mumbai, India',
  autoSpeakResponse: true,
  isDevMode: true, // Default open for motor testing as requested
  activeDrawer: 'none',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,

  updateSettings: (updates) => {
    set((state) => {
      const next = { ...state, ...updates };
      try {
        const toSave = { ...next };
        delete (toSave as any).activeDrawer;
        localStorage.setItem('neo_user_settings', JSON.stringify(toSave));
      } catch (e) {}
      return next;
    });
  },

  setActiveDrawer: (drawer) => set({ activeDrawer: drawer }),

  toggleDrawer: (drawer) => {
    const current = get().activeDrawer;
    set({ activeDrawer: current === drawer ? 'none' : drawer });
  },

  toggleDevMode: () => {
    set((state) => ({ isDevMode: !state.isDevMode }));
  },

  loadStoredSettings: () => {
    try {
      const stored = localStorage.getItem('neo_user_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        set((state) => ({ ...state, ...parsed }));
      }
    } catch (e) {}
  },
}));
