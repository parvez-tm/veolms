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

// On an expired/invalid session, clear creds and bounce to login (but not while
// already on the login page, so a failed login surfaces its error to the form).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
  return fallback
}

export default api
