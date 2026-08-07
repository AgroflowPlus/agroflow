import { apiFetch } from './marketService';

const BASE_URL = 'http://localhost:5000/api';

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
    } catch (error) {
      console.error('Get verification status error:', error);
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
      return { success: false, error: error.message || 'Failed to submit verification' };
    }
  },
};