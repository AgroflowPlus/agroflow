import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Onboarding           from './pages/Onboarding/Onboarding'
import Register             from './pages/Register/Register'
import Login                from './pages/Login/Login'
import FarmerDashboard      from './pages/FarmerDashboard/Farmerdashboard'
import BuyerSellerDashboard from './pages/BuyerSellerDashboard/BuyerSellerDashboard'
import PageLoader           from './components/PageLoader/PageLoader'
import FloatingAI           from './components/FloatingAI/FloatingAI'
import { ToastContainer } from './components/Toast/Toast'
import { ToastProvider } from './context/ToastContext'

// Wrapper component that provides toast context to children
function BuyerSellerWithAI() {
  return (
    <>
      <BuyerSellerDashboard />
      <FloatingAI />
    </>
  )
}

// Main App component with Toast Provider
export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <PageLoader />
        <Routes>
          <Route path="/"         element={<Onboarding />}       />
          <Route path="/register" element={<Register />}         />
          <Route path="/login"    element={<Login />}            />
          <Route path="/farmer/*" element={<FarmerDashboard />}  />
          <Route path="/buyer/*"  element={<BuyerSellerWithAI />} />
          <Route path="/seller/*" element={<BuyerSellerWithAI />} />
          <Route path="/admin/*"  element={<div style={{padding:40}}>Admin — coming next</div>} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </ToastProvider>
  )
}