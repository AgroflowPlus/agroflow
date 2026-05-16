import { useState, useEffect } from 'react'
import { RiRobot2Fill } from 'react-icons/ri'
import { MdClose } from 'react-icons/md'
import { useNavigate } from 'react-router-dom'
import styles from './FloatingAI.module.css'

interface Props {
  /** When true, renders the compact navbar pill variant (desktop only) */
  navbarMode?: boolean
}

export default function FloatingAI({ navbarMode = false }: Props) {
  const navigate                      = useNavigate()
  const [showTooltip, setShowTooltip] = useState(false)
  const [hasOpened, setHasOpened]     = useState(false)

  // Show tooltip after 3 s on first visit
  useEffect(() => {
    const seen = localStorage.getItem('agf_ai_tooltip_seen')
    if (!seen) {
      const timer = setTimeout(() => setShowTooltip(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Auto-hide tooltip after 6 s
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => setShowTooltip(false), 6000)
      return () => clearTimeout(timer)
    }
  }, [showTooltip])

  function handleClick() {
    setShowTooltip(false)
    setHasOpened(true)
    localStorage.setItem('agf_ai_tooltip_seen', 'true')
    navigate('/farmer/dashboard')
  }

  /* ── NAVBAR PILL (desktop) ─────────────────────── */
  if (navbarMode) {
    return (
      <div className={styles.navPillWrap}>
        {showTooltip && (
          <div className={styles.navTooltip}>
            <p>👋 Need assistance?</p>
            <p>I'm Agro, your personal farming buddy!</p>
            <button
              className={styles.navTooltipClose}
              onClick={() => setShowTooltip(false)}
            >
              <MdClose size={12} />
            </button>
          </div>
        )}

        <button
          className={`${styles.navPill} ${showTooltip ? styles.navPillActive : ''}`}
          onClick={handleClick}
          aria-label="Open Agro AI assistant"
        >
          {!hasOpened && <span className={styles.navPillPulse} />}
          <span className={styles.navPillIcon}>
            <RiRobot2Fill size={16} />
          </span>
          <span className={styles.navPillText}>Ask Agro AI</span>
          {/* <span className={styles.navPillBadge}>✨ New</span> */}
        </button>
      </div>
    )
  }

  /* ── FLOATING BUTTON (mobile) ──────────────────── */
  return (
    <>
      {showTooltip && (
        <div className={styles.tooltip}>
          <p>👋 Need assistance?</p>
          <p>I'm Agro, your personal farming buddy!</p>
          <button
            className={styles.tooltipClose}
            onClick={() => setShowTooltip(false)}
          >
            <MdClose size={12} />
          </button>
        </div>
      )}

      <button
        className={styles.floatBtn}
        onClick={handleClick}
        aria-label="Open AI assistant"
      >
        <RiRobot2Fill size={24} />
        {!hasOpened && <span className={styles.floatPulse} />}
      </button>
    </>
  )
}