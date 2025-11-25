import { useState, useRef, useEffect } from 'react'
import { Route, Switch } from 'wouter'
import Scene from './components/Scene'
import ContentPane from './components/ContentPane'
import AIHelp from './components/AIHelp'

const MAX_SCROLL_PROGRESS = 0.82
const BLACKOUT_START = 0.78
const BLACKOUT_END = 0.82

function MainApp() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [targetProgress, setTargetProgress] = useState(0)
  const [animationPhase, setAnimationPhase] = useState('intro')
  const [blackoutProgress, setBlackoutProgress] = useState(0)
  const [finalOverlayProgress, setFinalOverlayProgress] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isOnFinalPage, setIsOnFinalPage] = useState(false)
  const [finalOverlayTouchStart, setFinalOverlayTouchStart] = useState(null)
  const [finalOverlayTouchEnd, setFinalOverlayTouchEnd] = useState(null)
  const scrollContainerRef = useRef(null)
  const contentPaneRef = useRef(null)
  const animationFrameRef = useRef(null)
  const blackoutTargetRef = useRef(0)
  const finalOverlayTargetRef = useRef(0)
  const blackoutAnimRef = useRef(null)
  const finalOverlayAnimRef = useRef(null)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle continuous drag updates (bypasses quantization for smooth partial animation)
  const handleDragProgress = (continuousProgress) => {
    // Only update scrollProgress during drag - targetProgress stays at snap point
    setScrollProgress(continuousProgress)
  }

  // Handle snap to discrete sections (used after swipe release)
  const handleScrollProgress = (scrollPosition) => {
    if (isMobile) {
      // Map horizontal scroll to animation phases
      // 5 positions: intro(0), foundation(0.25), network(0.5), ecosystem(0.75), final(1.0)
      // Each static state shows only lines TO that layer, not ABOVE it
      if (scrollPosition < 0.2) {
        // Intro section - no lines
        setTargetProgress(0)
        setAnimationPhase('intro')
        blackoutTargetRef.current = 0
      } else if (scrollPosition < 0.45) {
        // Foundation section - camera at foundation, no lines yet
        setTargetProgress(0.18)
        setAnimationPhase('foundation')
        blackoutTargetRef.current = 0
      } else if (scrollPosition < 0.7) {
        // Network section - foundation-to-network lines complete, no lines above
        setTargetProgress(0.38)
        setAnimationPhase('network')
        blackoutTargetRef.current = 0
      } else if (scrollPosition < 0.95) {
        // Ecosystem section - network-to-ecosystem lines complete, no upward lines
        setTargetProgress(0.61)
        setAnimationPhase('ecosystem')
        blackoutTargetRef.current = 0
      } else {
        // Final screen - animate to blackout and show final overlay
        setTargetProgress(0.82) // Go to blackout state
        setAnimationPhase('ecosystem')
        blackoutTargetRef.current = 1
      }
    } else {
      // Desktop: handle blackout only
      if (scrollPosition > 0.95) {
        const blackoutT = (scrollPosition - 0.95) / 0.03
        blackoutTargetRef.current = Math.min(1, blackoutT)
      } else {
        blackoutTargetRef.current = 0
      }
    }
  }

  // Smooth scroll animation (only active when NOT dragging)
  useEffect(() => {
    const animate = () => {
      setScrollProgress(prev => {
        // Skip lerp during drag - scrollProgress is set directly by handleDragProgress
        if (isDragging) return prev

        const diff = targetProgress - prev
        if (Math.abs(diff) < 0.001) return targetProgress

        // Slow lerp for smooth animation after swipe release
        return prev + diff * (isMobile ? 0.08 : 0.15)
      })
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animationFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [targetProgress, isMobile, isDragging])

  useEffect(() => {
    if (isMobile) return // Skip wheel handling on mobile, use natural scroll instead

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

      // Trigger final page when reaching blackout zone
      if (newProgress >= BLACKOUT_START) {
        setIsOnFinalPage(true)
      } else {
        setIsOnFinalPage(false)
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      window.removeEventListener('wheel', handleWheel)
    }
  }, [targetProgress, animationPhase, isMobile])

  // Blackout animation target (scroll-controlled, desktop only)
  useEffect(() => {
    if (isMobile) return // Mobile handles blackout in handleScrollProgress

    if (scrollProgress >= BLACKOUT_START && scrollProgress < BLACKOUT_END) {
      const blackoutT = (scrollProgress - BLACKOUT_START) / (BLACKOUT_END - BLACKOUT_START)
      blackoutTargetRef.current = blackoutT
    } else if (scrollProgress >= BLACKOUT_END) {
      blackoutTargetRef.current = 1
    } else {
      blackoutTargetRef.current = 0
    }
  }, [scrollProgress, isMobile])

  // Final overlay fades in automatically once blackout is complete
  // Note: Only controls animation targets, never sets state (state drives animations, not vice versa)
  useEffect(() => {
    if (isOnFinalPage && blackoutProgress >= 0.95) {
      // On final page and blackout complete - show overlay
      finalOverlayTargetRef.current = 1
    } else {
      // Not on final page or blackout incomplete - hide overlay
      finalOverlayTargetRef.current = 0
    }
  }, [blackoutProgress, isOnFinalPage])

  // Animate blackout overlay (scroll-controlled fade to black)
  useEffect(() => {
    const animateBlackout = () => {
      setBlackoutProgress(prev => {
        const diff = blackoutTargetRef.current - prev
        if (Math.abs(diff) < 0.001) {
          return blackoutTargetRef.current
        }
        return prev + diff * (isMobile ? 0.08 : 0.1) // Match mobile scroll speed
      })
      blackoutAnimRef.current = requestAnimationFrame(animateBlackout)
    }
    blackoutAnimRef.current = requestAnimationFrame(animateBlackout)
    return () => {
      if (blackoutAnimRef.current) {
        cancelAnimationFrame(blackoutAnimRef.current)
      }
    }
  }, [isMobile])

  // Animate final overlay independently of scroll
  useEffect(() => {
    const animateOverlay = () => {
      setFinalOverlayProgress(prev => {
        const diff = finalOverlayTargetRef.current - prev
        if (Math.abs(diff) < 0.001) {
          return finalOverlayTargetRef.current
        }
        return prev + diff * (isMobile ? 0.08 : 0.08) // Match mobile speed
      })
      finalOverlayAnimRef.current = requestAnimationFrame(animateOverlay)
    }
    finalOverlayAnimRef.current = requestAnimationFrame(animateOverlay)
    return () => {
      if (finalOverlayAnimRef.current) {
        cancelAnimationFrame(finalOverlayAnimRef.current)
      }
    }
  }, [isMobile])

  // Handle touch events on final overlay for swipe back navigation (mobile only)
  const handleFinalOverlayTouchStart = (e) => {
    if (!isMobile) return
    setFinalOverlayTouchEnd(null)
    setFinalOverlayTouchStart(e.targetTouches[0].clientX)
  }

  const handleFinalOverlayTouchMove = (e) => {
    if (!isMobile) return
    setFinalOverlayTouchEnd(e.targetTouches[0].clientX)
  }

  const handleFinalOverlayTouchEnd = () => {
    if (!isMobile || !finalOverlayTouchStart || !finalOverlayTouchEnd) return

    const distance = finalOverlayTouchStart - finalOverlayTouchEnd
    const isRightSwipe = distance < -50

    if (isRightSwipe) {
      // Swipe right - go back to ecosystem section
      setIsOnFinalPage(false)
      handleScrollProgress(0.75)
    }
  }

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
          padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.3s ease',
          flexWrap: isMobile ? 'wrap' : 'nowrap'
        }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease'
            }}
            onClick={() => {
              setTargetProgress(0)
              setAnimationPhase('intro')
              blackoutTargetRef.current = 0
              // On mobile, reset to intro section
              if (isMobile) {
                handleScrollProgress(0)
              } else if (contentPaneRef.current) {
                contentPaneRef.current.scrollTo({
                  top: 0,
                  behavior: 'smooth'
                })
              }
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '0.8'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            <img src="/logo.png" alt="Archeum Logo" style={{ width: isMobile ? '24px' : '28px', height: 'auto' }} />
            <span style={{
              fontSize: isMobile ? '1.1rem' : '1.35rem',
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
          <div style={{
            display: 'flex',
            gap: isMobile ? '0.75rem' : '1.5rem',
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            opacity: 0.8,
            flexWrap: 'wrap'
          }}>
            <a href="https://archeum.dev" target="_blank" rel="noopener noreferrer" style={{ color: textColor, textDecoration: 'none', transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>Docs</a>
            <a href="https://github.com/archeum-dev" target="_blank" rel="noopener noreferrer" style={{ color: textColor, textDecoration: 'none', transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>GitHub</a>
            <a href="https://discord.gg/cdyPcAzbhH" target="_blank" rel="noopener noreferrer" style={{ color: textColor, textDecoration: 'none', transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>Discord</a>
            <a href="https://patreon.com/archeum" target="_blank" rel="noopener noreferrer" style={{ color: textColor, textDecoration: 'none', transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>Patreon</a>
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
        position: 'relative',
        width: '100%',
        height: '100%'
      }}>
        {/* Background scene - full screen */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0
        }}>
          <Scene scrollProgress={scrollProgress} isMobile={isMobile} />
        </div>

        {/* Progressive fade gradient behind text (desktop only) */}
        {!isMobile && (
          <div style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: '40%',
            height: '70vh',
            background: 'linear-gradient(to right, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 60%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, black 70%, transparent 100%)',
            maskImage: 'linear-gradient(to top, black 0%, black 70%, transparent 100%)',
            zIndex: 5,
            pointerEvents: 'none'
          }} />
        )}

        {/* Content cards - horizontal scroll at bottom */}
        <ContentPane
          animationPhase={animationPhase}
          isMobile={isMobile}
          onScrollProgress={handleScrollProgress}
          onDragProgress={handleDragProgress}
          scrollRef={contentPaneRef}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          isOnFinalPage={isOnFinalPage}
          setIsOnFinalPage={setIsOnFinalPage}
          scrollProgress={scrollProgress}
        />
      </div>

      {/* Blackout overlay - fades to pure black first */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: blackoutProgress,
          pointerEvents: 'none',
          background: '#000000',
          zIndex: 99
        }}
      />

      {/* Final full-screen page - only visible after blackout */}
      <div
        onTouchStart={handleFinalOverlayTouchStart}
        onTouchMove={handleFinalOverlayTouchMove}
        onTouchEnd={handleFinalOverlayTouchEnd}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: finalOverlayProgress,
          pointerEvents: finalOverlayProgress > 0.9 ? 'auto' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, rgb(32, 32, 36) 0%, rgb(24, 24, 27) 100%)',
          zIndex: 100
        }}
      >
        {isMobile && finalOverlayProgress > 0.8 && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: 0,
            right: 0,
            textAlign: 'center',
            color: 'white',
            opacity: 0.4,
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase'
          }}>
            Swipe to go back
          </div>
        )}
        <div style={{
          textAlign: 'center',
          color: 'white',
          padding: isMobile ? '1.5rem' : '2rem',
          maxWidth: isMobile ? '100%' : 'none'
        }}>
          <img
            src="/logo.png"
            alt="Archeum"
            style={{ width: isMobile ? '100px' : '160px', marginBottom: isMobile ? '1.5rem' : '2rem', opacity: 0.9 }}
          />
          <h1 style={{ fontSize: isMobile ? '2rem' : '3rem', marginBottom: '1rem', fontWeight: 300 }}>
            Build on Archeum
          </h1>
          <p style={{ fontSize: isMobile ? '1.1rem' : '1.5rem', opacity: 0.7, marginBottom: isMobile ? '2rem' : '3rem' }}>
            One unified, decentralized platform for the future.
            <br />
            Build once. Run forever.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center' }}>
            <a
              href="https://github.com/archeum-dev/sdk"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'linear-gradient(135deg, #5c3905 0%, #b47a1a 55%, #d8a941 100%)',
                color: '#0a0a0a',
                padding: isMobile ? '0.875rem 1.75rem' : '1rem 2rem',
                border: 'none',
                borderRadius: '4px',
                fontSize: isMobile ? '1rem' : '1.1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxShadow: '0 6px 18px rgba(254, 217, 136, 0.25)',
                textDecoration: 'none',
                display: 'inline-block',
                width: isMobile ? '100%' : 'auto',
                maxWidth: isMobile ? '300px' : 'none'
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
                padding: isMobile ? '0.875rem 1.75rem' : '1rem 2rem',
                border: '2px solid transparent',
                borderRadius: '4px',
                fontSize: isMobile ? '1rem' : '1.1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                textDecoration: 'none',
                display: 'inline-block',
                width: isMobile ? '100%' : 'auto',
                maxWidth: isMobile ? '300px' : 'none'
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
                background: 'linear-gradient(135deg, #2d1b02 0%, #6d470f 55%, #8a6b25 100%)',
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

function App() {
  return (
    <Switch>
      <Route path="/ai-help" component={AIHelp} />
      <Route component={MainApp} />
    </Switch>
  )
}

export default App
