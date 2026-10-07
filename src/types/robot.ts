// Master Robot Kinematics, Motor Actions & Animation Types

export type MotorState =
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'WALKING'
  | 'TURNING'
  | 'GESTURING'
  | 'DANCING'
  | 'SITTING'
  | 'SLEEPING'
  | 'SPEAKING'
  | 'EMOTIONAL'
  | 'TRANSITIONING';

export type AnimationState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'happy'
  | 'confused'
  | 'sad'
  | 'walking'
  | 'dancing'
  | 'waving'
  | 'clapping'
  | 'jumping'
  | 'sitting'
  | 'sleeping'
  | 'gesturing'
  | 'turning'
  | 'bowing'
  | 'celebrating'
  | 'pointing'
  | 'crouching';

export type EmotionState =
  | 'neutral'
  | 'happy'
  | 'curious'
  | 'thinking'
  | 'confused'
  | 'sad'
  | 'excited'
  | 'sleepy'
  | 'love'
  | 'surprised'
  | 'shy'
  | 'laughing';

export type EyeExpression =
  | 'normal'
  | 'blink'
  | 'happy_crescents'
  | 'thinking_dart'
  | 'confused_asym'
  | 'sad_droop'
  | 'closed_sleep'
  | 'wide_excited'
  | 'heart'
  | 'scanning';

// Complete Human-Inspired Motor Action Library Identifiers
export type RobotAction =
  // Basic Locomotion & Navigation
  | 'walk_forward'
  | 'walk_backward'
  | 'walk_left'
  | 'walk_right'
  | 'turn_left'
  | 'turn_right'
  | 'rotate_180'
  | 'rotate_360'
  | 'stop'
  | 'approach_target'
  | 'move_away'
  | 'follow_target'
  | 'look_at_target'
  | 'walk_center'
  | 'reset_position'
  // Hand & Arm Actions
  | 'wave'
  | 'wave_hello'
  | 'wave_goodbye'
  | 'raise_left_hand'
  | 'raise_right_hand'
  | 'raise_both_hands'
  | 'point_left'
  | 'point_right'
  | 'point_forward'
  | 'point_upward'
  | 'thumbs_up'
  | 'clap'
  | 'cross_arms'
  | 'stretch_arms'
  | 'reach_forward'
  | 'reach_upward'
  | 'handshake'
  | 'present_object'
  | 'beckon'
  // Body Actions
  | 'bow'
  | 'nod'
  | 'shake_head'
  | 'tilt_head'
  | 'lean_forward'
  | 'lean_backward'
  | 'turn_torso'
  | 'crouch'
  | 'sit'
  | 'sit_down'
  | 'stand_up'
  | 'jump'
  | 'celebrate'
  | 'dance'
  | 'sleep'
  | 'wake_up'
  // Expressive Actions
  | 'happy'
  | 'curious'
  | 'confused'
  | 'surprised'
  | 'thinking'
  | 'sad'
  | 'excited'
  | 'shy'
  | 'listening_attentively'
  | 'laughing'
  // Legacy aliases
  | 'come_closer'
  | 'step_back'
  | 'turn_around'
  | 'look_at_me';

// Controllable Articulated Joint Identifiers
export type JointId =
  | 'pelvis'
  | 'lower_torso'
  | 'upper_torso'
  | 'neck'
  | 'head'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'left_upper_arm'
  | 'right_upper_arm'
  | 'left_elbow'
  | 'right_elbow'
  | 'left_wrist'
  | 'right_wrist'
  | 'left_hand'
  | 'right_hand'
  | 'left_hip'
  | 'right_hip'
  | 'left_knee'
  | 'right_knee'
  | 'left_ankle'
  | 'right_ankle'
  | 'left_foot'
  | 'right_foot';

// 3D Joint Euler Rotation [pitch(X), yaw(Y), roll(Z)] in radians
export type EulerTuple = [number, number, number];
export type Vector3Tuple = [number, number, number];

// Articulated Joint Pose (full humanoid skeletal posture)
export interface FullBodyPose {
  pelvisPosition: Vector3Tuple;
  pelvisRotation: EulerTuple;
  lowerTorsoRotation: EulerTuple;
  upperTorsoRotation: EulerTuple;
  neckRotation: EulerTuple;
  headRotation: EulerTuple;
  leftShoulderRotation: EulerTuple;
  rightShoulderRotation: EulerTuple;
  leftUpperArmRotation: EulerTuple;
  rightUpperArmRotation: EulerTuple;
  leftElbowRotation: EulerTuple;
  rightElbowRotation: EulerTuple;
  leftWristRotation: EulerTuple;
  rightWristRotation: EulerTuple;
  leftHandRotation: EulerTuple;
  rightHandRotation: EulerTuple;
  leftHipRotation: EulerTuple;
  rightHipRotation: EulerTuple;
  leftKneeRotation: EulerTuple;
  rightKneeRotation: EulerTuple;
  leftAnkleRotation: EulerTuple;
  rightAnkleRotation: EulerTuple;
  leftFootRotation: EulerTuple;
  rightFootRotation: EulerTuple;
}

export type ActionCategory =
  | 'locomotion'
  | 'hand_arm'
  | 'body'
  | 'expressive'
  | 'social';

export type ActionLayer = 'full_body' | 'upper_body' | 'lower_body' | 'head_face';

// Action Registry Definition Schema
export interface ActionDefinition {
  id: RobotAction;
  name: string;
  category: ActionCategory;
  layer: ActionLayer;
  duration: number; // in milliseconds (0 for continuous/infinite)
  isLooping: boolean;
  interruptible: boolean;
  emotion?: EmotionState;
  eyeExpression?: EyeExpression;
  replyDialogue?: string;
  description: string;
}

export interface RobotTransform {
  position: Vector3Tuple;
  targetPosition: Vector3Tuple;
  rotation: Vector3Tuple;
  targetRotation: Vector3Tuple;
  headRotation: Vector3Tuple;
  targetHeadRotation: Vector3Tuple;
}

export interface FloatingEmote {
  id: string;
  type: 'zzz' | 'exclamation' | 'question' | 'music' | 'heart' | 'sparkle' | 'lightbulb';
  position: Vector3Tuple;
  createdAt: number;
}
