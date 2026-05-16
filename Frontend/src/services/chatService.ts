import { authService } from './authService'

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api"

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  createdAt: string
}

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}

async function request(endpoint: string, options?: RequestInit) {
  const token = authService.getToken()
  if (!token) throw new Error('Not authenticated')
  
  const res = await fetch(`${BASE_URL}/chat${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers
    }
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Request failed')
  }
  return res.json()
}

export const chatService = {
  // Get all sessions
  async getSessions(): Promise<{ sessions: ChatSession[] }> {
    return request('/sessions')
  },
  
  // Create new session
  async createSession(title?: string): Promise<{ session: ChatSession }> {
    return request('/sessions', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'New Chat' })
    })
  },
  
  // Save message to session
  async saveMessage(sessionId: string, role: 'user' | 'ai', content: string): Promise<{ message: ChatMessage }> {
    return request(`/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content })
    })
  },
  
  // Delete session
  async deleteSession(sessionId: string): Promise<{ message: string }> {
    return request(`/sessions/${sessionId}`, { method: 'DELETE' })
  }
}