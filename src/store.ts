import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, Product } from './types';

interface AppState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  initialize: () => void;
  cart: { product: Product; quantity: number }[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      setUser: (user) => {
        set({ user });
      },
      initialize: () => {
        // Since we use persist middleware, state is loaded synchronously from localStorage
        set({ loading: false });
      },
      cart: [],
      addToCart: (product, quantity) =>
        set((state) => {
          const existing = state.cart.find((item) => item.product.id === product.id);
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }
          return { cart: [...state.cart, { product, quantity }] };
        }),
      removeFromCart: (productId) =>
        set((state) => ({ cart: state.cart.filter((item) => item.product.id !== productId) })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          cart: state.cart.map(item => item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item)
        })),
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'brq-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, cart: state.cart }),
    }
  )
);
