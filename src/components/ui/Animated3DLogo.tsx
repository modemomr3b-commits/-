import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Environment, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function Logo3D({ isHovered, scale = 1 }: { isHovered: boolean, scale?: number }) {
  const texture = useTexture('/logo.jpeg.jpeg');
  
  const crystalRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Smooth gentle floating of the central logo
    if (crystalRef.current) {
      crystalRef.current.position.y = Math.sin(t * 1.5) * 0.12 * scale;
      crystalRef.current.rotation.y = Math.sin(t * 1.0) * 0.12;
      crystalRef.current.rotation.x = Math.cos(t * 1.2) * 0.06;
      
      const targetScale = (isHovered ? 1.08 : 1) * scale;
      crystalRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
    
    // Rotating outer gold ring 1
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = t * 0.5;
      ring1Ref.current.rotation.y = t * 0.7;
      ring1Ref.current.rotation.z = Math.sin(t * 0.3) * 0.2;
    }
    
    // Counter-rotating inner gold ring 2
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = -t * 0.45;
      ring2Ref.current.rotation.y = -t * 0.65;
      ring2Ref.current.rotation.z = Math.cos(t * 0.4) * 0.25;
    }

    // Tilted orbit ring 3
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z = t * 0.8;
      ring3Ref.current.rotation.x = Math.PI / 3 + Math.sin(t * 0.5) * 0.1;
    }
  });

  return (
    <group>
      {/* Central Floating Logo with Dark-Removal Shader */}
      <group ref={crystalRef}>
        <mesh>
          <planeGeometry args={[3.2, 3.2]} />
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
                  // Mask out black/dark background so only the glowing gold logo renders
                  float luma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
                  diffuseColor.a *= smoothstep(0.02, 0.22, luma);
                #endif
                `
              );
            }}
          />
        </mesh>
      </group>
      
      {/* Golden Orbiting Rings */}
      <mesh ref={ring1Ref} scale={scale}>
        <torusGeometry args={[2.0, 0.04, 16, 100]} />
        <meshStandardMaterial 
          color="#fbbf24" 
          metalness={0.9} 
          roughness={0.15} 
          emissive="#d97706" 
          emissiveIntensity={0.6} 
        />
      </mesh>

      <mesh ref={ring2Ref} scale={scale}>
        <torusGeometry args={[2.3, 0.03, 16, 100]} />
        <meshStandardMaterial 
          color="#fde047" 
          metalness={0.95} 
          roughness={0.1} 
          emissive="#b45309" 
          emissiveIntensity={0.5} 
        />
      </mesh>

      <mesh ref={ring3Ref} scale={scale}>
        <torusGeometry args={[1.7, 0.025, 16, 80]} />
        <meshStandardMaterial 
          color="#f59e0b" 
          metalness={0.85} 
          roughness={0.2} 
          emissive="#78350f" 
          emissiveIntensity={0.4} 
        />
      </mesh>

      {/* Ambient Sparkling Gold Particles */}
      <Sparkles 
        count={85} 
        scale={4.5 * scale} 
        size={3.2} 
        speed={isHovered ? 0.9 : 0.45} 
        opacity={isHovered ? 0.95 : 0.75} 
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
  const fallback2D = (
    <div className="w-full h-full flex items-center justify-center p-0.5 relative group bg-transparent">
      <div className="absolute inset-0 rounded-full border border-amber-400/30 animate-[spin_8s_linear_infinite]" />
      <div className="absolute inset-1.5 rounded-full border border-yellow-300/20 animate-[spin_12s_linear_infinite_reverse]" />
      <img 
        src="/logo.jpeg.jpeg" 
        alt="BRQ - شركة الوفاء" 
        className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(251,191,36,0.5)] transition-transform duration-300 group-hover:scale-110"
        style={{ mixBlendMode: 'screen' }}
      />
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback2D}>
      <Canvas 
        camera={{ position: [0, 0, 6.5], fov: 45 }} 
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.25} penumbra={1} intensity={1.2} />
        <pointLight position={[-10, -10, -10]} intensity={0.6} color="#fbbf24" />
        <Suspense fallback={fallback2D}>
          <Environment preset="city" />
          <Logo3D isHovered={isHovered} scale={scale} />
        </Suspense>
      </Canvas>
    </ErrorBoundary>
  );
}
