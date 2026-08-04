/*
FILE: leeway-agents\src\cortices\retrieval\RetrievalCortex.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: AI.ORCHESTRATION.R_ET_RI_EV_AL_CO_RT_EX.MAIN
REGION: 🧠 AI
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, PerspectiveCamera, OrbitControls, Float, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { ShieldAlert } from 'lucide-react';

// Detects WebGL support
function useWebGLSupport() {
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const support = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      setSupported(support);
    } catch (e) {
      setSupported(false);
    }
  }, []);
  return supported;
}

const DatabaseNode = ({ position, color, label }: { position: [number, number, number], color: string, label: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime + position[0]) * 0.005;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh position={position} ref={meshRef}>
        <icosahedronGeometry args={[0.8, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} wireframe />
      </mesh>
    </Float>
  );
};

const TopologyLines = () => {
  const points = useMemo(() => {
    const p = [];
    for (let i = 0; i < 20; i++) {
      p.push(new THREE.Vector3(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10));
    }
    return p;
  }, []);

  return (
    <group>
      {points.map((p, i) => (
        <line key={i}>
          <bufferGeometry attach="geometry" setFromPoints={[new THREE.Vector3(0, 0, 0), p]} />
          <lineBasicMaterial attach="material" color="#4f46e5" transparent opacity={0.2} />
        </line>
      ))}
    </group>
  );
};

const RetrievalCortex = () => {
  const webglSupported = useWebGLSupport();

  return (
    <div className="w-full h-full bg-[#020617] relative">
      {!webglSupported ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617] p-8 text-center z-20">
          <ShieldAlert className="w-12 h-12 text-blue-500/40 mb-4" />
          <h3 className="text-blue-400 text-xs font-black tracking-[0.4em] uppercase mb-2">Neural_Retrieval_Offline</h3>
          <p className="text-white/40 text-[10px] font-mono leading-relaxed max-w-xs">
            3D Topology visualization requires WebGL hardware acceleration. Please enable it in your browser settings.
          </p>
        </div>
      ) : (
      <Canvas 
        shadows 
        dpr={[1, 2]}
        gl={{ 
          preserveDrawingBuffer: true,
          alpha: true,
          failIfMajorPerformanceCaveat: false
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 10, 25]} fov={50} />
        <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.5} />
        
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#6366f1" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#818cf8" />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <group>
          <DatabaseNode position={[0, 0, 0]} color="#6366f1" label="Neural Core" />
          <DatabaseNode position={[8, 4, -5]} color="#10b981" label="Cold Store" />
          <DatabaseNode position={[-8, -4, 5]} color="#f59e0b" label="Agent Memory" />
          <DatabaseNode position={[5, -6, -8]} color="#3b82f6" label="Task Registry" />
          <DatabaseNode position={[-5, 8, 8]} color="#a855f7" label="Neural Hub" />
          <TopologyLines />
        </group>
      </Canvas>
      )}
      
      <div className="absolute bottom-8 left-8 z-10 pointer-events-none">
        <div className="flex flex-col gap-1">
          <h2 className="text-blue-400 text-xs font-black tracking-[0.4em] uppercase">Neural_Retrieval_Cortex</h2>
          <p className="text-white/20 text-[9px] font-mono uppercase tracking-widest">Sovereign Topology v4.2</p>
        </div>
      </div>
    </div>
  );
};

export default RetrievalCortex;

