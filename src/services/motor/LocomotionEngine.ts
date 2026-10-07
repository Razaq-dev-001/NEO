// Procedural Human Locomotion & Gait Simulation Engine for NEO
import * as THREE from 'three';
import { FullBodyPose, Vector3Tuple } from '../../types/robot';
import { DEFAULT_REST_POSE, clonePose } from './KinematicPose';

export interface LocomotionState {
  isMoving: boolean;
  velocity: Vector3Tuple; // [vx, vy, vz]
  speed: number; // 0 to 1
  targetSpeed: number;
  heading: number; // current yaw angle in radians
  targetHeading: number;
  worldPosition: Vector3Tuple;
  targetPosition: Vector3Tuple;
  gaitPhase: number; // 0 to 2*PI
  strideFrequency: number; // cycles per second (Hz)
  strideLength: number; // max hip angle amplitude
  armSwing: number;
}

export class LocomotionEngine {
  private state: LocomotionState = {
    isMoving: false,
    velocity: [0, 0, 0],
    speed: 0,
    targetSpeed: 0,
    heading: 0,
    targetHeading: 0,
    worldPosition: [0, 0, 0],
    targetPosition: [0, 0, 0],
    gaitPhase: 0,
    strideFrequency: 1.8, // 1.8 Hz human walking cadence
    strideLength: 0.65, // ~37 degrees hip swing
    armSwing: 0.6, // arm counter swing amplitude
  };

  getState(): LocomotionState {
    return this.state;
  }

  setTargetPosition(x: number, z: number, speed = 1.0) {
    this.state.targetPosition = [x, 0, z];
    this.state.targetSpeed = speed;
    this.state.isMoving = true;

    // Calculate heading towards target
    const dx = x - this.state.worldPosition[0];
    const dz = z - this.state.worldPosition[2];
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.05) {
      this.state.targetHeading = Math.atan2(dx, dz);
    }
  }

  setTargetHeading(yaw: number) {
    this.state.targetHeading = yaw;
  }

  stop() {
    this.state.targetSpeed = 0;
    this.state.isMoving = false;
  }

  resetPosition() {
    this.state.worldPosition = [0, 0, 0];
    this.state.targetPosition = [0, 0, 0];
    this.state.heading = 0;
    this.state.targetHeading = 0;
    this.state.speed = 0;
    this.state.targetSpeed = 0;
    this.state.isMoving = false;
    this.state.gaitPhase = 0;
  }

  // Update locomotion simulation per frame
  update(delta: number): { pose: FullBodyPose; worldPosition: Vector3Tuple; heading: number } {
    const s = this.state;
    const clampedDelta = Math.min(delta, 0.1);

    // 1. Heading interpolation (Smooth angular rotation)
    let diffHeading = s.targetHeading - s.heading;
    while (diffHeading < -Math.PI) diffHeading += Math.PI * 2;
    while (diffHeading > Math.PI) diffHeading -= Math.PI * 2;
    s.heading += diffHeading * Math.min(1.0, 5.0 * clampedDelta);

    // 2. Speed acceleration & deceleration (Human momentum)
    const accelRate = s.targetSpeed > s.speed ? 4.5 : 6.0;
    s.speed = THREE.MathUtils.lerp(s.speed, s.targetSpeed, accelRate * clampedDelta);

    // Check if reached target position
    const dx = s.targetPosition[0] - s.worldPosition[0];
    const dz = s.targetPosition[2] - s.worldPosition[2];
    const distToTarget = Math.sqrt(dx * dx + dz * dz);

    if (s.isMoving && distToTarget < 0.08) {
      s.isMoving = false;
      s.targetSpeed = 0;
    }

    // 3. World position translation
    if (s.speed > 0.01) {
      const moveDistance = s.speed * 0.9 * clampedDelta;
      const moveX = Math.sin(s.heading) * moveDistance;
      const moveZ = Math.cos(s.heading) * moveDistance;

      s.worldPosition[0] += moveX;
      s.worldPosition[2] += moveZ;

      // Advance gait phase based on speed
      s.gaitPhase = (s.gaitPhase + s.strideFrequency * Math.PI * 2 * s.speed * clampedDelta) % (Math.PI * 2);
    } else {
      // Settle phase to 0 smoothly when stopping
      s.gaitPhase = THREE.MathUtils.lerp(s.gaitPhase, 0, 5.0 * clampedDelta);
    }

    // 4. Synthesize Procedural Human Gait Pose
    const pose = clonePose(DEFAULT_REST_POSE);
    const phase = s.gaitPhase;
    const weight = Math.min(1.0, s.speed * 1.2);

    if (weight > 0.01) {
      const sinPhase = Math.sin(phase);
      const cosPhase = Math.cos(phase);

      // --- LEGS & HIPS KINEMATICS ---
      // Alternating hip pitch
      const leftHipPitch = sinPhase * s.strideLength * weight;
      const rightHipPitch = -sinPhase * s.strideLength * weight;

      pose.leftHipRotation = [leftHipPitch, 0, 0];
      pose.rightHipRotation = [rightHipPitch, 0, 0];

      // Dynamic Knee Flexion during swing phase (ground clearance)
      // Left leg swings when sinPhase < 0
      const leftKneeFlex = sinPhase < 0 ? Math.abs(sinPhase) * 0.85 * weight : 0.05 * weight;
      // Right leg swings when sinPhase > 0
      const rightKneeFlex = sinPhase > 0 ? Math.abs(sinPhase) * 0.85 * weight : 0.05 * weight;

      pose.leftKneeRotation = [-leftKneeFlex, 0, 0];
      pose.rightKneeRotation = [-rightKneeFlex, 0, 0];

      // Ankle dorsiflexion / plantarflexion for heel-toe roll
      pose.leftAnkleRotation = [-sinPhase * 0.35 * weight, 0, 0];
      pose.rightAnkleRotation = [sinPhase * 0.35 * weight, 0, 0];

      // --- PELVIS BOUNCE & LATERAL WEIGHT SHIFT ---
      // Vertical bounce at double frequency (2 bounces per full stride cycle)
      const verticalBounce = Math.abs(sinPhase) * 0.08 * weight;
      // Lateral sway towards the stance leg
      const lateralSway = cosPhase * 0.035 * weight;
      const pelvisRoll = -cosPhase * 0.045 * weight;

      pose.pelvisPosition = [
        lateralSway,
        DEFAULT_REST_POSE.pelvisPosition[1] + verticalBounce,
        0,
      ];
      pose.pelvisRotation = [0, 0, pelvisRoll];

      // --- TORSO COUNTER-ROTATION & STABILIZATION ---
      // Spine twists opposite to hips to balance angular momentum
      const torsoTwist = -sinPhase * 0.14 * weight;
      const torsoLean = 0.06 * weight; // slight forward lean when moving
      pose.lowerTorsoRotation = [torsoLean * 0.5, torsoTwist * 0.5, -pelvisRoll * 0.7];
      pose.upperTorsoRotation = [torsoLean * 0.5, torsoTwist * 0.5, -pelvisRoll * 0.5];

      // --- HEAD STABILIZATION (Vestibulo-ocular reflex) ---
      // Head stays level and stable while torso and pelvis roll and bounce
      pose.headRotation = [-torsoLean * 0.8, -torsoTwist * 0.8, pelvisRoll * 0.8];

      // --- OPPOSING ARM SWING ---
      // Left arm swings opposite to left leg (swings forward when left leg swings back)
      const leftArmPitch = -sinPhase * s.armSwing * weight;
      const rightArmPitch = sinPhase * s.armSwing * weight;

      // Base arm posture blended with walking swing
      pose.leftUpperArmRotation = [
        DEFAULT_REST_POSE.leftUpperArmRotation[0] * (1 - weight) + leftArmPitch,
        0.1,
        0.25,
      ];
      pose.rightUpperArmRotation = [
        DEFAULT_REST_POSE.rightUpperArmRotation[0] * (1 - weight) + rightArmPitch,
        -0.1,
        -0.25,
      ];

      // Elbows flex naturally during forward swing
      pose.leftElbowRotation = [
        sinPhase < 0 ? -0.45 * Math.abs(sinPhase) * weight : -0.15 * weight,
        0,
        0.1,
      ];
      pose.rightElbowRotation = [
        sinPhase > 0 ? -0.45 * Math.abs(sinPhase) * weight : -0.15 * weight,
        0,
        -0.1,
      ];
    } else {
      pose.pelvisPosition = [
        0,
        DEFAULT_REST_POSE.pelvisPosition[1],
        0,
      ];
    }

    return {
      pose,
      worldPosition: s.worldPosition,
      heading: s.heading,
    };
  }
}

export const locomotionEngine = new LocomotionEngine();
