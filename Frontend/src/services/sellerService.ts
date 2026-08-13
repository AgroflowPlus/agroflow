import { apiFetch } from './marketService';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://ai-farmer-platform-backend-code.onrender.com/api';

export interface SellerVerificationStatus {
  id: string;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  selfieUrl?: string;
  verificationNote?: string;
  updatedAt: string;
}

export const sellerService = {
  // ── Get my verification status ──────
  async getMyVerificationStatus(): Promise<{ verificationStatus: string; seller?: SellerVerificationStatus }> {
    try {
      const res = await apiFetch(`${BASE_URL}/sellers/my/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('agf_token')}`,
        },
      });
      const data = await res.json();
      return data;
    } catch (error: any) {
      console.error('Get verification status error:', error);
      
      // Check for network errors
      if (!navigator.onLine || error.message === 'Failed to fetch' || error.message === 'NetworkError') {
        return { verificationStatus: 'unverified' };
      }
      
      return { verificationStatus: 'unverified' };
    }
  },

  // ── Submit verification ────────────────────────────────────────
  async submitVerification(
    selfieUrl: string, 
    description?: string,
    farmName?: string,
    yearsExperience?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await apiFetch(`${BASE_URL}/sellers/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('agf_token')}`,
        },
        body: JSON.stringify({ 
          selfieUrl, 
          description,
          farmName,
          yearsExperience 
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to submit verification' };
      }
      return { success: true };
    } catch (error: any) {
      console.error('Submit verification error:', error);
      
      // Check for network errors
      if (!navigator.onLine || error.message === 'Failed to fetch' || error.message === 'NetworkError') {
        return { success: false, error: 'No internet connection. Please check your network and try again.' };
      }
      
      if (error.message === 'Something went wrong. Please try again.') {
        return { success: false, error: error.message };
      }
      
      return { success: false, error: 'Something went wrong. Please try again.' };
    }
  },
};