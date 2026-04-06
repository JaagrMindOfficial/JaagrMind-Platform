import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

const ParticleWave = ({ isDark }) => {
    const meshRef = useRef();

    // Grid configuration for the wave
    const countX = 80;
    const countZ = 80;
    const spacing = 1.2;

    // Create initial grid positions
    const particles = useMemo(() => {
        const positions = new Float32Array(countX * countZ * 3);
        let i = 0;
        for (let ix = 0; ix < countX; ix++) {
            for (let iz = 0; iz < countZ; iz++) {
                // center the grid around 0,0,0
                positions[i] = ix * spacing - ((countX * spacing) / 2); // x
                positions[i + 1] = 0; // y
                positions[i + 2] = iz * spacing - ((countZ * spacing) / 2); // z
                i += 3;
            }
        }
        return positions;
    }, [countX, countZ, spacing]);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        const positions = meshRef.current.geometry.attributes.position.array;

        let i = 0;
        for (let ix = 0; ix < countX; ix++) {
            for (let iz = 0; iz < countZ; iz++) {
                // Combine sine and cosine waves for an organic, rolling fluid motion
                // Slower phase = calmer background motion (was ~0.5 / 0.3)
                positions[i + 1] =
                    Math.sin((ix * 0.1) + time * 0.14) * 2.2 +
                    Math.sin((iz * 0.1) + time * 0.1) * 2.2;
                
                i += 3;
            }
        }
        meshRef.current.geometry.attributes.position.needsUpdate = true;
        
        meshRef.current.rotation.y = time * 0.012;
        meshRef.current.position.y = -5.5 + Math.sin(time * 0.07) * 0.35;
    });

    // Theme-adaptive colors
    const pointColor = isDark ? '#E9D5FF' : '#312E81';

    return (
        <points ref={meshRef} position={[0, -5.5, 0]} rotation={[0.1, 0, 0]}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particles.length / 3}
                    array={particles}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.18}
                color={pointColor}
                sizeAttenuation={true}
                transparent={true}
                opacity={isDark ? 0.9 : 1.0}
                blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
            />
        </points>
    );
};

const Background3D = () => {
    const { isDark } = useTheme();
    
    // Exactly match the root CSS background variables for seamless fog blending
    const bgColor = isDark ? '#090815' : '#F8FAFC';

    return (
        <div style={{ 
            position: 'fixed', 
            top: 0, left: 0, 
            width: '100%', height: '100%', 
            zIndex: -1, 
            pointerEvents: 'none', 
            background: bgColor, 
            transition: 'background 0.4s ease' 
        }}>
            <Canvas camera={{ position: [0, 5, 18], fov: 60 }}>
                {/* Fog is critical to blend the distant particles into the background smoothly */}
                <fog attach="fog" args={[bgColor, 5, 50]} />
                <PerspectiveCamera makeDefault position={[0, 5, 18]} />
                <ParticleWave isDark={isDark} />
            </Canvas>
        </div>
    );
};

export default Background3D;
