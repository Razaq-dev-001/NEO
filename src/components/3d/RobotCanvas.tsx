import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { RobotMesh } from './RobotMesh';
import { StudioEnvironment } from './StudioEnvironment';
import { FloatingEmotes3D } from './RobotParticles';
import { useRobotStore } from '../../state/robotStore';
import { useSettingsStore } from '../../state/settingsStore';

const LoadingFallback: React.FC = () => {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshBasicMaterial color="#00f2fe" wireframe />
    </mesh>
  );
};

export const RobotCanvas: React.FC = () => {
  const companionMode = useSettingsStore((s) => s.companionMode);
  const setPointerCoordinates = useRobotStore((s) => s.setPointerCoordinates);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    setPointerCoordinates({ x, y });
  };

  return (
    <div
      className="w-full h-full relative cursor-grab active:cursor-grabbing"
      onPointerMove={handlePointerMove}
    >
      <Canvas
        camera={{
          position: companionMode === 'compact' ? [0, 0.15, 3.2] : [0, 0.22, 3.6],
          fov: companionMode === 'compact' ? 42 : 44,
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        shadows
      >
        <Suspense fallback={<LoadingFallback />}>
          <StudioEnvironment />
          <RobotMesh />
          <FloatingEmotes3D />

          {/* Smooth OrbitControls */}
          <OrbitControls
            enablePan={false}
            enableZoom={companionMode !== 'compact'}
            minDistance={2.0}
            maxDistance={5.0}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.7}
            minAzimuthAngle={-Math.PI / 2.2}
            maxAzimuthAngle={Math.PI / 2.2}
            dampingFactor={0.06}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
