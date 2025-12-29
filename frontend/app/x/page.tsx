'use client'

import { useEffect, useState, useCallback } from 'react'

export default function ExplainerPage() {
  const [simpleMode, setSimpleMode] = useState(true) // Start in simple mode

  // Message lifecycle demo
  const originalMessage = "The key is under the blue flowerpot."
  const [displayText, setDisplayText] = useState('')
  const [phase, setPhase] = useState<
    'typing' | 'encrypting' | 'fragmenting' | 'distributing' | 'waiting' |
    'collecting' | 'decrypting' | 'revealed' | 'pause'
  >('typing')
  const [fragmentPositions, setFragmentPositions] = useState([
    { x: 50, y: 50, collected: false },
    { x: 50, y: 50, collected: false },
    { x: 50, y: 50, collected: false },
    { x: 50, y: 50, collected: false },
    { x: 50, y: 50, collected: false },
  ])
  const [encryptProgress, setEncryptProgress] = useState(0)
  const [waitingDays, setWaitingDays] = useState(0)
  const [recipient, setRecipient] = useState(false)

  // Scramble text helper
  const scrambleText = (text: string, amount: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    return text.split('').map((char, i) => {
      if (char === ' ') return ' '
      if (Math.random() < amount) {
        return chars[Math.floor(Math.random() * chars.length)]
      }
      return char
    }).join('')
  }

  // Main animation loop
  useEffect(() => {
    let timeout: NodeJS.Timeout

    const runPhase = () => {
      switch (phase) {
        case 'typing':
          // Type out message character by character
          let charIndex = 0
          const typeInterval = setInterval(() => {
            charIndex++
            setDisplayText(originalMessage.slice(0, charIndex))
            if (charIndex >= originalMessage.length) {
              clearInterval(typeInterval)
              setTimeout(() => setPhase('encrypting'), 1000)
            }
          }, 60)
          return () => clearInterval(typeInterval)

        case 'encrypting':
          // Scramble the text progressively
          let progress = 0
          const encryptInterval = setInterval(() => {
            progress += 0.05
            setEncryptProgress(progress)
            setDisplayText(scrambleText(originalMessage, Math.min(progress, 1)))
            if (progress >= 1) {
              clearInterval(encryptInterval)
              setTimeout(() => setPhase('fragmenting'), 800)
            }
          }, 50)
          return () => clearInterval(encryptInterval)

        case 'fragmenting':
          // Show key splitting
          setTimeout(() => setPhase('distributing'), 1500)
          break

        case 'distributing':
          // Scatter fragments to different positions
          const scattered = [
            { x: 15, y: 20, collected: false },
            { x: 75, y: 15, collected: false },
            { x: 25, y: 75, collected: false },
            { x: 85, y: 65, collected: false },
            { x: 50, y: 85, collected: false },
          ]
          setFragmentPositions(scattered)
          setTimeout(() => setPhase('waiting'), 2000)
          break

        case 'waiting':
          // Show time passing
          let days = 0
          const waitInterval = setInterval(() => {
            days++
            setWaitingDays(days)
            if (days >= 3) {
              clearInterval(waitInterval)
              setTimeout(() => {
                setRecipient(true)
                setPhase('collecting')
              }, 500)
            }
          }, 600)
          return () => clearInterval(waitInterval)

        case 'collecting':
          // Collect fragments one by one
          let collected = 0
          const collectInterval = setInterval(() => {
            setFragmentPositions(prev => prev.map((f, i) =>
              i === collected ? { ...f, x: 50, y: 50, collected: true } : f
            ))
            collected++
            if (collected >= 3) {
              clearInterval(collectInterval)
              setTimeout(() => setPhase('decrypting'), 1000)
            }
          }, 700)
          return () => clearInterval(collectInterval)

        case 'decrypting':
          // Unscramble the text
          let decrypt = 1
          const decryptInterval = setInterval(() => {
            decrypt -= 0.05
            setEncryptProgress(decrypt)
            setDisplayText(scrambleText(originalMessage, Math.max(decrypt, 0)))
            if (decrypt <= 0) {
              clearInterval(decryptInterval)
              setDisplayText(originalMessage)
              setTimeout(() => setPhase('revealed'), 500)
            }
          }, 50)
          return () => clearInterval(decryptInterval)

        case 'revealed':
          setTimeout(() => setPhase('pause'), 3000)
          break

        case 'pause':
          // Reset everything
          setTimeout(() => {
            setDisplayText('')
            setEncryptProgress(0)
            setWaitingDays(0)
            setRecipient(false)
            setFragmentPositions([
              { x: 50, y: 50, collected: false },
              { x: 50, y: 50, collected: false },
              { x: 50, y: 50, collected: false },
              { x: 50, y: 50, collected: false },
              { x: 50, y: 50, collected: false },
            ])
            setPhase('typing')
          }, 1500)
          break
      }
    }

    runPhase()
  }, [phase])

  const phaseLabels: Record<string, { simple: string; technical: string }> = {
    typing: { simple: 'Writing message', technical: 'INPUT' },
    encrypting: { simple: 'Scrambling', technical: 'AES-256-GCM ENCRYPT' },
    fragmenting: { simple: 'Splitting the key', technical: 'SHAMIR SECRET SHARING' },
    distributing: { simple: 'Hiding the pieces', technical: 'NOSTR RELAY DISTRIBUTION' },
    waiting: { simple: 'Time passes...', technical: 'TIMER COUNTDOWN' },
    collecting: { simple: 'Gathering pieces', technical: 'FRAGMENT COLLECTION' },
    decrypting: { simple: 'Unscrambling', technical: 'AES-256-GCM DECRYPT' },
    revealed: { simple: 'Message delivered', technical: 'PLAINTEXT RECOVERED' },
    pause: { simple: '', technical: '' },
  }

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
          --green: #00FF88;
        }

        body { background: var(--black); overflow-x: hidden; }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scatter {
          from { transform: translate(0, 0) rotate(45deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }

        @keyframes check {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
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
          height: 44px;
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

        .toggle-option.active { color: #0A0A0A; }

        .toggle-slider {
          position: absolute;
          top: 4px;
          left: 4px;
          width: calc(50% - 8px);
          height: 36px;
          background: #FF6B00;
          transition: transform 0.3s ease;
        }

        .toggle-slider.right { transform: translateX(calc(100% + 8px)); }
      `}</style>

      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        background: '#0A0A0A',
        minHeight: '100vh',
        maxWidth: '390px',
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden'
      }}>

        {/* Header */}
        <header style={{
          background: '#0A0A0A',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg viewBox="0 0 100 100" style={{ width: '32px', height: '32px' }}>
              <circle cx="50" cy="50" r="44" fill="none" stroke="#FFFFFF" strokeWidth="5" opacity="0.3"/>
              <circle cx="50" cy="50" r="30" fill="none" stroke="#FFFFFF" strokeWidth="5" opacity="0.6"/>
              <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
            </svg>
            <span style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em' }}>ECHOLOCK</span>
          </div>
          <span style={{ color: '#FF6B00', fontSize: '9px', letterSpacing: '0.1em' }}>HOW IT WORKS</span>
        </header>

        {/* Mode Toggle */}
        <div className="toggle-track" onClick={() => setSimpleMode(!simpleMode)}>
          <div className={`toggle-slider ${!simpleMode ? 'right' : ''}`} />
          <div className={`toggle-option ${simpleMode ? 'active' : ''}`}>SIMPLE</div>
          <div className={`toggle-option ${!simpleMode ? 'active' : ''}`}>TECHNICAL</div>
        </div>

        {/* Phase Indicator */}
        <div style={{
          padding: '16px 20px',
          background: phase === 'revealed' ? '#00FF88' : '#FF6B00',
          transition: 'background 0.3s ease'
        }}>
          <div style={{
            color: '#0A0A0A',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textAlign: 'center'
          }}>
            {simpleMode ? phaseLabels[phase]?.simple : phaseLabels[phase]?.technical}
          </div>
        </div>

        {/* Sender/Recipient Indicator */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{
            flex: 1,
            padding: '12px 20px',
            background: !recipient ? 'rgba(123, 163, 201, 0.2)' : 'transparent',
            borderRight: '1px solid rgba(255,255,255,0.1)',
            transition: 'background 0.3s ease'
          }}>
            <div style={{
              fontSize: '8px',
              letterSpacing: '0.15em',
              color: !recipient ? '#7BA3C9' : 'rgba(255,255,255,0.3)',
              textAlign: 'center'
            }}>
              {simpleMode ? 'YOU' : 'SENDER'}
            </div>
          </div>
          <div style={{
            flex: 1,
            padding: '12px 20px',
            background: recipient ? 'rgba(123, 163, 201, 0.2)' : 'transparent',
            transition: 'background 0.3s ease'
          }}>
            <div style={{
              fontSize: '8px',
              letterSpacing: '0.15em',
              color: recipient ? '#7BA3C9' : 'rgba(255,255,255,0.3)',
              textAlign: 'center'
            }}>
              {simpleMode ? 'THEM' : 'RECIPIENT'}
            </div>
          </div>
        </div>

        {/* Main Display Area */}
        <div style={{
          padding: '24px 20px',
          minHeight: '140px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: phase === 'revealed'
            ? 'linear-gradient(180deg, rgba(0,255,136,0.1) 0%, transparent 100%)'
            : 'transparent',
          transition: 'background 0.5s ease'
        }}>
          {/* Message Display */}
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '15px',
            lineHeight: 1.6,
            color: phase === 'encrypting' || phase === 'fragmenting'
              ? '#FF6B00'
              : phase === 'revealed'
                ? '#00FF88'
                : '#FFFFFF',
            minHeight: '48px',
            position: 'relative',
            wordBreak: 'break-word',
            transition: 'color 0.3s ease'
          }}>
            {displayText}
            {phase === 'typing' && (
              <span style={{
                display: 'inline-block',
                width: '2px',
                height: '18px',
                background: '#FFFFFF',
                marginLeft: '2px',
                verticalAlign: 'middle',
                animation: 'blink 1s infinite'
              }} />
            )}
            {phase === 'pause' && (
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                {simpleMode ? 'Watch the message journey...' : 'Restarting demonstration...'}
              </span>
            )}
          </div>

          {/* Encryption Progress Bar */}
          {(phase === 'encrypting' || phase === 'decrypting') && (
            <div style={{ marginTop: '16px' }}>
              <div style={{
                height: '4px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${phase === 'encrypting' ? encryptProgress * 100 : (1 - encryptProgress) * 100}%`,
                  background: phase === 'decrypting' ? '#00FF88' : '#FF6B00',
                  transition: 'width 0.05s linear'
                }} />
              </div>
              <div style={{
                marginTop: '8px',
                fontSize: '9px',
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.1em'
              }}>
                {phase === 'encrypting'
                  ? (simpleMode ? 'Making it unreadable...' : '256-bit encryption in progress')
                  : (simpleMode ? 'Making it readable again...' : 'Authenticated decryption')}
              </div>
            </div>
          )}
        </div>

        {/* Fragment Visualization */}
        <div style={{
          height: '200px',
          position: 'relative',
          background: '#0A0A0A',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Grid lines for Ulm aesthetic */}
          <svg style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.05
          }}>
            {[...Array(10)].map((_, i) => (
              <line key={`v${i}`} x1={`${i * 10}%`} y1="0" x2={`${i * 10}%`} y2="100%" stroke="#FFFFFF" strokeWidth="1"/>
            ))}
            {[...Array(5)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={`${i * 25}%`} x2="100%" y2={`${i * 25}%`} stroke="#FFFFFF" strokeWidth="1"/>
            ))}
          </svg>

          {/* Central Key/Lock Icon */}
          {(phase === 'fragmenting' || phase === 'distributing' || phase === 'waiting' || phase === 'collecting') && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '40px',
              height: '40px',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                fontSize: '16px'
              }}>
                {phase === 'waiting' ? '⏳' : '🔐'}
              </div>
            </div>
          )}

          {/* Fragments */}
          {fragmentPositions.map((pos, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%) rotate(45deg)',
                width: i < 3 ? '24px' : '20px',
                height: i < 3 ? '24px' : '20px',
                background: pos.collected ? '#00FF88' : (i < 3 ? '#FF6B00' : '#7BA3C9'),
                opacity: phase === 'typing' || phase === 'encrypting' ? 0 :
                         phase === 'fragmenting' ? 1 :
                         phase === 'revealed' || phase === 'pause' ? 0 : 1,
                transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: pos.collected
                  ? '0 0 20px rgba(0, 255, 136, 0.5)'
                  : i < 3
                    ? '0 0 15px rgba(255, 107, 0, 0.4)'
                    : '0 0 10px rgba(123, 163, 201, 0.3)'
              }}
            />
          ))}

          {/* Labels */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '20px',
            right: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '8px',
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.3)'
          }}>
            <span>{simpleMode ? '5 PIECES' : '5 FRAGMENTS'}</span>
            <span style={{ color: '#FF6B00' }}>{simpleMode ? 'NEED 3' : 'THRESHOLD: 3'}</span>
          </div>

          {/* Waiting counter */}
          {phase === 'waiting' && (
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#FFFFFF',
                fontFamily: "'IBM Plex Sans', sans-serif"
              }}>{waitingDays * 24}h</div>
              <div style={{
                fontSize: '8px',
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.15em',
                marginTop: '4px'
              }}>{simpleMode ? 'NO CHECK-IN' : 'SINCE LAST CHECK-IN'}</div>
            </div>
          )}
        </div>

        {/* Process Steps */}
        <div style={{ background: '#0A0A0A' }}>
          {[
            { id: 'typing', icon: '✏️', simple: 'Write', tech: 'INPUT' },
            { id: 'encrypting', icon: '🔒', simple: 'Lock', tech: 'ENCRYPT' },
            { id: 'fragmenting', icon: '💎', simple: 'Split', tech: 'FRAGMENT' },
            { id: 'distributing', icon: '🌐', simple: 'Hide', tech: 'DISTRIBUTE' },
            { id: 'waiting', icon: '⏰', simple: 'Wait', tech: 'TIMER' },
            { id: 'collecting', icon: '🧲', simple: 'Gather', tech: 'COLLECT' },
            { id: 'decrypting', icon: '🔓', simple: 'Unlock', tech: 'DECRYPT' },
            { id: 'revealed', icon: '✉️', simple: 'Read', tech: 'PLAINTEXT' },
          ].map((step, i) => {
            const isActive = step.id === phase
            const isPast = ['typing', 'encrypting', 'fragmenting', 'distributing', 'waiting', 'collecting', 'decrypting', 'revealed']
              .indexOf(phase) > i

            return (
              <div key={step.id} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 20px',
                background: isActive ? 'rgba(255, 107, 0, 0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid #FF6B00' : '3px solid transparent',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  width: '28px',
                  fontSize: '14px',
                  opacity: isActive ? 1 : isPast ? 0.5 : 0.2
                }}>{step.icon}</div>
                <div style={{
                  flex: 1,
                  fontSize: '10px',
                  fontWeight: isActive ? 700 : 400,
                  letterSpacing: '0.1em',
                  color: isActive ? '#FF6B00' : isPast ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'
                }}>
                  {simpleMode ? step.simple : step.tech}
                </div>
                {isPast && (
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path
                      d="M2 6 L5 9 L10 3"
                      fill="none"
                      stroke="#00FF88"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: 24,
                        animation: 'check 0.3s ease forwards'
                      }}
                    />
                  </svg>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer explanation */}
        <div style={{
          padding: '20px',
          background: '#0A0A0A',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <p style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.4)',
            lineHeight: 1.6,
            textAlign: 'center'
          }}>
            {simpleMode
              ? "Your message becomes unreadable, gets split into pieces hidden around the world. If you don't check in, it reassembles and delivers itself."
              : "AES-256-GCM encryption → Shamir 3-of-5 split → Nostr relay distribution → Timer expiry → Fragment collection → Authenticated decryption"
            }
          </p>
        </div>

        {/* Hazard stripe */}
        <div className="hazard-stripe" style={{ height: '6px' }} />

        {/* Bottom bar */}
        <div style={{
          padding: '16px 20px',
          background: '#0A0A0A',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '9px',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.1em'
          }}>echolock.xyz</span>
          <span style={{
            fontSize: '9px',
            color: '#FF6B00',
            letterSpacing: '0.1em'
          }}>{simpleMode ? 'NO ONE CAN STOP IT' : 'ZERO TRUST'}</span>
        </div>
      </div>
    </>
  )
}
