import './App.css'

function App() {
  return (
    <div className="page">
      <header className="nav">
        <div className="nav-left">
          <span className="logo-dot" />
          <span className="logo-text">AtmosAI</span>
        </div>
        <nav className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#demo-modes">Use cases</a>
        </nav>
        <button className="nav-cta">Book a bar demo</button>
      </header>

      <main>
        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="taiv-tag">Powered by Taiv</p>
            <h1>
              TV that feels
              <br />
              <span>the crowd.</span>
            </h1>
            <p className="hero-subtitle">
              AtmosAI is an AI-powered TV layer for sports bars and restaurants.
              It listens to crowd energy in real time and automatically triggers
              celebrations, drink specials, and interactive games when your guests
              are most engaged.
            </p>
            <div className="hero-actions">
              <button className="primary-cta">See live celebration demo</button>
              <button className="ghost-cta">Talk to our team</button>
            </div>
            <div className="hero-meta">
              <span>Built for sports bars & venues</span>
              <span>Plugs into your existing TVs</span>
            </div>
          </div>

          <div className="hero-panel">
            <div className="stadium-screen">
              <div className="screen-top">
                <span className="pill live">LIVE</span>
                <span className="pill venue">Game Night · Main Bar</span>
              </div>
              <div className="screen-body">
                <div className="crowd-meter">
                  <span>Crowd energy</span>
                  <div className="meter-bar">
                    <div className="meter-fill" />
                  </div>
                  <p className="meter-label">Cheer spike detected!</p>
                </div>
                <div className="promo-card">
                  <p className="promo-title">Goal! 2-for-1 house shots</p>
                  <p className="promo-meta">For the next 10 minutes only</p>
                </div>
              </div>
              <div className="screen-footer">
                <span>AtmosAI reacts when your crowd does.</span>
              </div>
            </div>

            <div className="camera-card">
              <p className="camera-title">Camera sensing crowd reactions</p>
              <p className="camera-meta">
                Track cheers, chants and applause to measure which promos actually
                move the room.
              </p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section section-grid">
          <div className="section-intro">
            <h2>How AtmosAI works on game night</h2>
            <p>
              Plug our device into any TV, connect a small bar camera and mic, and
              AtmosAI turns crowd energy into dynamic offers and content.
            </p>
          </div>
          <ol className="steps">
            <li>
              <h3>1. Listen to the room</h3>
              <p>
                Our AI listens for roar volume, chanting and applause patterns to
                understand when your venue peaks.
              </p>
            </li>
            <li>
              <h3>2. Trigger smart promos</h3>
              <p>
                When the home team scores, AtmosAI instantly fires pre-set drink
                or food specials across your TVs.
              </p>
            </li>
            <li>
              <h3>3. Host AI trivia in breaks</h3>
              <p>
                During timeouts and halftime, an on-screen AI host runs trivia,
                polls and mini games to keep guests engaged.
              </p>
            </li>
          </ol>
        </section>

        <section id="features" className="section">
          <h2>What AtmosAI can do for your venue</h2>
          <p className="section-subtitle">
            From automated goal celebrations to AI trivia, AtmosAI turns TVs into
            revenue-driving experiences instead of passive screens.
          </p>
          <div className="feature-grid">
            <div className="feature-card">
              <h3>Crowd-aware celebrations</h3>
              <p>
                Trigger confetti animations, “GOAL!” takeovers and sponsor moments
                the instant volume spikes.
              </p>
            </div>
            <div className="feature-card">
              <h3>Dynamic drink & food specials</h3>
              <p>
                Auto-rotate promos like “2-for-1 wings” or “touchdown shots” based
                on live game states.
              </p>
            </div>
            <div className="feature-card">
              <h3>AI trivia host</h3>
              <p>
                Run themed trivia and crowd polls on the TV during breaks, with QR
                codes for guests to play along.
              </p>
            </div>
            <div className="feature-card">
              <h3>Real-time engagement analytics</h3>
              <p>
                Use the camera feed to see which promos actually spike cheering and
                dwell time at the bar.
              </p>
            </div>
          </div>
        </section>

        <section id="demo-modes" className="section">
          <h2>Switch between AtmosAI demo modes</h2>
          <p className="section-subtitle">
            Preview how AtmosAI behaves across different types of nights.
          </p>
          <div className="modes-row">
            <div className="mode-card">
              <h3>Big match night</h3>
              <p>
                High-energy profiles with aggressive promos when your team scores or
                hits key plays.
              </p>
            </div>
            <div className="mode-card">
              <h3>Chill weeknight</h3>
              <p>
                Softer prompts, quiz questions and happy hour nudges when the room
                is more relaxed.
              </p>
            </div>
            <div className="mode-card">
              <h3>Trivia takeover</h3>
              <p>
                Put the AI host front and center with full-screen games and
                leaderboard moments.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>AtmosAI · TV that knows the crowd.</p>
        <button className="primary-cta small">Request early access</button>
      </footer>
    </div>
  )
}

export default App
