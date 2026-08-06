type Props = {
  open: boolean
  result?: 'win' | 'lose' | 'draw'
  onClose: () => void
  onGoHome: () => void
}

export function GameResultDialog({ open, result, onClose, onGoHome }: Props) {
  if (!open) {
    return null
  }

  const title =
    result === 'win' ? 'You won!' : result === 'lose' ? 'You lost' : 'Draw'
  const subtitle =
    result === 'win'
      ? 'Nice game — checkmate!'
      : result === 'lose'
        ? 'Your opponent delivered checkmate.'
        : 'The game ended in a stalemate/draw.'

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal result-modal" role="dialog" onClick={(e) => e.stopPropagation()}>
        <div className={`result-badge result-${result ?? 'draw'}`}>
          {result === 'win' ? '🏆' : result === 'lose' ? '♟️' : '🤝'}
        </div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Stay
          </button>
          <button type="button" className="btn primary" onClick={onGoHome}>
            Back to lobby
          </button>
        </div>
      </div>
    </div>
  )
}
