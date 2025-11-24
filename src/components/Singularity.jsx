import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Singularity() {
    const group = useRef()
    const ring1 = useRef()
    const ring2 = useRef()
    const ring3 = useRef()

    useFrame((state, delta) => {
        if (!group.current) return

        // Rotate rings
        ring1.current.rotation.z += delta * 0.2
        ring1.current.rotation.x += delta * 0.1

        ring2.current.rotation.z -= delta * 0.15
        ring2.current.rotation.y += delta * 0.1

        ring3.current.rotation.x -= delta * 0.1
        ring3.current.rotation.y -= delta * 0.05

        // Pulse effect
        const t = state.clock.elapsedTime
        const scale = 1 + Math.sin(t * 2) * 0.05
        group.current.scale.setScalar(scale)
    })

    return (
        <group ref={group}>
            {/* Core Sphere */}
            <mesh>
                <sphereGeometry args={[1, 64, 64]} />
                <meshStandardMaterial
                    color="#ffffff"
                    emissive="#ffffff"
                    emissiveIntensity={4}
                    toneMapped={false}
                />
            </mesh>

            {/* Inner Glow Halo */}
            <mesh scale={[1.2, 1.2, 1.2]}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshBasicMaterial
                    color="#00f0ff"
                    transparent
                    opacity={0.1}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* Tech Rings - Flattened */}
            <group ref={ring1}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[1.4, 0.02, 16, 100]} />
                    <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={2} toneMapped={false} />
                </mesh>
            </group>

            <group ref={ring2}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[1.8, 0.02, 16, 100]} />
                    <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} toneMapped={false} />
                </mesh>
            </group>

            <group ref={ring3}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[2.2, 0.01, 16, 100]} />
                    <meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={2} toneMapped={false} />
                </mesh>
            </group>
        </group>
    )
}
