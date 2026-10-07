import { create } from 'zustand';
import { AnimationState, EmotionState, EyeExpression, FloatingEmote, RobotAction } from '../types/robot';
import { motorController } from '../services/motor/MotorController';
import { getActionDefinition } from '../services/motor/ActionRegistry';

interface RobotState {
  animationState: AnimationState;
  previousAnimationState: AnimationState;
  emotionState: EmotionState;
  eyeExpression: EyeExpression;
  isBlinking: boolean;
  speechAmplitude: number; // 0 to 1 for mouth and audio responsiveness
  audioFrequencyData: number[]; // for real-time waveform display

  // Spatial coordinates in 3D scene
  position: [number, number, number];
  targetPosition: [number, number, number];
  rotation: [number, number, number];
  targetRotation: [number, number, number];
  headRotation: [number, number, number];
  targetHeadRotation: [number, number, number];

  // Floating emotes/particles
  floatingEmotes: FloatingEmote[];

  // Interactive lookAt tracking mouse/camera
  isTrackingPointer: boolean;
  pointerCoordinates: { x: number; y: number };

  // Actions
  setAnimationState: (state: AnimationState) => void;
  setEmotionState: (emotion: EmotionState) => void;
  setEyeExpression: (eye: EyeExpression) => void;
  setBlinking: (blinking: boolean) => void;
  setSpeechAmplitude: (amplitude: number) => void;
  setAudioFrequencyData: (data: number[]) => void;
  setPointerCoordinates: (coords: { x: number; y: number }) => void;
  setTrackingPointer: (tracking: boolean) => void;

  setTargetPosition: (pos: [number, number, number]) => void;
  setTargetRotation: (rot: [number, number, number]) => void;
  setTargetHeadRotation: (rot: [number, number, number]) => void;

  triggerAction: (action: RobotAction) => void;
  addFloatingEmote: (type: FloatingEmote['type']) => void;
  removeFloatingEmote: (id: string) => void;
  resetPosition: () => void;
}

export const useRobotStore = create<RobotState>((set, get) => ({
  animationState: 'idle',
  previousAnimationState: 'idle',
  emotionState: 'neutral',
  eyeExpression: 'normal',
  isBlinking: false,
  speechAmplitude: 0,
  audioFrequencyData: [0.1, 0.2, 0.15, 0.3, 0.2, 0.1],

  position: [0, 0, 0],
  targetPosition: [0, 0, 0],
  rotation: [0, 0, 0],
  targetRotation: [0, 0, 0],
  headRotation: [0, 0, 0],
  targetHeadRotation: [0, 0, 0],

  floatingEmotes: [],
  isTrackingPointer: true,
  pointerCoordinates: { x: 0, y: 0 },

  setAnimationState: (newState) => {
    const current = get().animationState;
    if (current === newState) return;

    // Automatic eye expression mappings based on state
    let eye: EyeExpression = 'normal';
    if (newState === 'sleeping') eye = 'closed_sleep';
    else if (newState === 'happy' || newState === 'dancing') eye = 'happy_crescents';
    else if (newState === 'thinking') eye = 'thinking_dart';
    else if (newState === 'confused') eye = 'confused_asym';
    else if (newState === 'sad') eye = 'sad_droop';
    else if (newState === 'listening') eye = 'wide_excited';

    set({
      previousAnimationState: current,
      animationState: newState,
      eyeExpression: eye,
    });
  },

  setEmotionState: (emotion) => {
    let eye: EyeExpression = 'normal';
    switch (emotion) {
      case 'happy':
      case 'excited':
        eye = 'happy_crescents';
        break;
      case 'love':
        eye = 'heart';
        break;
      case 'thinking':
        eye = 'thinking_dart';
        break;
      case 'confused':
      case 'curious':
        eye = 'confused_asym';
        break;
      case 'sad':
        eye = 'sad_droop';
        break;
      case 'sleepy':
        eye = 'closed_sleep';
        break;
      case 'surprised':
        eye = 'wide_excited';
        break;
      default:
        eye = 'normal';
    }
    set({ emotionState: emotion, eyeExpression: eye });
  },

  setEyeExpression: (eye) => set({ eyeExpression: eye }),
  setBlinking: (blinking) => set({ isBlinking: blinking }),
  setSpeechAmplitude: (amplitude) => set({ speechAmplitude: amplitude }),
  setAudioFrequencyData: (data) => set({ audioFrequencyData: data }),
  setPointerCoordinates: (coords) => set({ pointerCoordinates: coords }),
  setTrackingPointer: (tracking) => set({ isTrackingPointer: tracking }),

  setTargetPosition: (pos) => set({ targetPosition: pos }),
  setTargetRotation: (rot) => set({ targetRotation: rot }),
  setTargetHeadRotation: (rot) => set({ targetHeadRotation: rot }),

  triggerAction: (action) => {
    // 1. Dispatch directly into master motor controller state machine
    motorController.triggerAction(action);

    // 2. Fetch definition for metadata
    const def = getActionDefinition(action);
    if (def) {
      if (def.emotion) {
        get().setEmotionState(def.emotion);
      }
      if (def.eyeExpression) {
        get().setEyeExpression(def.eyeExpression);
      }
    }

    if (action === 'dance') get().addFloatingEmote('music');
    else if (action === 'sleep') get().addFloatingEmote('zzz');
    else if (action === 'wave' || action === 'jump' || action === 'celebrate') get().addFloatingEmote('sparkle');
    else if (action === 'come_closer' || action === 'approach_target') get().addFloatingEmote('heart');
  },

  addFloatingEmote: (type) => {
    const newEmote: FloatingEmote = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      position: [
        (Math.random() - 0.5) * 1.2,
        1.6 + Math.random() * 0.4,
        (Math.random() - 0.5) * 0.5,
      ],
      createdAt: Date.now(),
    };
    set((state) => ({ floatingEmotes: [...state.floatingEmotes.slice(-5), newEmote] }));

    setTimeout(() => {
      get().removeFloatingEmote(newEmote.id);
    }, 2800);
  },

  removeFloatingEmote: (id) => {
    set((state) => ({
      floatingEmotes: state.floatingEmotes.filter((e) => e.id !== id),
    }));
  },

  resetPosition: () => {
    motorController.triggerAction('reset_position');
    set({
      position: [0, 0, 0],
      targetPosition: [0, 0, 0],
      rotation: [0, 0, 0],
      targetRotation: [0, 0, 0],
      headRotation: [0, 0, 0],
      targetHeadRotation: [0, 0, 0],
      animationState: 'idle',
      emotionState: 'neutral',
      eyeExpression: 'normal',
    });
  },
}));
