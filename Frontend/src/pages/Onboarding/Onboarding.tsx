import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiLeafFill } from 'react-icons/ri'
import { BsArrowRight } from 'react-icons/bs'
import { getContentImages } from '../../services/authService'
import styles from './Onboarding.module.css'

export default function Onboarding() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [images, setImages]     = useState<Record<string, string>>({})

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    getContentImages().then(setImages)
  }, [])

  return (
    <div className={styles.page}>

      {/* ── NAVBAR ─────────────────────────────────── */}
      <nav className={`${styles.navbar} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>
            <RiLeafFill size={17} />
          </div>
          <span className={styles.logoName}>
            AgroFlow<span>+</span>
          </span>
        </div>
        <div className={styles.navActions}>
          <button className={styles.navSignUp} onClick={() => navigate('/register')}>
            Sign Up
          </button>
          <button className={styles.navLogin} onClick={() => navigate('/login')}>
            Log In <BsArrowRight size={12} />
          </button>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────── */}
      <section className={styles.hero}>
        <div
          className={styles.heroBg}
          style={
            images['hero_bg']
              ? { backgroundImage: `url('${images['hero_bg']}')` }
              : {}
          }
        />
        <div className={styles.heroOverlay} />

        <div className={styles.heroInner}>
          <div>
            <div className={styles.heroPill}>
              <div className={styles.pillDot} />
              <span className={styles.pillText}>AI-Driven Agricultural Platform</span>
            </div>

            <h1 className={styles.heroHeading}>
              Bringing <em>Innovation</em><br />
              to Your Farming<br />
              Journey.
            </h1>

            <p className={styles.heroSub}>
              From precision agriculture to sustainable supply chains — we
              connect farmers, buyers, and sellers through intelligent technology
              that grows your business and eliminates waste.
            </p>

            <div className={styles.heroBtns}>
              <button className={styles.btnPrimary} onClick={() => navigate('/register')}>
                Get Started
                <div className={styles.btnCircle}>
                  <BsArrowRight size={13} />
                </div>
              </button>
              <button className={styles.btnGhost} onClick={() => navigate('/login')}>
                I already have an account
              </button>
            </div>
          </div>

          <div className={styles.heroCard}>
            <div className={styles.heroCardHead}>
              <div className={styles.heroCardDot} />
              Our Mission
            </div>
            <p className={styles.heroCardBody}>
              To empower farmers with intelligent tools and technology that
              enhance productivity, sustainability, and efficiency — shaping
              the future of agriculture.
            </p>
            <div className={styles.heroCardLink}>
              Learn More <BsArrowRight size={12} />
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────── */}
      <section className={styles.how}>
        <div className={styles.howInner}>

          <div>
            <div className={styles.howEyebrow}>
              <div className={styles.howEyebrowBar} />
              Our Working Flow
            </div>
            <h2 className={styles.howTitle}>
              How We Do<br />Agricultural Work
            </h2>
            <p className={styles.howSubText}>
              Our platform connects quality produce directly with buyers —
              top quality, zero waste, fully transparent.
            </p>
            <div className={styles.howPhotos}>
              <div
                className={`${styles.howPhoto} ${styles.howPhotoA}`}
                style={
                  images['how_we_work_1']
                    ? { backgroundImage: `url('${images['how_we_work_1']}')` }
                    : {}
                }
              />
              <div
                className={`${styles.howPhoto} ${styles.howPhotoB}`}
                style={
                  images['how_we_work_2']
                    ? { backgroundImage: `url('${images['how_we_work_2']}')` }
                    : {}
                }
              />
              <div
                className={`${styles.howPhoto} ${styles.howPhotoC}`}
                style={
                  images['how_we_work_3']
                    ? { backgroundImage: `url('${images['how_we_work_3']}')` }
                    : {}
                }
              />
            </div>
          </div>

          <div className={styles.howSteps}>
            {[
              { n: '01', title: 'Register Your Role',      desc: 'Sign up as a Farmer, Buyer, or Seller. Each role gets a tailored dashboard built for your exact workflow.' },
              { n: '02', title: 'Input Produce or Demand', desc: 'Farmers log crop type, soil type, and location. Buyers and sellers enter what they need or have available.' },
              { n: '03', title: 'AI Matches & Schedules',  desc: 'Our AI engine instantly matches buyers to available produce and predicts the optimal harvest window.' },
              { n: '04', title: 'Get Notified & Deliver',  desc: 'Receive SMS and email alerts for every match. Track deliveries in real time from your dashboard.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className={styles.howStep}>
                <div className={styles.howStepBadge}>{n}</div>
                <div>
                  <div className={styles.howStepTitle}>{title}</div>
                  <div className={styles.howStepDesc}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── ROLES ──────────────────────────────────── */}
      <section className={styles.roles}>
        <div className={styles.rolesInner}>
          <div className={styles.rolesPill}>Who Uses AgroFlow+</div>
          <h2 className={styles.rolesTitle}>
            Built for <em>Every Player</em><br />
            in the Supply Chain
          </h2>
          <div className={styles.rolesGrid}>
            {[
              { key: 'role_farmer', cssClass: styles.rp1, name: 'Farmers', tagline: 'Grow & Manage Produce'    },
              { key: 'role_buyer',  cssClass: styles.rp2, name: 'Buyers',  tagline: 'Source Quality Produce'   },
              { key: 'role_seller', cssClass: styles.rp3, name: 'Sellers', tagline: 'List & Sell Availability' },
            ].map(({ key, cssClass, name, tagline }) => (
              <div key={name} className={styles.roleCard}>
                <div className={styles.rolePhotoWrap}>
                  <div
                    className={`${styles.rolePhoto} ${cssClass}`}
                    style={
                      images[key]
                        ? { backgroundImage: `url('${images[key]}')` }
                        : {}
                    }
                  />
                </div>
                <div className={styles.roleCardBody}>
                  <div className={styles.roleName}>{name}</div>
                  <div className={styles.roleTagline}>{tagline}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────── */}
      <section className={styles.cta}>
        <div className={styles.ctaGlow} />
        <div className={styles.ctaInner}>
          <div className={styles.ctaPill}>Join AgroFlow+</div>
          <h2 className={styles.ctaTitle}>
            Ready to Transform Your<br />
            <em>Agricultural Business?</em>
          </h2>
          <p className={styles.ctaDesc}>
            Join thousands of farmers, buyers, and sellers already using
            AgroFlow+ to grow smarter, earn more, and waste less.
          </p>
          <div className={styles.ctaBtns}>
            <button className={styles.btnPrimary} onClick={() => navigate('/register')}>
              Create Free Account
              <div className={styles.btnCircle}>
                <BsArrowRight size={13} />
              </div>
            </button>
            <button className={styles.btnOutline} onClick={() => navigate('/login')}>
              Sign In Instead
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>AgroFlow<span>+</span></div>
        <div className={styles.footerCopy}>© 2026 AgroFlow+. All rights reserved.</div>
      </footer>

    </div>
  )
}