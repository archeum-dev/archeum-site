import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import LayerNodes from './LayerNodes'
import FloatingParticles from './FloatingParticles'
import InterLayerLines from './InterLayerLines'

export default function Experience({ scrollProgress = 0, offsetX = 0, isMobile = false, isDragging = false }) {
  const groupRef = useRef()

  const layer1Opacity = useRef(0)
  const layer2Opacity = useRef(0)
  const layer3Opacity = useRef(0)

  // Line animation refs
  const foundationToNetworkGrowth = useRef(0)
  const networkToEcosystemGrowth = useRef(0)
  const ecosystemUpwardGrowth = useRef(0)
  const foundationToNetworkOpacity = useRef(0)
  const networkToEcosystemOpacity = useRef(0)
  const ecosystemUpwardOpacity = useRef(0)

  // Camera position refs for smooth transitions
  const currentCameraPos = useRef({ x: 0, y: 50, z: 0 })
  const currentLookAt = useRef({ x: 0, y: 0, z: 0 })

  useFrame((state, delta) => {
    const offset = scrollProgress

    // Scroll structure with 7 primary phases:
    // Phase 1: Intro + Zoom Start (0-0.18) - Start zooming immediately on scroll
    // Phase 2: Foundation + Line Growth (0.18-0.35) - STATIC - lines grow to network
    // Phase 3: Move to Network (0.35-0.38) - Camera transition
    // Phase 4: Network + Line Growth (0.38-0.58) - STATIC - lines grow to ecosystem
    // Phase 5: Move to Ecosystem (0.58-0.61) - Camera transition
    // Phase 6: Ecosystem + Upward Lines (0.61-0.78) - STATIC - lines grow upward
    // Phase 7: Blackout (0.78-0.88) - Line comes at camera, screen fades to black
    // Phase 8: Final Landing (0.88-1.0) - Black background with final content

    let zPos, yPos, lookAtY

    // Camera positioning (lookAt lower on mobile to center layers higher in viewport)
    const lookAtOffset = isMobile ? -4 : 0
    const foundationCam = { z: 12, y: 6.5, lookAt: 1.2 + lookAtOffset }
    const networkCam = { z: 12, y: 14.5, lookAt: 9.5 + lookAtOffset }
    const ecosystemCam = { z: 12, y: 20.5, lookAt: 17.5 + lookAtOffset }

    if (offset < 0.18) {
      // Phase 1: Drop straight down center, then arc out to side view
      const t = Math.min(offset / 0.18, 1) // Normalize to 0-1

      if (t < 0.5) {
        // First half: Drop straight down the center (minimal offset to avoid singularity)
        const dropT = t / 0.5 // 0 to 1 for drop phase
        // Keep camera nearly centered during drop
        // Note: x position set below in separate block
        yPos = THREE.MathUtils.lerp(50, 20, dropT)
        lookAtY = THREE.MathUtils.lerp(0, 8 + lookAtOffset, dropT)
      } else {
        // Second half: Arc out to side with smooth acceleration
        const arcT = (t - 0.5) / 0.5 // 0 to 1 for arc phase
        // Apply smoothstep for smooth acceleration/deceleration
        const easedT = arcT * arcT * (3 - 2 * arcT)

        // Note: x and z positions set below in separate block using circular arc
        yPos = THREE.MathUtils.lerp(20, foundationCam.y, easedT)
        lookAtY = THREE.MathUtils.lerp(8 + lookAtOffset, foundationCam.lookAt, easedT)
      }
    } else if (offset < 0.35) {
      // Phase 3: Foundation - STATIC (camera locked, lines growing)
      zPos = foundationCam.z
      yPos = foundationCam.y
      lookAtY = foundationCam.lookAt
    } else if (offset < 0.38) {
      // Phase 4: Transition - Move UP to Network
      const t = (offset - 0.35) / 0.03
      zPos = foundationCam.z
      yPos = THREE.MathUtils.lerp(foundationCam.y, networkCam.y, t)
      lookAtY = THREE.MathUtils.lerp(foundationCam.lookAt, networkCam.lookAt, t)
    } else if (offset < 0.58) {
      // Phase 5: Network - STATIC (camera locked, lines growing)
      zPos = networkCam.z
      yPos = networkCam.y
      lookAtY = networkCam.lookAt
    } else if (offset < 0.61) {
      // Phase 6: Transition - Move UP to Ecosystem
      const t = (offset - 0.58) / 0.03
      zPos = ecosystemCam.z
      yPos = THREE.MathUtils.lerp(networkCam.y, ecosystemCam.y, t)
      lookAtY = THREE.MathUtils.lerp(networkCam.lookAt, ecosystemCam.lookAt, t)
    } else {
      // Phase 7+: Ecosystem - remain locked
      zPos = ecosystemCam.z
      yPos = ecosystemCam.y
      lookAtY = ecosystemCam.lookAt
    }

    // Smoothly lerp camera position and lookAt for smooth transitions
    const lerpFactor = Math.min(delta * 4, 1) // Slower transitions for smoother animations

    // X and Z position during intro phase (circular arc animation)
    const targetX = isMobile ? 24 : 16
    let xPos = targetX
    if (offset < 0.18) {
      const t = Math.min(offset / 0.18, 1)
      const lim = 0.5
      if (t < lim) {
        // First half: Stay centered during vertical drop (minimal offset to avoid singularity)
        xPos = 0.5
        zPos = 1
      }
      else {
        // Second half: Rotate camera in circular arc around the structure
        const arcT = (t - lim) / (1 - lim)
        const easedT = arcT * arcT * (3 - 2 * arcT) // smoothstep

        // Calculate circular path in xz plane
        const startRadius = Math.sqrt(0.5 * 0.5 + 1 * 1) // radius at drop position
        const endRadius = Math.sqrt(targetX * targetX + foundationCam.z * foundationCam.z)
        const radius = THREE.MathUtils.lerp(startRadius, endRadius, easedT)

        // Calculate angles to ensure we end at foundation camera position
        const startAngle = Math.atan2(1, 0.5) // angle of start position
        const endAngle = Math.atan2(foundationCam.z, targetX) // angle of foundation camera
        const angle = THREE.MathUtils.lerp(startAngle, endAngle, easedT)

        xPos = Math.cos(angle) * radius
        zPos = Math.sin(angle) * radius
      }
    }

    const targetPos = { x: xPos, y: yPos, z: zPos }
    const targetLookAt = { x: 0, y: lookAtY, z: 0 }

    currentCameraPos.current.x = THREE.MathUtils.lerp(currentCameraPos.current.x, targetPos.x, lerpFactor)
    currentCameraPos.current.y = THREE.MathUtils.lerp(currentCameraPos.current.y, targetPos.y, lerpFactor)
    currentCameraPos.current.z = THREE.MathUtils.lerp(currentCameraPos.current.z, targetPos.z, lerpFactor)

    currentLookAt.current.x = THREE.MathUtils.lerp(currentLookAt.current.x, targetLookAt.x, lerpFactor)
    currentLookAt.current.y = THREE.MathUtils.lerp(currentLookAt.current.y, targetLookAt.y, lerpFactor)
    currentLookAt.current.z = THREE.MathUtils.lerp(currentLookAt.current.z, targetLookAt.z, lerpFactor)

    state.camera.position.set(currentCameraPos.current.x, currentCameraPos.current.y, currentCameraPos.current.z)
    state.camera.lookAt(currentLookAt.current.x, currentLookAt.current.y, currentLookAt.current.z)

    // Layer Opacity Management

    // Foundation Layer (White, Y=0) - Always visible
    layer1Opacity.current = 1

    // Network Layer (Blue, Y=8) - visible in intro, fade out as approaching foundation, fade in before network
    let l2Opacity
    if (offset < 0.14) {
      l2Opacity = 1 // Visible during intro
    } else if (offset < 0.18) {
      // Fade out as camera approaches foundation layer
      const fadeProgress = (offset - 0.14) / (0.18 - 0.14)
      l2Opacity = 1 - fadeProgress
    } else if (offset < 0.30) {
      l2Opacity = 0 // Hidden during foundation section (layer is above focus)
    } else if (offset < 0.38) {
      // Fade in BEFORE transition completes (finishes as it comes into view)
      l2Opacity = (offset - 0.30) / 0.08
    } else {
      l2Opacity = 1 // Visible from network onward
    }
    layer2Opacity.current = l2Opacity

    // Apps Layer (Orange, Y=16) - visible in intro, fade out as approaching foundation, fade in before ecosystem
    let l3Opacity
    if (offset < 0.14) {
      l3Opacity = 1 // Visible during intro
    } else if (offset < 0.18) {
      // Fade out as camera approaches foundation layer
      const fadeProgress = (offset - 0.14) / (0.18 - 0.14)
      l3Opacity = 1 - fadeProgress
    } else if (offset < 0.53) {
      l3Opacity = 0 // Hidden during foundation and network sections (layer is above focus)
    } else if (offset < 0.61) {
      // Fade in BEFORE transition completes (finishes as it comes into view)
      l3Opacity = (offset - 0.53) / 0.08
    } else if (offset < 0.85) {
      l3Opacity = 1 // Visible during ecosystem
    } else {
      // Fade out during blackout
      const fadeProgress = (offset - 0.85) / 0.03
      l3Opacity = 1 - fadeProgress
    }
    layer3Opacity.current = l3Opacity

    // Line Growth and Opacity - fade to lower opacity as camera moves up

    const FADED_OPACITY = 0.1 // Keep lines visible but faded

    // Foundation to Network lines
    const LAYER_PAUSE = 0.03 // Pause before lines extend
    if (offset < 0.18) {
      // Not started yet (waiting for zoom to complete)
      foundationToNetworkGrowth.current = 0
      foundationToNetworkOpacity.current = 0
    } else if (offset < 0.18 + LAYER_PAUSE) {
      // Pause phase - camera arrived but lines haven't started
      foundationToNetworkGrowth.current = 0
      foundationToNetworkOpacity.current = 0
    } else if (offset < 0.35) {
      // Phase 2: Lines growing from foundation to network
      const growthProgress = (offset - 0.18 - LAYER_PAUSE) / (0.17 - LAYER_PAUSE)
      foundationToNetworkGrowth.current = growthProgress
      foundationToNetworkOpacity.current = Math.min(1, growthProgress * 2) // Fade in faster
    } else if (offset < 0.38) {
      // Fade down during camera transition
      const fadeProgress = (offset - 0.35) / 0.03
      foundationToNetworkGrowth.current = 1
      foundationToNetworkOpacity.current = THREE.MathUtils.lerp(1, FADED_OPACITY, fadeProgress)
    } else {
      // Stay faded but visible
      foundationToNetworkGrowth.current = 1
      foundationToNetworkOpacity.current = FADED_OPACITY
    }

    // Network to Ecosystem lines
    if (offset < 0.38) {
      // Not started yet
      networkToEcosystemGrowth.current = 0
      networkToEcosystemOpacity.current = 0
    } else if (offset < 0.38 + LAYER_PAUSE) {
      // Pause phase - camera arrived but lines haven't started
      networkToEcosystemGrowth.current = 0
      networkToEcosystemOpacity.current = 0
    } else if (offset < 0.58) {
      // Phase 5: Lines growing from network to ecosystem
      const growthProgress = (offset - 0.38 - LAYER_PAUSE) / (0.20 - LAYER_PAUSE)
      networkToEcosystemGrowth.current = growthProgress
      networkToEcosystemOpacity.current = Math.min(1, growthProgress * 2) // Fade in faster
    } else if (offset < 0.61) {
      // Fade down during camera transition
      const fadeProgress = (offset - 0.58) / 0.03
      networkToEcosystemGrowth.current = 1
      networkToEcosystemOpacity.current = THREE.MathUtils.lerp(1, FADED_OPACITY, fadeProgress)
    } else {
      // Stay faded but visible
      networkToEcosystemGrowth.current = 1
      networkToEcosystemOpacity.current = FADED_OPACITY
    }

    // Ecosystem Upward lines
    if (offset < 0.61) {
      // Not started yet
      ecosystemUpwardGrowth.current = 0
      ecosystemUpwardOpacity.current = 0
    } else if (offset < 0.61 + LAYER_PAUSE) {
      // Pause phase - camera arrived but lines haven't started
      ecosystemUpwardGrowth.current = 0
      ecosystemUpwardOpacity.current = 0
    } else if (offset < 0.78) {
      // Phase 7: Lines growing upward from ecosystem
      const growthProgress = (offset - 0.61 - LAYER_PAUSE) / (0.17 - LAYER_PAUSE)
      ecosystemUpwardGrowth.current = growthProgress
      ecosystemUpwardOpacity.current = Math.min(1, growthProgress * 2)
    } else {
      ecosystemUpwardGrowth.current = 1
      ecosystemUpwardOpacity.current = 1
    }

    // Slow rotation
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02
    }
  })

  // Theme-based colors
  const foundationColor = '#ffffff'
  const networkColor = '#00f0ff'
  const ecosystemColor = '#ff8800'
  const upwardLineEndColor = '#ffffff'
  const foundationEmissive = foundationColor
  const networkEmissive = networkColor
  const ecosystemEmissive = ecosystemColor
  const foundationScale = 0.1
  const networkScale = 0.1
  const ecosystemScale = 0.1

  // Layer node counts
  const foundationNodeCount = 60
  const networkNodeCount = 120
  const ecosystemNodeCount = 200

  // Line percentage (25% of start layer nodes)
  const LINE_PERCENTAGE = 0.25
  const foundationToNetworkLineCount = Math.round(foundationNodeCount * LINE_PERCENTAGE)
  const networkToEcosystemLineCount = Math.round(networkNodeCount * LINE_PERCENTAGE)
  const ecosystemUpwardLineCount = Math.round(ecosystemNodeCount * LINE_PERCENTAGE)

  return (
    <>
      <FloatingParticles count={200} />

      <group ref={groupRef} position={[offsetX, 0, 0]}>
        {/* Foundation Layer - White in dark mode, Black in light mode */}
        <group position={[0, 0, 0]}>
          <LayerNodesWrapper
            key="foundation"
            count={foundationNodeCount}
            radius={3.5}
            color={foundationColor}
            emissiveColor={foundationEmissive}
            scale={foundationScale}
            connectInternal={false}
            opacityRef={layer1Opacity}
            seed={0}
          />
        </group>

        {/* Network Layer - Blue */}
        <group position={[0, 8, 0]}>
          <LayerNodesWrapper
            key="network"
            count={networkNodeCount}
            radius={6}
            color={networkColor}
            emissiveColor={networkEmissive}
            scale={networkScale}
            connectInternal={false}
            opacityRef={layer2Opacity}
            seed={8000}
          />
        </group>

        {/* Apps Layer - Orange */}
        <group position={[0, 16, 0]}>
          <LayerNodesWrapper
            key="ecosystem"
            count={ecosystemNodeCount}
            radius={9}
            color={ecosystemColor}
            emissiveColor={ecosystemEmissive}
            scale={ecosystemScale}
            connectInternal={false}
            opacityRef={layer3Opacity}
            seed={16000}
          />
        </group>

        {/* Inter-layer connection lines */}
        <InterLayerLines
          key="foundation-network"
          startY={0}
          endY={8}
          startRadius={3.5}
          endRadius={6}
          startSeed={0}
          endSeed={8000}
          startCount={foundationNodeCount}
          endCount={networkNodeCount}
          growthRef={foundationToNetworkGrowth}
          opacityRef={foundationToNetworkOpacity}
          startColor={foundationColor}
          endColor={networkColor}
          count={foundationToNetworkLineCount}
        />

        <InterLayerLines
          key="network-ecosystem"
          startY={8}
          endY={16}
          startRadius={6}
          endRadius={9}
          startSeed={8000}
          endSeed={16000}
          startCount={networkNodeCount}
          endCount={ecosystemNodeCount}
          growthRef={networkToEcosystemGrowth}
          opacityRef={networkToEcosystemOpacity}
          startColor={networkColor}
          endColor={ecosystemColor}
          count={networkToEcosystemLineCount}
        />

        {/* Upward lines from ecosystem - no target layer above */}
        <InterLayerLines
          key="ecosystem-upward"
          startY={16}
          endY={24}
          startRadius={9}
          endRadius={12}
          startSeed={16000}
          endSeed={24000}
          startCount={ecosystemNodeCount}
          endCount={ecosystemNodeCount}
          growthRef={ecosystemUpwardGrowth}
          opacityRef={ecosystemUpwardOpacity}
          startColor={ecosystemColor}
          endColor={upwardLineEndColor}
          count={ecosystemUpwardLineCount}
        />
      </group>
    </>
  )
}

function LayerNodesWrapper({ opacityRef, seed, ...props }) {
  const groupRef = useRef()

  useFrame(() => {
    if (groupRef.current) {
      const opacity = opacityRef.current
      groupRef.current.visible = opacity > 0.01

      // Recursively update all materials in the group
      groupRef.current.traverse(child => {
        // Handle InstancedMesh (Spheres)
        if (child.isInstancedMesh && child.material) {
          // Ensure material updates are applied
          child.material.opacity = opacity
          child.material.transparent = true
          child.material.needsUpdate = true
        }
        // Handle LineSegments
        if (child.isLineSegments && child.material) {
          // Lines use 0.1 * opacity for subtlety
          child.material.opacity = opacity * 0.1
          child.material.transparent = true
          child.material.needsUpdate = true
        }
      })
    }
  })

  return (
    <group ref={groupRef}>
      <LayerNodes {...props} opacityRef={opacityRef} seed={seed} />
    </group>
  )
}
