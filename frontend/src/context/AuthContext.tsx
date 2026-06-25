import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import api, { TOKEN_KEY, USER_KEY } from '@/lib/api'
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
  login: (userDetail: string, password: string) => Promise<AuthUser>
  register: (payload: RegisterPayload) => Promise<AuthUser>
  becomeInstructor: () => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredUser(): AuthUser | null {
  try {
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      role: user?.roleName,
      isAdmin: user?.roleName === 'Admin',
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
