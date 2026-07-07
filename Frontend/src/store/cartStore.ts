import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Listing } from '../services/marketService'

export interface CartItem {
  listing:  Listing
  quantity: number
}

interface CartStore {
  items:       CartItem[]
  addItem:     (listing: Listing, quantity: number) => void
  removeItem:  (listingId: string) => void
  updateQty:   (listingId: string, quantity: number) => void
  clearCart:   () => void
  totalItems:  () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (listing, quantity) => {
        const existing = get().items.find(i => i.listing.id === listing.id)
        if (existing) {
          set({ items: get().items.map(i =>
            i.listing.id === listing.id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          )})
        } else {
          set({ items: [...get().items, { listing, quantity }] })
        }
      },

      removeItem: (listingId) =>
        set({ items: get().items.filter(i => i.listing.id !== listingId) }),

      updateQty: (listingId, quantity) =>
        set({ items: get().items.map(i =>
          i.listing.id === listingId ? { ...i, quantity } : i
        )}),

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'agroflow-cart' }
  )
)