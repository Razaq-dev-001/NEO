import React from 'react';
import { Sparkles, Music, ArrowLeft, ArrowRight, Moon, Sun, ArrowUpCircle, RotateCw, HandMetal } from 'lucide-react';
import { useRobotStore } from '../../state/robotStore';
import { useSettingsStore } from '../../state/settingsStore';
import { useConversationStore } from '../../state/conversationStore';
import { aiService } from '../../services/aiService';
import { speechService } from '../../services/speechService';
import { soundFx } from '../../services/audioSynthesizer';

export const QuickActionsHUD: React.FC = () => {
  const animationState = useRobotStore((s) => s.animationState);
  const triggerAction = useRobotStore((s) => s.triggerAction);
  const theme = useSettingsStore((s) => s.theme);
  const isStudio = theme === 'studio';

  const handleAction = async (action: any, text: string) => {
    soundFx.playMotionSwoosh();
    triggerAction(action);
    const res = await aiService.processUserMessage(text);
    if (res.reply) {
      useConversationStore.getState().addMessage('assistant', res.reply, res.emotion, res.action);
      speechService.speak(res.reply);
    }
  };

  const isSleeping = animationState === 'sleeping';

  const buttonStyle = isStudio
    ? 'bg-white/80 hover:bg-white text-slate-700 hover:text-cyan-600 border-slate-300/80 hover:border-cyan-400 shadow-sm'
    : 'bg-[#121826]/70 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border-white/[0.08] hover:border-cyan-500/40';

  return (
    <aside aria-label="Robot Quick Actions" className="absolute left-6 bottom-28 z-20 hidden md:flex flex-col space-y-2 select-none">
      <span className={`text-[10px] font-mono uppercase tracking-widest font-bold px-1 ${isStudio ? 'text-slate-500' : 'text-slate-400'}`}>
        Motor Actions
      </span>

      {/* Wave */}
      <button
        onClick={() => handleAction('wave', 'Wave your hands and say hello!')}
        className={`group flex items-center space-x-2 px-3.5 py-2 rounded-xl backdrop-blur-md border text-xs font-semibold transition-all shadow-md active:scale-95 ${buttonStyle}`}
        title="Wave Hand"
      >
        <span className="text-sm">👋</span>
        <span>Wave</span>
      </button>

      {/* Dance */}
      <button
        onClick={() => handleAction('dance', 'Start dancing and party!')}
        className={`group flex items-center space-x-2 px-3.5 py-2 rounded-xl backdrop-blur-md border text-xs font-semibold transition-all shadow-md active:scale-95 ${
          isStudio
            ? 'bg-purple-50/90 hover:bg-purple-100 text-purple-700 border-purple-200 hover:border-purple-400'
            : 'bg-[#121826]/70 hover:bg-purple-500/20 text-slate-300 hover:text-purple-300 border-white/[0.08] hover:border-purple-500/40'
        }`}
        title="Dance Sequence"
      >
        <Music className="w-3.5 h-3.5 text-purple-500 group-hover:scale-110 transition-transform" />
        <span>Dance</span>
      </button>

      {/* Jump */}
      <button
        onClick={() => handleAction('jump', 'Jump high with your thrusters!')}
        className={`group flex items-center space-x-2 px-3.5 py-2 rounded-xl backdrop-blur-md border text-xs font-semibold transition-all shadow-md active:scale-95 ${
          isStudio
            ? 'bg-emerald-50/90 hover:bg-emerald-100 text-emerald-700 border-emerald-200 hover:border-emerald-400'
            : 'bg-[#121826]/70 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border-white/[0.08] hover:border-emerald-500/40'
        }`}
        title="Jump High"
      >
        <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
        <span>Jump</span>
      </button>

      {/* Clap */}
      <button
        onClick={() => handleAction('clap', 'Clap your hands!')}
        className={`group flex items-center space-x-2 px-3.5 py-2 rounded-xl backdrop-blur-md border text-xs font-semibold transition-all shadow-md active:scale-95 ${buttonStyle}`}
        title="Clap Hands"
      >
        <span className="text-sm">👏</span>
        <span>Clap</span>
      </button>

      {/* Spin 360 */}
      <button
        onClick={() => handleAction('turn_around', 'Spin all the way around!')}
        className={`group flex items-center space-x-2 px-3.5 py-2 rounded-xl backdrop-blur-md border text-xs font-semibold transition-all shadow-md active:scale-95 ${buttonStyle}`}
        title="Spin 360 Degrees"
      >
        <RotateCw className="w-3.5 h-3.5 text-cyan-500" />
        <span>Spin 360</span>
      </button>

      {/* Walk Left / Right */}
      <div className="flex space-x-1.5">
        <button
          onClick={() => handleAction('walk_left', 'Walk to the left side')}
          className={`flex-1 flex items-center justify-center p-2 rounded-xl backdrop-blur-md border text-xs font-medium transition-all active:scale-95 ${buttonStyle}`}
          title="Walk Left"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => handleAction('walk_right', 'Walk to the right side')}
          className={`flex-1 flex items-center justify-center p-2 rounded-xl backdrop-blur-md border text-xs font-medium transition-all active:scale-95 ${buttonStyle}`}
          title="Walk Right"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sleep / Wake */}
      <button
        onClick={() => {
          if (isSleeping) {
            handleAction('wake_up', 'Wake up NEO!');
          } else {
            handleAction('sleep', 'Go to sleep mode.');
          }
        }}
        className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl backdrop-blur-md border text-xs font-semibold transition-all active:scale-95 ${
          isSleeping
            ? 'bg-amber-500/20 text-amber-600 border-amber-500/40'
            : isStudio
            ? 'bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border-indigo-200 hover:border-indigo-400'
            : 'bg-[#121826]/70 hover:bg-indigo-500/20 border-white/[0.08] hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300'
        }`}
        title={isSleeping ? 'Wake Up' : 'Sleep Mode'}
      >
        {isSleeping ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
        <span>{isSleeping ? 'Wake Up' : 'Sleep'}</span>
      </button>
    </aside>
  );
};
