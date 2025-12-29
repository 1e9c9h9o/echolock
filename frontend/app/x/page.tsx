'use client'

import { useEffect, useState, useCallback } from 'react'

export default function ExplainerPage() {
  const [activeStep, setActiveStep] = useState(0)
  const [fragmentsVisible, setFragmentsVisible] = useState(false)
  const [simpleMode, setSimpleMode] = useState(false)

  // Demo state
  const [demoTime, setDemoTime] = useState(72) // hours remaining
  const [demoPhase, setDemoPhase] = useState<'countdown' | 'warning' | 'checkin' | 'collecting' | 'decrypting' | 'delivering' | 'released'>('countdown')
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [autoDemoRunning, setAutoDemoRunning] = useState(true)
  const [releaseStep, setReleaseStep] = useState(0)

  // Check-in action
  const handleCheckIn = useCallback(() => {
    setDemoPhase('checkin')
    setShowCheckmark(true)
    setDemoTime(72)
    setTimeout(() => {
      setShowCheckmark(false)
      setDemoPhase('countdown')
    }, 1500)
  }, [])

  // Auto demo cycle
  useEffect(() => {
    if (!autoDemoRunning) return

    const interval = setInterval(() => {
      setDemoTime(prev => {
        if (prev <= 1) {
          // Start release sequence
          setAutoDemoRunning(false)
          startReleaseSequence()
          return 0
        }
        if (prev <= 12 && demoPhase === 'countdown') {
          setDemoPhase('warning')
        }
        return prev - 6 // Speed up for demo
      })
    }, 500)

    return () => clearInterval(interval)
  }, [autoDemoRunning, demoPhase])

  // Release sequence - shows full flow
  const startReleaseSequence = useCallback(() => {
    const steps = [
      { phase: 'collecting' as const, step: 0, duration: 1500 },   // Collecting fragments
      { phase: 'collecting' as const, step: 1, duration: 800 },    // Fragment 2
      { phase: 'collecting' as const, step: 2, duration: 800 },    // Fragment 3
      { phase: 'decrypting' as const, step: 3, duration: 1200 },   // Decrypting
      { phase: 'delivering' as const, step: 4, duration: 1500 },   // Delivering
      { phase: 'released' as const, step: 5, duration: 2500 },     // Done
    ]

    let totalDelay = 0
    steps.forEach(({ phase, step, duration }) => {
      setTimeout(() => {
        setDemoPhase(phase)
        setReleaseStep(step)
      }, totalDelay)
      totalDelay += duration
    })

    // Reset after sequence
    setTimeout(() => {
      setDemoTime(72)
      setDemoPhase('countdown')
      setReleaseStep(0)
      setAutoDemoRunning(true)
    }, totalDelay + 500)
  }, [])

  // Reset demo when it ends
  useEffect(() => {
    if (demoPhase === 'released') {
      const timeout = setTimeout(() => {
        setDemoTime(72)
        setDemoPhase('countdown')
        setReleaseStep(0)
        setAutoDemoRunning(true)
      }, 3500)
      return () => clearTimeout(timeout)
    }
  }, [demoPhase])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 5)
    }, 3000)
    setTimeout(() => setFragmentsVisible(true), 500)
    return () => clearInterval(interval)
  }, [])

  const technicalSteps = [
    { num: '01', label: 'ENCRYPT', desc: 'AES-256-GCM' },
    { num: '02', label: 'FRAGMENT', desc: '3-of-5 Shamir' },
    { num: '03', label: 'DISTRIBUTE', desc: '7+ Nostr relays' },
    { num: '04', label: 'TIMESTAMP', desc: 'Bitcoin BIP65' },
    { num: '05', label: 'RELEASE', desc: 'Autonomous trigger' },
  ]

  const simpleSteps = [
    { num: '01', label: 'LOCK IT', desc: 'Scramble your message' },
    { num: '02', label: 'BREAK THE KEY', desc: 'Split into 5 pieces' },
    { num: '03', label: 'SCATTER', desc: 'Hide pieces worldwide' },
    { num: '04', label: 'SET TIMER', desc: 'Start the countdown' },
    { num: '05', label: 'DELIVER', desc: 'Message sent automatically' },
  ]

  const steps = simpleMode ? simpleSteps : technicalSteps

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --black: #0A0A0A;
          --white: #FFFFFF;
          --blue: #7BA3C9;
          --blue-light: #A8C5DC;
          --orange: #FF6B00;
          --yellow: #FFD000;
        }

        body { background: var(--blue); overflow-x: hidden; }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }

        @keyframes rings {
          0% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.02) rotate(180deg); }
          100% { transform: scale(1) rotate(360deg); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(45deg); }
          50% { transform: translateY(-12px) rotate(45deg); }
        }

        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 107, 0, 0.5); }
          50% { box-shadow: 0 0 40px rgba(255, 107, 0, 0.8); }
        }

        @keyframes checkmark {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(-45deg); opacity: 1; }
          100% { transform: scale(1) rotate(-45deg); opacity: 1; }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        @keyframes expand {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(20); opacity: 0; }
        }

        @keyframes messageReveal {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes fragmentCollect {
          0% { transform: rotate(45deg) scale(1); }
          50% { transform: rotate(45deg) scale(1.1); }
          100% { transform: rotate(45deg) scale(0.8) translateY(10px); }
        }

        @keyframes decrypt {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes flyIn {
          0% { transform: translateX(-50px) rotate(45deg); opacity: 0; }
          100% { transform: translateX(0) rotate(45deg); opacity: 1; }
        }

        .hazard-stripe {
          background: repeating-linear-gradient(
            -45deg,
            var(--yellow),
            var(--yellow) 10px,
            var(--black) 10px,
            var(--black) 20px
          );
        }

        .toggle-track {
          width: 100%;
          height: 48px;
          background: #0A0A0A;
          display: flex;
          position: relative;
          cursor: pointer;
          border-bottom: 2px solid #FF6B00;
        }

        .toggle-option {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: rgba(255,255,255,0.4);
          transition: all 0.3s ease;
          z-index: 1;
        }

        .toggle-option.active {
          color: #0A0A0A;
        }

        .toggle-slider {
          position: absolute;
          top: 4px;
          left: 4px;
          width: calc(50% - 8px);
          height: 40px;
          background: #FF6B00;
          transition: transform 0.3s ease;
        }

        .toggle-slider.right {
          transform: translateX(calc(100% + 8px));
        }
      `}</style>

      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        background: '#7BA3C9',
        minHeight: '100vh',
        maxWidth: '390px',
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden'
      }}>

        {/* Hazard stripe top */}
        <div className="hazard-stripe" style={{ height: '8px' }} />

        {/* Header */}
        <header style={{
          background: '#0A0A0A',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ position: 'relative', width: '48px', height: '48px' }}>
            <svg viewBox="0 0 100 100" style={{
              width: '100%',
              height: '100%',
              animation: 'rings 20s linear infinite'
            }}>
              <circle cx="50" cy="50" r="44" fill="none" stroke="#FFFFFF" strokeWidth="5" opacity="0.3"/>
              <circle cx="50" cy="50" r="30" fill="none" stroke="#FFFFFF" strokeWidth="5" opacity="0.6"/>
              <circle cx="50" cy="50" r="16" fill="#FF6B00" style={{ animation: 'pulse 2s ease-in-out infinite' }}/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, letterSpacing: '0.2em' }}>ECHOLOCK</div>
            <div style={{ color: '#FF6B00', fontSize: '9px', letterSpacing: '0.15em', marginTop: '2px' }}>DEAD MAN'S SWITCH</div>
          </div>
        </header>

        {/* Mode Toggle */}
        <div className="toggle-track" onClick={() => setSimpleMode(!simpleMode)}>
          <div className={`toggle-slider ${simpleMode ? 'right' : ''}`} />
          <div className={`toggle-option ${!simpleMode ? 'active' : ''}`}>TECHNICAL</div>
          <div className={`toggle-option ${simpleMode ? 'active' : ''}`}>SIMPLE</div>
        </div>

        {/* Hero Section */}
        <section style={{ padding: '32px 24px', position: 'relative' }}>
          <div style={{
            display: 'inline-block',
            background: '#0A0A0A',
            color: '#FFFFFF',
            fontSize: '9px',
            letterSpacing: '0.2em',
            padding: '8px 12px',
            marginBottom: '16px'
          }}>{simpleMode ? 'HOW IT WORKS' : 'CRYPTOGRAPHIC INFRASTRUCTURE'}</div>

          <h1 style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: '32px',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: '#0A0A0A',
            marginBottom: '16px'
          }}>
            {simpleMode ? (
              <>Your message,<br/><span style={{ color: '#FF6B00' }}>delivered later.</span></>
            ) : (
              <>No single point<br/><span style={{ color: '#FF6B00' }}>of failure.</span></>
            )}
          </h1>

          <p style={{
            fontSize: '13px',
            color: '#0A0A0A',
            opacity: 0.7,
            lineHeight: 1.6,
            marginBottom: '24px'
          }}>
            {simpleMode
              ? "Write a message for someone. If you don't check in regularly, it gets sent to them automatically. Like a letter that mails itself."
              : "Messages encrypted, fragmented, distributed across global relay networks. Released only when you stop checking in."
            }
          </p>
        </section>

        {/* Interactive Check-in Demo */}
        <section style={{
          background: '#0A0A0A',
          padding: '24px',
          borderTop: '4px solid #FF6B00',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <span style={{
              color: '#FFFFFF',
              fontSize: '9px',
              letterSpacing: '0.15em',
              opacity: 0.5
            }}>{simpleMode ? 'LIVE DEMO' : 'CHECK-IN SIMULATION'}</span>
            <span style={{
              color: demoPhase === 'warning' || demoPhase === 'collecting' || demoPhase === 'decrypting' || demoPhase === 'delivering' ? '#FF6B00' : '#7BA3C9',
              fontSize: '9px',
              letterSpacing: '0.1em',
              animation: demoPhase === 'warning' ? 'shake 0.3s infinite' : 'none'
            }}>
              {demoPhase === 'released' ? 'DELIVERED' :
               demoPhase === 'collecting' ? `COLLECTING ${releaseStep + 1}/3` :
               demoPhase === 'decrypting' ? 'DECRYPTING...' :
               demoPhase === 'delivering' ? 'DELIVERING...' :
               demoPhase === 'checkin' ? 'TIMER RESET' : 'WATCHING...'}
            </span>
          </div>

          {/* Timer Display */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '24px',
            position: 'relative'
          }}>
            {/* Circular progress */}
            <div style={{ position: 'relative', width: '120px', height: '120px' }}>
              <svg viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke="rgba(123, 163, 201, 0.2)"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke={
                    demoPhase === 'released' ? '#00FF88' :
                    demoPhase === 'collecting' || demoPhase === 'decrypting' || demoPhase === 'delivering' ? '#FF6B00' :
                    demoPhase === 'warning' ? '#FF6B00' : '#7BA3C9'
                  }
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={
                    demoPhase === 'collecting' ? `${((releaseStep + 1) / 3) * 339} 339` :
                    demoPhase === 'decrypting' || demoPhase === 'delivering' ? '339 339' :
                    demoPhase === 'released' ? '339 339' :
                    `${(demoTime / 72) * 339} 339`
                  }
                  style={{
                    transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease',
                    filter: (demoPhase === 'warning' || demoPhase === 'collecting' || demoPhase === 'decrypting' || demoPhase === 'delivering') ? 'drop-shadow(0 0 10px #FF6B00)' :
                            demoPhase === 'released' ? 'drop-shadow(0 0 10px #00FF88)' : 'none'
                  }}
                />
              </svg>

              {/* Center content */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                {demoPhase === 'released' ? (
                  <div style={{ animation: 'messageReveal 0.5s ease' }}>
                    <div style={{ fontSize: '28px', marginBottom: '4px' }}>📨</div>
                    <div style={{ color: '#00FF88', fontSize: '9px', letterSpacing: '0.1em', fontWeight: 700 }}>SENT</div>
                  </div>
                ) : demoPhase === 'collecting' ? (
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: '20px',
                        height: '20px',
                        background: i <= releaseStep ? '#FF6B00' : 'rgba(123, 163, 201, 0.3)',
                        transform: 'rotate(45deg)',
                        animation: i === releaseStep ? 'flyIn 0.4s ease forwards' : 'none',
                        transition: 'background 0.3s ease'
                      }} />
                    ))}
                  </div>
                ) : demoPhase === 'decrypting' ? (
                  <div>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      border: '3px solid #FF6B00',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      margin: '0 auto 8px',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    <div style={{ color: '#FF6B00', fontSize: '8px', letterSpacing: '0.1em' }}>
                      {simpleMode ? 'UNLOCKING' : 'AES-256'}
                    </div>
                  </div>
                ) : demoPhase === 'delivering' ? (
                  <div style={{ animation: 'pulse 0.5s ease infinite' }}>
                    <div style={{ fontSize: '28px', marginBottom: '4px' }}>📤</div>
                    <div style={{ color: '#FF6B00', fontSize: '8px', letterSpacing: '0.1em' }}>SENDING</div>
                  </div>
                ) : showCheckmark ? (
                  <div style={{
                    width: '32px',
                    height: '16px',
                    borderLeft: '4px solid #00FF88',
                    borderBottom: '4px solid #00FF88',
                    animation: 'checkmark 0.4s ease forwards'
                  }} />
                ) : (
                  <>
                    <div style={{
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontSize: '28px',
                      fontWeight: 700,
                      color: demoPhase === 'warning' ? '#FF6B00' : '#FFFFFF',
                      lineHeight: 1
                    }}>{demoTime}</div>
                    <div style={{
                      color: '#7BA3C9',
                      fontSize: '9px',
                      letterSpacing: '0.1em',
                      marginTop: '2px'
                    }}>HOURS</div>
                  </>
                )}
              </div>

              {/* Pulse ring on warning */}
              {demoPhase === 'warning' && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '100%',
                  height: '100%',
                  border: '2px solid #FF6B00',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  animation: 'expand 1s ease-out infinite'
                }} />
              )}
            </div>
          </div>

          {/* Check-in Button */}
          <button
            onClick={() => {
              if (demoPhase === 'countdown' || demoPhase === 'warning') {
                handleCheckIn()
              }
            }}
            disabled={demoPhase !== 'countdown' && demoPhase !== 'warning' && demoPhase !== 'checkin'}
            style={{
              width: '100%',
              padding: '16px',
              background:
                demoPhase === 'released' ? '#00FF88' :
                (demoPhase === 'collecting' || demoPhase === 'decrypting' || demoPhase === 'delivering') ? 'rgba(255, 107, 0, 0.3)' :
                '#FF6B00',
              border: 'none',
              color:
                demoPhase === 'released' ? '#0A0A0A' :
                (demoPhase === 'collecting' || demoPhase === 'decrypting' || demoPhase === 'delivering') ? '#FF6B00' :
                '#0A0A0A',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              cursor: (demoPhase === 'countdown' || demoPhase === 'warning') ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase'
            }}
          >
            {demoPhase === 'released' ? 'Message Delivered!' :
             demoPhase === 'collecting' ? (simpleMode ? 'Gathering pieces...' : 'Collecting fragments...') :
             demoPhase === 'decrypting' ? (simpleMode ? 'Unlocking message...' : 'Decrypting payload...') :
             demoPhase === 'delivering' ? (simpleMode ? 'Sending message...' : 'Delivering to recipient...') :
             simpleMode ? 'Tap to Check In' : 'Execute Check-In'}
          </button>

          {/* Demo explanation */}
          <p style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.4)',
            textAlign: 'center',
            marginTop: '16px',
            lineHeight: 1.5
          }}>
            {simpleMode
              ? "Watch the timer count down. Tap the button to reset it. If it reaches zero, your message is sent automatically."
              : "Simulated 72h countdown. Check-in resets timer. Zero triggers autonomous message release."
            }
          </p>
        </section>

        {/* Animated Fragments Visual */}
        <section style={{
          padding: '24px',
          background: '#FFFFFF',
          borderTop: '4px solid #0A0A0A',
          borderBottom: '4px solid #0A0A0A',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '180px'
        }}>
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '12px',
            fontSize: '9px',
            letterSpacing: '0.15em',
            opacity: 0.4
          }}>{simpleMode ? 'YOUR SECRET, SPLIT UP' : 'FRAGMENT DISTRIBUTION'}</div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            paddingTop: '40px',
            paddingBottom: '20px'
          }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                width: '40px',
                height: '40px',
                background: i < 3 ? '#FF6B00' : '#0A0A0A',
                transform: 'rotate(45deg)',
                opacity: fragmentsVisible ? 1 : 0,
                animation: fragmentsVisible ? `float 2.5s ease-in-out infinite ${i * 0.15}s` : 'none',
                transition: 'opacity 0.5s ease',
                transitionDelay: `${i * 0.1}s`,
                boxShadow: i < 3 ? '0 4px 20px rgba(255, 107, 0, 0.4)' : '0 4px 20px rgba(0, 0, 0, 0.2)'
              }} />
            ))}
          </div>

          <div style={{ textAlign: 'center', fontSize: '11px', color: '#0A0A0A' }}>
            {simpleMode ? (
              <><span style={{ color: '#FF6B00', fontWeight: 700 }}>Any 3</span> pieces unlock your message</>
            ) : (
              <><span style={{ color: '#FF6B00', fontWeight: 700 }}>3</span> of <span style={{ fontWeight: 700 }}>5</span> fragments required</>
            )}
          </div>
        </section>

        {/* Orange accent bar */}
        <div style={{ height: '12px', background: '#FF6B00' }} />

        {/* Flow Steps */}
        <section style={{ background: '#0A0A0A', padding: '0' }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: '#FFFFFF', fontSize: '9px', letterSpacing: '0.15em' }}>
              {simpleMode ? 'THE PROCESS' : 'SYSTEM OPERATION FLOW'}
            </span>
            <span style={{ color: '#FF6B00', fontSize: '9px', letterSpacing: '0.1em' }}>
              {simpleMode ? '5 STEPS' : 'REF: EL-001'}
            </span>
          </div>

          {steps.map((step, i) => (
            <div key={i} style={{
              display: 'flex',
              borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              animation: `slideIn 0.5s ease ${i * 0.1}s both`
            }}>
              <div style={{
                width: '56px',
                background: activeStep === i ? '#FF6B00' : 'rgba(123, 163, 201, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                color: activeStep === i ? '#0A0A0A' : '#FFFFFF',
                transition: 'all 0.3s ease'
              }}>{step.num}</div>
              <div style={{ flex: 1, padding: '16px 20px' }}>
                <div style={{
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  marginBottom: '4px'
                }}>{step.label}</div>
                <div style={{ color: '#7BA3C9', fontSize: '11px' }}>{step.desc}</div>
              </div>
              {activeStep === i && (
                <div style={{ width: '4px', background: '#FF6B00', animation: 'glow 1.5s ease-in-out infinite' }} />
              )}
            </div>
          ))}
        </section>

        {/* Specs Grid */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px',
          padding: '4px',
          background: '#A8C5DC'
        }}>
          {(simpleMode ? [
            { label: 'SECURITY', value: 'Bank-level' },
            { label: 'BACKUP', value: '5 copies' },
            { label: 'STORAGE', value: 'Worldwide' },
            { label: 'TIMER', value: 'You choose' }
          ] : [
            { label: 'ENCRYPTION', value: 'AES-256' },
            { label: 'KEY SPLIT', value: '3-of-5' },
            { label: 'RELAYS', value: '7+ nodes' },
            { label: 'TIMELOCK', value: 'Bitcoin' }
          ]).map((spec, i) => (
            <div key={i} style={{
              background: '#FFFFFF',
              padding: '20px 16px',
              borderLeft: '4px solid #FF6B00'
            }}>
              <div style={{
                fontSize: '8px',
                letterSpacing: '0.15em',
                color: '#0A0A0A',
                opacity: 0.5,
                marginBottom: '6px'
              }}>{spec.label}</div>
              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 700,
                color: '#0A0A0A'
              }}>{spec.value}</div>
            </div>
          ))}
        </section>

        {/* Trust Model */}
        <section style={{
          background: '#FFFFFF',
          borderTop: '4px solid #0A0A0A',
          padding: '32px 24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#FF6B00',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 700,
              color: '#0A0A0A',
              flexShrink: 0
            }}>{simpleMode ? '?' : '!'}</div>
            <div>
              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 700,
                color: '#0A0A0A',
                marginBottom: '8px'
              }}>{simpleMode ? 'Why is this safe?' : 'Zero Trust Architecture'}</div>
              <p style={{
                fontSize: '12px',
                color: '#0A0A0A',
                opacity: 0.7,
                lineHeight: 1.6
              }}>
                {simpleMode
                  ? "Your message is split into pieces stored in different places around the world. No single person or company can read it. Only when enough pieces come together does the message become readable again."
                  : "You don't trust any single relay, server, or company. The math protects you. Even we can't read your message or stop the release."
                }
              </p>
            </div>
          </div>

          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '13px',
            color: '#FF6B00',
            padding: '16px',
            background: 'rgba(255, 107, 0, 0.1)',
            borderLeft: '4px solid #FF6B00'
          }}>
            {simpleMode ? 'No one can stop it. Not even us.' : 'trust_no_one == trust_everyone'}
          </div>
        </section>

        {/* Network Visual */}
        <section style={{
          background: '#0A0A0A',
          padding: '32px 24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            fontSize: '9px',
            letterSpacing: '0.15em',
            color: '#FFFFFF',
            opacity: 0.5,
            marginBottom: '24px'
          }}>{simpleMode ? 'STORED AROUND THE WORLD' : 'GLOBAL RELAY NETWORK'}</div>

          <div style={{ position: 'relative', height: '140px' }}>
            {[
              { x: '10%', y: '20%', delay: 0 },
              { x: '30%', y: '60%', delay: 0.2 },
              { x: '45%', y: '25%', delay: 0.4 },
              { x: '60%', y: '70%', delay: 0.6 },
              { x: '75%', y: '35%', delay: 0.8 },
              { x: '88%', y: '55%', delay: 1.0 },
              { x: '50%', y: '85%', delay: 1.2 },
            ].map((node, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                width: '12px',
                height: '12px',
                background: i < 3 ? '#FF6B00' : '#7BA3C9',
                borderRadius: '50%',
                animation: `pulse 2s ease-in-out infinite ${node.delay}s`,
                boxShadow: i < 3 ? '0 0 20px rgba(255, 107, 0, 0.6)' : '0 0 15px rgba(123, 163, 201, 0.4)'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '30px',
                  height: '30px',
                  border: `1px solid ${i < 3 ? '#FF6B00' : '#7BA3C9'}`,
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  opacity: 0.3,
                  animation: `pulse 2s ease-in-out infinite ${node.delay}s`
                }} />
              </div>
            ))}

            <svg style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0.2
            }}>
              <line x1="10%" y1="20%" x2="30%" y2="60%" stroke="#FFFFFF" strokeWidth="1"/>
              <line x1="30%" y1="60%" x2="45%" y2="25%" stroke="#FFFFFF" strokeWidth="1"/>
              <line x1="45%" y1="25%" x2="60%" y2="70%" stroke="#FFFFFF" strokeWidth="1"/>
              <line x1="60%" y1="70%" x2="75%" y2="35%" stroke="#FFFFFF" strokeWidth="1"/>
              <line x1="75%" y1="35%" x2="88%" y2="55%" stroke="#FFFFFF" strokeWidth="1"/>
              <line x1="45%" y1="25%" x2="75%" y2="35%" stroke="#FFFFFF" strokeWidth="1"/>
              <line x1="30%" y1="60%" x2="60%" y2="70%" stroke="#FFFFFF" strokeWidth="1"/>
            </svg>
          </div>

          <p style={{
            fontSize: '11px',
            color: '#FFFFFF',
            opacity: 0.6,
            marginTop: '20px',
            lineHeight: 1.6
          }}>
            {simpleMode
              ? "Your message pieces are kept in 7+ different locations. Even if most of them went offline, your message would still be delivered."
              : "Fragments distributed across independent Nostr relays. Even if 4 disappear, your message survives."
            }
          </p>
        </section>

        {/* Use Cases - Simple mode only */}
        {simpleMode && (
          <section style={{
            background: '#FFFFFF',
            borderTop: '4px solid #0A0A0A',
            padding: '24px'
          }}>
            <div style={{
              fontSize: '9px',
              letterSpacing: '0.15em',
              opacity: 0.5,
              marginBottom: '16px'
            }}>WHAT PEOPLE USE IT FOR</div>

            {[
              { icon: '🔑', text: 'Password inheritance for family' },
              { icon: '💌', text: 'Letters to loved ones' },
              { icon: '📋', text: 'Important instructions' },
              { icon: '🛡️', text: 'Insurance information' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 0',
                borderBottom: i < 3 ? '1px solid rgba(0,0,0,0.1)' : 'none'
              }}>
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <span style={{ fontSize: '13px', color: '#0A0A0A' }}>{item.text}</span>
              </div>
            ))}
          </section>
        )}

        {/* Hazard Warning */}
        <section style={{
          background: '#FFFFFF',
          borderTop: '4px solid #0A0A0A',
          display: 'flex'
        }}>
          <div className="hazard-stripe" style={{ width: '48px', flexShrink: 0 }} />
          <div style={{ padding: '20px 16px' }}>
            <div style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 700,
              color: '#0A0A0A',
              marginBottom: '4px'
            }}>{simpleMode ? 'Still in Testing' : 'Development Status: Prototype'}</div>
            <p style={{
              fontSize: '10px',
              color: '#0A0A0A',
              opacity: 0.6,
              lineHeight: 1.5
            }}>
              {simpleMode
                ? "We're still testing this. Don't use it for anything super important yet."
                : "Experimental. Bitcoin Testnet. Security audit pending."
              }
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          background: '#0A0A0A',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="24" height="24" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#FFFFFF" strokeWidth="5" opacity="0.3"/>
              <circle cx="50" cy="50" r="30" fill="none" stroke="#FFFFFF" strokeWidth="5" opacity="0.6"/>
              <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
            </svg>
            <span style={{ color: '#FFFFFF', fontSize: '11px', letterSpacing: '0.15em' }}>ECHOLOCK</span>
          </div>
          <span style={{ color: '#FFFFFF', fontSize: '9px', opacity: 0.4 }}>v0.1.0-alpha</span>
        </footer>

        {/* Hazard stripe bottom */}
        <div className="hazard-stripe" style={{ height: '8px' }} />
      </div>
    </>
  )
}
