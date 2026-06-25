const SRC = 'https://checkout.razorpay.com/v1/checkout.js'
let loadingPromise: Promise<void> | null = null

export interface RazorpayHandlerResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export interface RazorpayOptions {
  key: string
  order_id: string
  amount: number
  currency: string
  name: string
  description?: string
  image?: string
  handler: (response: RazorpayHandlerResponse) => void
  prefill?: { name?: string; email?: string; contact?: string }
  theme?: { color?: string }
  modal?: { ondismiss?: () => void }
}

interface RazorpayInstance {
  open(): void
  on(event: string, cb: (e: unknown) => void): void
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

/** Inject the Razorpay Checkout script once; resolves when it's ready. */
export function loadRazorpay(): Promise<void> {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve()
  if (loadingPromise) return loadingPromise
  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loadingPromise = null
      reject(new Error('Failed to load the payment gateway'))
    }
    document.body.appendChild(script)
  })
  return loadingPromise
}

export function openRazorpay(options: RazorpayOptions): RazorpayInstance {
  const rzp = new window.Razorpay(options)
  rzp.open()
  return rzp
}
