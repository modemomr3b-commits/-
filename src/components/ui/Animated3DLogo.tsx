import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Environment, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';

function Logo3D({ isHovered, scale = 1 }: { isHovered: boolean, scale?: number }) {
  const texture = useTexture('/logo.jpeg.jpeg');
  
  const crystalRef = useRef<THREE.Group>(null);
  const torusGroupRef = useRef<THREE.Group>(null);
  const textGroupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!crystalRef.current || !torusGroupRef.current || !textGroupRef.current) return;
    
    const t = state.clock.getElapsedTime();
    
    // Float up and down smoothly
    const floatY = Math.sin(t * 1.5) * 0.12 * scale;
    crystalRef.current.position.y = floatY;
    torusGroupRef.current.position.y = floatY;
    
    // Smooth 3D tilt
    crystalRef.current.rotation.x = Math.sin(t * 0.8) * 0.05;
    crystalRef.current.rotation.y = Math.sin(t * 1.0) * 0.08;
    
    torusGroupRef.current.rotation.x = Math.sin(t * 0.8) * 0.05;
    torusGroupRef.current.rotation.y = Math.sin(t * 1.0) * 0.08;
    
    // Gentle rotation of the text orbit ring
    textGroupRef.current.rotation.y = t * 0.45;

    // Hover scale
    const targetScale = (isHovered ? 1.08 : 1) * scale;
    crystalRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    torusGroupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
  });

  return (
    <group>
      {/* Central Diamond/Crystal Logo */}
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
                  // Deeply mask out dark background so only the glowing gold/silver crystal renders seamlessly
                  float luma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
                  diffuseColor.a *= smoothstep(0.015, 0.2, luma);
                #endif
                `
              );
            }}
          />
        </mesh>
      </group>

      {/* Orbiting 3D Ring with Ribbon Text (شركة الوفاء المتميز / ALWAFFA TAMAYEZ) */}
      <group ref={torusGroupRef}>
        <group ref={textGroupRef} position={[0, -0.05, 0.05]} rotation={[-Math.PI / 10, 0, 0]}>
          <Html transform center scale={0.009} style={{ pointerEvents: 'none' }}>
            <div className="relative w-[520px] h-[520px] flex items-center justify-center pointer-events-none select-none">
              <svg 
                viewBox="0 0 500 500" 
                className="w-full h-full animate-[spin_14s_linear_infinite]"
                style={{ overflow: 'visible' }}
              >
                <defs>
                  {/* Subtle golden/white glow filter */}
                  <filter id="glow-text" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {/* 3D Glassy Ring Ribbon Outline */}
                <ellipse 
                  cx="250" 
                  cy="250" 
                  rx="215" 
                  ry="125" 
                  fill="none" 
                  stroke="rgba(251, 191, 36, 0.25)" 
                  strokeWidth="22" 
                  className="backdrop-blur-sm"
                />
                <ellipse 
                  cx="250" 
                  cy="250" 
                  rx="215" 
                  ry="125" 
                  fill="none" 
                  stroke="rgba(255, 255, 255, 0.45)" 
                  strokeWidth="1.5" 
                />

                {/* Text Path following the 3D Elliptical Orbit */}
                <path 
                  id="orbit-path" 
                  d="M 35, 250 a 215,125 0 1,0 430,0 a 215,125 0 1,0 -430,0" 
                  fill="none" 
                />

                {/* Arabic Text (Front/Main) */}
                <text 
                  fill="url(#ringGrad)" 
                  fontSize="33" 
                  fontWeight="900" 
                  filter="url(#glow-text)"
                  letterSpacing="1px"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  <textPath href="#orbit-path" startOffset="75%" textAnchor="middle">
                    شركة الوفاء المتميز
                  </textPath>
                </text>

                {/* English Text (Back/Top) */}
                <text 
                  fill="#ffffff" 
                  fontSize="24" 
                  fontWeight="800" 
                  filter="url(#glow-text)"
                  letterSpacing="5px"
                  opacity="0.9"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  <textPath href="#orbit-path" startOffset="25%" textAnchor="middle">
                    ALWAFFA • TAMAYEZ
                  </textPath>
                </text>
              </svg>
            </div>
          </Html>
        </group>
      </group>

      {/* Floating Gold Sparkle Stars */}
      <Sparkles 
        count={75} 
        scale={4.8 * scale} 
        size={3.2} 
        speed={isHovered ? 0.9 : 0.4} 
        opacity={isHovered ? 0.95 : 0.8} 
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
      <img 
        src="/logo.jpeg.jpeg" 
        alt="BRQ - شركة الوفاء" 
        className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(251,191,36,0.6)] transition-transform duration-300 group-hover:scale-110"
        style={{ mixBlendMode: 'screen' }}
      />
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback2D}>
      <Canvas 
        camera={{ position: [0, 0, 6.2], fov: 45 }} 
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
