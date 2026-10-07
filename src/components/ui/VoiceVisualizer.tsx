import React from 'react';
import { motion } from 'framer-motion';
import { useConversationStore } from '../../state/conversationStore';
import { useRobotStore } from '../../state/robotStore';

export const VoiceVisualizer: React.FC = () => {
  const isListening = useConversationStore((s) => s.isListening);
  const isSpeaking = useConversationStore((s) => s.isSpeaking);
  const audioLevel = useConversationStore((s) => s.audioInputLevel);
  const speechAmp = useRobotStore((s) => s.speechAmplitude);

  if (!isListening && !isSpeaking) return null;

  const currentLevel = isListening ? audioLevel : speechAmp;
  const ringColor = isListening ? 'border-cyan-400' : 'border-emerald-400';
  const glowColor = isListening ? 'rgba(0, 240, 255, 0.4)' : 'rgba(16, 185, 129, 0.4)';

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
      {/* Outer Pulse Wave Ring 1 */}
      <motion.div
        animate={{
          scale: [1, 1.2 + currentLevel * 0.4, 1],
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.8,
          ease: 'easeInOut',
        }}
        className={`w-72 h-72 rounded-full border-2 border-dashed ${ringColor}`}
        style={{
          boxShadow: `0 0 30px ${glowColor}`,
        }}
      />

      {/* Outer Pulse Wave Ring 2 */}
      <motion.div
        animate={{
          scale: [1, 1.4 + currentLevel * 0.6, 1],
          opacity: [0.15, 0.45, 0.15],
        }}
        transition={{
          repeat: Infinity,
          duration: 2.4,
          ease: 'easeInOut',
        }}
        className={`absolute w-88 h-88 rounded-full border ${ringColor}`}
      />
    </div>
  );
};
