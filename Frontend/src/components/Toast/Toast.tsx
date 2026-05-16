import { MdCheckCircle, MdError, MdInfo, MdWarning, MdClose } from 'react-icons/md'
import { useToast } from '../../context/ToastContext'
import styles from './Toast.module.css'

const icons = {
  success: <MdCheckCircle size={20} />,
  error: <MdError size={20} />,
  info: <MdInfo size={20} />,
  warning: <MdWarning size={20} />
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
          <span className={styles.icon}>{icons[toast.type]}</span>
          <span className={styles.message}>{toast.message}</span>
          <button className={styles.closeBtn} onClick={() => removeToast(toast.id)}>
            <MdClose size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}