import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import api, { TOKEN_KEY, USER_KEY } from '@/lib/api'
import { dashboardPathFor, isTokenValid } from '@/lib/auth'
import type { AuthUser, LoginResponse, RoleName } from '@/types'

interface RegisterPayload {
  firstName: string
  lastName: string
  email: string
  password: string
  userName?: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  role: RoleName | undefined
  isAdmin: boolean
  /** Where this user's dashboard lives (role-aware); '/my-learning' for guests. */
  dashboardPath: string
  login: (userDetail: string, password: string) => Promise<AuthUser>
  register: (payload: RegisterPayload) => Promise<AuthUser>
  becomeInstructor: () => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Restore the persisted session, but only if the stored token is still valid.
 * The token lives in localStorage, so it survives a browser/tab close; an
 * expired or malformed one is cleared here so we never show a logged-in UI for
 * a dead session.
 */
function readStoredUser(): AuthUser | null {
  try {
    if (!isTokenValid(localStorage.getItem(TOKEN_KEY))) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      return null
    }
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())

  const persist = useCallback((res: LoginResponse) => {
    localStorage.setItem(TOKEN_KEY, res.token)
    localStorage.setItem(USER_KEY, JSON.stringify(res.data))
    setUser(res.data)
    return res.data
  }, [])

  const login = useCallback(
    async (userDetail: string, password: string) => {
      const { data } = await api.post<LoginResponse>('/user/login', {
        userDetail,
        password,
      })
      return persist(data)
    },
    [persist]
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const { data } = await api.post<LoginResponse>('/user/register', payload)
      return persist(data)
    },
    [persist]
  )

  const becomeInstructor = useCallback(async () => {
    const { data } = await api.post<LoginResponse>('/user/become-instructor', {})
    return persist(data)
  }, [persist])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  // Keep auth state in sync across tabs: logging in or out (or a token cleared by
  // the api 401 handler) in one tab updates the others.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY || e.key === USER_KEY || e.key === null) {
        setUser(readStoredUser())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      role: user?.roleName,
      isAdmin: user?.roleName === 'Admin',
      dashboardPath: dashboardPathFor(user?.roleName),
      login,
      register,
      becomeInstructor,
      logout,
    }),
    [user, login, register, becomeInstructor, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
