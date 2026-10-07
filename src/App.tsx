import React, { useEffect, useState } from 'react';
import { RobotCanvas } from './components/3d/RobotCanvas';
import { HeaderHUD } from './components/ui/HeaderHUD';
import { VoiceVisualizer } from './components/ui/VoiceVisualizer';
import { QuickActionsHUD } from './components/ui/QuickActionsHUD';
import { MotorTestingHUD } from './components/ui/MotorTestingHUD';
import { CommandBar } from './components/ui/CommandBar';
import { TaskDrawer } from './components/ui/TaskDrawer';
import { MemoryDrawer } from './components/ui/MemoryDrawer';
import { NewsDrawer } from './components/ui/NewsDrawer';
import { SettingsModal } from './components/ui/SettingsModal';
import { dbService } from './services/dbService';
import { reminderService } from './services/reminderService';
import { kokoroService } from './services/kokoroService';
import { useSettingsStore } from './state/settingsStore';
import { useTaskStore } from './state/taskStore';
import { useMemoryStore } from './state/memoryStore';
import { useRobotStore } from './state/robotStore';

export const App: React.FC = () => {
  const companionMode = useSettingsStore((s) => s.companionMode);
  const theme = useSettingsStore((s) => s.theme);
  const loadStoredSettings = useSettingsStore((s) => s.loadStoredSettings);
  const [isAppReady, setIsAppReady] = useState(false);

  // Initialize DB, Reminders, and stored preferences
  useEffect(() => {
    const initApp = async () => {
      loadStoredSettings();
      await dbService.init();

      // Load tasks and memories
      const tasks = dbService.getAllTasks();
      if (tasks.length > 0) {
        useTaskStore.getState().setTasks(tasks);
      }

      const memories = dbService.getAllMemories();
      if (memories.length > 0) {
        useMemoryStore.getState().setMemories(memories);
      }

      // Start reminder service & check Kokoro TTS engine
      reminderService.start();
      kokoroService.checkHealth();
      setIsAppReady(true);
    };

    initApp();

    return () => {
      reminderService.stop();
    };
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useSettingsStore.getState().setActiveDrawer('none');
        useRobotStore.getState().setAnimationState('idle');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isStudioTheme = theme === 'studio';

  return (
    <main
      className={`relative w-screen h-screen overflow-hidden flex flex-col font-sans select-none transition-colors duration-500 ${
        isStudioTheme
          ? 'bg-gradient-to-b from-[#f1f4f8] via-[#e5ebf2] to-[#d8e0ea] text-slate-800'
          : 'bg-gradient-to-b from-[#070a11] via-[#0b101c] to-[#060910] text-slate-100'
      }`}
    >
      {/* Studio Lighting Radial Highlight directly behind robot */}
      {isStudioTheme ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] bg-white/70 rounded-full blur-3xl pointer-events-none" />
      ) : (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-500/[0.04] rounded-full blur-3xl pointer-events-none" />
      )}

      {/* Top Header Navigation HUD */}
      <HeaderHUD />

      {/* Main 3D Viewport */}
      <section className="relative flex-1 w-full h-full">
        {/* Audio Visualizer Pulse Ring */}
        <VoiceVisualizer />

        {/* 3D Robot Scene */}
        <RobotCanvas />

        {/* Floating Quick Action Buttons (Wave, Dance, Jump, Walk, Sleep) */}
        {companionMode !== 'compact' && <QuickActionsHUD />}

        {/* Developer Motor Testing & Kinematics Control Panel */}
        {companionMode !== 'compact' && <MotorTestingHUD />}
      </section>

      {/* Floating Bottom Command Bar (Mic, Text, Prompt Chips) */}
      <CommandBar />

      {/* Slide-out Drawers & Modals */}
      <TaskDrawer />
      <MemoryDrawer />
      <NewsDrawer />
      <SettingsModal />
    </main>
  );
};

export default App;
