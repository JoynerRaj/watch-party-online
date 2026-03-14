import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Float, Environment, Stars, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Cinema Screen ──────────────────────────────────────────────────────── */
function CinemaScreen({ screenStream, isScreenSharing }) {
  const meshRef = useRef();
  const videoRef = useRef(document.createElement('video'));
  const textureRef = useRef(null);

  useEffect(() => {
    if (isScreenSharing && screenStream) {
      videoRef.current.srcObject = screenStream;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
      textureRef.current = new THREE.VideoTexture(videoRef.current);
      textureRef.current.minFilter = THREE.LinearFilter;
      textureRef.current.magFilter = THREE.LinearFilter;
    } else {
      videoRef.current.srcObject = null;
      textureRef.current = null;
    }
  }, [screenStream, isScreenSharing]);

  useFrame(() => {
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  });

  return (
    <group position={[0, 3, -8]}>
      {/* Screen frame */}
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[11.4, 6.6, 0.3]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Screen surface */}
      <mesh ref={meshRef}>
        <planeGeometry args={[11, 6.2]} />
        {isScreenSharing && textureRef.current ? (
          <meshBasicMaterial map={textureRef.current} />
        ) : (
          <meshStandardMaterial
            color="#111128"
            emissive="#1a1a3e"
            emissiveIntensity={0.3}
          />
        )}
      </mesh>

      {/* Screen glow when not sharing */}
      {!isScreenSharing && (
        <Text
          position={[0, 0, 0.1]}
          fontSize={0.5}
          color="#6366f1"
          anchorX="center"
          anchorY="middle"
        >
          🎬 Share Screen to Start
        </Text>
      )}

      {/* Neon border strips */}
      <mesh position={[0, 3.25, 0]}>
        <boxGeometry args={[11.5, 0.05, 0.1]} />
        <meshStandardMaterial emissive="#8b5cf6" emissiveIntensity={2} color="#8b5cf6" />
      </mesh>
      <mesh position={[0, -3.25, 0]}>
        <boxGeometry args={[11.5, 0.05, 0.1]} />
        <meshStandardMaterial emissive="#8b5cf6" emissiveIntensity={2} color="#8b5cf6" />
      </mesh>
      <mesh position={[-5.75, 0, 0]}>
        <boxGeometry args={[0.05, 6.5, 0.1]} />
        <meshStandardMaterial emissive="#ec4899" emissiveIntensity={2} color="#ec4899" />
      </mesh>
      <mesh position={[5.75, 0, 0]}>
        <boxGeometry args={[0.05, 6.5, 0.1]} />
        <meshStandardMaterial emissive="#ec4899" emissiveIntensity={2} color="#ec4899" />
      </mesh>
    </group>
  );
}

/* ─── Cinema Seat ────────────────────────────────────────────────────────── */
function CinemaSeat({ position, user, isSpeaking }) {
  const groupRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    if (glowRef.current && isSpeaking) {
      glowRef.current.intensity = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.5;
    }
  });

  const seatColor = user ? user.avatar_color : '#2a2a4a';

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      {/* Seat back */}
      <mesh position={[0, 0.8, -0.2]}>
        <boxGeometry args={[0.8, 1.2, 0.15]} />
        <meshStandardMaterial
          color={seatColor}
          metalness={0.3}
          roughness={0.6}
        />
      </mesh>

      {/* Seat bottom */}
      <mesh position={[0, 0.2, 0.1]}>
        <boxGeometry args={[0.8, 0.15, 0.6]} />
        <meshStandardMaterial color={seatColor} metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Armrests */}
      <mesh position={[-0.45, 0.5, 0]}>
        <boxGeometry args={[0.1, 0.6, 0.5]} />
        <meshStandardMaterial color="#1a1a3e" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.45, 0.5, 0]}>
        <boxGeometry args={[0.1, 0.6, 0.5]} />
        <meshStandardMaterial color="#1a1a3e" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* User avatar (head) */}
      {user && (
        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
          <mesh position={[0, 1.7, 0]}>
            <sphereGeometry args={[0.3, 32, 32]} />
            <meshStandardMaterial
              color={user.avatar_color}
              emissive={isSpeaking ? '#22c55e' : user.avatar_color}
              emissiveIntensity={isSpeaking ? 0.8 : 0.2}
            />
          </mesh>
          {/* Eyes */}
          <mesh position={[-0.1, 1.75, 0.25]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0.1, 1.75, 0.25]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
          </mesh>
          {/* Username label */}
          <Text
            position={[0, 2.2, 0]}
            fontSize={0.18}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#000000"
          >
            {user.username}
          </Text>
        </Float>
      )}

      {/* Speaking glow */}
      {user && isSpeaking && (
        <pointLight
          ref={glowRef}
          position={[0, 1.7, 0.5]}
          color="#22c55e"
          intensity={1}
          distance={3}
        />
      )}
    </group>
  );
}

/* ─── Floor ──────────────────────────────────────────────────────────────── */
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <MeshReflectorMaterial
        resolution={512}
        blur={[300, 100]}
        mixBlur={0.8}
        mixStrength={0.5}
        color="#0a0a1a"
        metalness={0.6}
        roughness={0.4}
        mirror={0.3}
      />
    </mesh>
  );
}

/* ─── Ceiling ────────────────────────────────────────────────────────────── */
function Ceiling() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 8, 0]}>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#050510" />
    </mesh>
  );
}

/* ─── Walls ──────────────────────────────────────────────────────────────── */
function Walls() {
  return (
    <group>
      {/* Left wall */}
      <mesh position={[-8, 4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[20, 9]} />
        <meshStandardMaterial color="#0d0d20" />
      </mesh>
      {/* Right wall */}
      <mesh position={[8, 4, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[20, 9]} />
        <meshStandardMaterial color="#0d0d20" />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 4, 10]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[16, 9]} />
        <meshStandardMaterial color="#0d0d20" />
      </mesh>
    </group>
  );
}

/* ─── Neon Lights ────────────────────────────────────────────────────────── */
function NeonLights() {
  return (
    <group>
      {/* Purple strip lights on walls */}
      <mesh position={[-7.9, 1, -2]}>
        <boxGeometry args={[0.05, 0.05, 12]} />
        <meshStandardMaterial emissive="#8b5cf6" emissiveIntensity={3} color="#8b5cf6" />
      </mesh>
      <mesh position={[7.9, 1, -2]}>
        <boxGeometry args={[0.05, 0.05, 12]} />
        <meshStandardMaterial emissive="#8b5cf6" emissiveIntensity={3} color="#8b5cf6" />
      </mesh>

      {/* Pink strips on ceiling */}
      <mesh position={[0, 7.95, -2]}>
        <boxGeometry args={[16, 0.05, 0.05]} />
        <meshStandardMaterial emissive="#ec4899" emissiveIntensity={3} color="#ec4899" />
      </mesh>

      {/* Point lights for ambient */}
      <pointLight position={[-6, 2, 0]} color="#8b5cf6" intensity={0.5} distance={12} />
      <pointLight position={[6, 2, 0]} color="#8b5cf6" intensity={0.5} distance={12} />
      <pointLight position={[0, 6, -6]} color="#ec4899" intensity={0.3} distance={10} />
    </group>
  );
}

/* ─── Camera Controller ──────────────────────────────────────────────────── */
function CameraController() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 4, 9);
    camera.lookAt(0, 2, -4);
  }, [camera]);

  return null;
}

/* ─── Floating Particles ─────────────────────────────────────────────────── */
function FloatingParticles() {
  const count = 100;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    return pos;
  }, []);

  const pointsRef = useRef();

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      const arr = pointsRef.current.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] += Math.sin(state.clock.elapsedTime + i) * 0.002;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#8b5cf6" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

/* ─── Main Cinema3D Component ────────────────────────────────────────────── */
export default function Cinema3D({ users, screenStream, isScreenSharing }) {
  const seatPositions = [
    { x: -3,   y: 0, z: 2 },
    { x: -1.5, y: 0, z: 2 },
    { x: 0,    y: 0, z: 2 },
    { x: 1.5,  y: 0, z: 2 },
    { x: 3,    y: 0, z: 2 },
    { x: -2.5, y: 0.3, z: 4 },
    { x: -1,   y: 0.3, z: 4 },
    { x: 1,    y: 0.3, z: 4 },
    { x: 2.5,  y: 0.3, z: 4 },
    { x: -3.5, y: 0.6, z: 6 },
    { x: -2,   y: 0.6, z: 6 },
    { x: 0,    y: 0.6, z: 6 },
    { x: 2,    y: 0.6, z: 6 },
    { x: 3.5,  y: 0.6, z: 6 },
  ];

  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 1.5]}
      style={{ background: '#050510' }}
    >
      <CameraController />

      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[0, 8, -5]} intensity={0.3} color="#ffffff" />

      {/* Stars in the background */}
      <Stars radius={20} depth={50} count={1000} factor={3} saturation={0.5} fade speed={0.5} />

      {/* Cinema environment */}
      <Floor />
      <Ceiling />
      <Walls />
      <NeonLights />
      <FloatingParticles />

      {/* Cinema Screen */}
      <CinemaScreen screenStream={screenStream} isScreenSharing={isScreenSharing} />

      {/* Seats with user avatars */}
      {seatPositions.map((pos, i) => {
        const user = users[i] || null;
        return (
          <CinemaSeat
            key={i}
            position={pos}
            user={user}
            isSpeaking={user?.is_speaking || false}
          />
        );
      })}
    </Canvas>
  );
}
