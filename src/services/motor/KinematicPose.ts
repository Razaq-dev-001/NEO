// Kinematic Pose Definitions & Blending Utilities for Articulated Skeletal Rig
import * as THREE from 'three';
import { ActionLayer, EulerTuple, FullBodyPose, Vector3Tuple } from '../../types/robot';

// Reference Iconic Resting Pose (Left arm pointing up, Right arm at side, feet grounded)
export const DEFAULT_REST_POSE: FullBodyPose = {
  pelvisPosition: [0, -0.15, 0],
  pelvisRotation: [0, 0, 0],
  lowerTorsoRotation: [0, 0, 0],
  upperTorsoRotation: [0, 0, 0],
  neckRotation: [0, 0, 0],
  headRotation: [0, 0, 0],
  leftShoulderRotation: [0, 0, 0],
  rightShoulderRotation: [0, 0, 0],
  leftUpperArmRotation: [-0.65, 0.25, 0.65], // Iconic pointing hand raised
  rightUpperArmRotation: [0.15, 0, -0.2], // Resting naturally at side
  leftElbowRotation: [-0.4, 0, 0.15],
  rightElbowRotation: [0.1, 0, -0.05],
  leftWristRotation: [0.1, 0, 0.1],
  rightWristRotation: [0, 0, 0],
  leftHandRotation: [0, 0, 0],
  rightHandRotation: [0, 0, 0],
  leftHipRotation: [0, 0, 0],
  rightHipRotation: [0, 0, 0],
  leftKneeRotation: [0, 0, 0],
  rightKneeRotation: [0, 0, 0],
  leftAnkleRotation: [0, 0, 0],
  rightAnkleRotation: [0, 0, 0],
  leftFootRotation: [0, 0, 0],
  rightFootRotation: [0, 0, 0],
};

export const createZeroPose = (): FullBodyPose => ({
  pelvisPosition: [0, 0, 0],
  pelvisRotation: [0, 0, 0],
  lowerTorsoRotation: [0, 0, 0],
  upperTorsoRotation: [0, 0, 0],
  neckRotation: [0, 0, 0],
  headRotation: [0, 0, 0],
  leftShoulderRotation: [0, 0, 0],
  rightShoulderRotation: [0, 0, 0],
  leftUpperArmRotation: [0, 0, 0],
  rightUpperArmRotation: [0, 0, 0],
  leftElbowRotation: [0, 0, 0],
  rightElbowRotation: [0, 0, 0],
  leftWristRotation: [0, 0, 0],
  rightWristRotation: [0, 0, 0],
  leftHandRotation: [0, 0, 0],
  rightHandRotation: [0, 0, 0],
  leftHipRotation: [0, 0, 0],
  rightHipRotation: [0, 0, 0],
  leftKneeRotation: [0, 0, 0],
  rightKneeRotation: [0, 0, 0],
  leftAnkleRotation: [0, 0, 0],
  rightAnkleRotation: [0, 0, 0],
  leftFootRotation: [0, 0, 0],
  rightFootRotation: [0, 0, 0],
});

export const clonePose = (pose: FullBodyPose): FullBodyPose => ({
  pelvisPosition: [...pose.pelvisPosition],
  pelvisRotation: [...pose.pelvisRotation],
  lowerTorsoRotation: [...pose.lowerTorsoRotation],
  upperTorsoRotation: [...pose.upperTorsoRotation],
  neckRotation: [...pose.neckRotation],
  headRotation: [...pose.headRotation],
  leftShoulderRotation: [...pose.leftShoulderRotation],
  rightShoulderRotation: [...pose.rightShoulderRotation],
  leftUpperArmRotation: [...pose.leftUpperArmRotation],
  rightUpperArmRotation: [...pose.rightUpperArmRotation],
  leftElbowRotation: [...pose.leftElbowRotation],
  rightElbowRotation: [...pose.rightElbowRotation],
  leftWristRotation: [...pose.leftWristRotation],
  rightWristRotation: [...pose.rightWristRotation],
  leftHandRotation: [...pose.leftHandRotation],
  rightHandRotation: [...pose.rightHandRotation],
  leftHipRotation: [...pose.leftHipRotation],
  rightHipRotation: [...pose.rightHipRotation],
  leftKneeRotation: [...pose.leftKneeRotation],
  rightKneeRotation: [...pose.rightKneeRotation],
  leftAnkleRotation: [...pose.leftAnkleRotation],
  rightAnkleRotation: [...pose.rightAnkleRotation],
  leftFootRotation: [...pose.leftFootRotation],
  rightFootRotation: [...pose.rightFootRotation],
});

// Helper for lerping a 3-element vector/euler
export const lerpVector3 = (a: Vector3Tuple, b: Vector3Tuple, t: number): Vector3Tuple => [
  THREE.MathUtils.lerp(a[0], b[0], t),
  THREE.MathUtils.lerp(a[1], b[1], t),
  THREE.MathUtils.lerp(a[2], b[2], t),
];

export const lerpEuler = (a: EulerTuple, b: EulerTuple, t: number): EulerTuple => [
  THREE.MathUtils.lerp(a[0], b[0], t),
  THREE.MathUtils.lerp(a[1], b[1], t),
  THREE.MathUtils.lerp(a[2], b[2], t),
];

// Blend two complete full body poses
export const blendPoses = (a: FullBodyPose, b: FullBodyPose, t: number): FullBodyPose => {
  const clampT = Math.max(0, Math.min(1, t));
  return {
    pelvisPosition: lerpVector3(a.pelvisPosition, b.pelvisPosition, clampT),
    pelvisRotation: lerpEuler(a.pelvisRotation, b.pelvisRotation, clampT),
    lowerTorsoRotation: lerpEuler(a.lowerTorsoRotation, b.lowerTorsoRotation, clampT),
    upperTorsoRotation: lerpEuler(a.upperTorsoRotation, b.upperTorsoRotation, clampT),
    neckRotation: lerpEuler(a.neckRotation, b.neckRotation, clampT),
    headRotation: lerpEuler(a.headRotation, b.headRotation, clampT),
    leftShoulderRotation: lerpEuler(a.leftShoulderRotation, b.leftShoulderRotation, clampT),
    rightShoulderRotation: lerpEuler(a.rightShoulderRotation, b.rightShoulderRotation, clampT),
    leftUpperArmRotation: lerpEuler(a.leftUpperArmRotation, b.leftUpperArmRotation, clampT),
    rightUpperArmRotation: lerpEuler(a.rightUpperArmRotation, b.rightUpperArmRotation, clampT),
    leftElbowRotation: lerpEuler(a.leftElbowRotation, b.leftElbowRotation, clampT),
    rightElbowRotation: lerpEuler(a.rightElbowRotation, b.rightElbowRotation, clampT),
    leftWristRotation: lerpEuler(a.leftWristRotation, b.leftWristRotation, clampT),
    rightWristRotation: lerpEuler(a.rightWristRotation, b.rightWristRotation, clampT),
    leftHandRotation: lerpEuler(a.leftHandRotation, b.leftHandRotation, clampT),
    rightHandRotation: lerpEuler(a.rightHandRotation, b.rightHandRotation, clampT),
    leftHipRotation: lerpEuler(a.leftHipRotation, b.leftHipRotation, clampT),
    rightHipRotation: lerpEuler(a.rightHipRotation, b.rightHipRotation, clampT),
    leftKneeRotation: lerpEuler(a.leftKneeRotation, b.leftKneeRotation, clampT),
    rightKneeRotation: lerpEuler(a.rightKneeRotation, b.rightKneeRotation, clampT),
    leftAnkleRotation: lerpEuler(a.leftAnkleRotation, b.leftAnkleRotation, clampT),
    rightAnkleRotation: lerpEuler(a.rightAnkleRotation, b.rightAnkleRotation, clampT),
    leftFootRotation: lerpEuler(a.leftFootRotation, b.leftFootRotation, clampT),
    rightFootRotation: lerpEuler(a.rightFootRotation, b.rightFootRotation, clampT),
  };
};

// Layered blending: Overlay an upper body or head action over a lower body locomotion base
export const blendLayeredPose = (
  basePose: FullBodyPose,
  overlayPose: FullBodyPose,
  layer: ActionLayer,
  weight: number
): FullBodyPose => {
  if (weight <= 0) return basePose;
  if (weight >= 1 && layer === 'full_body') return overlayPose;

  const result = clonePose(basePose);
  const w = Math.max(0, Math.min(1, weight));

  if (layer === 'full_body') {
    return blendPoses(basePose, overlayPose, w);
  }

  if (layer === 'upper_body' || layer === 'head_face') {
    result.upperTorsoRotation = lerpEuler(basePose.upperTorsoRotation, overlayPose.upperTorsoRotation, w);
    result.neckRotation = lerpEuler(basePose.neckRotation, overlayPose.neckRotation, w);
    result.headRotation = lerpEuler(basePose.headRotation, overlayPose.headRotation, w);
    result.leftShoulderRotation = lerpEuler(basePose.leftShoulderRotation, overlayPose.leftShoulderRotation, w);
    result.rightShoulderRotation = lerpEuler(basePose.rightShoulderRotation, overlayPose.rightShoulderRotation, w);
    result.leftUpperArmRotation = lerpEuler(basePose.leftUpperArmRotation, overlayPose.leftUpperArmRotation, w);
    result.rightUpperArmRotation = lerpEuler(basePose.rightUpperArmRotation, overlayPose.rightUpperArmRotation, w);
    result.leftElbowRotation = lerpEuler(basePose.leftElbowRotation, overlayPose.leftElbowRotation, w);
    result.rightElbowRotation = lerpEuler(basePose.rightElbowRotation, overlayPose.rightElbowRotation, w);
    result.leftWristRotation = lerpEuler(basePose.leftWristRotation, overlayPose.leftWristRotation, w);
    result.rightWristRotation = lerpEuler(basePose.rightWristRotation, overlayPose.rightWristRotation, w);
    result.leftHandRotation = lerpEuler(basePose.leftHandRotation, overlayPose.leftHandRotation, w);
    result.rightHandRotation = lerpEuler(basePose.rightHandRotation, overlayPose.rightHandRotation, w);
  }

  if (layer === 'head_face') {
    result.neckRotation = lerpEuler(basePose.neckRotation, overlayPose.neckRotation, w);
    result.headRotation = lerpEuler(basePose.headRotation, overlayPose.headRotation, w);
  }

  if (layer === 'lower_body') {
    result.pelvisPosition = lerpVector3(basePose.pelvisPosition, overlayPose.pelvisPosition, w);
    result.pelvisRotation = lerpEuler(basePose.pelvisRotation, overlayPose.pelvisRotation, w);
    result.leftHipRotation = lerpEuler(basePose.leftHipRotation, overlayPose.leftHipRotation, w);
    result.rightHipRotation = lerpEuler(basePose.rightHipRotation, overlayPose.rightHipRotation, w);
    result.leftKneeRotation = lerpEuler(basePose.leftKneeRotation, overlayPose.leftKneeRotation, w);
    result.rightKneeRotation = lerpEuler(basePose.rightKneeRotation, overlayPose.rightKneeRotation, w);
    result.leftAnkleRotation = lerpEuler(basePose.leftAnkleRotation, overlayPose.leftAnkleRotation, w);
    result.rightAnkleRotation = lerpEuler(basePose.rightAnkleRotation, overlayPose.rightAnkleRotation, w);
    result.leftFootRotation = lerpEuler(basePose.leftFootRotation, overlayPose.leftFootRotation, w);
    result.rightFootRotation = lerpEuler(basePose.rightFootRotation, overlayPose.rightFootRotation, w);
  }

  return result;
};
