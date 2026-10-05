import * as tf from '@tensorflow/tfjs'

// Working assumption: target 0-25 maps alphabetically (0=A, 1=B, ... 25=Z).
// This has NOT been independently confirmed against the dataset creator's
// own encoding - see the project notes for why, and the plan to validate
// this against the ISLRTC-referenced image dataset later.
export const LETTER_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

let modelPromise = null
let scalerPromise = null

export function loadLetterModel() {
  if (!modelPromise) {
    modelPromise = tf.loadLayersModel('/model/model.json')
  }
  return modelPromise
}

export function loadScaler() {
  if (!scalerPromise) {
    scalerPromise = fetch('/model/scaler.json').then((r) => r.json())
  }
  return scalerPromise
}

// Turns MediaPipe's raw hand-landmark results into the exact 127-value
// feature vector the model was trained on: [uses_two_hands, left_hand x/y/z
// for landmarks 0-20, right_hand x/y/z for landmarks 0-20]. A hand that
// isn't currently visible is filled with zeros, matching how the training
// dataset represents single-hand signs.
export function landmarksToFeatureVector(multiHandLandmarks, multiHandedness) {
  const zeros21 = new Array(21 * 3).fill(0)
  let leftVals = zeros21
  let rightVals = zeros21

  if (multiHandLandmarks && multiHandedness) {
    multiHandLandmarks.forEach((landmarks, i) => {
      // NOTE: We tested swapping this label based on MediaPipe's documented
      // mirroring assumption, and real testing showed it made predictions
      // WORSE (letters that worked before broke, e.g. A/B/K), so it's been
      // reverted. Whatever mismatch is causing prediction errors, it isn't
      // a simple Left/Right label swap - use MediaPipe's label as-is.
      const label = multiHandedness[i]?.label // 'Left' or 'Right'
      const flat = []
      for (const point of landmarks) {
        flat.push(point.x, point.y, point.z)
      }
      if (label === 'Left') leftVals = flat
      else if (label === 'Right') rightVals = flat
    })
  }

  const usesTwoHands = multiHandLandmarks && multiHandLandmarks.length === 2 ? 1 : 0
  return [usesTwoHands, ...leftVals, ...rightVals]
}

export async function predictLetter(featureVector) {
  const [model, scaler] = await Promise.all([loadLetterModel(), loadScaler()])

  const scaled = featureVector.map((v, i) => (v - scaler.mean[i]) / scaler.scale[i])

  const inputTensor = tf.tensor2d([scaled])
  const outputTensor = model.predict(inputTensor)
  const probs = await outputTensor.data()
  inputTensor.dispose()
  outputTensor.dispose()

  let bestIndex = 0
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[bestIndex]) bestIndex = i
  }

  return {
    letter: LETTER_LABELS[bestIndex] ?? '?',
    confidence: probs[bestIndex],
    allProbs: probs,
  }
}
