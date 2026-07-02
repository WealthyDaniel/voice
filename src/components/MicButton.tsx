interface MicButtonProps {
  isListening: boolean
  disabled?: boolean
  onClick: () => void
}

export function MicButton({ isListening, disabled, onClick }: MicButtonProps) {
  return (
    <div className="mic-stack">
      <div className="mic-btn-wrap">
        {!disabled && !isListening && (
          <>
            <span className="mic-ring mic-ring-outer absolute" />
            <span className="mic-ring mic-ring-inner absolute" />
          </>
        )}

        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={isListening ? 'Stop recording' : 'Start recording'}
          className={`mic-btn ${isListening ? 'mic-pulse' : 'mic-idle-glow'}`}
        >
          {isListening ? (
            <svg className="mic-btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="mic-btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
              <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-3.08A7 7 0 0 0 19 11Z" />
            </svg>
          )}
        </button>
      </div>

      {!disabled && (
        <p className="mic-hint">
          {isListening ? (
            <>
              <span className="recording-dot" aria-hidden="true" />
              Tap to stop
            </>
          ) : (
            'Tap the mic to begin'
          )}
        </p>
      )}
    </div>
  )
}
