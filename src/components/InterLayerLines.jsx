import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Generate node positions using same Poisson disc sampling as LayerNodes
// MUST match LayerNodes.jsx implementation exactly
function generateNodePositions(count, radius, seed) {
  const rng = seededRandom(seed)
  const temp = []
  const minDist = radius / Math.sqrt(count) * 1.8

  const isValid = (x, z, points) => {
    const distFromCenter = Math.sqrt(x * x + z * z)
    if (distFromCenter > radius || distFromCenter < radius * 0.15) return false
    for (const p of points) {
      const dx = x - p.x
      const dz = z - p.z
      if (Math.sqrt(dx * dx + dz * dz) < minDist) return false
    }
    return true
  }

  // Seed points
  const numSeeds = 5
  for (let i = 0; i < numSeeds; i++) {
    const angle = (i / numSeeds) * Math.PI * 2
    const r = radius * 0.4
    temp.push({
      x: r * Math.cos(angle),
      y: (rng() - 0.5) * 0.1,  // Add y randomness like LayerNodes
      z: r * Math.sin(angle)
    })
  }

  const activeList = [...temp]

  // Poisson disc sampling
  while (activeList.length > 0 && temp.length < count) {
    const randIndex = Math.floor(rng() * activeList.length)
    const point = activeList[randIndex]
    let found = false

    for (let i = 0; i < 30; i++) {
      const angle = rng() * Math.PI * 2
      const dist = minDist * (1 + rng())
      const newX = point.x + Math.cos(angle) * dist
      const newZ = point.z + Math.sin(angle) * dist

      if (isValid(newX, newZ, temp)) {
        temp.push({
          x: newX,
          y: (rng() - 0.5) * 0.1,  // Add y randomness like LayerNodes
          z: newZ
        })
        activeList.push({ x: newX, z: newZ })
        found = true
        break
      }
    }

    if (!found) {
      activeList.splice(randIndex, 1)
    }
  }

  return temp
}

export default function InterLayerLines({
  startY,
  endY,
  startRadius,
  endRadius,
  growthRef,
  opacityRef,
  startColor = '#ffffff',
  endColor = '#00f0ff',
  count = 40,
  startCount = null,  // Allow specifying different counts for start/end layers
  endCount = null,
  startSeed = 0,
  endSeed = 8000
}) {
  const lineRef = useRef()

  // Generate deterministic node pairs using actual node positions
  const nodePairs = useMemo(() => {
    const pairs = []
    const rng = seededRandom(startY * 1000 + endY)

    // Generate actual node positions for both layers using SAME seeds as LayerNodes
    // Use layer-specific counts if provided, otherwise use count
    const actualStartCount = startCount !== null ? startCount : count
    const actualEndCount = endCount !== null ? endCount : count
    const startNodes = generateNodePositions(actualStartCount, startRadius, startSeed)
    const endNodes = generateNodePositions(actualEndCount, endRadius, endSeed)

    // Randomly select nodes to connect (use fewer lines than total nodes)
    const numLines = count

    // Create arrays of indices and shuffle them
    const startIndices = Array.from({ length: startNodes.length }, (_, i) => i)
    const endIndices = Array.from({ length: endNodes.length }, (_, i) => i)

    // Fisher-Yates shuffle using seeded RNG
    for (let i = startIndices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [startIndices[i], startIndices[j]] = [startIndices[j], startIndices[i]]
    }
    for (let i = endIndices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [endIndices[i], endIndices[j]] = [endIndices[j], endIndices[i]]
    }

    // Connect random pairs
    for (let i = 0; i < Math.min(numLines, startNodes.length, endNodes.length); i++) {
      const startNode = startNodes[startIndices[i]]
      const endNode = endNodes[endIndices[i]]

      // Add random offset for staggered growth - varied timing
      const offset = rng() * 0.6 // Start between 0-60% of the way through the animation

      pairs.push({
        start: [startNode.x, startY + startNode.y, startNode.z],
        end: [endNode.x, endY + endNode.y, endNode.z],
        offset: offset
      })
    }

    return pairs
  }, [startY, endY, startRadius, endRadius, count, startCount, endCount, startSeed, endSeed])

  // Create line geometry
  const geometry = useMemo(() => {
    const positions = []
    const colors = []

    const startColorObj = new THREE.Color(startColor)
    const endColorObj = new THREE.Color(endColor)

    nodePairs.forEach(pair => {
      // Add start point
      positions.push(...pair.start)
      colors.push(startColorObj.r, startColorObj.g, startColorObj.b)

      // Add end point
      positions.push(...pair.end)
      colors.push(endColorObj.r, endColorObj.g, endColorObj.b)
    })

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    return geom
  }, [nodePairs, startColor, endColor])

  // Store original positions for animation
  const originalPositions = useMemo(() => {
    return new Float32Array(geometry.attributes.position.array)
  }, [geometry])

  useFrame(() => {
    if (!lineRef.current) return

    const baseGrowth = growthRef.current
    const opacity = opacityRef.current

    // Update line growth with staggered offsets
    const positions = lineRef.current.geometry.attributes.position.array

    for (let i = 0; i < nodePairs.length; i++) {
      const baseIdx = i * 6 // Each line is 2 vertices * 3 coords
      const pair = nodePairs[i]

      // Calculate individual line growth with offset
      const offsetGrowth = (baseGrowth - pair.offset) / (1 - pair.offset)
      const growth = THREE.MathUtils.clamp(offsetGrowth, 0, 1)

      // Start point stays the same
      positions[baseIdx] = originalPositions[baseIdx]
      positions[baseIdx + 1] = originalPositions[baseIdx + 1]
      positions[baseIdx + 2] = originalPositions[baseIdx + 2]

      // End point lerps from start to final position based on growth
      const startX = originalPositions[baseIdx]
      const startY = originalPositions[baseIdx + 1]
      const startZ = originalPositions[baseIdx + 2]
      const endX = originalPositions[baseIdx + 3]
      const endY = originalPositions[baseIdx + 4]
      const endZ = originalPositions[baseIdx + 5]

      positions[baseIdx + 3] = THREE.MathUtils.lerp(startX, endX, growth)
      positions[baseIdx + 4] = THREE.MathUtils.lerp(startY, endY, growth)
      positions[baseIdx + 5] = THREE.MathUtils.lerp(startZ, endZ, growth)
    }

    lineRef.current.geometry.attributes.position.needsUpdate = true

    // Update opacity
    lineRef.current.material.opacity = opacity
    lineRef.current.visible = opacity > 0.01
  })

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0}
        linewidth={0.5}
      />
    </lineSegments>
  )
}

// Seeded random number generator for deterministic results
function seededRandom(seed) {
  let state = seed
  return function() {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}

