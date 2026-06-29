import axios from 'axios'

/** Cached (non-sensitive) user profile so the UI can render instantly on reload. */
export const USER_KEY = 'veolms_user'
/** Readable CSRF cookie set by the server on login/refresh (double-submit). */
const CSRF_COOKIE = 'csrf_token'
/** Where we keep the CSRF token the server returns in the auth response body. */
const CSRF_STORE_KEY = 'veolms_csrf'

// The server returns the CSRF token both as a readable cookie AND in the auth
// response body. We persist the body value because a cross-site SPA (frontend
// and API on different origins) CANNOT read the API's cookie via document.cookie,
// so the cookie path alone would break CSRF for cross-origin deployments.
let csrfToken: string | null = (() => {
  try {
    return localStorage.getItem(CSRF_STORE_KEY)
  } catch {
    return null
  }
})()

/** Store (or clear) the CSRF token from a login/register/refresh response. */
export function setCsrfToken(token: string | null): void {
  csrfToken = token
  try {
    if (token) localStorage.setItem(CSRF_STORE_KEY, token)
    else localStorage.removeItem(CSRF_STORE_KEY)
  } catch {
    /* ignore storage failures */
  }
}

/**
 * Axios instance for the VeoLMS API. Auth rides in httpOnly cookies, so requests
 * MUST send credentials. In dev, baseURL '/api' is proxied to the backend (see
 * vite.config.ts); in production set VITE_API_URL to the deployed API origin.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
})

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

// Double-submit CSRF: echo the readable csrf cookie in a header on any mutating
// request. The backend rejects cookie-authenticated mutations whose header
// doesn't match the cookie (an attacker's site can't read the cookie).
api.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase()
  if (method !== 'get' && method !== 'head' && method !== 'options') {
    // Prefer the stored token (works cross-origin); fall back to the cookie.
    const csrf = csrfToken ?? readCookie(CSRF_COOKIE)
    if (csrf) config.headers['X-CSRF-Token'] = csrf
  }
  return config
})

// Single-flight refresh so a burst of 401s triggers exactly one /refresh call.
let refreshPromise: Promise<boolean> | null = null
function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/user/refresh')
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

/** Clear the cached profile and let the app (AuthContext) react. No hard redirect:
 *  ProtectedRoute sends unauthenticated users to /login on its own. */
function endSession(): void {
  localStorage.removeItem(USER_KEY)
  setCsrfToken(null)
  window.dispatchEvent(new Event('veolms:logout'))
}

// Session lifecycle endpoints must not themselves trigger refresh/endSession.
const AUTH_FLOW =
  /\/user\/(login|register|refresh|logout|forgot-password|reset-password|verify-email)/

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const original = error.config
    const url: string = original?.url ?? ''
    const isAuthFlow = AUTH_FLOW.test(url)

    // On a first 401 for a normal request, try a silent token refresh and retry
    // once. This is what makes sessions survive the short access-token lifetime.
    if (status === 401 && original && !original.__retried && !isAuthFlow) {
      original.__retried = true
      if (await refreshSession()) {
        return api(original)
      }
      endSession()
      return Promise.reject(error)
    }

    const message =
      (error.response?.data as { message?: string } | undefined)?.message ?? ''
    if (
      !isAuthFlow &&
      (status === 401 || (status === 403 && /please login again/i.test(message)))
    ) {
      endSession()
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
