import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { useRobotStore } from '../../state/robotStore';
import { motorController } from '../../services/motor/MotorController';
import { soundFx } from '../../services/audioSynthesizer';

export const RobotMesh: React.FC = () => {
  // Global Store Subscriptions
  const isBlinking = useRobotStore((s) => s.isBlinking);
  const eyeExpression = useRobotStore((s) => s.eyeExpression);
  const triggerAction = useRobotStore((s) => s.triggerAction);

  // 24 Articulated Skeletal Joint Node References
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const pelvisGroupRef = useRef<THREE.Group | null>(null);
  const lowerTorsoGroupRef = useRef<THREE.Group | null>(null);
  const upperTorsoGroupRef = useRef<THREE.Group | null>(null);
  const neckGroupRef = useRef<THREE.Group | null>(null);
  const headGroupRef = useRef<THREE.Group | null>(null);

  // Left Arm Chain References
  const leftShoulderGroupRef = useRef<THREE.Group | null>(null);
  const leftUpperArmGroupRef = useRef<THREE.Group | null>(null);
  const leftElbowGroupRef = useRef<THREE.Group | null>(null);
  const leftWristGroupRef = useRef<THREE.Group | null>(null);
  const leftHandGroupRef = useRef<THREE.Group | null>(null);

  // Right Arm Chain References
  const rightShoulderGroupRef = useRef<THREE.Group | null>(null);
  const rightUpperArmGroupRef = useRef<THREE.Group | null>(null);
  const rightElbowGroupRef = useRef<THREE.Group | null>(null);
  const rightWristGroupRef = useRef<THREE.Group | null>(null);
  const rightHandGroupRef = useRef<THREE.Group | null>(null);

  // Left Leg & Foot References
  const leftHipGroupRef = useRef<THREE.Group | null>(null);
  const leftUpperLegGroupRef = useRef<THREE.Group | null>(null);
  const leftKneeGroupRef = useRef<THREE.Group | null>(null);
  const leftAnkleGroupRef = useRef<THREE.Group | null>(null);
  const leftFootGroupRef = useRef<THREE.Group | null>(null);

  // Right Leg & Foot References
  const rightHipGroupRef = useRef<THREE.Group | null>(null);
  const rightUpperLegGroupRef = useRef<THREE.Group | null>(null);
  const rightKneeGroupRef = useRef<THREE.Group | null>(null);
  const rightAnkleGroupRef = useRef<THREE.Group | null>(null);
  const rightFootGroupRef = useRef<THREE.Group | null>(null);

  // 3D Face Part References
  const leftEyeGroupRef = useRef<THREE.Group | null>(null);
  const rightEyeGroupRef = useRef<THREE.Group | null>(null);
  const mouthRef = useRef<THREE.Mesh | null>(null);

  // Eye blinking animation tracker
  const blinkScaleRef = useRef(1);

  // Automatic random eye blinking
  useEffect(() => {
    let blinkTimer: any;
    const triggerRandomBlink = () => {
      useRobotStore.getState().setBlinking(true);
      setTimeout(() => {
        useRobotStore.getState().setBlinking(false);
      }, 140);

      const nextDelay = 2800 + Math.random() * 4000;
      blinkTimer = setTimeout(triggerRandomBlink, nextDelay);
    };

    blinkTimer = setTimeout(triggerRandomBlink, 3000);
    return () => clearTimeout(blinkTimer);
  }, []);

  // Unreal Engine 5 / Pixar-Grade Physical Materials
  const materials = useMemo(() => {
    // 1. Pristine Glossy White Plastic / Lacquer Chassis
    const whiteChassis = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ffffff'),
      roughness: 0.08,
      metalness: 0.02,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.98,
      ior: 1.52,
      sheen: 0.15,
      sheenColor: new THREE.Color('#ffffff'),
    });

    // 2. High-Polished Chrome / Satin Silver (emblems, ball joints, trims, collar)
    const chromeMetal = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e2e8f0'),
      roughness: 0.14,
      metalness: 0.96,
    });

    // 3. Dark Obsidian Rubber / Soles
    const darkSole = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0f172a'),
      roughness: 0.55,
      metalness: 0.25,
    });

    // 4. Radiant Glowing Neon Cyan (eyes, mouth, shoe LED slots)
    const cyanGlow = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#00f7ff'),
      toneMapped: false,
    });

    // 5. Bright White Core highlight for eyes
    const whiteCore = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffffff'),
      toneMapped: false,
    });

    // 6. Sleek Black Obsidian Glass Screen Face
    const visorGlass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#030712'),
      roughness: 0.04,
      metalness: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      reflectivity: 0.99,
    });

    return { whiteChassis, chromeMetal, darkSole, cyanGlow, whiteCore, visorGlass };
  }, []);

  // Continuous Kinematic Evaluation Frame Loop (60/120 FPS on Apple Silicon M4)
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // Pointer target tracking
    motorController.setTrackingTarget(state.pointer.x, state.pointer.y);

    // Evaluate Kinematic Pose & Locomotion from Master Motor Controller
    const evalResult = motorController.evaluate(time, delta);
    const pose = evalResult.pose;
    const worldPos = evalResult.worldPosition;
    const heading = evalResult.heading;

    // 1. Root Group Translation & Orientation in Scene
    if (rootGroupRef.current) {
      rootGroupRef.current.position.set(worldPos[0], worldPos[1], worldPos[2]);
      rootGroupRef.current.rotation.y = heading;
    }

    // 2. Pelvis Node (Vertical bounce, roll, lateral sway)
    if (pelvisGroupRef.current) {
      pelvisGroupRef.current.position.set(
        pose.pelvisPosition[0],
        pose.pelvisPosition[1],
        pose.pelvisPosition[2]
      );
      pelvisGroupRef.current.rotation.set(
        pose.pelvisRotation[0],
        pose.pelvisRotation[1],
        pose.pelvisRotation[2]
      );
    }

    // 3. Torso & Spine Joints
    if (lowerTorsoGroupRef.current) {
      lowerTorsoGroupRef.current.rotation.set(
        pose.lowerTorsoRotation[0],
        pose.lowerTorsoRotation[1],
        pose.lowerTorsoRotation[2]
      );
    }
    if (upperTorsoGroupRef.current) {
      upperTorsoGroupRef.current.rotation.set(
        pose.upperTorsoRotation[0],
        pose.upperTorsoRotation[1],
        pose.upperTorsoRotation[2]
      );
    }

    // 4. Neck & Head Joints
    if (neckGroupRef.current) {
      neckGroupRef.current.rotation.set(
        pose.neckRotation[0],
        pose.neckRotation[1],
        pose.neckRotation[2]
      );
    }
    if (headGroupRef.current) {
      headGroupRef.current.rotation.set(
        pose.headRotation[0],
        pose.headRotation[1],
        pose.headRotation[2]
      );
    }

    // 5. Left Arm Hierarchy (Shoulder -> Upper Arm -> Elbow -> Wrist -> Hand)
    if (leftShoulderGroupRef.current) {
      leftShoulderGroupRef.current.rotation.set(
        pose.leftShoulderRotation[0],
        pose.leftShoulderRotation[1],
        pose.leftShoulderRotation[2]
      );
    }
    if (leftUpperArmGroupRef.current) {
      leftUpperArmGroupRef.current.rotation.set(
        pose.leftUpperArmRotation[0],
        pose.leftUpperArmRotation[1],
        pose.leftUpperArmRotation[2]
      );
    }
    if (leftElbowGroupRef.current) {
      leftElbowGroupRef.current.rotation.set(
        pose.leftElbowRotation[0],
        pose.leftElbowRotation[1],
        pose.leftElbowRotation[2]
      );
    }
    if (leftWristGroupRef.current) {
      leftWristGroupRef.current.rotation.set(
        pose.leftWristRotation[0],
        pose.leftWristRotation[1],
        pose.leftWristRotation[2]
      );
    }
    if (leftHandGroupRef.current) {
      leftHandGroupRef.current.rotation.set(
        pose.leftHandRotation[0],
        pose.leftHandRotation[1],
        pose.leftHandRotation[2]
      );
    }

    // 6. Right Arm Hierarchy (Shoulder -> Upper Arm -> Elbow -> Wrist -> Hand)
    if (rightShoulderGroupRef.current) {
      rightShoulderGroupRef.current.rotation.set(
        pose.rightShoulderRotation[0],
        pose.rightShoulderRotation[1],
        pose.rightShoulderRotation[2]
      );
    }
    if (rightUpperArmGroupRef.current) {
      rightUpperArmGroupRef.current.rotation.set(
        pose.rightUpperArmRotation[0],
        pose.rightUpperArmRotation[1],
        pose.rightUpperArmRotation[2]
      );
    }
    if (rightElbowGroupRef.current) {
      rightElbowGroupRef.current.rotation.set(
        pose.rightElbowRotation[0],
        pose.rightElbowRotation[1],
        pose.rightElbowRotation[2]
      );
    }
    if (rightWristGroupRef.current) {
      rightWristGroupRef.current.rotation.set(
        pose.rightWristRotation[0],
        pose.rightWristRotation[1],
        pose.rightWristRotation[2]
      );
    }
    if (rightHandGroupRef.current) {
      rightHandGroupRef.current.rotation.set(
        pose.rightHandRotation[0],
        pose.rightHandRotation[1],
        pose.rightHandRotation[2]
      );
    }

    // 7. Left Leg Hierarchy (Hip -> Knee -> Ankle -> Foot)
    if (leftHipGroupRef.current) {
      leftHipGroupRef.current.rotation.set(
        pose.leftHipRotation[0],
        pose.leftHipRotation[1],
        pose.leftHipRotation[2]
      );
    }
    if (leftKneeGroupRef.current) {
      leftKneeGroupRef.current.rotation.set(
        pose.leftKneeRotation[0],
        pose.leftKneeRotation[1],
        pose.leftKneeRotation[2]
      );
    }
    if (leftAnkleGroupRef.current) {
      leftAnkleGroupRef.current.rotation.set(
        pose.leftAnkleRotation[0],
        pose.leftAnkleRotation[1],
        pose.leftAnkleRotation[2]
      );
    }
    if (leftFootGroupRef.current) {
      leftFootGroupRef.current.rotation.set(
        pose.leftFootRotation[0],
        pose.leftFootRotation[1],
        pose.leftFootRotation[2]
      );
    }

    // 8. Right Leg Hierarchy (Hip -> Knee -> Ankle -> Foot)
    if (rightHipGroupRef.current) {
      rightHipGroupRef.current.rotation.set(
        pose.rightHipRotation[0],
        pose.rightHipRotation[1],
        pose.rightHipRotation[2]
      );
    }
    if (rightKneeGroupRef.current) {
      rightKneeGroupRef.current.rotation.set(
        pose.rightKneeRotation[0],
        pose.rightKneeRotation[1],
        pose.rightKneeRotation[2]
      );
    }
    if (rightAnkleGroupRef.current) {
      rightAnkleGroupRef.current.rotation.set(
        pose.rightAnkleRotation[0],
        pose.rightAnkleRotation[1],
        pose.rightAnkleRotation[2]
      );
    }
    if (rightFootGroupRef.current) {
      rightFootGroupRef.current.rotation.set(
        pose.rightFootRotation[0],
        pose.rightFootRotation[1],
        pose.rightFootRotation[2]
      );
    }

    // 9. Face Blinking & Speech Amplitude Animation
    const targetBlink = isBlinking || eyeExpression === 'closed_sleep' ? 0.05 : 1.0;
    blinkScaleRef.current = THREE.MathUtils.lerp(blinkScaleRef.current, targetBlink, 20 * delta);

    if (leftEyeGroupRef.current && rightEyeGroupRef.current) {
      leftEyeGroupRef.current.scale.y = blinkScaleRef.current;
      rightEyeGroupRef.current.scale.y = blinkScaleRef.current;
    }

    if (mouthRef.current) {
      const speechAmp = evalResult.speechAmplitude;
      if (speechAmp > 0.05) {
        const pulse = 1.0 + speechAmp * 1.6;
        mouthRef.current.scale.set(pulse, pulse * 1.8, 1);
      } else {
        mouthRef.current.scale.set(1, 1, 1);
      }
    }
  });

  const handleRobotClick = () => {
    soundFx.playWakeChime();
    triggerAction('wave');
  };

  return (
    <group ref={rootGroupRef} position={[0, 0, 0]} onClick={handleRobotClick}>
      {/* === PELVIS ROOT NODE === */}
      <group ref={pelvisGroupRef} position={[0, -0.15, 0]}>
        
        {/* === LOWER TORSO JOINT === */}
        <group ref={lowerTorsoGroupRef} position={[0, 0.15, 0]}>
          
          {/* === UPPER TORSO JOINT === */}
          <group ref={upperTorsoGroupRef} position={[0, 0.10, 0]}>
            {/* Main Pristine Glossy White Chassis (Pear-Shaped Torso) */}
            <mesh castShadow receiveShadow material={materials.whiteChassis} position={[0, 0.05, 0]}>
              <sphereGeometry args={[0.56, 64, 48]} />
            </mesh>

            {/* Chrome Waist Seam Ring */}
            <mesh position={[0, -0.15, 0]} material={materials.chromeMetal}>
              <cylinderGeometry args={[0.555, 0.555, 0.035, 48]} />
            </mesh>

            {/* Central Circular Metallic Emblem (From Prompt) */}
            <group position={[0, 0.14, 0.51]} rotation={[0.2, 0, 0]}>
              {/* Outer stepped chrome ring */}
              <mesh material={materials.chromeMetal}>
                <cylinderGeometry args={[0.115, 0.115, 0.02, 32]} />
              </mesh>
              {/* Inner chrome torus bezel */}
              <mesh position={[0, 0.015, 0]} material={materials.chromeMetal}>
                <torusGeometry args={[0.082, 0.016, 16, 32]} />
              </mesh>
              {/* Central metallic core button */}
              <mesh position={[0, 0.01, 0]} material={materials.chromeMetal}>
                <cylinderGeometry args={[0.046, 0.046, 0.02, 24]} />
              </mesh>
            </group>

            {/* === NECK SWIVEL COLLAR JOINT === */}
            <group ref={neckGroupRef} position={[0, 0.54, 0]}>
              <mesh material={materials.whiteChassis}>
                <cylinderGeometry args={[0.26, 0.32, 0.06, 32]} />
              </mesh>
              <mesh position={[0, 0.05, 0]} material={materials.chromeMetal}>
                <cylinderGeometry args={[0.16, 0.18, 0.08, 32]} />
              </mesh>

              {/* === LARGE ROUNDED RECTANGULAR HEAD WITH BLACK GLASS SCREEN === */}
              <group ref={headGroupRef} position={[0, 0.40, 0]}>
                {/* Main Pristine White Glossy Head Shell */}
                <RoundedBox
                  args={[1.34, 1.04, 0.90]}
                  radius={0.34}
                  smoothness={10}
                  castShadow
                  receiveShadow
                  material={materials.whiteChassis}
                />

                {/* Top Recessed Metallic Panel Groove */}
                <group position={[0, 0.52, 0]}>
                  <mesh material={materials.chromeMetal}>
                    <boxGeometry args={[0.44, 0.015, 0.32]} />
                  </mesh>
                </group>

                {/* Left Headphone Ear-Cup Pod */}
                <group position={[-0.68, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <mesh material={materials.whiteChassis} castShadow>
                    <cylinderGeometry args={[0.25, 0.25, 0.08, 32]} />
                  </mesh>
                  <mesh position={[0, 0.045, 0]} material={materials.chromeMetal}>
                    <cylinderGeometry args={[0.20, 0.20, 0.03, 32]} />
                  </mesh>
                  <mesh position={[0, 0.065, 0]} material={materials.darkSole}>
                    <cylinderGeometry args={[0.13, 0.13, 0.02, 32]} />
                  </mesh>
                </group>

                {/* Right Headphone Ear-Cup Pod */}
                <group position={[0.68, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                  <mesh material={materials.whiteChassis} castShadow>
                    <cylinderGeometry args={[0.25, 0.25, 0.08, 32]} />
                  </mesh>
                  <mesh position={[0, 0.045, 0]} material={materials.chromeMetal}>
                    <cylinderGeometry args={[0.20, 0.20, 0.03, 32]} />
                  </mesh>
                  <mesh position={[0, 0.065, 0]} material={materials.darkSole}>
                    <cylinderGeometry args={[0.13, 0.13, 0.02, 32]} />
                  </mesh>
                </group>

                {/* Sleek Black Glass Screen Face (From Prompt) */}
                <group position={[0, -0.02, 0.41]}>
                  {/* Outer Bezel Frame */}
                  <mesh material={materials.whiteChassis}>
                    <boxGeometry args={[1.10, 0.84, 0.08]} />
                  </mesh>
                  {/* Sleek Curved Obsidian Glass Screen */}
                  <RoundedBox
                    args={[1.04, 0.78, 0.08]}
                    radius={0.20}
                    smoothness={10}
                    position={[0, 0, 0.03]}
                    material={materials.visorGlass}
                  />

                  {/* === GLOWING NEON CYAN MINIMALIST HAPPY EXPRESSION === */}
                  {/* Left Curved Upward Eye ^ */}
                  <group ref={leftEyeGroupRef} position={[-0.24, 0.07, 0.085]}>
                    <mesh rotation={[0, 0, 0]} material={materials.cyanGlow}>
                      <torusGeometry args={[0.095, 0.024, 16, 32, Math.PI]} />
                    </mesh>
                    <mesh position={[0, 0, 0.005]} material={materials.whiteCore}>
                      <torusGeometry args={[0.095, 0.012, 16, 32, Math.PI]} />
                    </mesh>
                  </group>

                  {/* Right Curved Upward Eye ^ */}
                  <group ref={rightEyeGroupRef} position={[0.24, 0.07, 0.085]}>
                    <mesh rotation={[0, 0, 0]} material={materials.cyanGlow}>
                      <torusGeometry args={[0.095, 0.024, 16, 32, Math.PI]} />
                    </mesh>
                    <mesh position={[0, 0, 0.005]} material={materials.whiteCore}>
                      <torusGeometry args={[0.095, 0.012, 16, 32, Math.PI]} />
                    </mesh>
                  </group>

                  {/* Smiling Neon Cyan Mouth Arc */}
                  <mesh
                    ref={mouthRef}
                    position={[0, -0.07, 0.085]}
                    rotation={[Math.PI, 0, 0]}
                    material={materials.cyanGlow}
                  >
                    <cylinderGeometry args={[0.06, 0.06, 0.015, 32, 1, false, 0, Math.PI]} />
                  </mesh>

                  {/* Ambient Screen Neon Glow */}
                  <pointLight position={[0, 0, 0.15]} color="#00f7ff" intensity={1.2} distance={1.5} />
                </group>
              </group>
            </group>

            {/* === LEFT BALL-JOINTED ARM (POINTING UP IN FRIENDLY HELPFUL POSE) === */}
            <group ref={leftShoulderGroupRef} position={[0.54, 0.18, 0]}>
              {/* Chrome Ball Joint */}
              <mesh material={materials.chromeMetal}>
                <sphereGeometry args={[0.095, 24, 24]} />
              </mesh>
              <mesh position={[0.04, 0.03, 0]} material={materials.whiteChassis} castShadow>
                <sphereGeometry args={[0.11, 24, 24]} />
              </mesh>

              {/* Upper Arm Bone */}
              <group ref={leftUpperArmGroupRef} position={[0.04, 0, 0]}>
                <mesh position={[0.04, -0.14, 0]} material={materials.whiteChassis} castShadow>
                  <capsuleGeometry args={[0.075, 0.14, 16, 16]} />
                </mesh>

                {/* Left Elbow Ball Joint */}
                <group ref={leftElbowGroupRef} position={[0.06, -0.26, 0]}>
                  <mesh rotation={[0, 0, Math.PI / 2]} material={materials.chromeMetal}>
                    <cylinderGeometry args={[0.07, 0.07, 0.09, 20]} />
                  </mesh>

                  {/* Left Wrist & Forearm */}
                  <group ref={leftWristGroupRef} position={[0, -0.14, 0]}>
                    <mesh material={materials.whiteChassis} castShadow>
                      <capsuleGeometry args={[0.075, 0.13, 16, 16]} />
                    </mesh>

                    {/* Articulated Hand Pointing Index Finger Upward */}
                    <group ref={leftHandGroupRef} position={[0, -0.12, 0]}>
                      <mesh material={materials.whiteChassis}>
                        <sphereGeometry args={[0.085, 24, 24]} />
                      </mesh>
                      {/* Pointing Index Finger */}
                      <group position={[0.04, 0.09, 0.02]} rotation={[-0.2, 0, 0.1]}>
                        <mesh material={materials.whiteChassis}>
                          <capsuleGeometry args={[0.028, 0.11, 12, 12]} />
                        </mesh>
                        <mesh position={[0, -0.04, 0]} material={materials.chromeMetal}>
                          <sphereGeometry args={[0.03, 12, 12]} />
                        </mesh>
                      </group>
                      {/* Extended Thumb */}
                      <mesh position={[-0.05, 0.02, 0.04]} rotation={[0.4, -0.5, 0]} material={materials.whiteChassis}>
                        <capsuleGeometry args={[0.026, 0.06, 12, 12]} />
                      </mesh>
                      {/* Curled fingers */}
                      <mesh position={[0.02, -0.04, 0.03]} material={materials.whiteChassis}>
                        <sphereGeometry args={[0.032, 12, 12]} />
                      </mesh>
                      <mesh position={[-0.02, -0.04, 0.03]} material={materials.whiteChassis}>
                        <sphereGeometry args={[0.03, 12, 12]} />
                      </mesh>
                    </group>
                  </group>
                </group>
              </group>
            </group>

            {/* === RIGHT BALL-JOINTED ARM (RESTING NATURALLY AT SIDE) === */}
            <group ref={rightShoulderGroupRef} position={[-0.54, 0.18, 0]}>
              {/* Chrome Ball Joint */}
              <mesh material={materials.chromeMetal}>
                <sphereGeometry args={[0.095, 24, 24]} />
              </mesh>
              <mesh position={[-0.04, 0.03, 0]} material={materials.whiteChassis} castShadow>
                <sphereGeometry args={[0.11, 24, 24]} />
              </mesh>

              {/* Upper Arm Bone */}
              <group ref={rightUpperArmGroupRef} position={[-0.04, 0, 0]}>
                <mesh position={[-0.04, -0.14, 0]} material={materials.whiteChassis} castShadow>
                  <capsuleGeometry args={[0.075, 0.14, 16, 16]} />
                </mesh>

                {/* Right Elbow Ball Joint */}
                <group ref={rightElbowGroupRef} position={[-0.06, -0.26, 0]}>
                  <mesh rotation={[0, 0, Math.PI / 2]} material={materials.chromeMetal}>
                    <cylinderGeometry args={[0.07, 0.07, 0.09, 20]} />
                  </mesh>

                  {/* Right Wrist & Forearm */}
                  <group ref={rightWristGroupRef} position={[0, -0.14, 0]}>
                    <mesh material={materials.whiteChassis} castShadow>
                      <capsuleGeometry args={[0.075, 0.13, 16, 16]} />
                    </mesh>

                    {/* Right Hand */}
                    <group ref={rightHandGroupRef} position={[0, -0.12, 0]}>
                      <mesh material={materials.whiteChassis}>
                        <sphereGeometry args={[0.085, 24, 24]} />
                      </mesh>
                      <mesh position={[0.03, -0.08, 0]} material={materials.whiteChassis}>
                        <capsuleGeometry args={[0.025, 0.06, 12, 12]} />
                      </mesh>
                      <mesh position={[-0.01, -0.09, 0]} material={materials.whiteChassis}>
                        <capsuleGeometry args={[0.025, 0.07, 12, 12]} />
                      </mesh>
                      <mesh position={[-0.05, -0.08, 0]} material={materials.whiteChassis}>
                        <capsuleGeometry args={[0.025, 0.06, 12, 12]} />
                      </mesh>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* === LEFT BALL-JOINTED LEG (WITH GLOWING CYAN ACCENT ON FOOT) === */}
        <group ref={leftHipGroupRef} position={[0.22, -0.18, 0]}>
          {/* Chrome Hip Ball Joint */}
          <mesh material={materials.chromeMetal}>
            <sphereGeometry args={[0.085, 20, 20]} />
          </mesh>

          {/* Upper Leg Bone */}
          <group ref={leftUpperLegGroupRef} position={[0, -0.06, 0]}>
            <mesh material={materials.chromeMetal}>
              <cylinderGeometry args={[0.062, 0.062, 0.16, 24]} />
            </mesh>

            {/* Left Knee Ball Joint */}
            <group ref={leftKneeGroupRef} position={[0, -0.12, 0]}>
              <mesh material={materials.chromeMetal}>
                <sphereGeometry args={[0.078, 20, 20]} />
              </mesh>

              {/* Lower Leg & Ankle */}
              <group ref={leftAnkleGroupRef} position={[0, -0.12, 0]}>
                <mesh material={materials.chromeMetal}>
                  <cylinderGeometry args={[0.058, 0.058, 0.12, 20]} />
                </mesh>

                {/* Chunky Shoe Foot with Glowing Cyan Accent */}
                <group ref={leftFootGroupRef} position={[0, -0.12, 0.04]}>
                  <mesh position={[0, 0.09, -0.04]} material={materials.chromeMetal}>
                    <cylinderGeometry args={[0.09, 0.09, 0.03, 24]} />
                  </mesh>

                  <RoundedBox
                    args={[0.26, 0.16, 0.42]}
                    radius={0.08}
                    smoothness={6}
                    castShadow
                    receiveShadow
                    material={materials.whiteChassis}
                  />

                  <mesh position={[0, -0.085, 0]} material={materials.darkSole}>
                    <boxGeometry args={[0.265, 0.025, 0.425]} />
                  </mesh>

                  {/* Glowing Cyan LED Accent Slot on Toe (From Prompt) */}
                  <mesh position={[0, -0.01, 0.215]} material={materials.cyanGlow}>
                    <boxGeometry args={[0.13, 0.03, 0.02]} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* === RIGHT BALL-JOINTED LEG (WITH GLOWING CYAN ACCENT ON FOOT) === */}
        <group ref={rightHipGroupRef} position={[-0.22, -0.18, 0]}>
          {/* Chrome Hip Ball Joint */}
          <mesh material={materials.chromeMetal}>
            <sphereGeometry args={[0.085, 20, 20]} />
          </mesh>

          {/* Upper Leg Bone */}
          <group ref={rightUpperLegGroupRef} position={[0, -0.06, 0]}>
            <mesh material={materials.chromeMetal}>
              <cylinderGeometry args={[0.062, 0.062, 0.16, 24]} />
            </mesh>

            {/* Right Knee Ball Joint */}
            <group ref={rightKneeGroupRef} position={[0, -0.12, 0]}>
              <mesh material={materials.chromeMetal}>
                <sphereGeometry args={[0.078, 20, 20]} />
              </mesh>

              {/* Lower Leg & Ankle */}
              <group ref={rightAnkleGroupRef} position={[0, -0.12, 0]}>
                <mesh material={materials.chromeMetal}>
                  <cylinderGeometry args={[0.058, 0.058, 0.12, 20]} />
                </mesh>

                {/* Chunky Shoe Foot with Glowing Cyan Accent */}
                <group ref={rightFootGroupRef} position={[0, -0.12, 0.04]}>
                  <mesh position={[0, 0.09, -0.04]} material={materials.chromeMetal}>
                    <cylinderGeometry args={[0.09, 0.09, 0.03, 24]} />
                  </mesh>

                  <RoundedBox
                    args={[0.26, 0.16, 0.42]}
                    radius={0.08}
                    smoothness={6}
                    castShadow
                    receiveShadow
                    material={materials.whiteChassis}
                  />

                  <mesh position={[0, -0.085, 0]} material={materials.darkSole}>
                    <boxGeometry args={[0.265, 0.025, 0.425]} />
                  </mesh>

                  {/* Glowing Cyan LED Accent Slot on Toe (From Prompt) */}
                  <mesh position={[0, -0.01, 0.215]} material={materials.cyanGlow}>
                    <boxGeometry args={[0.13, 0.03, 0.02]} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>

      </group>
    </group>
  );
};
