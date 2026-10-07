// Central Motor Controller, Action Evaluator & State Machine for NEO
import * as THREE from 'three';
import {
  ActionDefinition,
  FullBodyPose,
  MotorState,
  RobotAction,
  Vector3Tuple,
} from '../../types/robot';
import { DEFAULT_REST_POSE, blendLayeredPose, blendPoses, clonePose } from './KinematicPose';
import { getActionDefinition } from './ActionRegistry';
import { locomotionEngine } from './LocomotionEngine';
import { useRobotStore } from '../../state/robotStore';
import { soundFx } from '../audioSynthesizer';

export class MotorController {
  private motorState: MotorState = 'IDLE';
  private currentAction: ActionDefinition | null = null;
  private actionElapsed: number = 0;
  private actionDuration: number = 0;
  private isActionActive: boolean = false;
  private actionBlendWeight: number = 0;

  // Blending transition pose
  private previousPose: FullBodyPose = clonePose(DEFAULT_REST_POSE);
  private currentPose: FullBodyPose = clonePose(DEFAULT_REST_POSE);

  // Target lookAt vector
  private lookTarget: Vector3Tuple = [0, 0, 2];
  private isTrackingTarget: boolean = true;

  getMotorState(): MotorState {
    return this.motorState;
  }

  getCurrentAction(): ActionDefinition | null {
    return this.currentAction;
  }

  getCurrentPose(): FullBodyPose {
    return this.currentPose;
  }

  // Trigger any action by ID from Voice, UI, or AI intents
  triggerAction(actionId: RobotAction, onComplete?: () => void) {
    const actionDef = getActionDefinition(actionId);

    // Handle locomotion actions directly through locomotion engine
    if (actionId === 'walk_forward') {
      locomotionEngine.setTargetPosition(0, 1.5, 1.0);
      this.motorState = 'WALKING';
      useRobotStore.getState().setAnimationState('walking');
      return;
    }

    if (actionId === 'walk_backward' || actionId === 'step_back') {
      locomotionEngine.setTargetPosition(0, -1.0, 0.85);
      this.motorState = 'WALKING';
      useRobotStore.getState().setAnimationState('walking');
      return;
    }

    if (actionId === 'walk_left') {
      locomotionEngine.setTargetPosition(-1.8, 0.2, 1.0);
      this.motorState = 'WALKING';
      useRobotStore.getState().setAnimationState('walking');
      return;
    }

    if (actionId === 'walk_right') {
      locomotionEngine.setTargetPosition(1.8, 0.2, 1.0);
      this.motorState = 'WALKING';
      useRobotStore.getState().setAnimationState('walking');
      return;
    }

    if (actionId === 'approach_target' || actionId === 'come_closer') {
      locomotionEngine.setTargetPosition(0, 1.3, 1.0);
      this.motorState = 'WALKING';
      useRobotStore.getState().setAnimationState('walking');
      return;
    }

    if (actionId === 'walk_center' || actionId === 'reset_position') {
      locomotionEngine.setTargetPosition(0, 0, 1.0);
      this.motorState = 'WALKING';
      useRobotStore.getState().setAnimationState('walking');
      return;
    }

    if (actionId === 'turn_left') {
      locomotionEngine.setTargetHeading(locomotionEngine.getState().heading + Math.PI / 2);
      this.motorState = 'TURNING';
      return;
    }

    if (actionId === 'turn_right') {
      locomotionEngine.setTargetHeading(locomotionEngine.getState().heading - Math.PI / 2);
      this.motorState = 'TURNING';
      return;
    }

    if (actionId === 'rotate_180' || actionId === 'turn_around') {
      locomotionEngine.setTargetHeading(locomotionEngine.getState().heading + Math.PI);
      this.motorState = 'TURNING';
      return;
    }

    if (actionId === 'rotate_360') {
      locomotionEngine.setTargetHeading(locomotionEngine.getState().heading + Math.PI * 2);
      this.motorState = 'TURNING';
      return;
    }

    if (actionId === 'stop') {
      locomotionEngine.stop();
      this.stopCurrentAction();
      this.motorState = 'IDLE';
      useRobotStore.getState().setAnimationState('idle');
      return;
    }

    // Hand/Body/Expressive Actions
    this.previousPose = clonePose(this.currentPose);
    this.currentAction = actionDef;
    this.actionElapsed = 0;
    this.actionDuration = actionDef.duration / 1000;
    this.isActionActive = true;
    this.actionBlendWeight = 0;

    // Update state mappings
    if (actionDef.category === 'hand_arm') this.motorState = 'GESTURING';
    else if (actionId === 'dance') this.motorState = 'DANCING';
    else if (actionId === 'sit' || actionId === 'sit_down') this.motorState = 'SITTING';
    else if (actionId === 'sleep') this.motorState = 'SLEEPING';
    else if (actionDef.category === 'expressive') this.motorState = 'EMOTIONAL';
    else this.motorState = 'GESTURING';

    if (actionDef.emotion) {
      useRobotStore.getState().setEmotionState(actionDef.emotion);
    }
    if (actionDef.eyeExpression) {
      useRobotStore.getState().setEyeExpression(actionDef.eyeExpression);
    }

    // Set store animation state
    useRobotStore.getState().setAnimationState(actionId as any);

    // Audio / Particle feedback
    if (actionId === 'jump') soundFx.playMotionSwoosh();
    else if (actionId === 'dance') soundFx.playWakeChime();
  }

  stopCurrentAction() {
    this.isActionActive = false;
    this.currentAction = null;
    this.actionElapsed = 0;
    this.actionBlendWeight = 0;
    this.motorState = 'IDLE';
    useRobotStore.getState().setAnimationState('idle');
  }

  setTrackingTarget(x: number, y: number, z = 2.0) {
    this.lookTarget = [x, y, z];
    this.isTrackingTarget = true;
  }

  // Master Frame Evaluation (Runs at 60/120 FPS inside Three.js useFrame)
  evaluate(time: number, delta: number): {
    pose: FullBodyPose;
    worldPosition: Vector3Tuple;
    heading: number;
    speechAmplitude: number;
  } {
    const clampedDelta = Math.min(delta, 0.1);

    // 1. Evaluate Locomotion Engine Base
    const locoResult = locomotionEngine.update(clampedDelta);
    let basePose = locoResult.pose;

    // Update locomotion state in state machine
    if (locomotionEngine.getState().isMoving) {
      this.motorState = 'WALKING';
    } else if (this.motorState === 'WALKING') {
      this.motorState = 'IDLE';
      if (useRobotStore.getState().animationState === 'walking') {
        useRobotStore.getState().setAnimationState('idle');
      }
    }

    // 2. Base Idle Breathing and Pointer Gaze if not moving
    if (!locomotionEngine.getState().isMoving && !this.isActionActive) {
      const breath = Math.sin(time * 2.2) * 0.035;
      basePose.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] + breath;
      basePose.lowerTorsoRotation[0] = Math.sin(time * 1.8) * 0.02;
      basePose.leftUpperArmRotation[0] = DEFAULT_REST_POSE.leftUpperArmRotation[0] + Math.sin(time * 1.6) * 0.04;
      basePose.rightUpperArmRotation[0] = DEFAULT_REST_POSE.rightUpperArmRotation[0] + Math.sin(time * 1.6) * 0.03;

      // Pointer look-at tracking
      if (this.isTrackingTarget) {
        const mouseX = this.lookTarget[0] * 0.35;
        const mouseY = this.lookTarget[1] * 0.25;
        basePose.headRotation = [-mouseY, mouseX, -mouseX * 0.08];
      }
    }

    // 3. Evaluate Procedural Action Overlay if active
    let actionPose: FullBodyPose | null = null;
    let actionLayer = this.currentAction?.layer || 'full_body';

    if (this.isActionActive && this.currentAction) {
      this.actionElapsed += clampedDelta;
      const t = this.actionElapsed;
      const duration = this.actionDuration;

      // Calculate ease-in and ease-out blend weight
      const blendInTime = 0.35;
      const blendOutTime = 0.45;

      if (t < blendInTime) {
        this.actionBlendWeight = t / blendInTime;
      } else if (duration > 0 && t > duration - blendOutTime) {
        this.actionBlendWeight = Math.max(0, (duration - t) / blendOutTime);
      } else {
        this.actionBlendWeight = 1.0;
      }

      // Procedural action kinematics evaluation
      actionPose = this.evaluateProceduralAction(this.currentAction.id, t, time);

      // Check for action completion
      if (duration > 0 && t >= duration && !this.currentAction.isLooping) {
        this.stopCurrentAction();
      }
    }

    // 4. Layered Pose Blending (Blend actionPose over basePose)
    if (actionPose && this.actionBlendWeight > 0) {
      this.currentPose = blendLayeredPose(basePose, actionPose, actionLayer, this.actionBlendWeight);
    } else {
      this.currentPose = basePose;
    }

    return {
      pose: this.currentPose,
      worldPosition: locoResult.worldPosition,
      heading: locoResult.heading,
      speechAmplitude: useRobotStore.getState().speechAmplitude,
    };
  }

  // Comprehensive Procedural Action Kinematics Evaluator
  private evaluateProceduralAction(actionId: RobotAction, t: number, globalTime: number): FullBodyPose {
    const p = clonePose(DEFAULT_REST_POSE);

    switch (actionId) {
      // --- HAND & ARM ACTIONS ---
      case 'wave':
      case 'wave_hello': {
        // High-energy overhead wave with wrist rotation
        p.upperTorsoRotation = [0, -0.08, 0.05];
        p.neckRotation = [-0.05, -0.15, -0.05];
        p.headRotation = [-0.1, Math.sin(t * 7.0) * 0.15, 0.08];

        // Left iconic arm raised high overhead waving
        p.leftUpperArmRotation = [-1.6, 0.2, 1.1 + Math.sin(t * 9.0) * 0.7];
        p.leftElbowRotation = [-0.3, Math.sin(t * 9.0) * 0.4, 0.2];
        p.leftWristRotation = [0.1, Math.sin(t * 9.0) * 0.5, 0.2];

        // Gentle supportive body bounce
        p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] + Math.abs(Math.sin(t * 6.0)) * 0.08;
        break;
      }

      case 'wave_goodbye': {
        // Double hand enthusiastic goodbye wave
        p.headRotation = [-0.1, Math.sin(t * 6.0) * 0.2, 0];
        p.leftUpperArmRotation = [-1.6, 0.2, 1.1 + Math.sin(t * 8.0) * 0.6];
        p.rightUpperArmRotation = [-1.6, -0.2, -1.1 - Math.cos(t * 8.0) * 0.6];
        p.leftElbowRotation = [-0.3, Math.sin(t * 8.0) * 0.3, 0];
        p.rightElbowRotation = [-0.3, -Math.cos(t * 8.0) * 0.3, 0];
        p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] + Math.abs(Math.sin(t * 6.0)) * 0.1;
        break;
      }

      case 'thumbs_up': {
        // Extends right arm forward, makes fist gesture with nodding approval
        p.rightUpperArmRotation = [-0.85, -0.1, -0.1];
        p.rightElbowRotation = [-0.8, 0, 0.2];
        p.rightWristRotation = [0.2, 0.4, 0.3];
        p.headRotation = [Math.sin(t * 8.0) * 0.15 + 0.1, 0, 0];
        break;
      }

      case 'clap': {
        // Rhythmic applause in front of chest
        const clapWave = Math.sin(t * 12.0);
        p.upperTorsoRotation = [0.08, 0, 0];
        p.leftUpperArmRotation = [-0.85, 0.85 + clapWave * 0.35, 0.35];
        p.rightUpperArmRotation = [-0.85, -0.85 - clapWave * 0.35, -0.35];
        p.leftElbowRotation = [-0.9, 0, 0];
        p.rightElbowRotation = [-0.9, 0, 0];
        p.headRotation = [0.1 + clapWave * 0.08, 0, 0];
        p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] + Math.abs(Math.sin(t * 6.0)) * 0.06;
        break;
      }

      case 'cross_arms': {
        // Fold arms confidently across chest
        p.upperTorsoRotation = [-0.08, 0, 0];
        p.headRotation = [-0.05, 0.1, 0.05];
        p.leftUpperArmRotation = [-0.5, 0.7, 0.75];
        p.rightUpperArmRotation = [-0.5, -0.7, -0.75];
        p.leftElbowRotation = [-1.4, 0, 0.3];
        p.rightElbowRotation = [-1.4, 0, -0.3];
        break;
      }

      case 'stretch_arms': {
        // Stretches arms wide horizontally and breathes
        const open = Math.min(1.0, t * 1.5);
        p.upperTorsoRotation = [-0.12 * open, 0, 0];
        p.headRotation = [-0.2 * open, 0, 0];
        p.leftUpperArmRotation = [0, 0, 1.45 * open];
        p.rightUpperArmRotation = [0, 0, -1.45 * open];
        p.leftElbowRotation = [0, 0, 0];
        p.rightElbowRotation = [0, 0, 0];
        break;
      }

      case 'raise_left_hand': {
        p.leftUpperArmRotation = [-2.0, 0, 0.8];
        p.headRotation = [-0.1, -0.1, 0];
        break;
      }

      case 'raise_right_hand': {
        p.rightUpperArmRotation = [-2.0, 0, -0.8];
        p.headRotation = [-0.1, 0.1, 0];
        break;
      }

      case 'raise_both_hands': {
        p.leftUpperArmRotation = [-2.1, 0.2, 0.9];
        p.rightUpperArmRotation = [-2.1, -0.2, -0.9];
        p.headRotation = [-0.2, 0, 0];
        p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] + Math.sin(t * 6.0) * 0.06;
        break;
      }

      case 'point_left': {
        p.leftUpperArmRotation = [-0.6, 0.8, 1.2];
        p.leftElbowRotation = [-0.2, 0, 0];
        p.headRotation = [0, 0.6, 0];
        break;
      }

      case 'point_right': {
        p.rightUpperArmRotation = [-0.6, -0.8, -1.2];
        p.rightElbowRotation = [-0.2, 0, 0];
        p.headRotation = [0, -0.6, 0];
        break;
      }

      case 'point_forward': {
        p.rightUpperArmRotation = [-1.4, 0, -0.1];
        p.rightElbowRotation = [-0.15, 0, 0];
        p.headRotation = [0, 0, 0];
        break;
      }

      case 'point_upward': {
        p.leftUpperArmRotation = [-1.9, 0, 0.65];
        p.leftElbowRotation = [-0.1, 0, 0];
        p.headRotation = [-0.4, -0.1, 0];
        break;
      }

      case 'handshake': {
        p.rightUpperArmRotation = [-0.85, -0.1, -0.2];
        p.rightElbowRotation = [-0.75 + Math.sin(t * 8.0) * 0.25, 0, 0];
        p.rightWristRotation = [0, 0.3, 0];
        p.headRotation = [0.1, 0, 0];
        break;
      }

      case 'present_object': {
        p.leftUpperArmRotation = [-0.7, 0.4, 0.5];
        p.rightUpperArmRotation = [-0.7, -0.4, -0.5];
        p.leftElbowRotation = [-0.9, 0, 0.4];
        p.rightElbowRotation = [-0.9, 0, -0.4];
        p.headRotation = [0.15, 0, 0];
        break;
      }

      case 'beckon': {
        p.rightUpperArmRotation = [-0.7, -0.2, -0.3];
        p.rightElbowRotation = [-1.0 + Math.sin(t * 7.0) * 0.4, 0, 0];
        p.headRotation = [0.1, -0.15, 0];
        break;
      }

      // --- BODY ACTIONS ---
      case 'bow': {
        // Japanese formal respectful bow: 35 degrees forward pitch
        const bowPitch = Math.sin(Math.min(Math.PI, t * 1.5)) * 0.6;
        p.lowerTorsoRotation = [bowPitch * 0.5, 0, 0];
        p.upperTorsoRotation = [bowPitch * 0.5, 0, 0];
        p.headRotation = [bowPitch * 0.3, 0, 0];
        p.leftUpperArmRotation = [0.1, 0, 0.15];
        p.rightUpperArmRotation = [0.1, 0, -0.15];
        p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] - bowPitch * 0.08;
        break;
      }

      case 'nod': {
        p.headRotation = [Math.sin(t * 9.0) * 0.28, 0, 0];
        break;
      }

      case 'shake_head': {
        p.headRotation = [0, Math.sin(t * 8.0) * 0.38, Math.sin(t * 8.0) * 0.08];
        break;
      }

      case 'tilt_head': {
        p.neckRotation = [0, 0.1, -0.25];
        p.headRotation = [-0.08, 0.15, -0.2];
        break;
      }

      case 'lean_forward': {
        p.lowerTorsoRotation = [0.25, 0, 0];
        p.upperTorsoRotation = [0.25, 0, 0];
        p.headRotation = [-0.35, 0, 0];
        p.pelvisPosition[2] = 0.25;
        break;
      }

      case 'lean_backward': {
        p.lowerTorsoRotation = [-0.2, 0, 0];
        p.upperTorsoRotation = [-0.2, 0, 0];
        p.headRotation = [0.25, 0, 0];
        p.pelvisPosition[2] = -0.2;
        break;
      }

      case 'turn_torso': {
        p.lowerTorsoRotation = [0, Math.sin(t * 4.0) * 0.6, 0];
        p.upperTorsoRotation = [0, Math.sin(t * 4.0) * 0.6, 0];
        p.headRotation = [0, Math.sin(t * 4.0) * 0.4, 0];
        break;
      }

      case 'crouch': {
        p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] - 0.35;
        p.leftHipRotation = [0.65, 0, 0];
        p.rightHipRotation = [0.65, 0, 0];
        p.leftKneeRotation = [-0.85, 0, 0];
        p.rightKneeRotation = [-0.85, 0, 0];
        p.lowerTorsoRotation = [0.25, 0, 0];
        p.leftUpperArmRotation = [-0.5, 0.2, 0.4];
        p.rightUpperArmRotation = [-0.5, -0.2, -0.4];
        break;
      }

      case 'sit':
      case 'sit_down': {
        p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] - 0.45;
        p.pelvisPosition[2] = -0.15;
        p.leftHipRotation = [1.45, 0, 0.1];
        p.rightHipRotation = [1.45, 0, -0.1];
        p.leftKneeRotation = [-1.48, 0, 0];
        p.rightKneeRotation = [-1.48, 0, 0];
        p.leftAnkleRotation = [0.1, 0, 0];
        p.rightAnkleRotation = [0.1, 0, 0];
        p.leftUpperArmRotation = [-0.65, 0, 0.3];
        p.rightUpperArmRotation = [-0.65, 0, -0.3];
        p.leftElbowRotation = [-0.6, 0, 0];
        p.rightElbowRotation = [-0.6, 0, 0];
        break;
      }

      case 'stand_up': {
        const standProgress = Math.min(1.0, t * 1.5);
        const sitPose = this.evaluateProceduralAction('sit', 0, 0);
        return blendPoses(sitPose, DEFAULT_REST_POSE, standProgress);
      }

      case 'jump': {
        // High spring leap with anticipation, airborne apex, and cushion landing
        const jumpTime = (t * 3.8) % (Math.PI * 2);
        const sinJump = Math.sin(jumpTime);

        if (sinJump >= 0) {
          // In the air!
          p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] + sinJump * 1.25;
          p.leftUpperArmRotation = [-2.1, 0.2, 0.9];
          p.rightUpperArmRotation = [-2.1, -0.2, -0.9];
          p.leftKneeRotation = [-0.65, 0, 0];
          p.rightKneeRotation = [-0.65, 0, 0];
          p.headRotation = [-0.2, 0, 0];
        } else {
          // Cushion squat
          p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] + sinJump * 0.25;
          p.leftKneeRotation = [sinJump * 0.45, 0, 0];
          p.rightKneeRotation = [sinJump * 0.45, 0, 0];
          p.leftUpperArmRotation = [-0.4, 0, 0.4];
          p.rightUpperArmRotation = [-0.4, 0, -0.4];
        }
        break;
      }

      case 'celebrate': {
        p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] + Math.abs(Math.sin(t * 8.0)) * 0.28;
        p.headRotation = [Math.sin(t * 8.0) * 0.15, Math.cos(t * 4.0) * 0.2, 0];
        p.leftUpperArmRotation = [-1.8 + Math.sin(t * 8.0) * 0.4, 0.2, 1.0];
        p.rightUpperArmRotation = [-1.8 + Math.cos(t * 8.0) * 0.4, -0.2, -1.0];
        p.leftElbowRotation = [-0.4, 0, 0.2];
        p.rightElbowRotation = [-0.4, 0, -0.2];
        break;
      }

      case 'dance': {
        // Multi-phase coordinated dance choreo
        p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] + Math.abs(Math.sin(t * 7.5)) * 0.32;
        p.pelvisRotation = [0, Math.sin(t * 4.0) * 1.1, Math.cos(t * 7.5) * 0.12];
        p.lowerTorsoRotation = [0, Math.sin(t * 4.0) * 0.4, 0];
        p.upperTorsoRotation = [0, Math.sin(t * 4.0) * 0.3, 0];
        p.headRotation = [
          Math.sin(t * 7.5) * 0.18,
          Math.cos(t * 4.0) * 0.45,
          Math.sin(t * 5.0) * 0.25,
        ];
        p.leftUpperArmRotation = [-1.3 + Math.sin(t * 7.5) * 0.7, 0.3, 0.9 + Math.cos(t * 6.0) * 0.5];
        p.rightUpperArmRotation = [-1.3 + Math.cos(t * 7.5) * 0.7, -0.3, -0.9 - Math.sin(t * 6.0) * 0.5];
        p.leftElbowRotation = [-0.6 + Math.sin(t * 7.5) * 0.4, 0, 0.2];
        p.rightElbowRotation = [-0.6 + Math.cos(t * 7.5) * 0.4, 0, -0.2];
        break;
      }

      case 'sleep': {
        p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] - 0.08 + Math.sin(t * 1.2) * 0.025;
        p.lowerTorsoRotation = [0.12, 0, 0];
        p.upperTorsoRotation = [0.15, 0, 0];
        p.neckRotation = [0.2, 0, 0.08];
        p.headRotation = [0.28, 0, 0.08];
        p.leftUpperArmRotation = [0.15, 0, 0.15];
        p.rightUpperArmRotation = [0.15, 0, -0.15];
        break;
      }

      case 'wake_up': {
        const wakeT = Math.min(1.0, t * 1.2);
        p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] + Math.sin(t * 8.0) * 0.08 * (1 - wakeT);
        p.headRotation = [-0.2 * (1 - wakeT), Math.sin(t * 10.0) * 0.2 * (1 - wakeT), 0];
        p.leftUpperArmRotation = [-1.8 * wakeT, 0, 0.9 * wakeT];
        p.rightUpperArmRotation = [-1.8 * wakeT, 0, -0.9 * wakeT];
        break;
      }

      // --- EXPRESSIVE ACTIONS ---
      case 'happy': {
        p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] + Math.abs(Math.sin(t * 8.0)) * 0.25;
        p.headRotation = [Math.sin(t * 8.0) * 0.12, 0, 0];
        p.leftUpperArmRotation = [-1.5, 0.2, 1.0];
        p.rightUpperArmRotation = [-1.5, -0.2, -1.0];
        break;
      }

      case 'curious': {
        p.neckRotation = [-0.08, 0.2, -0.18];
        p.headRotation = [-0.1, 0.25, -0.15];
        p.upperTorsoRotation = [0.1, 0.1, 0];
        p.leftUpperArmRotation = [-0.85, 0.35, 0.7];
        p.rightUpperArmRotation = [0.25, 0, -0.3];
        break;
      }

      case 'confused': {
        p.headRotation = [-0.15, 0.25, -0.22];
        p.rightUpperArmRotation = [-1.55, 0.5, -0.35];
        p.rightElbowRotation = [-1.4, 0, 0];
        p.leftUpperArmRotation = [0.3, 0.3, 0.4];
        break;
      }

      case 'surprised': {
        p.pelvisPosition[2] = -0.2;
        p.upperTorsoRotation = [-0.15, 0, 0];
        p.headRotation = [-0.25, 0, 0];
        p.leftUpperArmRotation = [-1.4, 0.3, 0.8];
        p.rightUpperArmRotation = [-1.4, -0.3, -0.8];
        break;
      }

      case 'thinking': {
        p.headRotation = [-0.25, 0.32, 0.15];
        p.rightUpperArmRotation = [-1.1, -0.2, -0.2];
        p.rightElbowRotation = [-1.5, 0, 0];
        p.rightWristRotation = [0.2, 0, 0];
        p.leftUpperArmRotation = [0.3, 0.2, 0.35];
        break;
      }

      case 'sad': {
        p.lowerTorsoRotation = [0.15, 0, 0];
        p.upperTorsoRotation = [0.2, 0, 0];
        p.neckRotation = [0.25, 0, 0];
        p.headRotation = [0.3, 0, 0];
        p.leftShoulderRotation = [0.1, 0, -0.1];
        p.rightShoulderRotation = [0.1, 0, 0.1];
        p.leftUpperArmRotation = [0.1, 0, 0.1];
        p.rightUpperArmRotation = [0.1, 0, -0.1];
        break;
      }

      case 'excited': {
        p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] + Math.abs(Math.sin(t * 9.0)) * 0.32;
        p.headRotation = [Math.sin(t * 9.0) * 0.15, 0, 0];
        p.leftUpperArmRotation = [-1.7, 0.2, 1.1];
        p.rightUpperArmRotation = [-1.7, -0.2, -1.1];
        break;
      }

      case 'shy': {
        p.headRotation = [0.2, 0.25, -0.15];
        p.leftUpperArmRotation = [0.4, -0.4, 0.2];
        p.rightUpperArmRotation = [0.4, 0.4, -0.2];
        p.leftElbowRotation = [-0.8, 0, 0];
        p.rightElbowRotation = [-0.8, 0, 0];
        break;
      }

      case 'laughing': {
        p.upperTorsoRotation = [-0.2 + Math.sin(t * 16.0) * 0.08, 0, 0];
        p.headRotation = [-0.35 + Math.sin(t * 16.0) * 0.08, 0, 0];
        p.leftUpperArmRotation = [-0.9 + Math.sin(t * 16.0) * 0.15, 0.2, 0.6];
        p.rightUpperArmRotation = [-0.9 + Math.sin(t * 16.0) * 0.15, -0.2, -0.6];
        p.pelvisPosition[1] = DEFAULT_REST_POSE.pelvisPosition[1] + Math.abs(Math.sin(t * 8.0)) * 0.1;
        break;
      }

      case 'listening_attentively': {
        p.neckRotation = [-0.06, 0.15, -0.1];
        p.headRotation = [-0.08, 0.18, -0.08];
        p.leftUpperArmRotation = [-0.75, 0.25, 0.65];
        p.rightUpperArmRotation = [0.2, 0, -0.25];
        break;
      }

      default:
        return DEFAULT_REST_POSE;
    }

    return p;
  }
}

export const motorController = new MotorController();
