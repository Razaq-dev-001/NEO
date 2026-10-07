import React from 'react';
import { ContactShadows } from '@react-three/drei';

export const StudioEnvironment: React.FC = () => {
  return (
    <group>
      {/* Ambient Lighting for clean studio illumination */}
      <ambientLight intensity={0.95} />

      {/* Main Key Light (Soft Warm-White Studio Overhead Light matching image) */}
      <directionalLight
        position={[3, 8, 5]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />

      {/* Fill Light (Soft Front-Left Diffuse Light) */}
      <directionalLight position={[-4, 4, 4]} intensity={0.85} color="#f1f5f9" />

      {/* Subtle Cyan Studio Rim Light for edge highlights */}
      <spotLight
        position={[0, 6, -4]}
        intensity={1.5}
        color="#e0f2fe"
        angle={0.7}
        penumbra={0.8}
      />

      {/* Soft Contact Ground Shadow underneath feet (Exact match from Image) */}
      <ContactShadows
        position={[0, -0.92, 0]}
        opacity={0.55}
        scale={7}
        blur={2.0}
        far={3}
        color="#0f172a"
      />

      {/* Clean Studio Shadow Plane */}
      <mesh position={[0, -0.93, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <shadowMaterial transparent opacity={0.3} />
      </mesh>
    </group>
  );
};
