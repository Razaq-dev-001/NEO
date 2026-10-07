import { create } from 'zustand';
import { ChatMessage, MessageRole } from '../types/ai';
import { EmotionState, RobotAction } from '../types/robot';

interface ConversationState {
  messages: ChatMessage[];
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  liveTranscript: string;
  currentSpeechText: string;
  audioInputLevel: number; // 0 to 1 for mic wave
  voiceMode: 'push_to_talk' | 'wake_word' | 'manual';
  isNewsDrawerOpen: boolean;

  addMessage: (
    role: MessageRole,
    content: string,
    emotion?: EmotionState,
    action?: RobotAction,
    metadata?: ChatMessage['metadata']
  ) => ChatMessage;
  clearMessages: () => void;
  setListening: (listening: boolean) => void;
  setThinking: (thinking: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setLiveTranscript: (text: string) => void;
  setCurrentSpeechText: (text: string) => void;
  setAudioInputLevel: (level: number) => void;
  setVoiceMode: (mode: 'push_to_talk' | 'wake_word' | 'manual') => void;
  setNewsDrawerOpen: (open: boolean) => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  messages: [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: "Hello! I'm NEO, your personal 3D AI robot companion. I'm active and ready to assist you. What would you like to explore or do today?",
      timestamp: Date.now(),
      emotion: 'happy',
      action: 'wave',
    },
  ],
  isListening: false,
  isThinking: false,
  isSpeaking: false,
  liveTranscript: '',
  currentSpeechText: '',
  audioInputLevel: 0,
  voiceMode: 'push_to_talk',
  isNewsDrawerOpen: false,

  addMessage: (role, content, emotion, action, metadata) => {
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role,
      content,
      timestamp: Date.now(),
      emotion,
      action,
      metadata,
    };

    set((state) => ({
      messages: [...state.messages.slice(-50), newMessage], // keep last 50
    }));

    return newMessage;
  },

  clearMessages: () => set({ messages: [] }),
  setListening: (listening) => set({ isListening: listening, liveTranscript: listening ? get().liveTranscript : '' }),
  setThinking: (thinking) => set({ isThinking: thinking }),
  setSpeaking: (speaking) => set({ isSpeaking: speaking }),
  setLiveTranscript: (liveTranscript) => set({ liveTranscript }),
  setCurrentSpeechText: (currentSpeechText) => set({ currentSpeechText }),
  setAudioInputLevel: (audioInputLevel) => set({ audioInputLevel }),
  setVoiceMode: (voiceMode) => set({ voiceMode }),
  setNewsDrawerOpen: (isNewsDrawerOpen) => set({ isNewsDrawerOpen }),
}));
