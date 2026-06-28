import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import api, { USER_KEY } from '@/lib/api'
import { dashboardPathFor } from '@/lib/auth'
import type { AuthUser, AuthResponse, RoleName } from '@/types'

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
  /** True until the initial session check (cookie refresh) completes. */
  initializing: boolean
  role: RoleName | undefined
  isAdmin: boolean
  /** Where this user's dashboard lives (role-aware); '/my-learning' for guests. */
  dashboardPath: string
  login: (userDetail: string, password: string) => Promise<AuthUser>
  register: (payload: RegisterPayload) => Promise<AuthUser>
  becomeInstructor: () => Promise<AuthUser>
  refreshProfile: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/** Optimistically read the cached profile so the UI renders instantly on reload;
 *  it's revalidated by a cookie-based /refresh on mount. */
function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readCachedUser())
  const [initializing, setInitializing] = useState(true)

  const persist = useCallback((res: AuthResponse) => {
    localStorage.setItem(USER_KEY, JSON.stringify(res.data))
    setUser(res.data)
    return res.data
  }, [])

  const clear = useCallback(() => {
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  const login = useCallback(
    async (userDetail: string, password: string) => {
      const { data } = await api.post<AuthResponse>('/user/login', { userDetail, password })
      return persist(data)
    },
    [persist]
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const { data } = await api.post<AuthResponse>('/user/register', payload)
      return persist(data)
    },
    [persist]
  )

  const becomeInstructor = useCallback(async () => {
    const { data } = await api.post<AuthResponse>('/user/become-instructor', {})
    return persist(data)
  }, [persist])

  // Pull the latest profile (e.g. after verifying email) into the cached user.
  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: AuthUser }>('/user/me')
      setUser((prev) => {
        const merged = { ...(prev ?? {}), ...data.data } as AuthUser
        localStorage.setItem(USER_KEY, JSON.stringify(merged))
        return merged
      })
    } catch {
      /* ignore: a failed /me leaves the cached user as-is */
    }
  }, [])

  const logout = useCallback(async () => {
    // Clear local state immediately (snappy UI), then revoke the refresh token +
    // clear the cookies server-side. The cookies are httpOnly, so only the server
    // response can remove them; sending the request still carries them.
    clear()
    try {
      await api.post('/user/logout')
    } catch {
      /* already cleared locally */
    }
  }, [clear])

  // Bootstrap: a cookie-based refresh re-establishes the session on load, which
  // is what makes login survive a browser/tab close. A 401 (no/expired refresh
  // cookie) simply means logged-out.
  useEffect(() => {
    let active = true
    api
      .post<AuthResponse>('/user/refresh')
      .then(({ data }) => {
        if (active) persist(data)
      })
      .catch(() => {
        if (active) clear()
      })
      .finally(() => {
        if (active) setInitializing(false)
      })
    return () => {
      active = false
    }
  }, [persist, clear])

  // React to a session ending (the api layer dispatches this on an unrecoverable
  // 401), and keep auth state in sync across tabs.
  useEffect(() => {
    const onLogout = () => setUser(null)
    const onStorage = (e: StorageEvent) => {
      if (e.key === USER_KEY || e.key === null) setUser(readCachedUser())
    }
    window.addEventListener('veolms:logout', onLogout)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('veolms:logout', onLogout)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      initializing,
      role: user?.roleName,
      isAdmin: user?.roleName === 'Admin',
      dashboardPath: dashboardPathFor(user?.roleName),
      login,
      register,
      becomeInstructor,
      refreshProfile,
      logout,
    }),
    [user, initializing, login, register, becomeInstructor, refreshProfile, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
