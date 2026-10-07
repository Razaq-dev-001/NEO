import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRobotStore } from '../../state/robotStore';

export const ThrusterParticles: React.FC<{
  position?: [number, number, number];
}> = ({ position = [0, -0.7, 0] }) => {
  const pointsRef = useRef<THREE.Points | null>(null);
  const animationState = useRobotStore((s) => s.animationState);

  const count = 30;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.3;
      pos[i * 3 + 1] = -Math.random() * 0.4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    return pos;
  }, []);

  const velocities = useRef<number[]>([]);
  if (velocities.current.length === 0) {
    for (let i = 0; i < count; i++) {
      velocities.current.push(
        (Math.random() - 0.5) * 0.01,
        -0.015 - Math.random() * 0.02,
        (Math.random() - 0.5) * 0.01
      );
    }
  }

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    const speedMod = animationState === 'jumping' || animationState === 'dancing' ? 2.2 : 1.0;

    for (let i = 0; i < count; i++) {
      arr[i * 3] += velocities.current[i * 3] * speedMod;
      arr[i * 3 + 1] += velocities.current[i * 3 + 1] * speedMod;
      arr[i * 3 + 2] += velocities.current[i * 3 + 2] * speedMod;

      // Reset when particle falls below floor
      if (arr[i * 3 + 1] < -0.8) {
        arr[i * 3] = (Math.random() - 0.5) * 0.25;
        arr[i * 3 + 1] = 0;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 0.25;
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <group position={position}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color="#00f2fe"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Thruster core glow light */}
      <pointLight
        color="#00f2fe"
        intensity={animationState === 'jumping' ? 2.5 : 0.9}
        distance={2.0}
        decay={2}
      />
    </group>
  );
};

export const FloatingEmotes3D: React.FC = () => {
  const emotes = useRobotStore((s) => s.floatingEmotes);

  return (
    <group>
      {emotes.map((emote) => (
        <EmoteSpriteItem key={emote.id} emote={emote} />
      ))}
    </group>
  );
};

// Zero-network-dependency Sprite Billboard for 100% offline instant rendering
const EmoteSpriteItem: React.FC<{ emote: any }> = ({ emote }) => {
  const spriteRef = useRef<THREE.Sprite | null>(null);

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    const getSymbol = () => {
      switch (emote.type) {
        case 'zzz':
          return 'Zzz';
        case 'music':
          return '♪';
        case 'heart':
          return '❤️';
        case 'sparkle':
          return '✨';
        case 'question':
          return '?';
        case 'exclamation':
          return '!';
        default:
          return '✨';
      }
    };

    const getColor = () => {
      switch (emote.type) {
        case 'zzz':
          return '#a855f7';
        case 'music':
          return '#00f2fe';
        case 'heart':
          return '#ff3366';
        case 'sparkle':
          return '#fbbf24';
        default:
          return '#00f2fe';
      }
    };

    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = getColor();
    ctx.shadowColor = getColor();
    ctx.shadowBlur = 12;
    ctx.fillText(getSymbol(), 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [emote.type]);

  useFrame((_, delta) => {
    if (spriteRef.current) {
      spriteRef.current.position.y += delta * 0.5;
      spriteRef.current.scale.multiplyScalar(0.99);
    }
  });

  return (
    <sprite
      ref={spriteRef}
      position={emote.position}
      scale={[0.45, 0.45, 1]}
    >
      <spriteMaterial map={texture} transparent opacity={0.9} depthWrite={false} />
    </sprite>
  );
};
