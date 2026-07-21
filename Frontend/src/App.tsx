import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Onboarding      from './pages/Onboarding/Onboarding'
import Register        from './pages/Register/Register'
import Login           from './pages/Login/Login'
import FarmerDashboard from './pages/FarmerDashboard/Farmerdashboard'
import BuyerDashboard  from './pages/BuyerSellerDashboard/BuyerDashboard'
import SellerDashboard from './pages/SellerDashboard/SellerDashboard'
import FloatingAI      from './components/FloatingAI/FloatingAI'
import { ToastContainer }   from './components/Toast/Toast'
import { ToastProvider }    from './context/ToastContext'
import { PWAInstallBanner } from './components/PWAInstallBanner/PWAInstallBanner'
import { authService }      from './services/authService'

function FarmerWithAI() {
  return (
    <>
      <FarmerDashboard />
      <FloatingAI />
    </>
  )
}

// Auto-redirect based on saved session
function AutoRedirect() {
  // Refresh session timestamp every time app opens
  useEffect(() => { authService.refreshSession() }, [])

  if (authService.isSessionValid()) {
    const user = authService.getUser()
    if (user?.role === 'farmer') return <Navigate to="/farmer/dashboard" replace />
    if (user?.role === 'buyer')  return <Navigate to="/buyer/dashboard"  replace />
    if (user?.role === 'seller') return <Navigate to="/seller/dashboard" replace />
  }

  return <Onboarding />
}

// Guard: redirect to dashboard if already logged in
function GuestOnly({ children }: { children: React.ReactNode }) {
  if (authService.isSessionValid()) {
    const user = authService.getUser()
    if (user?.role === 'farmer') return <Navigate to="/farmer/dashboard" replace />
    if (user?.role === 'buyer')  return <Navigate to="/buyer/dashboard"  replace />
    if (user?.role === 'seller') return <Navigate to="/seller/dashboard" replace />
  }
  return <>{children}</>
}

// Guard: redirect to login if not logged in
function Protected({ children }: { children: React.ReactNode }) {
  if (!authService.isSessionValid()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <ToastProvider>
      <PWAInstallBanner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AutoRedirect />} />

          <Route path="/register" element={
            <GuestOnly><Register /></GuestOnly>
          } />

          <Route path="/login" element={
            <GuestOnly><Login /></GuestOnly>
          } />

          <Route path="/farmer/*" element={
            <Protected><FarmerWithAI /></Protected>
          } />

          <Route path="/buyer/*" element={
            <Protected><BuyerDashboard /></Protected>
          } />

          <Route path="/seller/*" element={
            <Protected><SellerDashboard /></Protected>
          } />

          <Route path="/admin/*" element={
            <div style={{ padding: 40 }}>Admin — coming next</div>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </ToastProvider>
  )
}