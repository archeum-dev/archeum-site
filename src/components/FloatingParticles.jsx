import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function FloatingParticles({ count = 200 }) {
    const meshRef = useRef()
    const dummy = useMemo(() => new THREE.Object3D(), [])
    const particleColor = '#ffffff'

    const particles = useMemo(() => {
        const temp = []
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 60
            const y = (Math.random() - 0.5) * 40
            const z = (Math.random() - 0.5) * 60
            const speed = Math.random() * 0.3 + 0.1
            temp.push({ position: new THREE.Vector3(x, y, z), speed })
        }
        return temp
    }, [count])

    useFrame((state, delta) => {
        if (!meshRef.current) return

        particles.forEach((particle, i) => {
            // Slow float animation
            particle.position.y += Math.sin(state.clock.elapsedTime * particle.speed + i) * delta * 0.05

            dummy.position.copy(particle.position)
            dummy.scale.setScalar(0.01) // Much smaller
            dummy.updateMatrix()
            meshRef.current.setMatrixAt(i, dummy.matrix)
        })
        meshRef.current.instanceMatrix.needsUpdate = true
    })

    return (
        <instancedMesh ref={meshRef} args={[null, null, count]}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshStandardMaterial
                color={particleColor}
                emissive={particleColor}
                emissiveIntensity={0.3}
                transparent
                opacity={0.2}
            />
        </instancedMesh>
    )
}
