import { useEffect, useRef, useState } from 'react'
import { predictLetter, landmarksToFeatureVector } from '../lib/letterClassifier'

// Same requeue-until-correct rule as the quiz challenge, adapted for live
// signing instead of picking a card:
// - User performs the sign, clicks "Check my sign".
// - Correct -> move on. Wrong -> requeue to the end (yellow-free, red).
// - Skip -> shows the doodle reference, counts as wrong (yellow, not red),
//   still requeues. No free pass via skipping.
// - Camera trouble (no hand detected for a long stretch) is handled
//   separately from a wrong attempt - it doesn't count as a mistake.

const NO_HAND_TIMEOUT_MS = 15000
const STABLE_FRAMES_NEEDED = 4
const CHECK_COUNTDOWN_SECONDS = 3

function buildQueue(letters) {
  return letters.map((letter, i) => ({ letter, id: letter, queueId: `${letter}-init-${i}` }))
}

export default function WebcamChallenge({ letters, doodleFor, photoFor, onComplete }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const predictingRef = useRef(false)
  const lastHandSeenAtRef = useRef(Date.now())
  const stableRef = useRef({ lastCount: 0, streak: 0 })
  const liveLetterRef = useRef(null)
  const liveConfidenceRef = useRef(0)
  const countdownTimerRef = useRef(null)

  const [queue, setQueue] = useState(() => buildQueue(letters))
  const [correctIds, setCorrectIds] = useState(() => new Set())
  const [status, setStatus] = useState('Loading hand-tracking model...')
  const [liveLetter, setLiveLetter] = useState(null)
  const [liveConfidence, setLiveConfidence] = useState(0)
  const [handsDetected, setHandsDetected] = useState(0)
  const [result, setResult] = useState(null) // 'correct' | 'wrong' | 'skipped' | null
  const [cameraTrouble, setCameraTrouble] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [countdown, setCountdown] = useState(null) // null when not checking

  const current = queue[0]
  const totalUnique = letters.length
  const correctCount = correctIds.size

  useEffect(() => {
    let camera = null
    let hands = null
    let cancelled = false
    let pollTimer = null
    let troubleTimer = null

    function waitForMediaPipe(onReady) {
      const check = () => {
        if (cancelled) return
        if (window.Hands && window.Camera && window.drawConnectors && window.drawLandmarks) {
          onReady()
        } else {
          pollTimer = setTimeout(check, 100)
        }
      }
      check()
    }

    function scheduleTroubleCheck() {
      troubleTimer = setInterval(() => {
        if (cancelled) return
        if (Date.now() - lastHandSeenAtRef.current > NO_HAND_TIMEOUT_MS) {
          setCameraTrouble(true)
        }
      }, 2000)
    }

    async function start() {
      setStatus('Starting camera...')

      hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      })
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.75,
        minTrackingConfidence: 0.75,
      })

      hands.onResults((results) => {
        if (cancelled) return
        const canvas = canvasRef.current
        const video = videoRef.current
        if (!canvas || !video) return

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.save()
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

        const landmarkSets = results.multiHandLandmarks || []
        const rawCount = landmarkSets.length

        if (rawCount > 0) {
          lastHandSeenAtRef.current = Date.now()
          if (cameraTrouble) setCameraTrouble(false)
        }

        const st = stableRef.current
        if (rawCount === st.lastCount) {
          st.streak += 1
        } else {
          st.lastCount = rawCount
          st.streak = 1
        }
        const isStable = st.streak >= STABLE_FRAMES_NEEDED

        if (isStable) {
          setHandsDetected(rawCount)
          setStatus(rawCount > 0 ? `Detecting ${rawCount} hand${rawCount > 1 ? 's' : ''}` : 'No hand detected')
        }

        for (const landmarks of landmarkSets) {
          window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: '#2f6b57', lineWidth: 3 })
          window.drawLandmarks(ctx, landmarks, { color: '#d8a24a', lineWidth: 1, radius: 3 })
        }
        ctx.restore()

        if (isStable && !predictingRef.current) {
          predictingRef.current = true
          const featureVector = landmarksToFeatureVector(results.multiHandLandmarks, results.multiHandedness)
          predictLetter(featureVector)
            .then((res) => {
              if (!cancelled) {
                setLiveLetter(res.letter)
                setLiveConfidence(res.confidence)
                liveLetterRef.current = res.letter
                liveConfidenceRef.current = res.confidence
              }
            })
            .catch((err) => console.error('Prediction failed:', err))
            .finally(() => {
              predictingRef.current = false
            })
        }
      })

      try {
        camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (!cancelled) await hands.send({ image: videoRef.current })
          },
          width: 640,
          height: 480,
        })
        await camera.start()
        lastHandSeenAtRef.current = Date.now()
        scheduleTroubleCheck()
      } catch (err) {
        setCameraError(
          'Could not access the camera. Check browser permissions and that no other app is using it.'
        )
        console.error(err)
      }
    }

    waitForMediaPipe(start)

    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
      if (troubleTimer) clearInterval(troubleTimer)
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      if (camera) camera.stop()
      if (hands) hands.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function advanceAfter(kind) {
    // kind: 'correct' | 'wrong' | 'skipped'
    const rest = queue.slice(1)
    if (kind === 'correct') {
      const next = new Set(correctIds)
      next.add(current.id)
      setCorrectIds(next)
      if (rest.length === 0) {
        onComplete?.({ totalUnique })
        return
      }
      setQueue(rest)
    } else {
      const requeued = { ...current, queueId: `${current.id}-retry-${Date.now()}` }
      setQueue([...rest, requeued])
    }
    setResult(null)
  }

  function handleCheck() {
    if (!current || result || countdown !== null) return
    // Countdown before evaluating - gives time to get both hands into
    // position after the click, since a two-handed sign can't be checked
    // by clicking a button at the same time as signing.
    let remaining = CHECK_COUNTDOWN_SECONDS
    setCountdown(remaining)
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
        setCountdown(null)
        const isCorrect = liveLetterRef.current === current.letter && liveConfidenceRef.current > 0.6
        setResult(isCorrect ? 'correct' : 'wrong')
      } else {
        setCountdown(remaining)
      }
    }, 1000)
  }

  function handleSkip() {
    if (!current || result || countdown !== null) return
    setResult('skipped')
  }

  function handleRetryCamera() {
    setCameraTrouble(false)
    lastHandSeenAtRef.current = Date.now()
  }

  function handleMarkPending() {
    // Doesn't count as a mistake - just moves this question to the end,
    // same slot mechanically as a requeue, but not logged as wrong.
    setCameraTrouble(false)
    lastHandSeenAtRef.current = Date.now()
    const rest = queue.slice(1)
    const requeued = { ...current, queueId: `${current.id}-pending-${Date.now()}` }
    setQueue(rest.length === 0 ? [requeued] : [...rest, requeued])
  }

  if (cameraError) {
    return (
      <div className="placeholder-box">
        <p>{cameraError}</p>
      </div>
    )
  }

  if (!current) {
    return <p>No questions in this challenge.</p>
  }

  return (
    <div className="webcam-challenge">
      <div className="quiz-progress">
        <span>{correctCount} of {totalUnique} correct</span>
        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${(correctCount / totalUnique) * 100}%` }} />
        </div>
      </div>

      <h2 className="quiz-question">Show the sign for &quot;{current.letter}&quot;</h2>

      <div className="webcam-layout">
        <div className="webcam-video-wrap">
          <video ref={videoRef} style={{ display: 'none' }} playsInline />
          <canvas ref={canvasRef} className="webcam-canvas" />
        </div>

        {doodleFor && (
          <div className="webcam-reference">
            <span className="muted">Reference</span>
            <img src={doodleFor(current.letter)} alt={`Doodle of sign for ${current.letter}`} />
          </div>
        )}
      </div>

      <p className="muted" style={{ marginTop: 8 }}>{status}</p>

      {countdown !== null && (
        <div className="countdown-banner">
          Get ready... checking in {countdown}
        </div>
      )}

      {cameraTrouble && (
        <div className="camera-trouble-box">
          <p>Having trouble seeing a hand for a while. Camera issue?</p>
          <div className="quiz-feedback-row">
            <button type="button" className="quiz-submit" onClick={handleRetryCamera}>
              Retry
            </button>
            <button type="button" className="link-button" onClick={handleMarkPending}>
              Skip for now, revisit later
            </button>
          </div>
        </div>
      )}

      {!result && (
        <div className="quiz-feedback-row" style={{ marginTop: 16 }}>
          <button type="button" className="quiz-submit" onClick={handleCheck} disabled={countdown !== null}>
            {countdown !== null ? 'Checking...' : 'Check my sign'}
          </button>
          <button type="button" className="link-button" onClick={handleSkip} disabled={countdown !== null}>
            Skip / show me
          </button>
        </div>
      )}

      {(result === 'skipped' || result === 'wrong') && photoFor && (
        <div className="webcam-skip-reveal">
          <span className="muted">Correct sign:</span>
          <img src={photoFor(current.letter)} alt={`Correct sign for ${current.letter}`} />
        </div>
      )}

      {result && (
        <div className="quiz-feedback-row" style={{ marginTop: 16 }}>
          <span className={result === 'correct' ? 'feedback-correct' : result === 'skipped' ? 'feedback-skipped' : 'feedback-wrong'}>
            {result === 'correct' && 'Correct!'}
            {result === 'wrong' && "Not quite - you'll see this one again."}
            {result === 'skipped' && "Here's the sign - you'll see this one again."}
          </span>
          <button type="button" className="quiz-submit" onClick={() => advanceAfter(result)}>
            Continue
          </button>
        </div>
      )}
    </div>
  )
}
