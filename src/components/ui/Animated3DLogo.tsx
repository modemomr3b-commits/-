import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Environment, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';

function Logo3D({ isHovered, scale = 1 }: { isHovered: boolean, scale?: number }) {
  const texture = useTexture('/logo.jpeg.jpeg'); 
  
  const crystalRef = useRef<THREE.Group>(null);
  const torusGroupRef = useRef<THREE.Group>(null);
  const textGroupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (!crystalRef.current || !torusGroupRef.current || !textGroupRef.current) return;
    
    const t = state.clock.getElapsedTime();
    
    // Float up and down
    crystalRef.current.position.y = Math.sin(t * 1.5) * 0.12 * scale;
    torusGroupRef.current.position.y = crystalRef.current.position.y;
    
    // Rotate left and right
    crystalRef.current.rotation.x = 0;
    crystalRef.current.rotation.y = Math.sin(t * 1.0) * 0.06;
    torusGroupRef.current.rotation.x = 0;
    torusGroupRef.current.rotation.y = crystalRef.current.rotation.y;
    
    // Scale on hover
    const targetScale = (isHovered ? 1.05 : 1) * scale;
    crystalRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    torusGroupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
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
            metalness={0.4}
            clearcoat={1}
            clearcoatRoughness={0.1}
            envMapIntensity={isHovered ? 2.5 : 1.5}
            depthWrite={false}
            onBeforeCompile={(shader) => {
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
                #include <map_fragment>
                #ifdef USE_MAP
                  // Calculate luminance to deeply mask out the dark background
                  float luma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
                  diffuseColor.a *= smoothstep(0.01, 0.15, luma);
                #endif
                `
              );
            }}
          />
        </mesh>
      </group>
      
      {/* Orbiting texts inside the logo boundaries */}
      <group ref={torusGroupRef}>
        <group ref={textGroupRef} position={[0, 0, 0.1]}>
          <Html transform center scale={0.0085}>
            <svg viewBox="0 0 500 500" className="animate-[spin_12s_linear_infinite]" style={{ width: '500px', height: '500px', pointerEvents: 'none', overflow: 'visible' }}>
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <path id="text-path" d="M 50, 250 a 200,200 0 1,1 400,0 a 200,200 0 1,1 -400,0" fill="none" />
              <text fill="#fde047" fontSize="34" fontWeight="bold" filter="url(#glow)" className="font-sans">
                <textPath href="#text-path" startOffset="25%" textAnchor="middle">شركة الوفاء المتميز</textPath>
                <textPath href="#text-path" startOffset="75%" textAnchor="middle" style={{ letterSpacing: '4px' }}>ALWAFAA ALMOTAMAYEZ</textPath>
              </text>
            </svg>
          </Html>
        </group>
      </group>
      
      <Sparkles 
        count={80} 
        scale={4.5 * scale} 
        size={3} 
        speed={isHovered ? 0.8 : 0.4} 
        opacity={isHovered ? 0.9 : 0.6} 
        color="#fde047" 
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
  return (
    <ErrorBoundary fallback={
      <div className="flex flex-col items-center justify-center">
        <img src="/logo.jpeg.jpeg" alt="BRQ" className="w-full h-full object-contain drop-shadow-2xl mb-4" />
        <p className="text-yellow-400 text-xs text-center max-w-[250px] bg-black/50 p-2 rounded">
          يرجى التأكد من رفع الصورة باسم logo.jpeg.jpeg في مجلد public
        </p>
      </div>
    }>
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.4} />
        <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#60a5fa" />
        <Suspense fallback={null}>
          <Environment preset="city" />
          <Logo3D isHovered={isHovered} scale={scale} />
        </Suspense>
      </Canvas>
    </ErrorBoundary>
  );
}
