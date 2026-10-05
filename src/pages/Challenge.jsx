import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QuizChallenge from '../components/QuizChallenge'
import WebcamChallenge from '../components/WebcamChallenge'
import GameLevel from '../components/GameLevel'

// Each level has its own letter set - deliberately NOT shared between
// levels, so levels don't end up testing identical content.
const QUIZ_LEVEL_LETTERS = {
  1: ['A', 'B', 'C', 'D', 'E'],
  3: ['F', 'G', 'H', 'I', 'J'],
}

const WEBCAM_LEVEL_LETTERS = {
  2: ['K', 'L', 'M', 'N', 'O'],
  4: ['P', 'Q', 'R', 'S', 'T'],
}

function buildQuizQuestions(letters) {
  return letters.map((letter) => {
    const distractors = letters
      .filter((l) => l !== letter)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    const optionLetters = [letter, ...distractors].sort(() => Math.random() - 0.5)

    return {
      id: letter,
      prompt: `Which sign is "${letter}"?`,
      correctOptionId: letter,
      options: optionLetters.map((l) => ({
        id: l,
        label: l,
        doodle: `/sample-doodles/${l}.png`,
        image: `/sample-signs/${l}.jpg`,
      })),
    }
  })
}

export default function Challenge() {
  const { sectionId, levelId } = useParams()
  const navigate = useNavigate()
  const quizLetters = QUIZ_LEVEL_LETTERS[levelId]
  const webcamLetters = WEBCAM_LEVEL_LETTERS[levelId]

  const [quizQuestions] = useState(() => (quizLetters ? buildQuizQuestions(quizLetters) : []))
  const [, setCompleted] = useState(false)

  const isQuizLevel = Boolean(quizLetters)
  const isWebcamLevel = Boolean(webcamLetters)

  return (
    <GameLevel
      levelId={Number(levelId)}
      onComplete={() => setCompleted(true)}
      onExit={() => navigate(`/sections/${sectionId}`)}
    >
      {isQuizLevel ? (
        <QuizChallenge
          questions={quizQuestions}
          onComplete={() => setCompleted(true)}
        />
      ) : isWebcamLevel ? (
        <WebcamChallenge
          letters={webcamLetters}
          doodleFor={(letter) => `/sample-doodles/${letter}.png`}
          photoFor={(letter) => `/sample-signs/${letter}.jpg`}
          onComplete={() => setCompleted(true)}
        />
      ) : (
        <div className="placeholder-box">
          <p>This is where the story and challenge for this level will go.</p>
          <p className="muted">Section: {sectionId} &middot; Level: {levelId}</p>
        </div>
      )}
    </GameLevel>
  )
}
