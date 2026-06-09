import confetti from 'canvas-confetti'

export function fireGoalConfetti() {
  const colors = ['#1fa84a', '#2dcc63', '#c9a227', '#e4bc3a', '#f0f0f0']

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.65 },
    colors,
  })

  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    })
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    })
  }, 200)
}

const CELEBRATED_KEY = 'wc26-celebrated-matches'

function getCelebrated() {
  try {
    return JSON.parse(localStorage.getItem(CELEBRATED_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function markMatchCelebrated(matchId) {
  const ids = getCelebrated()
  if (!ids.includes(matchId)) {
    localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...ids, matchId]))
  }
}

export function wasMatchCelebrated(matchId) {
  return getCelebrated().includes(matchId)
}
