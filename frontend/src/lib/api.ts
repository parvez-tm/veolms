import axios from 'axios'

export const TOKEN_KEY = 'veolms_token'
export const USER_KEY = 'veolms_user'

/**
 * Axios instance for the VeoLMS API. In dev, baseURL '/api' is proxied to the
 * backend (see vite.config.ts); in production set VITE_API_URL to the deployed
 * backend origin (e.g. https://api.veolms.app/api).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
})

// Attach the bearer token to every request if present.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On an invalidated session, clear creds and bounce to login (but not while
// already on the login page, so a failed login surfaces its error to the form).
// A session is invalid when the server returns 401 (missing/expired/bad token),
// OR a 403 asking to "login again" — the backend uses that for a removed role or
// changed permissions (auth_middleware). Ordinary 403s (a forbidden action) are
// NOT a session problem, so they're left alone and surface to the caller.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ?? ''
    const sessionInvalid =
      status === 401 || (status === 403 && /please login again/i.test(message))
    if (sessionInvalid) {
      const hadToken = !!localStorage.getItem(TOKEN_KEY)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      if (hadToken && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  }
)

/** Pull a human-readable message out of an axios error. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string })?.message ?? error.message ?? fallback
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export default api
