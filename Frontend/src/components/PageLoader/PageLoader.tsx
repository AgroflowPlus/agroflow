import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { RiLeafFill } from 'react-icons/ri'
import styles from './PageLoader.module.css'

export default function PageLoader() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [key, setKey] = useState(0)

  useEffect(() => {
    setVisible(true)
    setKey(k => k + 1)
    const timer = setTimeout(() => setVisible(false), 900)
    return () => clearTimeout(timer)
  }, [location.pathname])

  if (!visible) return null

  return (
    <div className={styles.overlay} key={key}>
      <div className={styles.logoWrap}>
        <div className={styles.iconBox}>
          <RiLeafFill size={36} color="#0f1f11" />
        </div>
        <div className={styles.appName}>AgroFlow<span>+</span></div>
        <div className={styles.dots}>
          <span /><span /><span />
        </div>
      </div>
    </div>
  )
}