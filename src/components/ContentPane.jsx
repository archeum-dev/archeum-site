import { useEffect, useRef, useState } from 'react'

// Helper function to darken a hex color
const darkenColor = (hex, percent = 40) => {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.max(0, Math.floor((num >> 16) * (1 - percent / 100)))
    const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - percent / 100)))
    const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - percent / 100)))
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export default function ContentPane({ animationPhase, isMobile, onScrollProgress, scrollRef }) {
    const containerRef = useRef(null)
    const sectionRefs = useRef({})
    const [activeCardIndex, setActiveCardIndex] = useState(0)
    const [touchStart, setTouchStart] = useState(null)
    const [touchEnd, setTouchEnd] = useState(null)

    // Combine internal ref with external ref
    const setRefs = (el) => {
        containerRef.current = el
        if (scrollRef) {
            scrollRef.current = el
        }
    }

    // Sync activeCardIndex with animationPhase changes (for titlebar reset on mobile)
    useEffect(() => {
        if (!isMobile) return

        const phaseToIndex = {
            'intro': 0,
            'foundation': 1,
            'network': 2,
            'ecosystem': 3
        }

        const index = phaseToIndex[animationPhase]
        if (index !== undefined && index !== activeCardIndex) {
            setActiveCardIndex(index)
        }
    }, [animationPhase, isMobile, activeCardIndex])

    // Mobile touch handling for section navigation
    useEffect(() => {
        if (!isMobile) return

        const handleTouchStart = (e) => {
            setTouchEnd(null)
            setTouchStart(e.targetTouches[0].clientX)
        }

        const handleTouchMove = (e) => {
            setTouchEnd(e.targetTouches[0].clientX)
        }

        const handleTouchEnd = () => {
            if (!touchStart || !touchEnd) return

            const distance = touchStart - touchEnd
            const isLeftSwipe = distance > 50
            const isRightSwipe = distance < -50

            if (isLeftSwipe && activeCardIndex < 4) {
                // Swipe left - go to next section (0-4, where 4 is final screen)
                const newIndex = activeCardIndex + 1
                setActiveCardIndex(newIndex)
                onScrollProgress(newIndex / 4)
            } else if (isRightSwipe && activeCardIndex > 0) {
                // Swipe right - go to previous section
                const newIndex = activeCardIndex - 1
                setActiveCardIndex(newIndex)
                onScrollProgress(newIndex / 4)
            }
        }

        const container = containerRef.current
        if (!container) return

        container.addEventListener('touchstart', handleTouchStart)
        container.addEventListener('touchmove', handleTouchMove)
        container.addEventListener('touchend', handleTouchEnd)

        return () => {
            container.removeEventListener('touchstart', handleTouchStart)
            container.removeEventListener('touchmove', handleTouchMove)
            container.removeEventListener('touchend', handleTouchEnd)
        }
    }, [isMobile, touchStart, touchEnd, activeCardIndex, onScrollProgress])

    // Snap to section when animation phase changes (desktop only)
    useEffect(() => {
        if (isMobile) return // Skip on mobile, use CSS scroll snap instead

        const section = sectionRefs.current[animationPhase]
        const container = containerRef.current

        if (section && container) {
            // Calculate position to center the section
            const containerHeight = container.clientHeight
            const sectionTop = section.offsetTop
            const sectionHeight = section.offsetHeight
            const scrollTo = sectionTop - (containerHeight / 2) + (sectionHeight / 2)

            container.scrollTo({
                top: scrollTo,
                behavior: 'smooth'
            })
        }
    }, [animationPhase, isMobile])

    // Track scroll position to trigger final overlay (desktop only)
    useEffect(() => {
        if (!onScrollProgress || isMobile) return

        const container = containerRef.current
        if (!container) return

        const handleScroll = () => {
            // Vertical scroll on desktop
            const scrollTop = container.scrollTop
            const scrollHeight = container.scrollHeight
            const clientHeight = container.clientHeight
            const scrollPosition = scrollTop / (scrollHeight - clientHeight)
            onScrollProgress(scrollPosition)
        }

        container.addEventListener('scroll', handleScroll)
        return () => container.removeEventListener('scroll', handleScroll)
    }, [isMobile, onScrollProgress])

    const sections = [
        {
            id: 'intro',
            title: 'ARCHEUM',
            useBanner: true,
            description: 'The decentralized cloud for next-generation applications.',
            subtitle: 'Scroll to explore ↓',
            titleColor: '#ffffff',
            subtitleColor: '#00f0ff'
        },
        {
            id: 'foundation',
            title: 'The Foundation',
            description: 'Anchored on Ethereum. Secure, immutable, and decentralized trust at Archeum\'s core.',
            subtitle: '',
            titleColor: '#ffffff',
            subtitleColor: '#ffffff',
            details: [
                'Leverages Ethereum\'s proven technology',
                'Immutable smart contract as central registry',
                'Used as the sole source of identity',
                'No single point of failure'
            ]
        },
        {
            id: 'network',
            title: 'Real-Time Storage',
            description: 'Run your own Archeum Node - personal cloud storage tied to your identity. People can read and interact with your content in real-time.',
            subtitle: '',
            titleColor: '#00f0ff',
            subtitleColor: '#00f0ff',
            details: [
                'Fast, efficient nodes written in Rust',
                'Fast, secure connections over QUIC',
                'Human-readable handles (@alice)',
                'End-to-end encryption for all data by default',
            ]
        },
        {
            id: 'ecosystem',
            title: 'The Ecosystem',
            description: 'Applications run on the edge with data from nodes. No barrier to entry for developers, driving innovation, collaboration, and competition.',
            subtitle: '',
            titleColor: '#ff8800',
            subtitleColor: '#ff8800',
            details: [
                'Free for developers, small one-time cost for users',
                'Apps orchestrate data flows and interactions',
                'No single point of failure, or shutdowns, for any app',
            ]
        }
    ]

    const backgroundColor = `linear-gradient(135deg, rgba(32, 32, 36, 0.8) 0%, rgba(24, 24, 27, 0.9) 100%),
           repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.03) 2px, rgba(0, 0, 0, 0.03) 4px),
           repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0, 0, 0, 0.03) 2px, rgba(0, 0, 0, 0.03) 4px),
           #1f1f23`

    const textColor = 'white'

    return (
        <div
            ref={setRefs}
            style={{
                position: isMobile ? 'fixed' : 'relative',
                bottom: isMobile ? 0 : 'auto',
                left: isMobile ? 0 : 'auto',
                right: isMobile ? 0 : 'auto',
                width: isMobile ? '100vw' : '40%',
                height: isMobile ? 'auto' : '100vh',
                maxHeight: isMobile ? '45vh' : '100vh',
                overflow: isMobile ? 'hidden' : 'auto',
                background: isMobile
                    ? 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 40%, transparent 100%)'
                    : 'transparent',
                color: textColor,
                scrollBehavior: isMobile ? 'auto' : 'smooth',
                pointerEvents: 'auto',
                paddingTop: isMobile ? '1.5rem' : '80px',
                paddingBottom: isMobile ? '3rem' : '0',
                paddingLeft: isMobile ? '1.5rem' : '0',
                paddingRight: isMobile ? '1.5rem' : '0',
                transition: 'background 0.3s ease, color 0.3s ease',
                scrollSnapType: isMobile ? 'none' : 'y proximity',
                display: isMobile ? 'flex' : 'block',
                flexDirection: isMobile ? 'column' : undefined,
                justifyContent: isMobile ? 'flex-end' : undefined,
                zIndex: 10,
                boxSizing: 'border-box'
            }}
        >
            {/* Content sections */}
            {sections.map((section, index) => (
                <section
                    key={section.id}
                    ref={(el) => (sectionRefs.current[section.id] = el)}
                    style={{
                        minHeight: isMobile ? 'auto' : '100vh',
                        padding: isMobile ? '0' : '4rem 3rem',
                        display: isMobile ? (index === activeCardIndex ? 'flex' : 'none') : 'flex',
                        flexDirection: 'column',
                        justifyContent: isMobile ? 'flex-start' : 'center',
                        scrollSnapAlign: isMobile ? 'none' : 'start',
                        background: 'transparent',
                        overflow: isMobile ? 'hidden' : 'visible',
                        boxSizing: 'border-box',
                        opacity: isMobile ? (index === activeCardIndex ? 1 : 0) : 1,
                        transition: isMobile ? 'opacity 0.8s ease' : 'none',
                        width: '100%',
                        maxWidth: '100%'
                    }}
                >
                    {section.useBanner ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '0.8rem' : '1.2rem',
                            marginBottom: isMobile ? '1.5rem' : '2rem',
                            width: '100%',
                            maxWidth: '100%',
                            boxSizing: 'border-box'
                        }}>
                            <img
                                src="/logo.png"
                                alt="Archeum"
                                style={{
                                    width: isMobile ? '40px' : '55px',
                                    height: isMobile ? '40px' : '55px'
                                }}
                            />
                            <h1 style={{
                                fontSize: isMobile ? '2.5rem' : '4rem',
                                fontWeight: 500,
                                margin: 0,
                                letterSpacing: '0.05em',
                                fontFamily: '"Gotham Medium", "Montserrat", system-ui, sans-serif',
                                textTransform: 'uppercase',
                                background: 'linear-gradient(135deg, #d8a941 0%, #b47a1a 55%, #5c3905 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word',
                                maxWidth: '100%'
                            }}>
                                ARCHEUM
                            </h1>
                        </div>
                    ) : (
                        <>
                            <h1 style={{
                                fontSize: isMobile ? '2rem' : '3rem',
                                fontWeight: 500,
                                margin: 0,
                                marginBottom: isMobile ? '1rem' : '1.5rem',
                                letterSpacing: '0.05em',
                                fontFamily: '"Gotham Medium", "Montserrat", system-ui, sans-serif',
                                textTransform: 'uppercase',
                                background: `linear-gradient(135deg, ${section.titleColor} 0%, ${darkenColor(section.titleColor, 75)} 100%)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                transition: 'background 0.5s ease',
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word',
                                maxWidth: '100%'
                            }}>
                                {section.title}
                            </h1>
                            <div style={{
                                width: isMobile ? '60px' : '80px',
                                height: isMobile ? '2px' : '3px',
                                background: '#ffffff',
                                marginBottom: isMobile ? '1rem' : '1.5rem',
                                transition: 'background 0.5s ease'
                            }} />
                        </>
                    )}

                    <p style={{
                        fontSize: isMobile ? '1rem' : '1.5rem',
                        color: textColor,
                        opacity: 0.85,
                        fontWeight: 300,
                        lineHeight: 1.6,
                        marginBottom: isMobile ? '1.5rem' : '2rem',
                        maxWidth: '100%',
                        width: '100%',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        boxSizing: 'border-box'
                    }}>
                        {section.description}
                    </p>

                    {section.details && (
                        <ul style={{
                            listStyle: 'none',
                            padding: 0,
                            margin: 0,
                            marginBottom: isMobile ? '1.5rem' : '2rem',
                            maxWidth: isMobile ? '100%' : '600px',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}>
                            {section.details.map((detail, i) => (
                                <li
                                    key={i}
                                    style={{
                                        fontSize: isMobile ? '0.95rem' : '1.1rem',
                                        color: textColor,
                                        opacity: 0.8,
                                        marginBottom: isMobile ? '0.75rem' : '1rem',
                                        paddingLeft: isMobile ? '1.25rem' : '1.5rem',
                                        position: 'relative',
                                        wordWrap: 'break-word',
                                        overflowWrap: 'break-word'
                                    }}
                                >
                                    <span style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: isMobile ? '0.45rem' : '0.5rem',
                                        width: isMobile ? '5px' : '6px',
                                        height: isMobile ? '5px' : '6px',
                                        borderRadius: '50%',
                                        background: textColor
                                    }} />
                                    {detail}
                                </li>
                            ))}
                        </ul>
                    )}

                    {(section.subtitle || (isMobile && section.id === 'intro')) && (
                        <p style={{
                            color: textColor,
                            fontSize: isMobile ? '0.8rem' : '0.9rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            opacity: 0.7,
                            fontWeight: 600,
                            transition: 'color 0.5s ease',
                            margin: 0,
                            maxWidth: '100%',
                            width: '100%',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            boxSizing: 'border-box'
                        }}>
                            {isMobile && section.id === 'intro' ? 'Swipe to explore →' : section.subtitle}
                        </p>
                    )}
                </section>
            ))}

            {/* Extra scroll space to ensure final page appears only after intentional scroll (desktop only) */}
            {!isMobile && (
                <div style={{
                    minHeight: '100vh',
                    scrollSnapAlign: 'start'
                }}>
                </div>
            )}

            {/* Mobile swipe indicators */}
            {isMobile && (
                <div style={{
                    position: 'fixed',
                    bottom: '1rem',
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.5rem',
                    zIndex: 20,
                    pointerEvents: 'none',
                    width: '100vw',
                    opacity: activeCardIndex === 4 ? 0 : 1,
                    transition: 'opacity 0.8s ease'
                }}>
                    {[...sections, { id: 'final' }].map((_, index) => (
                        <div
                            key={index}
                            style={{
                                width: activeCardIndex === index ? '24px' : '8px',
                                height: '8px',
                                borderRadius: '4px',
                                background: activeCardIndex === index
                                    ? 'linear-gradient(135deg, #d8a941 0%, #b47a1a 55%, #5c3905 100%)'
                                    : 'rgba(255, 255, 255, 0.3)',
                                transition: 'all 0.8s ease',
                                boxShadow: activeCardIndex === index
                                    ? '0 2px 8px rgba(216, 169, 65, 0.4)'
                                    : 'none'
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

