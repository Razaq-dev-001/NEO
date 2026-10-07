import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Loader2, Volume2, Sparkles, Play, Sliders } from 'lucide-react';
import { useConversationStore } from '../../state/conversationStore';
import { useSettingsStore } from '../../state/settingsStore';
import { useRobotStore } from '../../state/robotStore';
import { speechService } from '../../services/speechService';
import { kokoroService } from '../../services/kokoroService';
import { aiService } from '../../services/aiService';
import { soundFx } from '../../services/audioSynthesizer';

export const CommandBar: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isListening = useConversationStore((s) => s.isListening);
  const liveTranscript = useConversationStore((s) => s.liveTranscript);
  const audioInputLevel = useConversationStore((s) => s.audioInputLevel);
  const addMessage = useConversationStore((s) => s.addMessage);

  const theme = useSettingsStore((s) => s.theme);
  const ttsPitch = useSettingsStore((s) => s.ttsPitch);
  const ttsRate = useSettingsStore((s) => s.ttsRate);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const triggerAction = useRobotStore((s) => s.triggerAction);
  const isStudio = theme === 'studio';

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    setInputText('');
    setIsProcessing(true);
    soundFx.playClick();

    // 1. Add User Message
    addMessage('user', text);

    // 2. Process via AI & Intent Parser
    try {
      const result = await aiService.processUserMessage(text);

      if (result.action) {
        triggerAction(result.action);
      }

      if (result.reply) {
        addMessage('assistant', result.reply, result.emotion, result.action);
        soundFx.playWakeChime();
        await speechService.speak(result.reply);
      }
    } catch (err) {
      console.error('Command processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      speechService.stopListening();
    } else {
      speechService.startListening((transcript) => {
        handleSendMessage(transcript);
      }, true); // continuous listening
    }
  };

  const ttsEngine = useSettingsStore((s) => s.ttsEngine);
  const kokoroVoice = useSettingsStore((s) => s.kokoroVoice);
  const kokoroSpeed = useSettingsStore((s) => s.kokoroSpeed);
  const kokoroStatus = useSettingsStore((s) => s.kokoroStatus);

  const voicePresets = [
    { id: 'af_heart', name: '❤️ Heart', desc: 'Warm, natural & youthful', speed: 1.05 },
    { id: 'af_bella', name: '🔥 Bella', desc: 'Energetic & cheerful', speed: 1.08 },
    { id: 'af_nicole', name: '🎧 Nicole', desc: 'Chill & relaxed', speed: 1.0 },
    { id: 'af_sarah', name: '🌸 Sarah', desc: 'Soft & sweet', speed: 1.02 },
    { id: 'af_sky', name: '☁️ Sky', desc: 'Playful & light', speed: 1.1 },
    { id: 'am_adam', name: '👦 Adam', desc: 'Youthful male', speed: 1.05 },
    { id: 'am_michael', name: '🎙️ Michael', desc: 'Warm clear male', speed: 1.0 },
    { id: 'bf_emma', name: '🇬🇧 Emma', desc: 'British companion', speed: 1.02 },
  ];

  const selectVoicePreset = async (preset: typeof voicePresets[0]) => {
    soundFx.playWakeChime();
    updateSettings({ ttsEngine: 'kokoro', kokoroVoice: preset.id, kokoroSpeed: preset.speed });
    await kokoroService.previewVoice(preset.id, preset.speed);
  };

  const quickPrompts = [
    { label: '👋 Wave', command: 'Wave your hand' },
    { label: '🚀 Jump', command: 'Jump high' },
    { label: '💃 Dance', command: 'Start dancing' },
    { label: '🚶 Walk Left', command: 'Walk to the left side' },
    { label: '🚶 Walk Right', command: 'Walk to the right side' },
    { label: '👏 Clap', command: 'Clap your hands' },
    { label: '🌀 Spin', command: 'Turn around and spin' },
    { label: '📋 Tasks', command: 'What are my tasks today?' },
    { label: '📰 News', command: "What's today's news?" },
    { label: '😄 Joke', command: 'Tell me a joke' },
  ];

  return (
    <nav aria-label="Command Bar Navigation" className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4 select-none">
      {/* Voice Preset Popover Menu */}
      {showVoicePicker && (
        <div className="mb-3 p-4 rounded-3xl bg-white/95 backdrop-blur-2xl border border-slate-300 shadow-2xl space-y-3 text-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-cyan-600" />
              <span className="font-bold text-slate-800 text-sm">Kokoro Neural Voice Models</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                100% Local & Free
              </span>
            </div>
            <button
              onClick={() => setShowVoicePicker(false)}
              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {voicePresets.map((preset) => {
              const isActive = ttsEngine === 'kokoro' && kokoroVoice === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => selectVoicePreset(preset)}
                  className={`p-2.5 rounded-2xl text-left font-medium transition-all flex flex-col justify-between border ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-800 border-cyan-400 shadow-sm ring-1 ring-cyan-400'
                      : 'bg-slate-100/90 hover:bg-slate-200/90 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold">{preset.name}</span>
                    {isActive && <span className="w-2 h-2 rounded-full bg-cyan-500" />}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5">{preset.desc}</span>
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span className="text-cyan-600 flex items-center space-x-0.5 font-semibold">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Preview</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Speed Tuning Slider */}
          <div className="pt-2 border-t border-slate-200 flex items-center space-x-3 text-slate-600">
            <span className="text-[11px] font-semibold flex items-center space-x-1">
              <Sliders className="w-3.5 h-3.5 text-cyan-600" />
              <span>Speed: {kokoroSpeed}x</span>
            </span>
            <input
              type="range"
              min="0.75"
              max="1.4"
              step="0.05"
              value={kokoroSpeed}
              onChange={(e) => updateSettings({ kokoroSpeed: parseFloat(e.target.value) })}
              className="flex-1 accent-cyan-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <button
              onClick={() => kokoroService.previewVoice(kokoroVoice, kokoroSpeed)}
              className="px-2.5 py-1 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-800 text-[11px] font-bold"
            >
              🔊 Test Speech
            </button>
          </div>
        </div>
      )}

      {/* Live Speech Recognition Transcript Floating Pill */}
      {isListening && liveTranscript && (
        <div className="mb-2 px-4 py-2 rounded-2xl bg-cyan-400 text-slate-900 text-xs font-bold shadow-lg shadow-cyan-400/30 flex items-center space-x-2 animate-pulse">
          <Mic className="w-3.5 h-3.5 animate-bounce text-slate-900" />
          <span className="truncate">"{liveTranscript}"</span>
        </div>
      )}

      {/* Quick Human Motor Action Chips + Voice Switcher Button */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
        <button
          onClick={() => setShowVoicePicker(!showVoicePicker)}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md transition-all shadow-sm flex items-center space-x-1.5 ${
            showVoicePicker
              ? 'bg-purple-600 text-white shadow-purple-600/30'
              : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Change Voice</span>
        </button>

        {quickPrompts.map((p) => (
          <button
            key={p.label}
            onClick={() => handleSendMessage(p.command)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-sm active:scale-95 ${
              isStudio
                ? 'bg-white/90 hover:bg-white text-slate-700 hover:text-cyan-600 border border-slate-300/80 hover:border-cyan-400'
                : 'bg-[#121826]/70 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Main Glass Input Bar with Mic Activation */}
      <div
        className={`relative flex items-center p-1.5 rounded-2xl backdrop-blur-xl border transition-all shadow-xl ${
          isStudio
            ? 'bg-white/95 border-slate-300/90 shadow-slate-400/25'
            : 'bg-[#121826]/85 border-white/[0.08] shadow-black/70'
        }`}
      >
        {/* Prominent Voice Microphone Button */}
        <button
          onClick={toggleMic}
          className={`relative px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 ${
            isListening
              ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/60 ring-2 ring-cyan-400 animate-pulse font-bold'
              : isStudio
              ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-300'
              : 'bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-cyan-300 border border-white/[0.06]'
          }`}
          title={isListening ? 'Voice Active (Click to Pause)' : 'Click to Activate Voice Microphone'}
        >
          <Mic className={`w-4 h-4 ${isListening ? 'animate-bounce' : ''}`} />
          <span className="text-xs font-bold hidden sm:inline">
            {isListening ? 'Listening...' : 'Voice'}
          </span>
          {isListening && (
            <div className="flex items-end space-x-0.5 h-3">
              <span className="w-1 bg-black rounded-full animate-ping" style={{ height: `${Math.max(4, audioInputLevel * 12)}px` }} />
              <span className="w-1 bg-black rounded-full animate-bounce" style={{ height: `${Math.max(6, audioInputLevel * 16)}px` }} />
            </div>
          )}
        </button>

        {/* Text Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          placeholder={
            isListening
              ? 'Voice active: Speak to NEO (e.g. "Wave", "Dance", "Jump")...'
              : 'Type or click Voice (e.g. "Wave", "Jump", "Dance", "Walk left")...'
          }
          className={`flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none ${
            isStudio
              ? 'text-slate-800 placeholder-slate-400 font-medium'
              : 'text-slate-100 placeholder-slate-500'
          }`}
        />

        {/* Send Button */}
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isProcessing}
          className="p-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-black font-semibold transition-all disabled:cursor-not-allowed shadow-md shadow-cyan-400/20 active:scale-95"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </nav>
  );
};
