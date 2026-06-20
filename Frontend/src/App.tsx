import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Onboarding           from './pages/Onboarding/Onboarding'
import Register             from './pages/Register/Register'
import Login                from './pages/Login/Login'
import FarmerDashboard      from './pages/FarmerDashboard/Farmerdashboard'
import BuyerDashboard       from './pages/BuyerSellerDashboard/BuyerDashboard'
import SellerDashboard      from './pages/SellerDashboard/SellerDashboard'
import PageLoader           from './components/PageLoader/PageLoader'
import FloatingAI           from './components/FloatingAI/FloatingAI'
import { ToastContainer } from './components/Toast/Toast'
import { ToastProvider } from './context/ToastContext'

function FarmerWithAI() {
  return (
    <>
      <FarmerDashboard />
      <FloatingAI />
    </>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <PageLoader />
        <Routes>
          <Route path="/"         element={<Onboarding />}       />
          <Route path="/register" element={<Register />}         />
          <Route path="/login"    element={<Login />}            />
          <Route path="/farmer/*" element={<FarmerWithAI />}     />
          
          <Route path="/buyer/*"  element={<BuyerDashboard />}   />
          
          <Route path="/seller/*" element={<SellerDashboard />}  />
          
          <Route path="/admin/*"  element={<div style={{padding:40}}>Admin — coming next</div>} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </ToastProvider>
  )
}