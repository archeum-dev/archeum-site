import { useMemo, useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line } from '@react-three/drei'

// Seeded random number generator for deterministic results
function seededRandom(seed) {
    let state = seed
    return function () {
        state = (state * 9301 + 49297) % 233280
        return state / 233280
    }
}

export default function LayerNodes({
    count = 50,
    radius = 5,
    color = '#ffffff',
    emissiveColor,
    targetColor = null,
    connectInternal = false,
    connectTo = [],
    connectionProgress = 1,
    opacityRef,
    onParticlesGenerated = () => { },
    scale = 0.1,
    seed = 1000 // New prop for deterministic generation
}) {
    const meshRef = useRef()
    const dummy = useMemo(() => new THREE.Object3D(), [])
    const finalEmissive = emissiveColor ?? color

    // Generate positions using Poisson disc sampling for even distribution
    const particles = useMemo(() => {
        const temp = []
        const minDist = radius / Math.sqrt(count) * 1.8 // Minimum distance between points
        const maxAttempts = 30
        const rng = seededRandom(seed)

        // Helper to check if point is valid (within disc and far enough from others)
        const isValid = (x, z, points) => {
            const distFromCenter = Math.sqrt(x * x + z * z)
            // Check if within disc radius and NOT too close to center
            if (distFromCenter > radius || distFromCenter < radius * 0.15) return false

            // Check distance to all existing points
            for (const p of points) {
                const dx = x - p.x
                const dz = z - p.z
                if (Math.sqrt(dx * dx + dz * dz) < minDist) return false
            }
            return true
        }

        // Start with multiple seed points spread around the disc (not in center)
        const numSeeds = 5
        for (let i = 0; i < numSeeds; i++) {
            const angle = (i / numSeeds) * Math.PI * 2
            const r = radius * 0.4 // Start at 40% radius
            const seedPoint = new THREE.Vector3(
                r * Math.cos(angle),
                (rng() - 0.5) * 0.1,
                r * Math.sin(angle)
            )
            temp.push(seedPoint)
        }

        const activeList = [...temp]

        // Poisson disc sampling
        while (activeList.length > 0 && temp.length < count) {
            const randIndex = Math.floor(rng() * activeList.length)
            const point = activeList[randIndex]
            let found = false

            for (let i = 0; i < maxAttempts; i++) {
                // Generate random point around current point
                const angle = rng() * Math.PI * 2
                const dist = minDist * (1 + rng())
                const newX = point.x + Math.cos(angle) * dist
                const newZ = point.z + Math.sin(angle) * dist

                if (isValid(newX, newZ, temp)) {
                    const newPoint = new THREE.Vector3(
                        newX,
                        (rng() - 0.5) * 0.1,
                        newZ
                    )
                    temp.push(newPoint)
                    activeList.push(newPoint)
                    found = true
                    break
                }
            }

            if (!found) {
                activeList.splice(randIndex, 1)
            }
        }

        return temp
    }, [count, radius, seed])

    useLayoutEffect(() => {
        if (onParticlesGenerated) onParticlesGenerated(particles)
    }, [particles, onParticlesGenerated])

    useFrame(() => {
        if (!meshRef.current) return

        // Update positions for actual particles
        particles.forEach((particle, i) => {
            dummy.position.copy(particle)
            dummy.scale.setScalar(0.2 * scale)
            dummy.updateMatrix()
            meshRef.current.setMatrixAt(i, dummy.matrix)
        })

        // Hide any unused instances by scaling them to 0
        for (let i = particles.length; i < count; i++) {
            dummy.position.set(0, 0, 0)
            dummy.scale.setScalar(0) // Scale to 0 to hide
            dummy.updateMatrix()
            meshRef.current.setMatrixAt(i, dummy.matrix)
        }

        meshRef.current.instanceMatrix.needsUpdate = true
    })

    // Generate lines - split into internal and external
    const { internalLines, externalLines } = useMemo(() => {
        const internal = []
        const external = []

        // Internal connections (nearest neighbors)
        if (connectInternal) {
            particles.forEach((p1, i) => {
                let neighbors = []
                particles.forEach((p2, j) => {
                    if (i === j) return
                    const dist = p1.distanceTo(p2)
                    neighbors.push({ idx: j, dist })
                })
                neighbors.sort((a, b) => a.dist - b.dist)
                neighbors.slice(0, 2).forEach(n => {
                    if (i < n.idx) {
                        internal.push([p1, particles[n.idx]])
                    }
                })
            })
        }

        // External connections (to another layer) - one-to-many
        if (connectTo.length > 0) {
            particles.forEach(p1 => {
                // Find multiple nearest neighbors in target layer
                let nearestNodes = []
                connectTo.forEach(p2 => {
                    const dist = p1.distanceTo(p2)
                    nearestNodes.push({ node: p2, dist })
                })

                // Sort by distance and take closest 2-3 nodes
                nearestNodes.sort((a, b) => a.dist - b.dist)
                const connectionsPerNode = Math.min(3, Math.ceil(connectTo.length / particles.length))

                nearestNodes.slice(0, connectionsPerNode).forEach(({ node, dist }) => {
                    if (dist < radius * 3) {
                        external.push([p1, node])
                    }
                })
            })
        }

        return { internalLines: internal, externalLines: external }
    }, [particles, connectTo, connectInternal, radius])

    return (
        <group>
            <instancedMesh ref={meshRef} args={[null, null, count]}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshStandardMaterial
                    color={color}
                    emissive={finalEmissive}
                    emissiveIntensity={0.8}
                    metalness={0}
                    roughness={0.5}
                    transparent
                    opacity={1}
                    toneMapped={false}
                />
            </instancedMesh>

            {/* Render internal lines (solid color) */}
            {internalLines.length > 0 && <LineSegments
                lines={internalLines}
                color={color}
                targetColor={null}
            />}

            {/* Render external lines (gradient) */}
            {externalLines.length > 0 && <LineSegments
                lines={externalLines}
                color={color}
                targetColor={targetColor}
            />}
        </group>
    )
}

function LineSegments({ lines, color, targetColor }) {
    const hasGradient = targetColor !== null

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry()
        const points = []
        const colors = []

        const c1 = new THREE.Color(color)
        const c2 = hasGradient ? new THREE.Color(targetColor) : c1

        lines.forEach(([p1, p2]) => {
            points.push(p1.x, p1.y, p1.z)
            points.push(p2.x, p2.y, p2.z)

            // Only add vertex colors if we have a gradient
            if (hasGradient) {
                colors.push(c1.r, c1.g, c1.b)
                colors.push(c2.r, c2.g, c2.b)
            }
        })

        geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
        if (hasGradient) {
            geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
        }
        return geo
    }, [lines, color, targetColor, hasGradient])

    return (
        <lineSegments geometry={geometry}>
            <lineBasicMaterial
                color={hasGradient ? "#ffffff" : color}
                vertexColors={hasGradient}
                transparent
                opacity={1}
            />
        </lineSegments>
    )
}
