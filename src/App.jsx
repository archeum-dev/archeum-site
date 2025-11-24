import { useState, useRef, useEffect } from 'react'
import Scene from './components/Scene'
import ContentPane from './components/ContentPane'

const MAX_SCROLL_PROGRESS = 0.78
const FINAL_OVERLAY_SHOW_THRESHOLD = MAX_SCROLL_PROGRESS - 0.001
const FINAL_OVERLAY_HIDE_THRESHOLD = MAX_SCROLL_PROGRESS - 0.02

function App() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [targetProgress, setTargetProgress] = useState(0)
  const [animationPhase, setAnimationPhase] = useState('intro')
  const [finalOverlayProgress, setFinalOverlayProgress] = useState(0)
  const scrollContainerRef = useRef(null)
  const animationFrameRef = useRef(null)
  const finalOverlayTargetRef = useRef(0)
  const lastScrollProgressRef = useRef(0)
  const finalOverlayAnimRef = useRef(null)

  // Smooth scroll animation
  useEffect(() => {
    const animate = () => {
      setScrollProgress(prev => {
        const diff = targetProgress - prev
        if (Math.abs(diff) < 0.001) return targetProgress
        return prev + diff * 0.15 // Smooth easing
      })
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animationFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [targetProgress])

  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault()
      const delta = e.deltaY
      const scrollHeight = 10000 // Virtual scroll height
      const currentScroll = targetProgress * scrollHeight
      const newScroll = Math.max(0, Math.min(scrollHeight, currentScroll + delta))
      const newProgress = Math.max(0, Math.min(MAX_SCROLL_PROGRESS, newScroll / scrollHeight))

      setTargetProgress(newProgress)

      // Determine animation phase based on scroll progress
      // Canvas animates immediately, but left pane changes when zoom is complete
      let phase = 'intro'
      if (newProgress >= 0.58) {
        phase = 'ecosystem'
      } else if (newProgress >= 0.35) {
        phase = 'network'
      } else if (newProgress >= 0.18) { // Switch to foundation after zoom completes
        phase = 'foundation'
      }

      if (phase !== animationPhase) {
        setAnimationPhase(phase)
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      window.removeEventListener('wheel', handleWheel)
    }
  }, [targetProgress, animationPhase])

  // Final overlay animation target
  useEffect(() => {
    const last = lastScrollProgressRef.current
    const goingDown = scrollProgress >= last
    lastScrollProgressRef.current = scrollProgress

    if (goingDown && scrollProgress >= FINAL_OVERLAY_SHOW_THRESHOLD) {
      finalOverlayTargetRef.current = 1
    } else if (!goingDown && scrollProgress <= FINAL_OVERLAY_HIDE_THRESHOLD) {
      finalOverlayTargetRef.current = 0
    }
  }, [scrollProgress])

  // Animate final overlay independently of scroll
  useEffect(() => {
    const animateOverlay = () => {
      setFinalOverlayProgress(prev => {
        const diff = finalOverlayTargetRef.current - prev
        if (Math.abs(diff) < 0.001) {
          return finalOverlayTargetRef.current
        }
        return prev + diff * 0.06
      })
      finalOverlayAnimRef.current = requestAnimationFrame(animateOverlay)
    }
    finalOverlayAnimRef.current = requestAnimationFrame(animateOverlay)
    return () => {
      if (finalOverlayAnimRef.current) {
        cancelAnimationFrame(finalOverlayAnimRef.current)
      }
    }
  }, [])

  const headerBg = `linear-gradient(135deg, rgba(32, 32, 36, 0.95) 0%, rgba(24, 24, 27, 0.95) 100%),
       repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.03) 2px, rgba(0, 0, 0, 0.03) 4px),
       repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0, 0, 0, 0.03) 2px, rgba(0, 0, 0, 0.03) 4px),
       #1f1f23`
  const textColor = 'white'
  const borderColor = 'rgba(255, 255, 255, 0.1)'

  return (
    <div
      ref={scrollContainerRef}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      {/* Fixed header across both panes */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <div style={{
          background: headerBg,
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${borderColor}`,
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/logo.png" alt="Archeum Logo" style={{ width: '28px', height: 'auto' }} />
            <span style={{
              fontSize: '1.35rem',
              fontWeight: 500,
              fontFamily: '"Gotham Medium", "Montserrat", system-ui, sans-serif',
              letterSpacing: '0.1em',
              background: 'linear-gradient(135deg, #d8a941 0%, #b47a1a 55%, #5c3905 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              ARCHEUM
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
            <a href="https://archeum.dev" target="_blank" rel="noopener noreferrer" style={{ color: textColor, textDecoration: 'none', transition: 'opacity 0.2s' }}>Docs</a>
            <a href="https://github.com/archeum-dev" target="_blank" rel="noopener noreferrer" style={{ color: textColor, textDecoration: 'none', transition: 'opacity 0.2s' }}>GitHub</a>
            <a href="https://discord.gg/cdyPcAzbhH" target="_blank" rel="noopener noreferrer" style={{ color: textColor, textDecoration: 'none', transition: 'opacity 0.2s' }}>Discord</a>
            <a href="https://patreon.com/archeum" target="_blank" rel="noopener noreferrer" style={{ color: textColor, textDecoration: 'none', transition: 'opacity 0.2s' }}>Patreon</a>
          </div>
        </div>
        <div
          style={{
            height: '1px',
            background: 'rgba(97,62,7,0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, #5c3905 0%, #c68f2a 60%, #ffe9a8 100%)',
              boxShadow: '0 0 8px rgba(255, 233, 168, 0.6)'
            }}
          />
        </div>
      </div>

      <div style={{
        display: 'flex',
        width: '100%',
        height: '100%'
      }}>
        {/* Left pane - reacts to animation phase */}
        <ContentPane animationPhase={animationPhase} />

        {/* Right pane - fixed canvas driven by scroll */}
        <Scene scrollProgress={scrollProgress} />
      </div>

      {/* Final full-screen page */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: finalOverlayProgress,
        pointerEvents: finalOverlayProgress > 0.5 ? 'auto' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(120deg, #222222, #101010)',
        zIndex: 100,
        transition: 'background 0.3s ease'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'white',
          padding: '2rem'
        }}>
          <img
            src="/logo.png"
            alt="Archeum"
            style={{ width: '160px', marginBottom: '2rem', opacity: 0.9 }}
          />
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 300 }}>
            Build on Archeum
          </h1>
          <p style={{ fontSize: '1.5rem', opacity: 0.7, marginBottom: '3rem' }}>
            One unified, decentralized platform for the future.
            <br />
            Build once. Run forever.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a
              href="https://github.com/archeum-dev/archeum-sdk"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'linear-gradient(135deg, #5c3905 0%, #b47a1a 55%, #d8a941 100%)',
                color: '#0a0a0a',
                padding: '1rem 2rem',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1.1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxShadow: '0 6px 18px rgba(254, 217, 136, 0.25)',
                textDecoration: 'none',
                display: 'inline-block'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.04)'
                e.currentTarget.style.boxShadow = '0 10px 22px rgba(254, 217, 136, 0.35)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(254, 217, 136, 0.25)'
              }}>
              Get Started
            </a>
            <a
              href="https://archeum.dev"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'transparent',
                color: 'white',
                padding: '1rem 2rem',
                border: '2px solid transparent',
                borderRadius: '4px',
                fontSize: '1.1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                textDecoration: 'none',
                display: 'inline-block'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.04)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}>
              <span style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '4px',
                padding: '2px',
                background: 'linear-gradient(135deg, #5c3905 0%, #b47a1a 55%, #d8a941 100%)',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
                pointerEvents: 'none'
              }} />
              <span style={{
                position: 'relative',
                zIndex: 1
              }}>
                Documentation
              </span>
            </a>
          </div>
        </div>
        <p style={{
          position: 'absolute',
          bottom: '2rem',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '0.8rem',
          opacity: 0.4,
          color: 'white'
        }}>
          © 2025 Archeum. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default App
