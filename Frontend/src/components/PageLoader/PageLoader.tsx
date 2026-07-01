import { RiLeafFill } from 'react-icons/ri'
import styles from './PageLoader.module.css'

export default function PageLoader() {
  return (
    <div className={styles.overlay}>
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