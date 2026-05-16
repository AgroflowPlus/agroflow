import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiLeafFill } from 'react-icons/ri'
import {
  BsArrowRight, BsEye, BsEyeSlash,
  BsEnvelope, BsLockFill, BsExclamationCircle,
} from 'react-icons/bs'
import { authService, getContentImages } from '../../services/authService'
import type { UserRole } from '../../types/auth'
import styles from '../../styles/auth.module.css'

// ── Email domain validation ───────────────────────────────
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)
}

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [apiError, setApiError] = useState('')
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [sideImage, setSideImage] = useState(
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=900&q=90'
  )

  useEffect(() => {
    getContentImages().then(imgs => {
      if (imgs['signin_side']) setSideImage(imgs['signin_side'])
    })
  }, [])

  const validate = () => {
    const e: Record<string, string> = {}

    // Email
    if (!email.trim()) {
      e.email = 'Email is required'
    } else if (!isValidEmail(email.trim())) {
      e.email = 'Enter a valid email address (e.g. you@example.com)'
    }

    // Password
    if (!password) {
      e.password = 'Password is required'
    } else if (password.length < 6) {
      e.password = 'Password must be at least 6 characters'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError('')
    if (!validate()) return

    setLoading(true)
    try {
      const res = await authService.login({ email, password })
      authService.saveSession(res)

      const role: UserRole = res.user.role as UserRole
      if      (role === 'farmer') navigate('/farmer/dashboard')
      else if (role === 'buyer')  navigate('/buyer/dashboard')
      else if (role === 'seller') navigate('/seller/dashboard')
      else                        navigate('/admin/dashboard')
    } catch (err: unknown) {
      setApiError(
        err instanceof Error ? err.message : 'Invalid email or password.'
      )
    } finally {
      setLoading(false)
    }
  }

  const err = (k: string) =>
    errors[k] ? (
      <div className={styles.fieldErrMsg}>
        <BsExclamationCircle size={11} />
        {errors[k]}
      </div>
    ) : null

  return (
    <div className={styles.shell}>

      {/* ── LEFT — farm photo ── */}
      <div className={styles.left}>
        <div
          className={styles.leftBg}
          style={{ backgroundImage: `url('${sideImage}')` }}
        />
        <div className={styles.leftOverlay} />

        <div className={styles.leftLogo}>
          <div className={styles.leftLogoMark}>
            <RiLeafFill size={17} />
          </div>
          <span className={styles.leftLogoText}>
            AgroFlow<span>+</span>
          </span>
        </div>

        <div className={styles.leftCaption}>
          <div className={styles.leftCaptionTag}>
            <div className={styles.leftCaptionDot} />
            <span className={styles.leftCaptionTagText}>Welcome Back</span>
          </div>
          <div className={styles.leftCaptionTitle}>
            Your Farm.<br />
            <em>Your Dashboard.</em>
          </div>
          <div className={styles.leftCaptionSub}>
            Sign in to manage your produce, track deliveries, and stay connected
            with your supply chain.
          </div>
        </div>
      </div>

      {/* ── RIGHT — login form ── */}
      <div className={styles.right}>
        <div className={styles.rightTopBar}>
          <div className={styles.mobileLogo}>
            <div className={styles.mobileLogoMark}>
              <RiLeafFill size={15} />
            </div>
            <span className={styles.mobileLogoText}>
              AgroFlow<span>+</span>
            </span>
          </div>
          <div className={styles.topBarRight}>
            <span className={styles.topBarText}>Don't have an account?</span>
            <button
              className={styles.topBarBtn}
              onClick={() => navigate('/register')}
            >
              Sign Up
            </button>
          </div>
        </div>

        <div className={styles.formWrap}>
          <h1 className={styles.formTitle}>Welcome Back</h1>
          <p className={styles.formSubtitle}>
            Sign in to your AgroFlow+ account
          </p>

          {apiError && (
            <div className={styles.errorBanner}>
              <BsExclamationCircle size={15} color="#e05252" />
              <span className={styles.errorBannerText}>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.fields}>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Email Address</label>
                <div className={styles.fieldInputWrap}>
                  <span className={styles.fieldInputIcon}>
                    <BsEnvelope size={14} />
                  </span>
                  <input
                    className={`${styles.fieldInput} ${errors['email'] ? styles.fieldError : ''}`}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                {err('email')}
              </div>

              <div className={styles.fieldGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className={styles.fieldLabel}>Password</label>
                  <span
                    style={{ fontSize: 12, color: '#2d6a35', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => {/* TODO: forgot password */}}
                  >
                    Forgot password?
                  </span>
                </div>
                <div className={styles.fieldInputWrap}>
                  <span className={styles.fieldInputIcon}>
                    <BsLockFill size={13} />
                  </span>
                  <input
                    className={`${styles.fieldInput} ${errors['password'] ? styles.fieldError : ''}`}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.fieldPasswordToggle}
                    onClick={() => setShowPwd(p => !p)}
                    tabIndex={-1}
                  >
                    {showPwd ? <BsEyeSlash size={15} /> : <BsEye size={15} />}
                  </button>
                </div>
                {err('password')}
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className={styles.spinner} /> Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <div className={styles.submitBtnCircle}>
                      <BsArrowRight size={13} />
                    </div>
                  </>
                )}
              </button>

            </div>
          </form>

          <p className={styles.termsText}>
            By signing in you agree to our{' '}
            <span className={styles.termsLink}>Terms of Service</span> and{' '}
            <span className={styles.termsLink}>Privacy Policy</span>.
          </p>
        </div>
      </div>

    </div>
  )
}