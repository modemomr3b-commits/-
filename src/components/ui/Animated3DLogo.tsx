import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Environment, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';

function Logo3D({ isHovered, scale = 1 }: { isHovered: boolean, scale?: number }) {
  const texture = useTexture('/logo.jpeg.jpeg'); 
  
  const crystalRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!crystalRef.current) return;
    
    const t = state.clock.getElapsedTime();
    
    // Smooth gentle floating up and down
    crystalRef.current.position.y = Math.sin(t * 1.5) * 0.1 * scale;
    
    // Gentle tilt rotation
    crystalRef.current.rotation.x = 0;
    crystalRef.current.rotation.y = Math.sin(t * 1.0) * 0.08;
    
    // Scale on hover
    const targetScale = (isHovered ? 1.06 : 1) * scale;
    crystalRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
  });

  return (
    <group>
      <group ref={crystalRef}>
        <mesh>
          <circleGeometry args={[2.5, 64]} />
          <meshPhysicalMaterial 
            map={texture} 
            transparent={true}
            roughness={0.1}
            metalness={0.3}
            clearcoat={1}
            clearcoatRoughness={0.1}
            envMapIntensity={isHovered ? 2.5 : 1.5}
            depthWrite={false}
          />
        </mesh>
      </group>
      
      <Sparkles 
        count={70} 
        scale={4.5 * scale} 
        size={3} 
        speed={isHovered ? 0.8 : 0.4} 
        opacity={isHovered ? 0.9 : 0.6} 
        color="#fbbf24" 
        position={[0, 0, 0]} 
      />
    </group>
  );
}

class ErrorBoundary extends React.Component<{children: React.ReactNode, fallback: React.ReactNode}, {hasError: boolean}> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

interface Props {
  isHovered?: boolean;
  scale?: number;
}

export default function Animated3DLogo({ isHovered = false, scale = 1 }: Props) {
  if (scale <= 0.5) {
    return (
      <div className="w-full h-full flex items-center justify-center p-0.5 relative group">
        <img 
          src="/logo.jpeg.jpeg" 
          alt="BRQ - شركة الوفاء" 
          className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(251,191,36,0.3)] transition-transform duration-300 group-hover:scale-110" 
        />
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={
      <div className="w-full h-full flex items-center justify-center p-1">
        <img src="/logo.jpeg.jpeg" alt="BRQ" className="max-w-full max-h-full object-contain drop-shadow-xl" />
      </div>
    }>
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.4} />
        <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#60a5fa" />
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <img src="/logo.jpeg.jpeg" alt="BRQ" className="max-w-full max-h-full object-contain" />
          </div>
        }>
          <Environment preset="city" />
          <Logo3D isHovered={isHovered} scale={scale} />
        </Suspense>
      </Canvas>
    </ErrorBoundary>
  );
}
