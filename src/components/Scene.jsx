import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import Experience from './Experience'

export default function Scene({ scrollProgress, isMobile = false, isDragging = false }) {
    const containerBg = '#050505'
    const canvasBg = '#050505'
    const bloomConfig = { threshold: 0.2, intensity: 1.5, blend: BlendFunction.ADD }
    const offsetX = 0 // Centered on both mobile and desktop

    return (
        <div style={{
            width: '100%',
            height: '100vh',
            position: 'relative',
            transition: 'background-color 0.3s ease',
            backgroundColor: containerBg
        }}>
            <Canvas
                camera={{ position: [20, 8, 15], fov: 45 }}
                dpr={[1, 2]}
                gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}
                style={{
                    width: '100%',
                    height: '100%'
                }}
            >
                <color attach="background" args={[canvasBg]} />
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <Environment preset="city" />

                <Experience scrollProgress={scrollProgress} offsetX={offsetX} isMobile={isMobile} isDragging={isDragging} />

                <EffectComposer disableNormalPass>
                    <Bloom
                        luminanceThreshold={bloomConfig.threshold}
                        mipmapBlur
                        intensity={bloomConfig.intensity}
                        radius={0.6}
                        blendFunction={bloomConfig.blend}
                    />
                </EffectComposer>
            </Canvas>
        </div>
    )
}
