import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { predictLetter, landmarksToFeatureVector } from '../lib/letterClassifier'

// This page exists ONLY to prove hand-tracking works, on its own, before
// it gets wired into any real challenge. Not part of the game flow.
//
// MediaPipe is loaded via <script> tags in index.html (not npm import) —
// see the comment there for why. That means Hands/Camera/etc. only exist
// on `window` once those scripts finish loading, which can happen after
// this component mounts. We poll briefly for them instead of assuming
// they're ready immediately.
export default function MLTest() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [status, setStatus] = useState('Loading hand-tracking model...')
  const [handsDetected, setHandsDetected] = useState(0)
  const [prediction, setPrediction] = useState(null)
  const predictingRef = useRef(false)

  useEffect(() => {
    let camera = null
    let hands = null
    let cancelled = false
    let pollTimer = null

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

      // Raw per-frame hand count can flicker (e.g. reads 2 hands for a
      // couple of frames when only 1 is present, especially at a distance
      // or awkward angle). Only update what's shown on screen once the
      // same count has held steady for a few frames in a row, so small
      // one-frame misreads don't show up as visible flicker.
      let lastCount = 0
      let stableStreak = 0
      const STABLE_FRAMES_NEEDED = 4

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

        if (rawCount === lastCount) {
          stableStreak += 1
        } else {
          lastCount = rawCount
          stableStreak = 1
        }

        if (stableStreak >= STABLE_FRAMES_NEEDED) {
          setHandsDetected(rawCount)
          setStatus(
            rawCount > 0
              ? `Detecting ${rawCount} hand${rawCount > 1 ? 's' : ''}`
              : 'No hand detected — hold your hand up in view'
          )
        }

        // Always draw whatever was actually detected this frame, even
        // during a not-yet-stable streak — the skeleton overlay should
        // stay responsive, only the text/count is debounced.
        for (const landmarks of landmarkSets) {
          window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {
            color: '#2f6b57',
            lineWidth: 3,
          })
          window.drawLandmarks(ctx, landmarks, { color: '#d8a24a', lineWidth: 1, radius: 3 })
        }
        ctx.restore()

        // Only run the classifier once the hand-count reading has held
        // steady for a few frames (same stability check used for the
        // on-screen text). Predicting on a raw, not-yet-stable frame is
        // exactly how a one-frame phantom second hand can flip a correct
        // single-hand sign into a wrong two-handed prediction — the model
        // treats hand count as an extremely strong signal.
        if (stableStreak >= STABLE_FRAMES_NEEDED && !predictingRef.current) {
          predictingRef.current = true
          const featureVector = landmarksToFeatureVector(
            results.multiHandLandmarks,
            results.multiHandedness
          )
          predictLetter(featureVector)
            .then((result) => {
              if (!cancelled) setPrediction(result)
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
      } catch (err) {
        setStatus(
          'Could not access the camera. Check browser permissions and that no other app is using it.'
        )
        console.error(err)
      }
    }

    waitForMediaPipe(start)

    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
      if (camera) camera.stop()
      if (hands) hands.close()
    }
  }, [])

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/sections" className="link-button">&larr; Back</Link>
        <h1>Hand Tracking Test</h1>
      </header>

      <p className="muted" style={{ marginBottom: 16 }}>
        This page is just for testing hand detection on its own — it is not part of
        the actual game yet. Hold a hand up in front of your camera; you should see
        a green/gold skeleton drawn over it.
      </p>

      <div style={{ position: 'relative', width: 640, maxWidth: '100%' }}>
        <video ref={videoRef} style={{ display: 'none' }} playsInline />
        <canvas
          ref={canvasRef}
          style={{ width: '100%', borderRadius: 4, border: '1px solid var(--line)' }}
        />
      </div>

      <p style={{ marginTop: 16, fontWeight: 600 }}>{status}</p>
      <p className="muted">Hands detected: {handsDetected}</p>

      {prediction && handsDetected > 0 && (
        <div className="prediction-box">
          <span className="prediction-letter">{prediction.letter}</span>
          <span className="muted">
            {(prediction.confidence * 100).toFixed(0)}% confidence
          </span>
        </div>
      )}

      <p className="muted" style={{ marginTop: 24, maxWidth: 640 }}>
        Note: this classifier's letter labels (A-Z) are a working assumption,
        not yet independently confirmed — see the project notes. Treat
        predictions here as "does the pipeline work end to end", not yet
        "is this labeled correctly."
      </p>
    </div>
  )
}
