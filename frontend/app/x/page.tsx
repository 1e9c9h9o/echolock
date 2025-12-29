import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'EchoLock',
  robots: 'noindex, nofollow',
}

export default function ExplainerPage() {
  return (
    <div style={{
      fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
      background: '#0a0a0a',
      color: '#fafafa',
      lineHeight: 1.5,
      padding: '32px',
      minHeight: '100vh',
      maxWidth: '390px',
      margin: '0 auto',
    }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes float {
          0%, 100% { transform: rotate(45deg) translateY(0); }
          50% { transform: rotate(45deg) translateY(-8px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(3); opacity: 0; }
        }
      `}</style>

      {/* Header */}
      <header style={{ marginBottom: '48px' }}>
        <p style={{
          fontFamily: "'SF Mono', 'Menlo', monospace",
          fontSize: '0.75rem',
          letterSpacing: '0.02em',
          color: '#00a8ff',
          marginBottom: '8px'
        }}>ECHOLOCK</p>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 600,
          letterSpacing: '-0.03em',
          marginBottom: '16px'
        }}>Dead Man's Switch</h1>
        <p style={{ color: '#666', fontSize: '0.9375rem' }}>
          Cryptographic insurance for your digital legacy. No single point of failure.
        </p>
      </header>

      {/* Problem */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#666',
          marginBottom: '8px'
        }}>The Problem</h2>
        <p style={{ color: '#666', fontSize: '0.9375rem' }}>
          If something happens to you, how do your loved ones access critical information?
          Passwords die with you. Lawyers can be compromised. Cloud services get shut down.
        </p>
      </section>

      {/* Solution */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#666',
          marginBottom: '8px'
        }}>The Solution</h2>
        <div style={{
          fontFamily: "'SF Mono', monospace",
          fontSize: '0.8125rem',
          color: '#00a8ff',
          padding: '16px',
          background: 'rgba(0,168,255,0.05)',
          borderLeft: '2px solid #00a8ff',
          marginBottom: '24px'
        }}>
          message + time lock = autonomous release
        </div>
        <p style={{ color: '#666', fontSize: '0.9375rem' }}>
          Write a message. Set a timer. Check in regularly. If you stop checking in,
          your message releases automatically to your chosen recipients.
        </p>
      </section>

      {/* How It Works */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#666',
          marginBottom: '8px'
        }}>How It Works</h2>

        {/* Visual: Shards */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          padding: '32px 0',
          marginBottom: '24px'
        }}>
          {[1, 0.8, 0.6, 0.4, 0.2].map((opacity, i) => (
            <div key={i} style={{
              width: '32px',
              height: '32px',
              background: '#00a8ff',
              opacity,
              transform: 'rotate(45deg)',
              animation: `float 3s ease-in-out infinite ${i * 0.2}s`
            }} />
          ))}
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { num: '1', title: 'Encrypt', desc: 'Your message is encrypted with AES-256-GCM. Military-grade. Unbreakable.' },
            { num: '2', title: 'Shatter', desc: 'The encryption key is split into 5 fragments using Shamir\'s Secret Sharing. Need 3 to reconstruct.' },
            { num: '3', title: 'Scatter', desc: 'Fragments distributed across 7+ independent Nostr relays worldwide. No single server to compromise.' },
            { num: '4', title: 'Timestamp', desc: 'Bitcoin blockchain anchors the timer. 800,000+ nodes verify. Unstoppable.' },
            { num: '5', title: 'Release', desc: 'Timer expires. Fragments reunite. Message decrypts. Recipients notified.' },
          ].map((step, i) => (
            <div key={i}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr',
                gap: '16px',
                alignItems: 'start'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  border: '1px solid #fafafa',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 300
                }}>{step.num}</div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '4px' }}>{step.title}</h3>
                  <p style={{ fontSize: '0.8125rem', color: '#666', lineHeight: 1.4 }}>{step.desc}</p>
                </div>
              </div>
              {i < 4 && (
                <div style={{
                  width: '1px',
                  height: '24px',
                  background: '#fafafa',
                  opacity: 0.2,
                  marginLeft: '24px'
                }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Network Visual */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#666',
          marginBottom: '8px'
        }}>Decentralized Network</h2>
        <div style={{ position: 'relative', height: '120px', marginBottom: '24px' }}>
          {[
            { top: '20%', left: '15%' },
            { top: '60%', left: '25%' },
            { top: '30%', left: '50%' },
            { top: '70%', left: '55%' },
            { top: '40%', left: '75%' },
            { top: '80%', left: '85%' },
            { top: '15%', left: '80%' },
          ].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: '8px',
              height: '8px',
              background: '#00a8ff',
              borderRadius: '50%',
              top: pos.top,
              left: pos.left
            }} />
          ))}
        </div>
        <p style={{ color: '#666', fontSize: '0.9375rem' }}>
          Your fragments live on independent Nostr relays run by different people in different countries.
          Even if 4 relays disappear, your message survives.
        </p>
      </section>

      {/* Technology */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#666',
          marginBottom: '8px'
        }}>Technology</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px'
        }}>
          {[
            { title: 'AES-256-GCM', desc: 'Authenticated encryption. Same standard protecting state secrets.' },
            { title: 'Shamir SSS', desc: 'Mathematically proven secret sharing. 3-of-5 threshold.' },
            { title: 'Nostr', desc: 'Censorship-resistant relay network. Permissionless. Global.' },
            { title: 'Bitcoin', desc: 'BIP65 timelocks. Trustless time. No central clock.' },
          ].map((tech, i) => (
            <div key={i} style={{
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '16px'
            }}>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '4px' }}>{tech.title}</h4>
              <p style={{ fontSize: '0.6875rem', color: '#666', lineHeight: 1.3 }}>{tech.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Model */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#666',
          marginBottom: '8px'
        }}>Trust Model</h2>
        <div style={{
          fontFamily: "'SF Mono', monospace",
          fontSize: '0.8125rem',
          color: '#00a8ff',
          padding: '16px',
          background: 'rgba(0,168,255,0.05)',
          borderLeft: '2px solid #00a8ff',
          marginBottom: '24px'
        }}>
          trust no one = trust everyone
        </div>
        <p style={{ color: '#666', fontSize: '0.9375rem' }}>
          You don't trust any single relay, server, or company. The math protects you.
          Even we can't read your message or stop the release.
        </p>
      </section>

      {/* Footer */}
      <footer style={{
        paddingTop: '32px',
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}>
        <p style={{ fontSize: '0.75rem', textAlign: 'center', color: '#666' }}>echolock.xyz</p>
      </footer>
    </div>
  )
}
