import { useState, useMemo } from 'react'

// Progression rule (locked earlier in planning): every question in the set
// must be answered correctly to complete the challenge. A wrong answer is
// not retried immediately - it goes to the END of the queue and comes back
// around later. This keeps looping until every question has been answered
// correctly.
//
// Example with 3 questions, wrong on Q1 first try:
//   Q1(wrong) -> Q2(right) -> Q3(right) -> Q1 again(right) -> done

function buildQueue(questions) {
  return questions.map((q, i) => ({ ...q, queueId: `${q.id}-init-${i}` }))
}

export default function QuizChallenge({ questions, onComplete }) {
  const [queue, setQueue] = useState(() => buildQueue(questions))
  const [correctIds, setCorrectIds] = useState(() => new Set())
  const [selectedOptionId, setSelectedOptionId] = useState(null)
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null

  const current = queue[0]
  const totalUnique = questions.length
  const correctCount = correctIds.size

  const options = useMemo(() => (current ? current.options : []), [current])

  function handleSelect(optionId) {
    if (feedback) return
    setSelectedOptionId(optionId)
  }

  function handleSubmit() {
    if (!selectedOptionId || !current) return
    const isCorrect = selectedOptionId === current.correctOptionId
    setFeedback(isCorrect ? 'correct' : 'wrong')
  }

  function handleContinue() {
    const wasCorrect = feedback === 'correct'
    const rest = queue.slice(1)

    if (wasCorrect) {
      const nextCorrectIds = new Set(correctIds)
      nextCorrectIds.add(current.id)
      setCorrectIds(nextCorrectIds)

      if (rest.length === 0) {
        onComplete?.({ totalUnique })
        return
      }
      setQueue(rest)
    } else {
      const requeued = { ...current, queueId: `${current.id}-retry-${Date.now()}` }
      setQueue([...rest, requeued])
    }

    setSelectedOptionId(null)
    setFeedback(null)
  }

  if (!current) {
    return <p>No questions in this challenge.</p>
  }

  return (
    <div className="quiz">
      <div className="quiz-progress">
        <span>{correctCount} of {totalUnique} correct</span>
        <div className="quiz-progress-bar">
          <div
            className="quiz-progress-fill"
            style={{ width: `${(correctCount / totalUnique) * 100}%` }}
          />
        </div>
      </div>

      <h2 className="quiz-question">{current.prompt}</h2>

      <div className="quiz-options">
        {options.map((opt) => {
          const isSelected = selectedOptionId === opt.id
          const showAsCorrect = feedback && opt.id === current.correctOptionId
          const showAsWrong = feedback === 'wrong' && isSelected && opt.id !== current.correctOptionId

          return (
            <button
              key={opt.id}
              type="button"
              className={
                'quiz-option' +
                (isSelected && !feedback ? ' selected' : '') +
                (showAsCorrect ? ' correct' : '') +
                (showAsWrong ? ' wrong' : '')
              }
              onClick={() => handleSelect(opt.id)}
              disabled={!!feedback}
            >
              <div className="quiz-option-images">
                {opt.doodle && (
                  <img src={opt.doodle} alt={`Doodle of sign for ${opt.label}`} className="quiz-option-image doodle" />
                )}
                {opt.doodle && opt.image && <span className="quiz-option-divider">|</span>}
                {opt.image && (
                  <img src={opt.image} alt={`Photo of sign for ${opt.label}`} className="quiz-option-image" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {!feedback ? (
        <button
          type="button"
          className="quiz-submit"
          onClick={handleSubmit}
          disabled={!selectedOptionId}
        >
          Submit
        </button>
      ) : (
        <div className="quiz-feedback-row">
          <span className={feedback === 'correct' ? 'feedback-correct' : 'feedback-wrong'}>
            {feedback === 'correct' ? 'Correct!' : "Not quite - you'll see this one again."}
          </span>
          <button type="button" className="quiz-submit" onClick={handleContinue}>
            Continue
          </button>
        </div>
      )}
    </div>
  )
}
