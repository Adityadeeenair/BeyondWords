import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../sections-map.css'

const SECTIONS = [
  {
    id: 'letters',
    number: '01',
    name: 'Alphabet Meadow',
    subtitle: 'A to Z Letters',
    description: 'Learn finger spelling and master the full ISL alphabet.',
    landmark: 'sun',
    color: '#22c55e',
    light: 'rgba(34, 197, 94, 0.15)',
    glow: 'rgba(34, 197, 94, 0.35)',
    available: true,
    progress: 40,
    badge: '2 / 5 levels',
    levelsSummary: [
      { id: 1, label: 'A – E', type: 'Quiz', status: 'complete' },
      { id: 2, label: 'K – O', type: 'Webcam', status: 'complete' },
      { id: 3, label: 'F – J', type: 'Quiz', status: 'complete' },
      { id: 4, label: 'P – T', type: 'Webcam', status: 'active' },
      { id: 5, label: 'A – Z', type: 'Checkpoint', status: 'locked' },
    ]
  },
  {
    id: 'numbers',
    number: '02',
    name: 'Number Forest',
    subtitle: '0 to 9 Digits',
    description: 'Sign digits and counting combinations with real camera verification.',
    landmark: 'tree',
    color: '#38bdf8',
    light: 'rgba(56, 189, 248, 0.15)',
    glow: 'rgba(56, 189, 248, 0.35)',
    available: false,
    progress: 0,
    badge: 'Locked',
    levelsSummary: [
      { id: 1, label: '0 – 4', type: 'Quiz', status: 'locked' },
      { id: 2, label: '5 – 9', type: 'Webcam', status: 'locked' },
      { id: 3, label: '0 – 9', type: 'Checkpoint', status: 'locked' },
    ]
  },
  {
    id: 'word-forming',
    number: '03',
    name: 'Word Summit',
    subtitle: 'Essential Signs',
    description: 'Chain signs into meaningful words and phrases in everyday contexts.',
    landmark: 'temple',
    color: '#a855f7',
    light: 'rgba(168, 85, 247, 0.15)',
    glow: 'rgba(168, 85, 247, 0.35)',
    available: false,
    progress: 0,
    badge: 'Locked',
    levelsSummary: [
      { id: 1, label: 'Emergency', type: 'Story', status: 'locked' },
      { id: 2, label: 'Sign Word', type: 'Webcam', status: 'locked' },
      { id: 3, label: 'Full Test', type: 'Checkpoint', status: 'locked' },
    ]
  },
]

function SectionLandmark({ type, color }) {
  if (type === 'sun') {
    return (
      <div className="sm-landmark-sun">
        <svg viewBox="0 0 48 48" width="44" height="44" fill="none">
          <circle cx="24" cy="24" r="14" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2.5" />
          <path d="M24 2v5M24 41v5M2 24h5M41 24h5M8.4 8.4l3.5 3.5M36.1 36.1l3.5 3.5M8.4 39.6l3.5-3.5M36.1 11.9l3.5-3.5" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    )
  }
  if (type === 'tree') {
    return (
      <div className="sm-landmark-tree">
        <svg viewBox="0 0 48 48" width="44" height="44" fill="none">
          <path d="M24 44v-9" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
          <path d="M24 6l-12 15h6l-8 12h28l-8-12h6L24 6z" fill="#10b981" stroke="#059669" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }
  return (
    <div className="sm-landmark-temple">
      <svg viewBox="0 0 48 48" width="44" height="44" fill="none">
        <path d="M24 6L6 20h36L24 6z" fill="#c084fc" stroke="#9333ea" strokeWidth="2" strokeLinejoin="round" />
        <rect x="12" y="20" width="24" height="20" rx="3" fill="#382952" stroke="#a855f7" strokeWidth="2" />
        <path d="M20 40v-8a4 4 0 0 1 8 0v8" fill="#a855f7" />
      </svg>
    </div>
  )
}

export default function Sections() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="sm-root">
      {/* ── Top Nav ── */}
      <header className="sm-nav">
        <div className="sm-nav-brand">
          <span className="sm-nav-logo-mark">
            <svg viewBox="0 0 28 28" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-1.2-6-3.2L3.3 15.6a2 2 0 0 1 3.2-2.4L8 15" />
            </svg>
          </span>
          <span className="sm-nav-name">BeyondWords</span>
          <span className="sm-nav-tag">ISL ADVENTURE</span>
        </div>
        <div className="sm-nav-right">
          <span className="sm-nav-email">{user?.email}</span>
          <Link to="/ml-test" className="sm-nav-link">Hand tracker</Link>
          <button className="sm-nav-link sm-nav-logout" onClick={signOut}>Log out</button>
        </div>
      </header>

      {/* ── World Banner ── */}
      <section className="sm-hero">
        <div className="sm-hero-tag">EXPLORATION TRAIL</div>
        <h1 className="sm-hero-title">Your Sign Journey</h1>
        <p className="sm-hero-sub">Travel through Indian Sign Language zones from alphabet roots to full expressions.</p>
      </section>

      {/* ── Adventure Landscape Map Section ── */}
      <main className="sm-map-section">
        <div className="sm-map-canvas">
          {/* Decorative clouds */}
          <div className="sm-cloud sm-cloud-1" />
          <div className="sm-cloud sm-cloud-2" />
          <div className="sm-cloud sm-cloud-3" />

          {/* Curved Map Path SVG */}
          <svg className="sm-svg-path" viewBox="0 0 1000 360" preserveAspectRatio="none" aria-hidden="true">
            {/* Trail shadow */}
            <path
              d="M 120 230 C 260 250, 310 110, 500 130 C 690 150, 740 270, 880 200"
              fill="none"
              stroke="#0f1922"
              strokeWidth="28"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
            {/* Base trail */}
            <path
              d="M 120 230 C 260 250, 310 110, 500 130 C 690 150, 740 270, 880 200"
              fill="none"
              stroke="#1b3832"
              strokeWidth="20"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Stepping stones */}
            <path
              d="M 120 230 C 260 250, 310 110, 500 130 C 690 150, 740 270, 880 200"
              fill="none"
              stroke="#2e9b62"
              strokeWidth="12"
              strokeDasharray="16 14"
              strokeLinecap="round"
            />
            {/* Center guide glow */}
            <path
              d="M 120 230 C 260 250, 310 110, 500 130 C 690 150, 740 270, 880 200"
              fill="none"
              stroke="#5cf194"
              strokeWidth="3"
              strokeDasharray="4 26"
              strokeLinecap="round"
              opacity="0.9"
            />
          </svg>

          {/* Zone nodes positioned along the adventure trail */}
          <div className="sm-zones-row">
            {SECTIONS.map((sec, idx) => {
              const isFirst = idx === 0
              return (
                <div
                  key={sec.id}
                  className={`sm-zone-landmark-node ${sec.available ? 'sm-zone--open' : 'sm-zone--closed'} ${isFirst ? 'sm-zone--current' : ''}`}
                  onClick={() => sec.available && navigate(`/sections/${sec.id}`)}
                  role={sec.available ? 'button' : undefined}
                  tabIndex={sec.available ? 0 : undefined}
                  onKeyDown={e => sec.available && e.key === 'Enter' && navigate(`/sections/${sec.id}`)}
                >
                  {sec.available && (
                    <div className="sm-start-badge">
                      <span>EXPLORE</span>
                    </div>
                  )}

                  <div
                    className="sm-zone-orb"
                    style={{
                      '--zone-color': sec.color,
                      '--zone-glow': sec.glow,
                    }}
                  >
                    <SectionLandmark type={sec.landmark} color={sec.color} />
                    {sec.available ? (
                      <span className="sm-zone-check">✓</span>
                    ) : (
                      <span className="sm-zone-lock">🔒</span>
                    )}
                  </div>

                  <div className="sm-zone-title-card">
                    <span className="sm-zone-num">ZONE {sec.number}</span>
                    <h3 className="sm-zone-name">{sec.name}</h3>
                    <span className="sm-zone-sub">{sec.subtitle}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Zone Cards Detailed Breakdown ── */}
        <div className="sm-cards-container">
          <div className="sm-cards-header">
            <div>
              <span className="sm-cards-tag">LEARNING ZONES</span>
              <h2 className="sm-cards-heading">Choose a Region</h2>
            </div>
            <p className="sm-cards-caption">Each region contains interactive quizzes, live webcam sign detection, and checkpoints.</p>
          </div>

          <div className="sm-cards-grid">
            {SECTIONS.map((sec, i) => (
              <div
                key={sec.id}
                id={`section-card-${sec.id}`}
                className={`sm-zone-card ${sec.available ? 'sm-zone-card--available' : 'sm-zone-card--locked'}`}
                style={{
                  '--accent': sec.color,
                  '--glow': sec.glow,
                }}
                onClick={() => sec.available && navigate(`/sections/${sec.id}`)}
                role={sec.available ? 'button' : undefined}
                tabIndex={sec.available ? 0 : undefined}
                onKeyDown={e => sec.available && e.key === 'Enter' && navigate(`/sections/${sec.id}`)}
              >
                <div className="sm-card-top">
                  <div className="sm-card-badge-row">
                    <span className="sm-card-zone-num">ZONE {sec.number}</span>
                    <span className={`sm-status-chip ${sec.available ? 'sm-chip-open' : 'sm-chip-locked'}`}>
                      {sec.badge}
                    </span>
                  </div>
                  <h3 className="sm-card-title">{sec.name}</h3>
                  <p className="sm-card-desc">{sec.description}</p>
                </div>

                {/* Level step indicators */}
                <div className="sm-card-levels-row">
                  {sec.levelsSummary.map((lvl) => (
                    <div
                      key={lvl.id}
                      className={`sm-level-pill sm-level-pill--${lvl.status}`}
                      title={`Level ${lvl.id}: ${lvl.label} (${lvl.type})`}
                    >
                      <span className="sm-pill-label">{lvl.label}</span>
                      <span className="sm-pill-type">{lvl.type}</span>
                    </div>
                  ))}
                </div>

                <div className="sm-card-footer">
                  {sec.available ? (
                    <div className="sm-enter-cta">
                      <span>Enter Trail</span>
                      <span className="sm-cta-arrow">→</span>
                    </div>
                  ) : (
                    <span className="sm-locked-hint">Complete previous zone to unlock</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

