import { create } from 'zustand'

interface User {
  id: string
  email: string
  email_verified?: boolean
  createdAt?: string
}

interface Switch {
  id: string
  title: string
  checkInHours: number
  expiresAt: string
  status: string
  createdAt: string
  recipientCount: number
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

interface SwitchState {
  switches: Switch[]
  setSwitches: (switches: Switch[]) => void
  addSwitch: (sw: Switch) => void
  updateSwitch: (id: string, sw: Partial<Switch>) => void
  removeSwitch: (id: string) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => {
    // Tokens are now in httpOnly cookies and cleared by the server on logout
    // Just clear the local state here
    set({ user: null, isAuthenticated: false })
  },
}))

export const useSwitchStore = create<SwitchState>((set) => ({
  switches: [],
  setSwitches: (switches) => set({ switches }),
  addSwitch: (sw) => set((state) => ({ switches: [...state.switches, sw] })),
  updateSwitch: (id, sw) =>
    set((state) => ({
      switches: state.switches.map((s) => (s.id === id ? { ...s, ...sw } : s)),
    })),
  removeSwitch: (id) =>
    set((state) => ({
      switches: state.switches.filter((s) => s.id !== id),
    })),
}))
