export type CropType = 'Maize' | 'Tomato' | 'Cassava' | 'Pepper'

export const AKURE_AREAS = [
  'Oba-Ile', 'Ijapo Estate', 'Oke-Aro', 'Arakale', 'Isolo',
  'Oda', 'Oke-Ogba', 'Ijomu', 'Ayedun', 'Alagbaka'
]

export const AKURE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Oba-Ile':      { lat: 7.2986, lng: 5.1413 },
  'Ijapo Estate': { lat: 7.2558, lng: 5.1947 },
  'Oke-Aro':      { lat: 7.2621, lng: 5.1823 },
  'Arakale':      { lat: 7.2533, lng: 5.1942 },
  'Isolo':        { lat: 7.2467, lng: 5.2011 },
  'Oda':          { lat: 7.2389, lng: 5.2134 },
  'Oke-Ogba':     { lat: 7.2701, lng: 5.1756 },
  'Ijomu':        { lat: 7.2612, lng: 5.1889 },
  'Ayedun':       { lat: 7.2445, lng: 5.2089 },
  'Alagbaka':     { lat: 7.2578, lng: 5.1934 },
}

export interface Listing {
  id:           string
  sellerId:     string
  sellerName:   string
  sellerEmail:  string
  sellerPhone?: string
  cropType:     CropType
  quantity:     number
  remainingQty: number
  location:     string
  description:  string
  photoUrl?:    string
  status:       'available' | 'partial' | 'sold'
  createdAt:    string
  distance?:    number
  coordinates?: { lat: number; lng: number } | null
  requests?:    Request[]
}

export interface Demand {
  id:        string
  buyerId:   string
  buyerName: string
  buyerEmail:string
  cropType:  CropType
  quantity:  number
  location:  string
  status:    'pending' | 'matched' | 'expired'
  createdAt: string
}

export interface Request {
  id:           string
  listingId:    string
  buyerId:      string
  buyerName:    string
  buyerEmail:   string
  requestedQty: number
  message:      string
  status:       'pending' | 'accepted' | 'rejected' | 'completed'
  createdAt:    string
  updatedAt:    string
}

export interface Match {
  id:             string
  listingId:      string
  demandId?:      string
  requestId?:     string
  cropType:       CropType
  buyerId:        string
  buyerName:      string
  buyerEmail:     string
  buyerLoc:       string
  sellerId:       string
  sellerName:     string
  sellerEmail:    string
  sellerLoc:      string
  quantity:       number
  distance:       number
  status:         'pending' | 'confirmed' | 'declined'
  matchedAt:      string
}

export interface Notification {
  id:        string
  userId:    string
  type:      'request' | 'match' | 'delivery' | 'waitlist'
  title:     string
  message:   string
  read:      boolean
  data?:     any
  createdAt: string
}

const BASE_URL = import.meta.env.VITE_API_URL || 'https://ai-farmer-platform-backend-code.onrender.com/api'

function getToken(): string {
  return localStorage.getItem('agroflow_token') || localStorage.getItem('agf_token') || ''
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  }
}

// ── In-memory notification store (frontend only) ──────────────
let _notifications: Notification[] = []

export const marketService = {
  // Keep for backwards compat — no-op now
  init() {},

  // ── LISTINGS ──────────────────────────────────────────────
  async getListings(userLocation?: string): Promise<Listing[]> {
    try {
      const params = new URLSearchParams()
      if (userLocation) params.set('userLocation', userLocation)

      const res  = await fetch(`${BASE_URL}/listings?${params}`, {
        headers: authHeaders(),
      })
      const data = await res.json()
      return data.listings || []
    } catch {
      return []
    }
  },

  async getListingsBySeller(): Promise<Listing[]> {
    try {
      const res  = await fetch(`${BASE_URL}/listings/my/listings`, { headers: authHeaders() })
      const data = await res.json()
      return data.listings || []
    } catch {
      return []
    }
  },

  async postListing(data: {
    cropType:    CropType
    quantity:    number
    location:    string
    description: string
    photoUrl?:   string
  }): Promise<{ success: boolean; listing?: any; error?: string }> {
    try {
      const res  = await fetch(`${BASE_URL}/listings`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) return { success: false, error: json.error }
      return { success: true, listing: json.listing }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  },

  // ── DELETE LISTING ──────────────────────────────────────────
  async deleteListing(listingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${BASE_URL}/listings/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete listing');
      
      return { success: true };
    } catch (error: any) {
      console.error('Delete listing error:', error);
      return { success: false, error: error.message };
    }
  },

  // ── DEMAND / WAITLIST ─────────────────────────────────────
  async postDemand(data: {
    cropType: CropType
    quantity: number
    location: string
  }): Promise<{ matched: boolean; match?: Match; demand?: Demand }> {
    try {
      const res  = await fetch(`${BASE_URL}/listings/demand`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify(data),
      })
      const json = await res.json()
      return json
    } catch {
      return { matched: false }
    }
  },

  async getWaitlist(): Promise<Demand[]> {
    try {
      const res  = await fetch(`${BASE_URL}/listings/my/waitlist`, { headers: authHeaders() })
      const data = await res.json()
      return data.demands || []
    } catch {
      return []
    }
  },

  // ── REQUESTS ─────────────────────────────────────────────
  async createRequest(
    listingId:    string,
    quantity:     number,
    message:      string,
    buyerLocation:string
  ): Promise<{ success: boolean; request?: any; error?: string }> {
    try {
      const res  = await fetch(`${BASE_URL}/listings/${listingId}/request`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({ quantity, message, buyerLocation }),
      })
      const json = await res.json()
      if (!res.ok) return { success: false, error: json.error }
      return { success: true, request: json.request }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  },

  async acceptRequest(
    requestId:    string,
    buyerLocation:string = 'Ijapo Estate'
  ): Promise<{ success: boolean; match?: Match; error?: string }> {
    try {
      const res  = await fetch(`${BASE_URL}/listings/requests/${requestId}/accept`, {
        method:  'PATCH',
        headers: authHeaders(),
        body:    JSON.stringify({ buyerLocation }),
      })
      const json = await res.json()
      if (!res.ok) return { success: false, error: json.error }
      return { success: true, match: json.match }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  },

  async rejectRequest(requestId: string): Promise<void> {
    try {
      await fetch(`${BASE_URL}/listings/requests/${requestId}/decline`, {
        method:  'PATCH',
        headers: authHeaders(),
      })
    } catch {}
  },

  // ── MATCHES ───────────────────────────────────────────────
  async getMatches(): Promise<Match[]> {
    try {
      const res  = await fetch(`${BASE_URL}/listings/my/matches`, { headers: authHeaders() })
      const data = await res.json()
      // Normalize backend match shape to frontend Match interface
      return (data.matches || []).map((m: any) => ({
        id:          m.id,
        listingId:   m.listingId,
        demandId:    m.demandId,
        requestId:   m.requestId,
        cropType:    m.cropType,
        buyerId:     m.buyerId,
        buyerName:   m.buyer?.user?.name  || '',
        buyerEmail:  m.buyer?.user?.email || '',
        buyerLoc:    m.buyerLocation,
        sellerId:    m.sellerId,
        sellerName:  m.seller?.user?.name  || '',
        sellerEmail: m.seller?.user?.email || '',
        sellerLoc:   m.sellerLocation,
        quantity:    m.quantity,
        distance:    m.distance,
        status:      m.status,
        matchedAt:   m.createdAt,
      }))
    } catch {
      return []
    }
  },
  
  // ── NOTIFICATIONS (frontend in-memory) ───────────────────
  getNotifications(userId: string): Notification[] {
    return _notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  addNotification(notif: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
    _notifications.unshift({
      id:        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      read:      false,
      createdAt: new Date().toISOString(),
      ...notif,
    })
  },

  markNotifRead(notifId: string) {
    const n = _notifications.find((n) => n.id === notifId)
    if (n) n.read = true
  },

  markAllRead(userId: string) {
    _notifications.forEach((n) => { if (n.userId === userId) n.read = true })
  },

  // Legacy sync methods — kept so existing UI code doesn't break
  // These now just return empty arrays; UI should use async methods above
  getListingsSync():               Listing[]      { return [] },
  getMatchesByUser(_id: string):   Match[]        { return [] },
  getWaitlistByUser(_id: string):  Demand[]       { return [] },
  getRequestsByBuyer(_id: string): Request[]      { return [] },
  getListingsBySeller_sync(_: string): Listing[]  { return [] },
}