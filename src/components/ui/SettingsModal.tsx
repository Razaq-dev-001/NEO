import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Key,
  Mic,
  Volume2,
  Sliders,
  User,
  Monitor,
  Eye,
  EyeOff,
  Check,
  RotateCcw,
  Sparkles,
  Download,
  Trash2,
} from 'lucide-react';
import { useSettingsStore } from '../../state/settingsStore';
import { speechService } from '../../services/speechService';
import { soundFx } from '../../services/audioSynthesizer';

export const SettingsModal: React.FC = () => {
  const activeDrawer = useSettingsStore((s) => s.activeDrawer);
  const toggleDrawer = useSettingsStore((s) => s.toggleDrawer);

  const settings = useSettingsStore();
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const [showApiKey, setShowApiKey] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activeTab, setActiveTab] = useState<'ai' | 'voice' | 'desktop' | 'profile'>('ai');

  useEffect(() => {
    const list = speechService.getAvailableVoices();
    setVoices(list);
  }, [activeDrawer]);

  if (activeDrawer !== 'settings') return null;

  const testVoice = () => {
    soundFx.playWakeChime();
    speechService.speak(
      `Hello ${settings.userName}! I'm NEO, your 3D personal companion. My voice settings are calibrated!`
    );
  };

  const handleExportData = () => {
    try {
      const exportObj = {
        settings: localStorage.getItem('neo_user_settings'),
        tasks: localStorage.getItem('neo_tasks_backup'),
        memories: localStorage.getItem('neo_memories_backup'),
        exportDate: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neo-companion-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      >
        <div className="w-full max-w-xl bg-[#0e1422] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">NEO Configuration</h2>
                <p className="text-xs text-slate-400 font-mono">Personalize AI, Voice & Desktop parameters</p>
              </div>
            </div>

            <button
              onClick={() => toggleDrawer('settings')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/[0.06] bg-white/[0.02] px-4 pt-2">
            {[
              { id: 'ai', label: 'AI Intelligence', icon: Sparkles },
              { id: 'voice', label: 'Speech & Audio', icon: Volume2 },
              { id: 'desktop', label: 'Companion Window', icon: Monitor },
              { id: 'profile', label: 'User Profile', icon: User },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? 'border-cyan-400 text-cyan-300 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* TAB 1: AI INTELLIGENCE */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Key className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Google Gemini API Key</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Optional (Fallback mode enabled)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={settings.geminiApiKey}
                      onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                      placeholder="AIzaSy..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    NEO runs seamlessly with both Gemini API and built-in offline companion intelligence. Get your free key at{' '}
                    <a
                      href="https://aistudio.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline"
                    >
                      aistudio.google.com
                    </a>.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Gemini AI Model</label>
                  <select
                    value={settings.geminiModel}
                    onChange={(e) => updateSettings({ geminiModel: e.target.value })}
                    className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Ultra Fast & Responsive)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Next-Gen Multimodal)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5 flex items-center space-x-1.5">
                    <Mic className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Configurable Wake Phrase</span>
                  </label>
                  <input
                    type="text"
                    value={settings.wakePhrase}
                    onChange={(e) => updateSettings({ wakePhrase: e.target.value.toLowerCase() })}
                    placeholder="e.g. hey neo"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: SPEECH & AUDIO */}
            {activeTab === 'voice' && (
              <div className="space-y-4">
                {/* Engine Selector */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Primary Speech Engine</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                      100% Free & Local
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateSettings({ ttsEngine: 'kokoro' })}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        settings.ttsEngine === 'kokoro'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center space-x-1">
                        <span>⚡ Kokoro Neural TTS</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Local 82M Neural Audio on Apple Silicon
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateSettings({ ttsEngine: 'system' })}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        settings.ttsEngine === 'system'
                          ? 'bg-purple-500/20 border-purple-400 text-purple-200 ring-1 ring-purple-400'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs">🎙️ macOS Native Speech</div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Built-in System Fallback Engine
                      </div>
                    </button>
                  </div>
                </div>

                {/* Kokoro Voices */}
                {settings.ttsEngine === 'kokoro' ? (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">
                        Kokoro Neural Companion Voice
                      </label>
                      <select
                        value={settings.kokoroVoice}
                        onChange={(e) => updateSettings({ kokoroVoice: e.target.value })}
                        className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="af_heart">❤️ Heart (Warm, Natural & Youthful) — Recommended</option>
                        <option value="af_bella">🔥 Bella (Energetic & Cheerful)</option>
                        <option value="af_nicole">🎧 Nicole (Chill & Conversational)</option>
                        <option value="af_sarah">🌸 Sarah (Soft & Sweet)</option>
                        <option value="af_sky">☁️ Sky (Playful & Light)</option>
                        <option value="am_adam">👦 Adam (Youthful Male Companion)</option>
                        <option value="am_michael">🎙️ Michael (Warm & Clear Male)</option>
                        <option value="bf_emma">🇬🇧 Emma (British Accent Companion)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Speech Speed ({settings.kokoroSpeed}x)</span>
                        <span className="text-slate-500 text-[10px]">Optimal: 1.05x</span>
                      </div>
                      <input
                        type="range"
                        min="0.75"
                        max="1.4"
                        step="0.05"
                        value={settings.kokoroSpeed}
                        onChange={(e) => updateSettings({ kokoroSpeed: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-400"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-slate-300 space-y-1">
                      <div className="font-semibold text-cyan-300 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Resilient Fallback Guarantee</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Kokoro runs 100% locally with zero subscription fees. If the local model is loading or encountering an error, NEO automatically uses macOS system speech as an instant fallback.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5">macOS System Voice</label>
                      <select
                        value={settings.ttsVoice}
                        onChange={(e) => updateSettings({ ttsVoice: e.target.value })}
                        className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">Default System Companion Voice</option>
                        {voices.map((v) => (
                          <option key={v.name} value={v.name}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Voice Pitch ({settings.ttsPitch}x)</span>
                      </div>
                      <input
                        type="range"
                        min="0.8"
                        max="1.8"
                        step="0.05"
                        value={settings.ttsPitch}
                        onChange={(e) => updateSettings({ ttsPitch: parseFloat(e.target.value) })}
                        className="w-full accent-purple-400"
                      />
                    </div>
                  </div>
                )}

                {/* Sliders & Toggles */}
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Audio Volume ({Math.round(settings.ttsVolume * 100)}%)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.ttsVolume}
                      onChange={(e) => updateSettings({ ttsVolume: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-400"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2.5 border-t border-white/[0.06]">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer">
                    <span className="text-slate-300">Sound Effects & Robotic Beeps</span>
                    <input
                      type="checkbox"
                      checked={settings.soundEffects}
                      onChange={(e) => updateSettings({ soundEffects: e.target.checked })}
                      className="rounded accent-cyan-400"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer">
                    <span className="text-slate-300">Auto-Speak Spoken Replies</span>
                    <input
                      type="checkbox"
                      checked={settings.autoSpeakResponse}
                      onChange={(e) => updateSettings({ autoSpeakResponse: e.target.checked })}
                      className="rounded accent-cyan-400"
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={testVoice}
                    className="w-full py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-cyan-500/10"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Test Voice & Preview Speech</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: DESKTOP COMPANION */}
            {activeTab === 'desktop' && (
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer">
                  <div>
                    <span className="text-slate-200 font-medium block">Always on Top Mode</span>
                    <span className="text-[11px] text-slate-400">Keep NEO floating above all Mac desktop windows</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.isAlwaysOnTop}
                    onChange={(e) => updateSettings({ isAlwaysOnTop: e.target.checked })}
                    className="rounded accent-cyan-400"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer">
                  <div>
                    <span className="text-slate-200 font-medium block">Compact Companion Mode</span>
                    <span className="text-[11px] text-slate-400">Minimalist floating desktop robot widget</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.companionMode === 'compact'}
                    onChange={(e) =>
                      updateSettings({
                        companionMode: e.target.checked ? 'compact' : 'full',
                      })
                    }
                    className="rounded accent-cyan-400"
                  />
                </label>

                {/* Shortcuts hint */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <span className="text-[10px] uppercase font-mono text-cyan-400 font-bold block">
                    macOS Global Shortcuts
                  </span>
                  <div className="flex justify-between items-center text-[11px] text-slate-300">
                    <span>Summon / Focus NEO</span>
                    <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-slate-300">⌥ + ⇧ + N</kbd>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-300">
                    <span>Toggle Voice Mic</span>
                    <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-slate-300">Space (when focused)</kbd>
                  </div>
                </div>

                {/* Backup / Export */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.08] text-slate-300 font-medium flex items-center justify-center space-x-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export SQLite Data Backup</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: USER PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Your Name</label>
                  <input
                    type="text"
                    value={settings.userName}
                    onChange={(e) => updateSettings({ userName: e.target.value })}
                    placeholder="e.g. Razaq"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Your Location (For Weather)</label>
                  <input
                    type="text"
                    value={settings.userLocation}
                    onChange={(e) => updateSettings({ userLocation: e.target.value })}
                    placeholder="e.g. Mumbai, India"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/[0.08] flex justify-end">
            <button
              onClick={() => toggleDrawer('settings')}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
            >
              Done & Save
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
