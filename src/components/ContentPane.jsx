import { useEffect, useRef } from 'react'

// Helper function to darken a hex color
const darkenColor = (hex, percent = 40) => {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.max(0, Math.floor((num >> 16) * (1 - percent / 100)))
    const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - percent / 100)))
    const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - percent / 100)))
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export default function ContentPane({ animationPhase }) {
    const containerRef = useRef(null)
    const sectionRefs = useRef({})

    // Snap to section when animation phase changes
    useEffect(() => {
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
    }, [animationPhase])

    const sections = [
        {
            id: 'intro',
            title: 'ARCHEUM',
            useBanner: true,
            description: 'The decentralized cloud for the next generation of applications.',
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
                'Immutable handle registry as a smart contract',
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
            description: 'Applications run on the edge with data from nodes. No barrier to entry for developers, driving innovation and competition.',
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
            ref={containerRef}
            style={{
                width: '40%',
                height: '100vh',
                overflowY: 'auto',
                overflowX: 'hidden',
                background: backgroundColor,
                color: textColor,
                scrollBehavior: 'smooth',
                pointerEvents: 'none', // Prevent interaction with left pane
                paddingTop: '80px', // Account for fixed header
                transition: 'background 0.3s ease, color 0.3s ease'
            }}
        >
            {/* Content sections */}
            {sections.map((section) => (
                <section
                    key={section.id}
                    ref={(el) => (sectionRefs.current[section.id] = el)}
                    style={{
                        minHeight: '100vh',
                        padding: '4rem 3rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}
                >
                    {section.useBanner ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.2rem',
                            marginBottom: '2rem'
                        }}>
                            <img
                                src="/logo.png"
                                alt="Archeum"
                                style={{
                                    width: '55px',
                                    height: '55px'
                                }}
                            />
                            <h1 style={{
                                fontSize: '4rem',
                                fontWeight: 500,
                                margin: 0,
                                letterSpacing: '0.05em',
                                fontFamily: '"Gotham Medium", "Montserrat", system-ui, sans-serif',
                                textTransform: 'uppercase',
                                background: 'linear-gradient(135deg, #d8a941 0%, #b47a1a 55%, #5c3905 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}>
                                ARCHEUM
                            </h1>
                        </div>
                    ) : (
                        <>
                            <h1 style={{
                                fontSize: '3rem',
                                fontWeight: 500,
                                margin: 0,
                                marginBottom: '1.5rem',
                                letterSpacing: '0.05em',
                                fontFamily: '"Gotham Medium", "Montserrat", system-ui, sans-serif',
                                textTransform: 'uppercase',
                                background: `linear-gradient(135deg, ${section.titleColor} 0%, ${darkenColor(section.titleColor, 75)} 100%)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                transition: 'background 0.5s ease'
                            }}>
                                {section.title}
                            </h1>
                            <div style={{
                                width: '80px',
                                height: '3px',
                                background: '#ffffff',
                                marginBottom: '1.5rem',
                                transition: 'background 0.5s ease'
                            }} />
                        </>
                    )}

                    <p style={{
                        fontSize: '1.5rem',
                        color: textColor,
                        opacity: 0.85,
                        fontWeight: 300,
                        lineHeight: 1.6,
                        marginBottom: '2rem',
                        maxWidth: '600px'
                    }}>
                        {section.description}
                    </p>

                    {section.details && (
                        <ul style={{
                            listStyle: 'none',
                            padding: 0,
                            marginBottom: '2rem',
                            maxWidth: '600px'
                        }}>
                            {section.details.map((detail, i) => (
                                <li
                                    key={i}
                                    style={{
                                        fontSize: '1.1rem',
                                        color: textColor,
                                        opacity: 0.8,
                                        marginBottom: '1rem',
                                        paddingLeft: '1.5rem',
                                        position: 'relative'
                                    }}
                                >
                                    <span style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: '0.5rem',
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: textColor
                                    }} />
                                    {detail}
                                </li>
                            ))}
                        </ul>
                    )}

                    <p style={{
                        color: textColor,
                        fontSize: '0.9rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        opacity: 0.7,
                        fontWeight: 600,
                        transition: 'color 0.5s ease'
                    }}>
                        {section.subtitle}
                    </p>
                </section>
            ))}
        </div>
    )
}

