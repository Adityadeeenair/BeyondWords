import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import '../level-map.css'

const SECTION_META = {
  letters: {
    title: 'SECTION 1 · LETTERS',
    subtitle: 'Master the ISL alphabet A – Z',
    accent: '#22c55e',
    accentGlow: 'rgba(34, 197, 94, 0.45)',
  },
  numbers: {
    title: 'SECTION 2 · NUMBERS',
    subtitle: 'Sign digits 0 through 9',
    accent: '#38bdf8',
    accentGlow: 'rgba(56, 189, 248, 0.45)',
  },
  'word-forming': {
    title: 'SECTION 3 · WORD FORMING',
    subtitle: 'Chain signs into full words',
    accent: '#a855f7',
    accentGlow: 'rgba(168, 85, 247, 0.45)',
  },
}

const LEVELS_BY_SECTION = {
  letters: [
    { id: 1, type: 'quiz', emoji: '🖐️', label: 'QUIZ', title: 'A – E', status: 'complete' },
    { id: 2, type: 'webcam', emoji: '📷', label: 'WEBCAM', title: 'K – O live signs', status: 'complete' },
    { id: 3, type: 'quiz', emoji: '🖐️', label: 'QUIZ', title: 'F – J', status: 'complete' },
    { id: 4, type: 'webcam', emoji: '📷', label: 'WEBCAM', title: 'P – T live signs', status: 'active' },
    { id: 5, type: 'capstone', emoji: '🔒', label: 'CHECKPOINT', title: 'Full A – Z test', status: 'locked' },
  ],
  numbers: [
    { id: 1, type: 'quiz', emoji: '🔢', label: 'QUIZ', title: '0 – 4', status: 'active' },
    { id: 2, type: 'webcam', emoji: '📷', label: 'WEBCAM', title: '5 – 9 live signs', status: 'locked' },
    { id: 3, type: 'capstone', emoji: '🔒', label: 'CHECKPOINT', title: 'Full 0 – 9 test', status: 'locked' },
  ],
  'word-forming': [
    { id: 1, type: 'quiz', emoji: '💬', label: 'STORY', title: 'Emergency words', status: 'locked' },
    { id: 2, type: 'webcam', emoji: '📷', label: 'WEBCAM', title: 'Sign the word', status: 'locked' },
    { id: 3, type: 'capstone', emoji: '🔒', label: 'CHECKPOINT', title: 'Full word test', status: 'locked' },
  ],
}

// Normalized coordinate points (0-100 x, y in pixels) along the s-curve from top to bottom
// Calibrated to align with wide sweeping adventure trail
const MAP_POINTS = [
  { x: 50.0, y: 150 },
  { x: 38.0, y: 310 },
  { x: 62.0, y: 480 },
  { x: 40.0, y: 645 },
  { x: 52.0, y: 805 },
]

function LevelTooltip({ level, onStart, onClose }) {
  return (
    <div className="bw-tooltip">
      <div className="bw-tooltip-header">
        <span className="bw-tooltip-icon-wrap">
          {level.type === 'webcam' ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          ) : level.status === 'locked' ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#94a3b8">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-1.2-6-3.2L3.3 15.6a2 2 0 0 1 3.2-2.4L8 15" />
            </svg>
          )}
        </span>
        <div className="bw-tooltip-info">
          <div className="bw-tooltip-badge">{level.label}</div>
          <div className="bw-tooltip-title">{level.title}</div>
        </div>
        <button className="bw-tooltip-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <button className="bw-tooltip-start" onClick={onStart}>
        {level.status === 'complete' ? '↩ Practice again' : 'Start →'}
      </button>
    </div>
  )
}

function LevelNode({ level, pt, onSelect, isSelected }) {
  const isLocked = level.status === 'locked'
  const isComplete = level.status === 'complete'
  const isActive = level.status === 'active'

  const nodeClass = [
    'bw-map-node',
    `bw-map-node--${level.status}`,
    level.type === 'capstone' ? 'bw-map-node--capstone' : '',
    isSelected ? 'bw-map-node--selected' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className="bw-map-node-wrapper"
      style={{ left: `${pt.x}%`, top: `${pt.y}px` }}
    >
      <button
        id={`level-node-${level.id}`}
        className={nodeClass}
        disabled={isLocked}
        onClick={() => onSelect(level)}
        aria-label={`Level ${level.id}: ${level.title} (${level.status})`}
      >
        {/* Glow halo */}
        <div className="bw-node-glow" />

        {/* Inner circle */}
        <div className="bw-node-disc">
          <span className="bw-node-icon">
            {isLocked ? (
              <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
            ) : level.type === 'webcam' ? (
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
                <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-1.2-6-3.2L3.3 15.6a2 2 0 0 1 3.2-2.4L8 15" />
              </svg>
            )}
          </span>
        </div>

        {/* Small checkmark badge (top-right) if complete */}
        {isComplete && (
          <span className="bw-node-check-badge">
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        )}
      </button>

      {/* Label and Subtitle card under node */}
      <div className="bw-map-node-card">
        <span className="bw-map-node-label">{level.label}</span>
        <span className="bw-map-node-sub">{level.title}</span>
      </div>
    </div>
  )
}

export default function Levels() {
  const { sectionId } = useParams()
  const navigate = useNavigate()
  const meta = SECTION_META[sectionId] || SECTION_META.letters
  const levels = LEVELS_BY_SECTION[sectionId] || LEVELS_BY_SECTION.letters

  const [selected, setSelected] = useState(null)
  const [loadingLevel, setLoadingLevel] = useState(null)
  const [transitionFading, setTransitionFading] = useState(false)

  useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest('.bw-map-node') && !e.target.closest('.bw-tooltip')) {
        setSelected(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Transition timer (Click start -> animated walking scene -> navigate to level) ──
  useEffect(() => {
    if (!loadingLevel) return
    setTransitionFading(false)

    const fadeTimer = setTimeout(() => {
      setTransitionFading(true)
    }, 2000)

    const navTimer = setTimeout(() => {
      navigate(`/sections/${sectionId}/levels/${loadingLevel.id}`)
    }, 2400)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(navTimer)
    }
  }, [loadingLevel, sectionId, navigate])

  function handleSelect(level) {
    if (loadingLevel) return
    setSelected(prev => (prev?.id === level.id ? null : level))
  }

  function handleStart(level) {
    setSelected(null)
    setLoadingLevel(level)
  }

  const containerH = 950

  // Wide organic serpentine curve passing gracefully through the 5 level positions
  const pathD = `
    M 50.0 150
    C 42.0 210, 32.0 250, 38.0 310
    C 44.0 375, 68.0 410, 62.0 480
    C 56.0 550, 34.0 575, 40.0 645
    C 45.0 710, 54.0 745, 52.0 805
  `

  return (
    <div className="bw-progression-root">
      {/* Top Banner */}
      <header className="bw-progression-header">
        <button
          className="bw-back-button"
          onClick={() => navigate('/sections')}
          aria-label="Back to sections"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>

        <div className="bw-header-text">
          <span className="bw-header-tag">ZONE TRAIL</span>
          <h1 className="bw-header-title">{meta.title}</h1>
          <p className="bw-header-subtitle">{meta.subtitle}</p>
        </div>

        <button className="bw-header-action" onClick={() => navigate('/sections')} aria-label="World Map">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
            <line x1="8" y1="2" x2="8" y2="18"></line>
            <line x1="16" y1="6" x2="16" y2="22"></line>
          </svg>
        </button>
      </header>

      {/* Main Map Container */}
      <main className="bw-map-scroll">
        <div className="bw-map-viewport" style={{ height: containerH }}>
          {/* Decorative ambient animated clouds */}
          <div className="bw-map-cloud bw-cloud-a" />
          <div className="bw-map-cloud bw-cloud-b" />
          <div className="bw-map-cloud bw-cloud-c" />
          <div className="bw-map-cloud bw-cloud-d" />

          {/* Environmental Terrain Elements: Pine clusters, hill ridges, stepping rocks */}
          <div className="bw-terrain-feature bw-forest-top-left" aria-hidden="true">
            <svg viewBox="0 0 60 48" width="56" height="44" fill="none">
              {/* Pine tree 1 */}
              <path d="M16 12l-7 10h4l-6 9h18l-6-9h4L16 12z" fill="#13352c" stroke="#1d4e41" strokeWidth="1.2" />
              <path d="M16 31v5" stroke="#0e231d" strokeWidth="2.5" strokeLinecap="round" />
              {/* Pine tree 2 */}
              <path d="M34 6l-9 12h5l-8 12h24l-8-12h5L34 6z" fill="#184337" stroke="#256353" strokeWidth="1.2" />
              <path d="M34 30v7" stroke="#0e231d" strokeWidth="3" strokeLinecap="round" />
              {/* Pine tree 3 */}
              <path d="M48 16l-6 8h3l-5 8h16l-5-8h3L48 16z" fill="#112e26" stroke="#1c473b" strokeWidth="1" />
              <path d="M48 32v4" stroke="#0e231d" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <div className="bw-terrain-feature bw-rocks-mid-right" aria-hidden="true">
            <svg viewBox="0 0 54 36" width="50" height="32" fill="none">
              {/* Boulder cluster */}
              <path d="M8 28c-3-6 0-14 8-16s14 4 16 10c1 3-1 6-4 6H8z" fill="#192631" stroke="#2c3e4e" strokeWidth="1.4" />
              <path d="M26 28c-2-5 1-11 7-12s11 3 13 8c1 3-1 4-3 4H26z" fill="#141f27" stroke="#243442" strokeWidth="1.2" />
              {/* Tiny moss tuft */}
              <circle cx="16" cy="18" r="2.5" fill="#22c55e" opacity="0.6" />
              <circle cx="20" cy="17" r="1.8" fill="#4ade80" opacity="0.5" />
            </svg>
          </div>

          <div className="bw-terrain-feature bw-forest-mid-left" aria-hidden="true">
            <svg viewBox="0 0 50 44" width="46" height="40" fill="none">
              <path d="M20 8l-8 11h4l-7 11h22l-7-11h4L20 8z" fill="#163e33" stroke="#22594a" strokeWidth="1.2" />
              <path d="M20 30v6" stroke="#0d241e" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M36 14l-6 9h3l-5 8h16l-5-8h3L36 14z" fill="#112f27" stroke="#1b453a" strokeWidth="1" />
              <path d="M36 31v5" stroke="#0d241e" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <div className="bw-terrain-feature bw-ridge-bottom-right" aria-hidden="true">
            <svg viewBox="0 0 70 38" width="65" height="34" fill="none">
              {/* Low mountain ridge */}
              <path d="M4 32L24 12l10 10 18-16 14 26H4z" fill="#15212b" stroke="#243746" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M24 12v20M52 6v26" stroke="#1f2f3c" strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
            </svg>
          </div>

          {/* SVG Serpentine Trail */}
          <svg
            className="bw-map-svg"
            viewBox={`0 0 100 ${containerH}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {/* Outer dark base path */}
            <path
              d={pathD}
              fill="none"
              stroke="#111c24"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Dark green path body */}
            <path
              d={pathD}
              fill="none"
              stroke="#184337"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Stepping stone pavers / cobblestone dash effect */}
            <path
              d={pathD}
              fill="none"
              stroke="#2e9b62"
              strokeWidth="5.5"
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Core highlight track */}
            <path
              d={pathD}
              fill="none"
              stroke="#5cf194"
              strokeWidth="1.3"
              strokeDasharray="2 6"
              strokeOpacity="0.85"
              strokeLinecap="round"
            />
          </svg>

          {/* Decorative trail landmarks */}
          <div className="bw-trail-landmark bw-landmark-top-right">
            <svg viewBox="0 0 36 36" width="32" height="32" fill="none">
              <path d="M18 3v30M3 18h30M7.4 7.4l21.2 21.2M7.4 28.6L28.6 7.4" stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.3" />
            </svg>
          </div>
          <div className="bw-trail-landmark bw-landmark-bottom-left">
            <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
              <path d="M18 4l-8 12h5l-6 10h18l-6-10h5L18 4z" fill="#143d32" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
            </svg>
          </div>

          {/* Level Nodes */}
          {levels.map((level, idx) => {
            const pt = MAP_POINTS[idx] || { x: 50, y: 150 + idx * 160 }
            return (
              <div key={level.id}>
                <LevelNode
                  level={level}
                  pt={pt}
                  isSelected={selected?.id === level.id}
                  onSelect={handleSelect}
                />

                {selected?.id === level.id && (
                  <div
                    className="bw-tooltip-wrapper"
                    style={{ left: `${pt.x}%`, top: `${pt.y + 48}px` }}
                  >
                    <LevelTooltip
                      level={level}
                      onStart={() => handleStart(level)}
                      onClose={() => setSelected(null)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>

      {/* Animated Loading / Transition Screen Before Level Game Loads */}
      {loadingLevel && (
        <div className={`bw-level-transition-overlay ${transitionFading ? 'bw-transition--fading' : ''}`}>
          <div className="bw-transition-backdrop">
            {/* Ambient fireflies / glowing particles */}
            <div className="bw-transition-particles">
              <span className="bw-particle p1" />
              <span className="bw-particle p2" />
              <span className="bw-particle p3" />
              <span className="bw-particle p4" />
              <span className="bw-particle p5" />
            </div>

            {/* Main Content Box */}
            <div className="bw-transition-container">
              {/* Badge Context */}
              <div className="bw-transition-badge">
                <span className="bw-transition-badge-icon">✨</span>
                <span>Level {loadingLevel.id} · {loadingLevel.title}</span>
              </div>

              {/* Game-like Walking Scene */}
              <div className="bw-transition-scene">
                {/* Background scenery silhouettes */}
                <div className="bw-transition-scenery-bg">
                  <span className="bw-tree">🌲</span>
                  <span className="bw-tree">🌳</span>
                  <span className="bw-tree">🏡</span>
                  <span className="bw-tree">🌳</span>
                  <span className="bw-tree">🌲</span>
                </div>

                {/* Ground pathway */}
                <div className="bw-transition-ground">
                  <div className="bw-transition-path" />
                  <div className="bw-transition-decorations">
                    <span className="bw-flower">🌸</span>
                    <span className="bw-stone">🪨</span>
                    <span className="bw-flower">🌼</span>
                    <span className="bw-lantern">🏮</span>
                  </div>
                </div>

                {/* Animated Player Character walking left to right */}
                <div className="bw-transition-player-track">
                  <div className="bw-transition-player-wrapper">
                    <img
                      src="/game/player_right.png"
                      alt="Player walking"
                      className="bw-transition-player-sprite"
                    />
                    <div className="bw-transition-player-shadow" />
                  </div>
                </div>

                {/* Destination portal / goal flag */}
                <div className="bw-transition-destination">
                  <div className="bw-destination-glow" />
                  <span className="bw-destination-flag">🚩</span>
                </div>
              </div>

              {/* Subtle Preparing Message & Progress */}
              <div className="bw-transition-status">
                <div className="bw-transition-message">
                  <span>Preparing your lesson</span>
                  <span className="bw-transition-dots">
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                </div>
                <div className="bw-transition-progress-bar">
                  <div className="bw-transition-progress-fill" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


