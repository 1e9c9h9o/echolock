'use client'

import { useEffect, useState } from 'react'

export default function ExplainerPage() {
  const [activeStep, setActiveStep] = useState(0)
  const [fragmentsVisible, setFragmentsVisible] = useState(false)
  const [simpleMode, setSimpleMode] = useState(false)

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
