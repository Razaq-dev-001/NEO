import React, { useState } from 'react';
import {
  Activity,
  X,
  Play,
  Square,
  RotateCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Music,
  Compass,
  Smile,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useRobotStore } from '../../state/robotStore';
import { useSettingsStore } from '../../state/settingsStore';
import { ACTION_REGISTRY } from '../../services/motor/ActionRegistry';
import { motorController } from '../../services/motor/MotorController';
import { RobotAction, ActionCategory } from '../../types/robot';
import { soundFx } from '../../services/audioSynthesizer';

export const MotorTestingHUD: React.FC = () => {
  const isDevMode = useSettingsStore((s) => s.isDevMode);
  const toggleDevMode = useSettingsStore((s) => s.toggleDevMode);
  const theme = useSettingsStore((s) => s.theme);
  const isStudio = theme === 'studio';

  const animationState = useRobotStore((s) => s.animationState);
  const triggerAction = useRobotStore((s) => s.triggerAction);

  const [activeCategory, setActiveCategory] = useState<ActionCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isDevMode) return null;

  const motorState = motorController.getMotorState();
  const currentAction = motorController.getCurrentAction();

  const handleActionClick = (actionId: RobotAction) => {
    soundFx.playMotionSwoosh();
    triggerAction(actionId);
  };

  const handleStop = () => {
    soundFx.playClick();
    triggerAction('stop');
  };

  // Group actions by categories
  const allActions = Object.values(ACTION_REGISTRY);
  const filteredActions = allActions.filter((action) => {
    const matchesCategory = activeCategory === 'all' || action.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getMotorStateBadgeColor = (state: string) => {
    switch (state) {
      case 'WALKING':
      case 'TURNING':
        return 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40';
      case 'GESTURING':
      case 'DANCING':
        return 'bg-purple-500/20 text-purple-600 border-purple-500/40';
      case 'EMOTIONAL':
        return 'bg-amber-500/20 text-amber-600 border-amber-500/40';
      case 'SITTING':
      case 'SLEEPING':
        return 'bg-indigo-500/20 text-indigo-600 border-indigo-500/40';
      default:
        return 'bg-cyan-500/20 text-cyan-600 border-cyan-500/40';
    }
  };

  return (
    <aside
      aria-label="Motor Kinematics Engine HUD"
      className={`fixed right-6 top-20 z-30 w-80 max-h-[82vh] flex flex-col rounded-2xl backdrop-blur-xl border shadow-2xl transition-all select-none ${
        isStudio
          ? 'bg-white/90 border-slate-200/90 text-slate-800'
          : 'bg-[#0c121e]/90 border-cyan-500/20 text-slate-200 shadow-cyan-950/40'
      }`}
    >
      {/* Header with Live Kinematic State Indicator */}
      <div className="p-3.5 border-b border-black/[0.06] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-600 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-xs tracking-wide">Motor Kinematics</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-600 font-semibold">
                DEV
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-700 transition-colors"
            title={isCollapsed ? 'Expand HUD' : 'Collapse HUD'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleDevMode}
            className="p-1 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
            title="Close Dev Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live State Machine Status Banner */}
      <div className="px-3.5 py-2.5 bg-black/[0.02] border-b border-black/[0.04] flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-medium">State:</span>
          <span
            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono uppercase tracking-wider ${getMotorStateBadgeColor(
              motorState
            )}`}
          >
            {motorState}
          </span>
        </div>

        {/* Emergency Stop Button */}
        <button
          onClick={handleStop}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-600 border border-red-500/30 text-[10px] font-bold tracking-wide transition-all active:scale-95"
          title="Interrupt Movement & Stop"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>STOP</span>
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Quick Locomotion D-Pad Controls */}
          <div className="p-3 border-b border-black/[0.04]">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block mb-2">
              Locomotion D-Pad
            </span>
            <div className="grid grid-cols-3 gap-1.5 max-w-[190px] mx-auto">
              <div />
              <button
                onClick={() => handleActionClick('walk_forward')}
                className={`p-2 rounded-xl flex items-center justify-center border text-xs font-semibold active:scale-90 transition-all ${
                  isStudio
                    ? 'bg-slate-100 hover:bg-cyan-50 hover:text-cyan-600 border-slate-200'
                    : 'bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border-white/10'
                }`}
                title="Walk Forward"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <div />

              <button
                onClick={() => handleActionClick('walk_left')}
                className={`p-2 rounded-xl flex items-center justify-center border text-xs font-semibold active:scale-90 transition-all ${
                  isStudio
                    ? 'bg-slate-100 hover:bg-cyan-50 hover:text-cyan-600 border-slate-200'
                    : 'bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border-white/10'
                }`}
                title="Walk Left"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleActionClick('reset_position')}
                className={`p-2 rounded-xl flex items-center justify-center border text-[10px] font-bold active:scale-90 transition-all ${
                  isStudio
                    ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                }`}
                title="Center Origin"
              >
                CTR
              </button>

              <button
                onClick={() => handleActionClick('walk_right')}
                className={`p-2 rounded-xl flex items-center justify-center border text-xs font-semibold active:scale-90 transition-all ${
                  isStudio
                    ? 'bg-slate-100 hover:bg-cyan-50 hover:text-cyan-600 border-slate-200'
                    : 'bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border-white/10'
                }`}
                title="Walk Right"
              >
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleActionClick('turn_left')}
                className={`p-2 rounded-xl flex items-center justify-center border text-xs font-semibold active:scale-90 transition-all ${
                  isStudio
                    ? 'bg-slate-100 hover:bg-cyan-50 hover:text-cyan-600 border-slate-200'
                    : 'bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border-white/10'
                }`}
                title="Turn Left 90°"
              >
                ↺
              </button>

              <button
                onClick={() => handleActionClick('walk_backward')}
                className={`p-2 rounded-xl flex items-center justify-center border text-xs font-semibold active:scale-90 transition-all ${
                  isStudio
                    ? 'bg-slate-100 hover:bg-cyan-50 hover:text-cyan-600 border-slate-200'
                    : 'bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border-white/10'
                }`}
                title="Walk Backward"
              >
                <ArrowDown className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleActionClick('turn_right')}
                className={`p-2 rounded-xl flex items-center justify-center border text-xs font-semibold active:scale-90 transition-all ${
                  isStudio
                    ? 'bg-slate-100 hover:bg-cyan-50 hover:text-cyan-600 border-slate-200'
                    : 'bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border-white/10'
                }`}
                title="Turn Right 90°"
              >
                ↻
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="p-2 border-b border-black/[0.04] flex items-center space-x-1 overflow-x-auto text-[11px]">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : isStudio
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              All ({allActions.length})
            </button>
            <button
              onClick={() => setActiveCategory('locomotion')}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeCategory === 'locomotion'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : isStudio
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              Locomotion
            </button>
            <button
              onClick={() => setActiveCategory('hand_arm')}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeCategory === 'hand_arm'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : isStudio
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              Arms & Hands
            </button>
            <button
              onClick={() => setActiveCategory('body')}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeCategory === 'body'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : isStudio
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              Body Actions
            </button>
            <button
              onClick={() => setActiveCategory('expressive')}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeCategory === 'expressive'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : isStudio
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              Expressions
            </button>
          </div>

          {/* Action List Grid (Scrollable) */}
          <div className="p-2.5 overflow-y-auto max-h-64 grid grid-cols-2 gap-1.5">
            {filteredActions.map((action) => {
              const isActive = animationState === (action.id as any);
              return (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action.id)}
                  className={`px-2.5 py-2 rounded-xl text-left border text-xs font-semibold transition-all active:scale-95 flex flex-col justify-between ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-600 border-cyan-500/40 shadow-sm'
                      : isStudio
                      ? 'bg-slate-50 hover:bg-white text-slate-700 hover:text-cyan-700 border-slate-200/80 hover:border-cyan-300 shadow-sm'
                      : 'bg-white/[0.03] hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-300 border-white/[0.06] hover:border-cyan-500/30'
                  }`}
                  title={action.description}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">{action.name}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping ml-1" />}
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 mt-1 uppercase">
                    {action.layer.replace('_', ' ')}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
};
