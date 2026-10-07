import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Square, Sparkles, Mic } from 'lucide-react';
import { useConversationStore } from '../../state/conversationStore';
import { useRobotStore } from '../../state/robotStore';
import { useSettingsStore } from '../../state/settingsStore';
import { speechService } from '../../services/speechService';
import { soundFx } from '../../services/audioSynthesizer';

export const SpeechTranscriptBubble: React.FC = () => {
  const messages = useConversationStore((s) => s.messages);
  const isSpeaking = useConversationStore((s) => s.isSpeaking);
  const isListening = useConversationStore((s) => s.isListening);
  const liveTranscript = useConversationStore((s) => s.liveTranscript);
  const currentSpeechText = useConversationStore((s) => s.currentSpeechText);
  const emotionState = useRobotStore((s) => s.emotionState);
  const theme = useSettingsStore((s) => s.theme);
  const isStudio = theme === 'studio';

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  const displayText = currentSpeechText || lastAssistantMessage?.content || '';

  const getEmotionBadge = () => {
    switch (emotionState) {
      case 'happy':
        return { label: 'Happy 😊', bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
      case 'excited':
        return { label: 'Excited ⚡️', bg: 'bg-pink-500/10 text-pink-600 border-pink-500/20' };
      case 'thinking':
        return { label: 'Thinking 🧠', bg: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
      case 'curious':
        return { label: 'Curious 🔍', bg: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' };
      case 'sleepy':
        return { label: 'Sleepy 💤', bg: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' };
      case 'sad':
        return { label: 'Gentle 🌧️', bg: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
      default:
        return { label: 'Companion 🤖', bg: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' };
    }
  };

  const badge = getEmotionBadge();

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl px-4 pointer-events-none">
      <AnimatePresence mode="wait">
        {/* Live Speech Recognition User Transcript */}
        {isListening && liveTranscript && (
          <motion.div
            key="user-listening"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`mb-3 p-3.5 rounded-2xl backdrop-blur-xl border shadow-xl flex items-center space-x-3 pointer-events-auto ${
              isStudio
                ? 'bg-white/90 border-cyan-400 text-slate-800 shadow-slate-300/40'
                : 'bg-cyan-950/80 border-cyan-500/30 text-cyan-100 shadow-cyan-950/50'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Mic className="w-4 h-4 text-cyan-600 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-mono text-cyan-600 font-bold block mb-0.5">
                Listening to you
              </span>
              <p className="text-sm font-medium truncate">{liveTranscript}</p>
            </div>
          </motion.div>
        )}

        {/* NEO Assistant Dialogue Bubble */}
        {displayText && (
          <motion.div
            key={displayText}
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={`p-4 rounded-2xl backdrop-blur-xl border shadow-xl pointer-events-auto ${
              isStudio
                ? 'bg-white/85 border-slate-300/80 shadow-slate-300/30 text-slate-800'
                : 'bg-[#121826]/85 border-white/[0.08] shadow-black/60 text-slate-200'
            }`}
          >
            {/* Header info */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-cyan-600 font-mono flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>NEO</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badge.bg}`}>
                  {badge.label}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1">
                {isSpeaking ? (
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      speechService.cancelSpeech();
                    }}
                    className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[11px] font-medium border border-red-500/30 transition-all"
                    title="Stop Speaking"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      speechService.speak(displayText);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-cyan-600 transition-all"
                    title="Replay Voice"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Message Body */}
            <p className="text-sm leading-relaxed font-normal">
              {displayText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
