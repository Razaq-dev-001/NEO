import React, { useState, useEffect } from 'react';
import {
  Bot,
  CheckSquare,
  Brain,
  Newspaper,
  Settings,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Activity,
} from 'lucide-react';
import { useRobotStore } from '../../state/robotStore';
import { useTaskStore } from '../../state/taskStore';
import { useSettingsStore } from '../../state/settingsStore';
import { soundFx } from '../../services/audioSynthesizer';

export const HeaderHUD: React.FC = () => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const animationState = useRobotStore((s) => s.animationState);
  const pendingTasksCount = useTaskStore((s) => s.getPendingTasksCount());

  const activeDrawer = useSettingsStore((s) => s.activeDrawer);
  const toggleDrawer = useSettingsStore((s) => s.toggleDrawer);
  const isDevMode = useSettingsStore((s) => s.isDevMode);
  const toggleDevMode = useSettingsStore((s) => s.toggleDevMode);
  const companionMode = useSettingsStore((s) => s.companionMode);
  const theme = useSettingsStore((s) => s.theme);
  const isMuted = useSettingsStore((s) => s.isMuted);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const isStudio = theme === 'studio';

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = () => {
    switch (animationState) {
      case 'listening':
        return { text: 'Listening...', color: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30 animate-pulse' };
      case 'thinking':
        return { text: 'Thinking...', color: 'bg-purple-500/15 text-purple-600 border-purple-500/30 animate-pulse' };
      case 'speaking':
        return { text: 'Speaking', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' };
      case 'sleeping':
        return { text: 'Sleep Mode', color: 'bg-slate-500/15 text-slate-500 border-slate-400/20' };
      case 'dancing':
        return { text: 'Dancing ♪', color: 'bg-pink-500/15 text-pink-600 border-pink-500/30' };
      case 'waving':
        return { text: 'Waving 👋', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' };
      default:
        return { text: 'Ready', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' };
    }
  };

  const status = getStatusBadge();

  return (
    <header className="absolute top-0 left-0 right-0 z-30 px-6 py-3.5 flex items-center justify-between select-none pointer-events-none">
      {/* Left: App Logo & Robot Status */}
      <div className="flex items-center space-x-3 pointer-events-auto">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-sky-500 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`font-black tracking-wider text-base ${isStudio ? 'text-slate-800' : 'text-white'}`}>
                NEO
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${isStudio ? 'bg-slate-200/70 text-slate-700 border-slate-300' : 'bg-white/10 text-slate-300 border-white/10'}`}>
                v1.0
              </span>
            </div>
            <div className={`text-[10px] font-mono flex items-center space-x-1.5 ${isStudio ? 'text-slate-500' : 'text-slate-400'}`}>
              <span>{currentTime}</span>
              <span>•</span>
              <span>{currentDate}</span>
            </div>
          </div>
        </div>

        {/* Live Status Pill */}
        <div
          className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-xs font-medium backdrop-blur-md ${status.color}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
          <span>{status.text}</span>
        </div>
      </div>

      {/* Right: Quick Navigation Tabs */}
      <div className="flex items-center space-x-2 pointer-events-auto">
        {/* Daily Tasks Button */}
        <button
          onClick={() => {
            soundFx.playClick();
            toggleDrawer('tasks');
          }}
          className={`relative p-2 rounded-xl text-xs font-medium flex items-center space-x-1.5 backdrop-blur-md transition-all ${
            activeDrawer === 'tasks'
              ? 'bg-cyan-500/20 text-cyan-600 border border-cyan-500/40 shadow-md'
              : isStudio
              ? 'bg-white/70 hover:bg-white text-slate-700 border border-slate-300/60 shadow-sm'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/[0.06]'
          }`}
          title="Daily Tasks"
        >
          <CheckSquare className="w-4 h-4" />
          <span className="hidden md:inline">Tasks</span>
          {pendingTasksCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-cyan-500 text-white font-bold text-[10px] flex items-center justify-center">
              {pendingTasksCount}
            </span>
          )}
        </button>

        {/* Memory Vault Button */}
        <button
          onClick={() => {
            soundFx.playClick();
            toggleDrawer('memories');
          }}
          className={`p-2 rounded-xl text-xs font-medium flex items-center space-x-1.5 backdrop-blur-md transition-all ${
            activeDrawer === 'memories'
              ? 'bg-purple-500/20 text-purple-600 border border-purple-500/40 shadow-md'
              : isStudio
              ? 'bg-white/70 hover:bg-white text-slate-700 border border-slate-300/60 shadow-sm'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/[0.06]'
          }`}
          title="Memory Vault"
        >
          <Brain className="w-4 h-4" />
          <span className="hidden md:inline">Memories</span>
        </button>

        {/* Live News & Weather Button */}
        <button
          onClick={() => {
            soundFx.playClick();
            toggleDrawer('news');
          }}
          className={`p-2 rounded-xl text-xs font-medium flex items-center space-x-1.5 backdrop-blur-md transition-all ${
            activeDrawer === 'news'
              ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/40 shadow-md'
              : isStudio
              ? 'bg-white/70 hover:bg-white text-slate-700 border border-slate-300/60 shadow-sm'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/[0.06]'
          }`}
          title="Live News & Weather"
        >
          <Newspaper className="w-4 h-4" />
          <span className="hidden md:inline">News</span>
        </button>

        {/* Motor Kinematics Developer HUD Toggle */}
        <button
          onClick={() => {
            soundFx.playClick();
            toggleDevMode();
          }}
          className={`p-2 rounded-xl text-xs font-medium flex items-center space-x-1.5 backdrop-blur-md transition-all ${
            isDevMode
              ? 'bg-cyan-500/20 text-cyan-600 border border-cyan-500/40 shadow-md'
              : isStudio
              ? 'bg-white/70 hover:bg-white text-slate-700 border border-slate-300/60 shadow-sm'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/[0.06]'
          }`}
          title="Toggle Motor Kinematics Developer Studio"
        >
          <Activity className="w-4 h-4" />
          <span className="hidden md:inline">Motor Dev</span>
        </button>

        <div className={`w-[1px] h-5 mx-1 hidden sm:block ${isStudio ? 'bg-slate-300' : 'bg-white/10'}`} />

        {/* Theme Toggle (Studio Clean Light vs Cyber Dark) */}
        <button
          onClick={() => {
            soundFx.playClick();
            updateSettings({ theme: isStudio ? 'cyber' : 'studio' });
          }}
          className={`p-2 rounded-xl text-xs backdrop-blur-md transition-all ${
            isStudio
              ? 'bg-white/70 hover:bg-white text-slate-700 border border-slate-300/60 shadow-sm'
              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/[0.06]'
          }`}
          title={isStudio ? 'Switch to Cyber Dark' : 'Switch to Studio Light'}
        >
          {isStudio ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Audio Mute Toggle */}
        <button
          onClick={() => {
            soundFx.playClick();
            updateSettings({ isMuted: !isMuted });
          }}
          className={`p-2 rounded-xl text-xs backdrop-blur-md transition-all ${
            isMuted
              ? 'bg-red-500/20 text-red-500 border border-red-500/30'
              : isStudio
              ? 'bg-white/70 hover:bg-white text-slate-700 border border-slate-300/60 shadow-sm'
              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/[0.06]'
          }`}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Companion Mode Toggle (Compact vs Full) */}
        <button
          onClick={() => {
            soundFx.playClick();
            updateSettings({
              companionMode: companionMode === 'full' ? 'compact' : 'full',
            });
          }}
          className={`p-2 rounded-xl text-xs backdrop-blur-md transition-all ${
            isStudio
              ? 'bg-white/70 hover:bg-white text-slate-700 border border-slate-300/60 shadow-sm'
              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/[0.06]'
          }`}
          title={companionMode === 'full' ? 'Compact Mode' : 'Full Mode'}
        >
          {companionMode === 'full' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Settings Button */}
        <button
          onClick={() => {
            soundFx.playClick();
            toggleDrawer('settings');
          }}
          className={`p-2 rounded-xl text-xs backdrop-blur-md transition-all ${
            activeDrawer === 'settings'
              ? 'bg-cyan-500/20 text-cyan-600 border border-cyan-500/40'
              : isStudio
              ? 'bg-white/70 hover:bg-white text-slate-700 border border-slate-300/60 shadow-sm'
              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/[0.06]'
          }`}
          title="NEO Configuration"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
