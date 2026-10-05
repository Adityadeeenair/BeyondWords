import { useEffect, useRef, useState, useCallback, cloneElement, Children, isValidElement } from 'react'
import { isWalkable, findNearestWalkable, findPath } from './pathfinding'
import { MAP_WIDTH, MAP_HEIGHT } from './navGrid'
import './GameLevel.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const PLAYER_SPEED = 3.6         // px per frame along path
const INTERACT_RADIUS = 72       // px — proximity to interact with NPC
const WALK_CYCLE_SPEED = 0.28    // walking animation cycle speed

// ─── Level config — extensible per level ─────────────────────────────────────
// noticeBoard: optional interactive board that gives the player level context.
// Uses the same ! bubble, click-to-walk, and dialogue panel as the NPC,
// but routes back to 'game' instead of 'challenge' when finished.
const LEVEL_CONFIGS = {
  1: {
    mapSrc: '/game/map.jpg',
    // Player starts on crossroads: x=660, y=320 (in pixels)
    playerStart: { x: 660, y: 320 },
    // Letters this level's quiz will test — shown in the sign-preview overlay
    // right before the notice board's final line. Sourced from /sample-signs/.
    signLetters: ['A', 'B', 'C', 'D', 'E'],
    npc: {
      id: 'maya',
      // Maya stands on the paved path in front of red house: x=420, y=340
      x: 420,
      y: 340,
      // Target stand point for player talking to Maya:
      standX: 470,
      standY: 340,
      sprite: '/game/npc_teacher_clean.png',
      portrait: '/game/portrait_maya.png',
      name: 'Maya',
      dialogue: [
        "Namaste! Welcome to our village!",
        "Every corner of this world has signs waiting to be discovered.",
        "Let me teach you the first five letters of Indian Sign Language (A through E).",
        "Ready? Let's begin the quiz!",
      ],
      challengePrompt: 'Match the ISL signs for A through E!',
    },
    // Notice board near the bench & lamp post (x: 864, y: 350)
    noticeBoard: {
      x: 864, y: 350,
      standX: 864, standY: 376,
      dialogue: [
        "Welcome to the village!",
        "Sign language is a natural part of everyday life around here, from the markets to every home.",
        "You have arrived to learn and become part of our community.",
        "Your journey begins with the basic letters of ISL.",
        "Go ahead and talk to Maya over by the red house to start your first lesson.",
      ],
    },
  },
  2: {
    mapSrc: '/game/map.jpg',
    playerStart: { x: 660, y: 320 },
    signLetters: ['K', 'L', 'M', 'N', 'O'],
    npc: {
      id: 'ravi',
      // Ravi stands on the stone plaza near blue house: x=1050, y=410
      x: 1050,
      y: 410,
      standX: 1000,
      standY: 410,
      sprite: '/game/npc_teacher_clean.png',
      name: 'Ravi',
      dialogue: [
        "Welcome back, adventurer!",
        "Now that you know A through E, let's try some live signing on camera.",
        "Show me letters K through O with your hand!",
      ],
      challengePrompt: 'Perform the ISL signs for K through O!',
    },
    noticeBoard: {
      x: 864, y: 350,
      standX: 864, standY: 376,
      dialogue: [
        "Village Market District",
        "The market area is bustling today, and vendors and shoppers are greeting each other in sign.",
        "Now that you have got A through E down, it is time to practice K through O.",
        "You will see these signs used all the time around the market stalls.",
        "Ravi is waiting by the blue house to guide your live practice when you are ready.",
      ],
    },
  },
  3: {
    mapSrc: '/game/map.jpg',
    playerStart: { x: 660, y: 320 },
    signLetters: ['F', 'G', 'H', 'I', 'J'],
    npc: {
      id: 'ananya',
      // Ananya stands near market stall: x=360, y=670
      x: 360,
      y: 670,
      standX: 410,
      standY: 670,
      sprite: '/game/npc_teacher_clean.png',
      name: 'Ananya',
      dialogue: [
        "Great progress so far! Ready for letters F through J?",
        "These signs are fundamental in everyday conversations.",
        "Let's test how quickly you can recognize them!",
      ],
      challengePrompt: 'Match the ISL signs for F through J!',
    },
    noticeBoard: {
      x: 864, y: 350,
      standX: 864, standY: 376,
      dialogue: [
        "Southern Lanes",
        "Down past the market stalls is where folks gather and chat in the evenings.",
        "Ananya spends her afternoons here teaching children and helping new learners.",
        "Today she will help you learn letters F through J, which pop up in everyday words.",
        "Head south down the road to meet Ananya and test what you know.",
      ],
    },
  },
  4: {
    mapSrc: '/game/map.jpg',
    playerStart: { x: 660, y: 320 },
    signLetters: ['P', 'Q', 'R', 'S', 'T'],
    npc: {
      id: 'dev',
      // Dev stands near the bridge: x=1110, y=520
      x: 1110,
      y: 520,
      standX: 1070,
      standY: 480,
      sprite: '/game/npc_teacher_clean.png',
      name: 'Dev',
      dialogue: [
        "You made it to the river bridge!",
        "Letters P through T require precise finger articulation.",
        "Hold your hand up to the camera and demonstrate your signs!",
      ],
      challengePrompt: 'Perform the ISL signs for P through T!',
    },
    noticeBoard: {
      x: 864, y: 350,
      standX: 864, standY: 376,
      dialogue: [
        "The Stone Bridge",
        "This stone bridge leads to the edge of the village.",
        "Dev has been helping travellers practice sign language here for a long time.",
        "Letters P through T take a bit more finger control, so take your time with each shape.",
        "Walk over to the bridge and show Dev your signs on camera.",
      ],
    },
  },
  5: {
    mapSrc: '/game/map.jpg',
    playerStart: { x: 660, y: 320 },
    npc: {
      id: 'guru',
      x: 660,
      y: 240,
      standX: 660,
      standY: 300,
      sprite: '/game/npc_teacher_clean.png',
      name: 'Master Arjun',
      dialogue: [
        "You have explored the village and mastered your signs.",
        "This is the grand trial of the alphabet.",
        "Show me your mastery of all the signs you have learned!",
      ],
      challengePrompt: 'Mastery challenge: put your ISL skills to the test!',
    },
    noticeBoard: {
      x: 864, y: 350,
      standX: 864, standY: 376,
      dialogue: [
        "The Grand Trial",
        "You have explored the whole village and practiced with everyone along the way.",
        "Master Arjun is waiting at the village square to see how well you know the full alphabet.",
        "Take a deep breath and trust your practice. You got this!",
      ],
    },
  },
}

/**
 * GameLevel — Fullscreen 2D top-down exploration game layer with road boundary collision.
 *
 * Props:
 *   levelId        (number)    — which level config to load
 *   onComplete     (fn)        — called when challenge finishes
 *   onExit         (fn)        — called when player manually exits
 *   children       (ReactNode) — the actual challenge component (QuizChallenge/WebcamChallenge)
 */
export default function GameLevel({ levelId, onComplete, onExit, children }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const rafRef = useRef(null)

  // React states
  const [phase, setPhase] = useState('loading') // 'loading' | 'game' | 'dialogue' | 'signPreview' | 'challenge' | 'complete'
  const [dialogueLine, setDialogueLine] = useState(0)
  const [assetsReady, setAssetsReady] = useState(false)
  const [npcConfig, setNpcConfig] = useState(null)
  const [invalidClickNotice, setInvalidClickNotice] = useState(false)
  // 'npc' → existing NPC dialogue (leads to challenge)
  // 'board' → notice board dialogue (returns to game)
  const [dialogueSource, setDialogueSource] = useState('npc')
  const [speakerBob, setSpeakerBob] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef(null)

  const config = LEVEL_CONFIGS[levelId] || LEVEL_CONFIGS[1]

  // ── Village ambient audio background ─────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio('/audio/village-ambience.mp3')
    audio.loop = true
    audio.volume = 0.11
    audioRef.current = audio

    // Start playback after user's first interaction to bypass autoplay restrictions
    let started = false
    const startAudio = () => {
      if (started) return
      started = true
      audio.play().catch(() => { })
      window.removeEventListener('pointerdown', startAudio)
      window.removeEventListener('keydown', startAudio)
    }

    window.addEventListener('pointerdown', startAudio, { once: true })
    window.addEventListener('keydown', startAudio, { once: true })

    return () => {
      window.removeEventListener('pointerdown', startAudio)
      window.removeEventListener('keydown', startAudio)
      audio.pause()
      audio.currentTime = 0
      audioRef.current = null
    }
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      if (audioRef.current) {
        audioRef.current.muted = next
        if (!next && audioRef.current.paused) {
          audioRef.current.play().catch(() => { })
        }
      }
      return next
    })
  }, [])

  // ── Load all game assets ───────────────────────────────────────────────────
  useEffect(() => {
    const toLoad = [
      { key: 'player_front', src: '/game/player_front.png' },
      { key: 'player_back', src: '/game/player_back.png' },
      { key: 'player_left', src: '/game/player_left.png' },
      { key: 'player_right', src: '/game/player_right.png' },
      { key: 'npc', src: config.npc.sprite },
    ]

    const images = {}
    // Total assets = sprite images + 1 video
    const totalAssets = toLoad.length + 1
    let loaded = 0
    let resolvedVideoEl = null  // set when video fires canplaythrough

    const tryFinish = (videoEl) => {
      if (videoEl) resolvedVideoEl = videoEl
      loaded++
      if (loaded === totalAssets) {
        const gs = buildInitialState(images, config)
        gs.videoEl = resolvedVideoEl
        stateRef.current = gs
        setNpcConfig(config.npc)
        setAssetsReady(true)
      }
    }

    toLoad.forEach(({ key, src }) => {
      const img = new Image()
      img.onload  = () => { images[key] = img;  tryFinish(null) }
      img.onerror = () => { images[key] = null; tryFinish(null) }
      img.src = src
    })

    // ── Village background video — dual-buffer gapless loop ───────────────────
    // 'ended' fires AFTER the last frame is consumed → decode gap → black flash.
    // Dual-buffer fix: two videos swap roles every cycle.
    //   • Standby starts playing 0.5 s before active ends (decoder fully warm).
    //   • At the crossover we flip gs.videoEl to standby (already running).
    //   • Old active resets to t=0 and becomes the new standby.
    //   ⟹ canvas always has a live decoded frame — zero black, zero gap.
    const makeVid = () => {
      const v = document.createElement('video')
      v.src = '/game/village_loop_final.mp4'
      v.muted = true
      v.playsInline = true
      v.preload = 'auto'
      v.loop = false
      return v
    }
    const vidA = makeVid()
    const vidB = makeVid()

    // active / standby refs — use plain objects so closure captures the container
    const slot = { active: vidA, standby: vidB }

    const onVideoReady = () => tryFinish(slot.active)
    vidA.addEventListener('canplaythrough', onVideoReady, { once: true })
    vidA.addEventListener('error',          onVideoReady, { once: true })

    // Prebuffer standby silently
    vidB.load()

    const onTimeUpdate = () => {
      const a = slot.active
      const b = slot.standby
      if (!a.duration) return
      const remaining = a.duration - a.currentTime

      // 0.5 s out: fire up standby so it's decoded & playing before we need it
      if (remaining <= 0.5 && b.paused) {
        b.currentTime = 0
        b.play().catch(() => {})
      }

      // Swap at ~0.05 s left — standby is already mid-frame, canvas sees no gap
      if (remaining <= 0.05) {
        slot.active  = b
        slot.standby = a
        // Update game state so renderGame draws the new active element
        if (stateRef.current) stateRef.current.videoEl = b
        // Reset old active to t=0 ready for next role as standby
        a.pause()
        a.currentTime = 0
      }
    }

    vidA.addEventListener('timeupdate', onTimeUpdate)
    vidB.addEventListener('timeupdate', onTimeUpdate)

    vidA.load()
    vidA.play().catch(() => {})

    return () => {
      vidA.removeEventListener('canplaythrough', onVideoReady)
      vidA.removeEventListener('error',          onVideoReady)
      vidA.removeEventListener('timeupdate',     onTimeUpdate)
      vidB.removeEventListener('timeupdate',     onTimeUpdate)
      vidA.pause()
      vidB.pause()
    }
  }, [levelId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start game loop when assets ready ──────────────────────────────────────
  useEffect(() => {
    if (!assetsReady) return
    setPhase('game')
  }, [assetsReady])

  useEffect(() => {
    // Only run loop during game or dialogue or challenge background
    const canvas = canvasRef.current
    if (!canvas) return

    function loop() {
      const gs = stateRef.current
      if (gs) {
        const ctx = canvas.getContext('2d')
        updateGame(gs)
        renderGame(ctx, gs, canvas)

        // Check if NPC reached for interaction while moving to NPC
        if (gs.movingToNpc && !gs.interacted) {
          const dx = gs.player.x - gs.npc.x
          const dy = gs.player.y - gs.npc.y
          const dist = Math.hypot(dx, dy)
          if (dist < INTERACT_RADIUS || gs.player.path.length === 0) {
            gs.movingToNpc = false
            gs.player.moving = false
            gs.player.path = []
            gs.interacted = true
            setDialogueSource('npc')
            setDialogueLine(0)
            setPhase('dialogue')
          }
        }

        // Check if notice board reached while moving to it
        if (gs.movingToNoticeBoard && !gs.noticeBoardInteracted) {
          const dx = gs.player.x - gs.noticeBoard.x
          const dy = gs.player.y - gs.noticeBoard.y
          const dist = Math.hypot(dx, dy)
          if (dist < INTERACT_RADIUS || gs.player.path.length === 0) {
            gs.movingToNoticeBoard = false
            gs.player.moving = false
            gs.player.path = []
            gs.noticeBoardInteracted = true
            setDialogueSource('board')
            setDialogueLine(0)
            setPhase('dialogue')
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  // ── Handle window resize for fullscreen canvas ─────────────────────────────
  useEffect(() => {
    function handleResize() {
      const canvas = canvasRef.current
      if (!canvas) return
      // Use physical pixels for the backing store so it's pixel-perfect on
      // HiDPI / Retina displays (devicePixelRatio ≥ 2). CSS size stays at
      // logical pixels so layout is unchanged.
      const dpr = window.devicePixelRatio || 1
      const logicalW = window.innerWidth
      const logicalH = window.innerHeight
      canvas.width  = Math.round(logicalW * dpr)
      canvas.height = Math.round(logicalH * dpr)
      canvas.style.width  = logicalW + 'px'
      canvas.style.height = logicalH + 'px'
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Canvas click handler with road boundary check & A* pathfinding ─────────
  const handleCanvasClick = useCallback((e) => {
    if (phase !== 'game') return
    const gs = stateRef.current
    const canvas = canvasRef.current
    if (!gs || !canvas) return

    const rect = canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top

    // Convert screen coordinates to world coordinates (1376x768 map space).
    // rect.width/height are CSS logical pixels — matches screenX/screenY units.
    const { worldX, worldY } = screenToWorld(screenX, screenY, rect.width, rect.height)

    // Check if clicked on/near the notice board (check before NPC so both are independently clickable)
    if (config.noticeBoard) {
      const distToBoard = Math.hypot(worldX - gs.noticeBoard.x, worldY - gs.noticeBoard.y)
      if (distToBoard < 65) {
        const standPt = findNearestWalkable(config.noticeBoard.standX, config.noticeBoard.standY)
        const path = findPath(gs.player.x, gs.player.y, standPt.x, standPt.y)
        if (path.length > 0) {
          gs.player.path = path
          gs.player.moving = true
          gs.movingToNpc = false
          gs.movingToNoticeBoard = true
          gs.clickRipples.push({ x: standPt.x, y: standPt.y, age: 0, maxAge: 25, isNpc: false })
        }
        return
      }
    }

    // Check if clicked on/near NPC
    const distToNpc = Math.hypot(worldX - gs.npc.x, worldY - gs.npc.y)
    if (distToNpc < 65) {
      // Move to NPC's designated stand point on road
      const standPt = findNearestWalkable(config.npc.standX || gs.npc.x, config.npc.standY || gs.npc.y)
      const path = findPath(gs.player.x, gs.player.y, standPt.x, standPt.y)
      if (path.length > 0) {
        gs.player.path = path
        gs.player.moving = true
        gs.movingToNpc = true
        gs.clickRipples.push({ x: standPt.x, y: standPt.y, age: 0, maxAge: 25, isNpc: true })
      }
      return
    }

    // Check if clicked location is directly walkable road
    const onRoad = isWalkable(worldX, worldY)
    let target = { x: worldX, y: worldY }

    if (!onRoad) {
      // Resolve to the nearest valid road position within reachable distance
      const nearest = findNearestWalkable(worldX, worldY, 40)
      if (!isWalkable(nearest.x, nearest.y)) {
        // Can't find a walkable road point nearby: reject click
        setInvalidClickNotice(true)
        setTimeout(() => setInvalidClickNotice(false), 1400)
        return
      }
      target = nearest
    }

    // Calculate path from current player position to target on the road
    const path = findPath(gs.player.x, gs.player.y, target.x, target.y)
    if (path.length > 0) {
      gs.player.path = path
      gs.player.moving = true
      gs.movingToNpc = false
      gs.movingToNoticeBoard = false
      gs.clickRipples.push({ x: target.x, y: target.y, age: 0, maxAge: 25, isNpc: false })
    }
  }, [phase, config])

  // ── Dialogue handlers ──────────────────────────────────────────────────────
  function triggerBob() {
    setSpeakerBob(true)
    setTimeout(() => setSpeakerBob(false), 360)
  }

  function handleDialogueNext() {
    triggerBob()
    if (dialogueSource === 'board') {
      // Notice board: cycle through its lines, then return to game (no challenge)
      const lines = config.noticeBoard.dialogue
      const hasSignPreview = Array.isArray(config.signLetters) && config.signLetters.length > 0
      const isSecondToLastLine = dialogueLine === lines.length - 2
      if (isSecondToLastLine && hasSignPreview) {
        // Right before the notice board's last line: show the signs for this level's quiz
        setPhase('signPreview')
      } else if (dialogueLine < lines.length - 1) {
        setDialogueLine(l => l + 1)
      } else {
        setDialogueLine(0)
        setPhase('game')
      }
    } else {
      // NPC: cycle through dialogue, then open the challenge modal
      const lines = config.npc.dialogue
      if (dialogueLine < lines.length - 1) {
        setDialogueLine(l => l + 1)
      } else {
        setDialogueLine(0)
        setPhase('challenge') // Open in-game challenge modal overlay!
      }
    }
  }

  // ── Sign preview handler (shown right before the notice board's last line) ──
  function handleSignPreviewContinue() {
    setDialogueLine(l => l + 1)
    setPhase('dialogue')
  }

  // ── Challenge completion ───────────────────────────────────────────────────
  function handleChallengeComplete(result) {
    // Record level completion in localStorage for seamless progression
    try {
      const completedKey = `beyondwords_completed_levels`
      const current = JSON.parse(localStorage.getItem(completedKey) || '[]')
      if (!current.includes(levelId)) {
        current.push(levelId)
        localStorage.setItem(completedKey, JSON.stringify(current))
      }
    } catch (_) { }

    setPhase('complete')
    onComplete?.(result)
  }

  return (
    <div className="gl-root gl-root--fullscreen">
      {/* Loading screen */}
      {phase === 'loading' && (
        <div className="gl-loading">
          <div className="gl-loading-inner">
            <div className="gl-loading-spinner" />
            <p className="gl-loading-text">Entering village adventure…</p>
          </div>
        </div>
      )}

      {/* Main Fullscreen Game Canvas */}
      <canvas
        ref={canvasRef}
        className="gl-canvas-fullscreen"
        onClick={handleCanvasClick}
        style={{ cursor: phase === 'game' ? 'pointer' : 'default' }}
      />

      {/* Minimal Top-Bar Navigation Controls */}
      <header className="gl-hud-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="gl-hud-exit-btn" onClick={onExit} title="Exit to Level Trail">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Exit Level
          </button>

          <button
            className="gl-hud-audio-btn"
            onClick={toggleMute}
            title={isMuted ? 'Unmute village ambience' : 'Mute village ambience'}
            aria-label={isMuted ? 'Unmute village ambience' : 'Mute village ambience'}
          >
            {isMuted ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
            )}
          </button>
        </div>

        <div className="gl-hud-badge">
          <span className="gl-hud-badge-dot" />
          Level {levelId} · Road Exploration
        </div>
      </header>

      {/* Interactive Floating Hint on Road */}
      {phase === 'game' && npcConfig && (
        <div className="gl-hint-bar">
          <span className="gl-hint-icon">💡</span>
          <span>Click on the gravel road to walk · Click <strong>{npcConfig.name} (❗)</strong> to start your challenge</span>
        </div>
      )}

      {/* Boundary Warning Toast (when clicking trees/houses/water) */}
      {invalidClickNotice && (
        <div className="gl-boundary-toast">
          ⚠️ You can only walk on the gravel and stone roads!
        </div>
      )}

      {/* Dialogue Overlay — Pixel-Art RPG Dialogue with 2 Character Portraits */}
      {phase === 'dialogue' && (
        <div className="gl-dialogue-overlay" onClick={handleDialogueNext}>
          <div className="gl-dialogue-container" onClick={(e) => e.stopPropagation()}>
            {/* Upper Portraits Stage */}
            <div className="gl-dialogue-portraits-stage">
              {/* Left Character (NPC / Maya / Board) */}
              <div
                className={`gl-portrait-wrapper gl-portrait-wrapper--left ${
                  dialogueSource === 'npc'
                    ? `gl-portrait--active ${speakerBob ? 'gl-portrait-bob' : ''}`
                    : 'gl-portrait--active'
                }`}
              >
                {dialogueSource === 'board' ? (
                  <div className="gl-board-badge" title="Notice Board">
                    📋
                  </div>
                ) : (
                  <img
                    src={npcConfig?.portrait || '/game/portrait_maya.png'}
                    alt={npcConfig?.name || 'NPC'}
                    className="gl-portrait-img"
                  />
                )}
              </div>

              {/* Right Character (Player Boy) */}
              <div
                className={`gl-portrait-wrapper gl-portrait-wrapper--right ${
                  dialogueSource === 'npc' ? 'gl-portrait--dimmed' : 'gl-portrait--dimmed'
                }`}
              >
                <img
                  src="/game/portrait_player.png"
                  alt="Player"
                  className="gl-portrait-img"
                />
              </div>
            </div>

            {/* Bottom RPG Dialogue Box */}
            <div className="gl-rpg-dialogue-box" onClick={handleDialogueNext}>
              {/* Corner floral ornaments from reference */}
              <div className="gl-dialogue-corner gl-dialogue-corner--left" />
              <div className="gl-dialogue-corner gl-dialogue-corner--right" />

              {/* Perched Name Tag */}
              <div className="gl-rpg-name-tag">
                <span className="gl-rpg-name-text">
                  {dialogueSource === 'board' ? 'Notice Board' : (npcConfig?.name || 'Maya')}
                </span>
              </div>

              {/* Dialogue Text Body */}
              <div className="gl-rpg-dialogue-body">
                <p className="gl-rpg-dialogue-text">
                  {dialogueSource === 'board'
                    ? config.noticeBoard?.dialogue[dialogueLine]
                    : npcConfig?.dialogue[dialogueLine]}
                </p>
              </div>

              {/* Bottom Footer: Progress Dots + Next Indicator */}
              <div className="gl-rpg-dialogue-bottom">
                <div className="gl-rpg-dialogue-dots">
                  {(dialogueSource === 'board'
                    ? config.noticeBoard?.dialogue
                    : npcConfig?.dialogue
                  )?.map((_, i) => (
                    <span
                      key={i}
                      className={`gl-rpg-dot ${i === dialogueLine ? 'gl-rpg-dot--active' : ''}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="gl-rpg-next-action"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDialogueNext()
                  }}
                >
                  <span>
                    {dialogueSource === 'board'
                      ? (dialogueLine < (config.noticeBoard?.dialogue.length ?? 1) - 1 ? 'Next' : 'Got it!')
                      : (dialogueLine < (npcConfig?.dialogue.length ?? 1) - 1 ? 'Next' : 'Begin Challenge')
                    }
                  </span>
                  <img
                    src="/game/dlg_arrow_pixel.png"
                    alt="▼"
                    className="gl-rpg-next-arrow"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sign Preview Overlay — shown right before the notice board's last line,
          gives a peek at the exact signs this level's quiz will ask about. */}
      {phase === 'signPreview' && (
        <div className="gl-sign-preview-backdrop">
          <div className="gl-sign-preview-card">
            <div className="gl-sign-preview-title">Signs you'll see in this quiz</div>
            <div className="gl-sign-preview-grid">
              {config.signLetters.map((letter) => (
                <div className="gl-sign-preview-item" key={letter}>
                  <img src={`/sample-signs/${letter}.jpg`} alt={`ISL sign for ${letter}`} />
                  <span>{letter}</span>
                </div>
              ))}
            </div>
            <button className="gl-sign-preview-btn" onClick={handleSignPreviewContinue}>
              Continue ▶
            </button>
          </div>
        </div>
      )}

      {/* IN-GAME CHALLENGE OVERLAY (Game world stays dimmed underneath!) */}
      {phase === 'challenge' && (
        <div className="gl-challenge-backdrop">
          <div className="gl-challenge-modal">
            {/* Challenge Modal Header */}
            <div className="gl-modal-header">
              <div className="gl-modal-npc-tag">
                <img src={npcConfig?.sprite} alt={npcConfig?.name} className="gl-modal-npc-img" />
                <div>
                  <div className="gl-modal-npc-name">{npcConfig?.name}'s Challenge</div>
                  <div className="gl-modal-npc-prompt">{npcConfig?.challengePrompt}</div>
                </div>
              </div>
              <button
                className="gl-modal-close-btn"
                onClick={onExit}
                title="Back to Levels"
              >
                ✕ Back to Levels
              </button>
            </div>

            {/* Existing Quiz / Webcam component embedded right here */}
            <div className="gl-modal-body">
              {children && renderChildren(children, handleChallengeComplete)}
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal Overlay (Celebration & Exploration) */}
      {phase === 'complete' && (
        <div className="gl-complete-backdrop">
          <div className="gl-complete-card">
            <div className="gl-complete-star">⭐</div>
            <h2 className="gl-complete-title">Level Complete!</h2>
            <p className="gl-complete-sub">
              {npcConfig?.name
                ? `${npcConfig.name} is impressed by your signing skills!`
                : 'You mastered all the signs in this level!'}
            </p>
            <div className="gl-complete-actions">
              <button className="gl-complete-btn-primary" onClick={onExit}>
                Continue to Levels Trail 🗺️
              </button>
              <button
                className="gl-complete-btn-secondary"
                onClick={() => {
                  if (stateRef.current) stateRef.current.interacted = false
                  setPhase('game')
                }}
              >
                Explore Village 🌳
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helper: find the single valid React element in children and inject onComplete ─
function renderChildren(children, onComplete) {
  // When multiple JSX expressions are siblings, React passes children as an array
  // that may contain React elements mixed with `false` / `null` / `undefined`.
  // cloneElement() expects a single element, so we find the first valid one.
  const child = Children.toArray(children).find(isValidElement)
  if (!child) return null
  return cloneElement(child, { onComplete })
}

// ─── Coordinate translation: Screen <-> World space ──────────────────────────
function getViewportTransform(screenWidth, screenHeight) {
  const scale = Math.max(screenWidth / MAP_WIDTH, screenHeight / MAP_HEIGHT)
  const offsetX = (screenWidth - MAP_WIDTH * scale) / 2
  const offsetY = (screenHeight - MAP_HEIGHT * scale) / 2
  return { scale, offsetX, offsetY }
}

function screenToWorld(sx, sy, screenWidth, screenHeight) {
  const { scale, offsetX, offsetY } = getViewportTransform(screenWidth, screenHeight)
  const worldX = (sx - offsetX) / scale
  const worldY = (sy - offsetY) / scale
  return { worldX, worldY }
}

// ─── Game state builder ──────────────────────────────────────────────────────
function buildInitialState(images, config) {
  const startPt = findNearestWalkable(config.playerStart.x, config.playerStart.y)

  return {
    images,
    player: {
      x: startPt.x,
      y: startPt.y,
      path: [], // Array of waypoints [{x, y}, ...]
      moving: false,
      facing: 'front', // front | back | left | right
      walkPhase: 0,
      spriteW: 68,
      spriteH: 68,
    },
    npc: {
      x: config.npc.x,
      y: config.npc.y,
      bobPhase: 0,
    },
    // Notice board world position (visual centre, off-road is fine)
    noticeBoard: {
      x: config.noticeBoard?.x ?? 864,
      y: config.noticeBoard?.y ?? 350,
    },
    movingToNpc: false,
    movingToNoticeBoard: false,
    interacted: false,
    noticeBoardInteracted: false,
    clickRipples: [],
  }
}

// ─── Game update loop (runs every frame) ─────────────────────────────────────
function updateGame(gs) {
  const p = gs.player

  // Move along waypoints in path
  if (p.moving && p.path.length > 0) {
    const nextPt = p.path[0]
    const dx = nextPt.x - p.x
    const dy = nextPt.y - p.y
    const dist = Math.hypot(dx, dy)

    if (dist <= PLAYER_SPEED) {
      p.x = nextPt.x
      p.y = nextPt.y
      p.path.shift()
      if (p.path.length === 0) {
        p.moving = false
        p.walkPhase = 0
      }
    } else {
      const nx = dx / dist
      const ny = dy / dist
      p.x += nx * PLAYER_SPEED
      p.y += ny * PLAYER_SPEED

      // Direction facing
      if (Math.abs(dx) > Math.abs(dy)) {
        p.facing = dx > 0 ? 'right' : 'left'
      } else {
        p.facing = dy > 0 ? 'front' : 'back'
      }

      // Step & walk cycle progression
      p.walkPhase = (p.walkPhase + WALK_CYCLE_SPEED) % (Math.PI * 2)
    }
  }

  // NPC idle bob
  gs.npc.bobPhase = (gs.npc.bobPhase + 0.04) % (Math.PI * 2)

  // Tick click ripple animations
  gs.clickRipples = gs.clickRipples
    .map(r => ({ ...r, age: r.age + 1 }))
    .filter(r => r.age < r.maxAge)
}

// ─── Game render (runs every frame) ──────────────────────────────────────────
function renderGame(ctx, gs, canvas) {
  const { images, player, npc } = gs

  // Logical (CSS) canvas size — used for all world-space math so that click
  // coordinates (which are in CSS px) continue to map correctly.
  const dpr = window.devicePixelRatio || 1
  const logicalW = canvas.width  / dpr
  const logicalH = canvas.height / dpr

  const { scale, offsetX, offsetY } = getViewportTransform(logicalW, logicalH)

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.save()
  // Scale up to physical pixels first, then apply the world→screen transform.
  // This means every drawImage writes at full device resolution — no CSS blur.
  ctx.scale(dpr, dpr)
  ctx.translate(offsetX, offsetY)
  ctx.scale(scale, scale)

  // Highest-quality interpolation for the video upscale / sprite draws
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality  = 'high'

  // 1. Map background — animated village video loop
  //    Draw directly from the live video element every frame — the browser
  //    composites the current decoded frame at full quality.
  const videoEl = gs.videoEl
  if (videoEl && videoEl.readyState >= 2) {
    ctx.drawImage(videoEl, 0, 0, MAP_WIDTH, MAP_HEIGHT)
  } else if (images.map) {
    // Fallback to static map while video loads
    ctx.drawImage(images.map, 0, 0, MAP_WIDTH, MAP_HEIGHT)
  }

  // 2. Click ripples
  gs.clickRipples.forEach(r => {
    const t = r.age / r.maxAge
    ctx.beginPath()
    ctx.arc(r.x, r.y, t * 24, 0, Math.PI * 2)
    ctx.strokeStyle = r.isNpc
      ? `rgba(251, 191, 36, ${(1 - t) * 0.8})`
      : `rgba(255, 255, 255, ${(1 - t) * 0.75})`
    ctx.lineWidth = 2.5
    ctx.stroke()
  })

  // 3. NPC (Maya / Master)
  // Subtle idle breathing & weight poise — anchored firmly at feet, zero floating
  const breathePhase = npc.bobPhase
  const idleScaleY = 1 + Math.sin(breathePhase) * 0.012
  const idleScaleX = 1 - Math.sin(breathePhase) * 0.006
  const npcH = 70
  const npcW = 70

  // NPC Ground Shadow — firmly planted beneath feet with high-depth contact layers
  ctx.save()
  // Wide ambient soft ground occlusion
  ctx.beginPath()
  ctx.ellipse(npc.x, npc.y + 1, 21, 7.5, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.28)'
  ctx.fill()
  // Core contact shadow anchoring both sandals/feet directly into ground
  ctx.beginPath()
  ctx.ellipse(npc.x, npc.y, 14, 4.8, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.52)'
  ctx.fill()
  // Deep pinpoint contact directly under each foot
  ctx.beginPath()
  ctx.ellipse(npc.x - 4, npc.y, 4.5, 2, 0, 0, Math.PI * 2)
  ctx.ellipse(npc.x + 5, npc.y, 4.5, 2, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.4)'
  ctx.fill()
  ctx.restore()

  // NPC sprite — grounded at npc.y with gentle subtle breathing
  if (images.npc) {
    ctx.save()
    ctx.translate(npc.x, npc.y)
    ctx.scale(idleScaleX, idleScaleY)
    // Feet touch precisely at ground zero (npc.y)
    ctx.drawImage(images.npc, -npcW / 2, -npcH + 2, npcW, npcH)
    ctx.restore()
  }

  // Interactive exclamation mark above NPC if not yet spoken
  // Sleek, compact RPG quest diamond-pill badge with gold gradient & soft bounce
  if (!gs.interacted) {
    const floatOffset = Math.sin(breathePhase * 1.5) * 3
    const badgeX = npc.x
    const badgeY = npc.y - npcH - 16 + floatOffset

    ctx.save()
    // Soft drop shadow for floating badge
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetY = 2

    // Modern glowing pill container
    const pw = 20
    const ph = 24
    ctx.beginPath()
    ctx.roundRect(badgeX - pw / 2, badgeY - ph / 2, pw, ph, 10)
    const badgeGrad = ctx.createLinearGradient(0, badgeY - ph / 2, 0, badgeY + ph / 2)
    badgeGrad.addColorStop(0, '#fef08a')
    badgeGrad.addColorStop(1, '#eab308')
    ctx.fillStyle = badgeGrad
    ctx.fill()

    // Crisp subtle border
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Inner exclamation glyph
    ctx.fillStyle = '#78350f'
    ctx.font = '900 13px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('!', badgeX, badgeY + 0.5)

    ctx.restore()

    // Ground interaction indicator ring (sleek dashed aesthetic)
    const auraPulse = 0.5 + 0.5 * Math.sin(npc.bobPhase * 2)
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(npc.x, npc.y, 20 + auraPulse * 3, 8 + auraPulse * 1.5, 0, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(234, 179, 8, ${0.45 + auraPulse * 0.35})`
    ctx.lineWidth = 1.75
    ctx.setLineDash([4, 3])
    ctx.stroke()
    ctx.restore()
  }

  // ── Notice Board: exclamation mark ──
  if (!gs.noticeBoardInteracted) {
    const brd = gs.noticeBoard
    const floatOffset = Math.sin(npc.bobPhase * 1.5) * 3
    const bbx = brd.x
    const bby = brd.y - 48 + floatOffset

    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetY = 2

    const pw = 20
    const ph = 24
    ctx.beginPath()
    ctx.roundRect(bbx - pw / 2, bby - ph / 2, pw, ph, 10)
    const badgeGrad = ctx.createLinearGradient(0, bby - ph / 2, 0, bby + ph / 2)
    badgeGrad.addColorStop(0, '#fef08a')
    badgeGrad.addColorStop(1, '#eab308')
    ctx.fillStyle = badgeGrad
    ctx.fill()

    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#78350f'
    ctx.font = '900 13px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('!', bbx, bby + 0.5)

    ctx.restore()

    // Pulsing aura ring at board base
    const brdPulse = 0.5 + 0.5 * Math.sin(npc.bobPhase * 2)
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(brd.x, brd.y + 4, 18 + brdPulse * 3, 7 + brdPulse * 1.5, 0, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(234, 179, 8, ${0.4 + brdPulse * 0.3})`
    ctx.lineWidth = 1.75
    ctx.setLineDash([4, 3])
    ctx.stroke()
    ctx.restore()
  }

  // 4. Player Character
  const spriteKeyMap = {
    front: 'player_front',
    back: 'player_back',
    left: 'player_left',
    right: 'player_right',
  }
  const playerImg = images[spriteKeyMap[player.facing] || 'player_front']
  const pw = player.spriteW
  const ph = player.spriteH

  // Walking motion dynamics: up/down step bob + stride rocking
  const isMoving = player.moving
  const phase = player.walkPhase || 0

  // Up/down vertical step displacement (cycles twice per full footstep stride cycle)
  const stepBob = isMoving ? -Math.abs(Math.sin(phase)) * 3.5 : 0
  // Side-to-side torso weight-shift / sway
  const stepSway = isMoving ? Math.sin(phase) * 0.045 : 0

  const pDrawY = player.y - ph + stepBob

  // Player Ground Shadow — stays planted on the terrain, dynamic scale & blur with step bounce
  ctx.save()
  const shadowScale = isMoving ? Math.max(0.72, 1 + stepBob * 0.05) : 1
  // Soft ambient outer shadow for depth
  ctx.beginPath()
  ctx.ellipse(player.x, player.y, 20 * shadowScale, 7.5 * shadowScale, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.28)'
  ctx.fill()
  // Direct contact shadow beneath feet
  ctx.beginPath()
  ctx.ellipse(player.x, player.y - 1, 13 * shadowScale, 4.8 * shadowScale, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)'
  ctx.fill()
  ctx.restore()

  // Player sprite — render full cohesive character model with step dynamics & depth tilt
  if (playerImg) {
    ctx.save()
    // Anchor transform to bottom center of feet
    ctx.translate(player.x, player.y)

    if (isMoving) {
      // 1. Natural squash & stretch on step footfall (compress slightly when landing, lengthen when passing)
      const squashX = 1 + Math.sin(phase * 2) * 0.035
      const stretchY = 1 - Math.sin(phase * 2) * 0.035

      // 2. Subtle directional tilt & stride sway (no body slicing, 100% seamless & preserved model)
      let tilt = 0
      if (player.facing === 'front' || player.facing === 'back') {
        // Natural hip/torso sway left-right during stride
        tilt = Math.sin(phase) * 0.04
      } else {
        // Subtle forward lean into motion direction
        const dirSign = player.facing === 'right' ? 1 : -1
        tilt = dirSign * (0.04 + Math.sin(phase) * 0.02)
      }

      ctx.rotate(tilt)
      ctx.scale(squashX, stretchY)

      // Draw the exact model seamlessly anchored right at the feet
      ctx.drawImage(
        playerImg,
        -pw / 2,
        -ph + stepBob,
        pw,
        ph
      )
    } else {
      // Idle: exact crisp grounded sprite
      ctx.drawImage(playerImg, -pw / 2, -ph, pw, ph)
    }

    ctx.restore()
  }

  // Destination indicator
  if (player.moving && player.path.length > 0) {
    const finalDest = player.path[player.path.length - 1]
    ctx.beginPath()
    ctx.arc(finalDest.x, finalDest.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(finalDest.x, finalDest.y, 9, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  ctx.restore()
}
