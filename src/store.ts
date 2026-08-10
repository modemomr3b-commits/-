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
  toast: { message: string, type: 'success' | 'error' | 'loading' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'loading') => void;
  hideToast: () => void;
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
        try {
          const resetKey = 'sessions_reset_v1';
          if (typeof window !== 'undefined' && !localStorage.getItem(resetKey)) {
            const currentUser = useStore.getState().user;
            if (currentUser) {
              const uName = (currentUser.username || '').trim().toLowerCase();
              const fName = (currentUser.fullName || '').trim().toLowerCase();
              const uId = (currentUser.id || currentUser.uid || '').trim().toLowerCase();

              const isWafaa = uName === 'wafaa' || uName === 'waffa' || fName === 'wafaa' || uId === 'wafaa';
              const isNaseef = uName === 'نصيف عبد الرزاق' || fName === 'نصيف عبد الرزاق' || uId === 'نصيف عبد الرزاق';

              if (!isWafaa && !isNaseef) {
                set({ user: null });
              }
            }
            localStorage.setItem(resetKey, 'true');
          }
        } catch (e) {
          console.error('Session reset error:', e);
        }
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
      toast: null,
      showToast: (message, type = 'success') => {
        set({ toast: { message, type } });
        if (type !== 'loading') {
          setTimeout(() => set({ toast: null }), 3000);
        }
      },
      hideToast: () => set({ toast: null }),
    }),
    {
      name: 'brq-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, cart: state.cart }),
    }
  )
);
