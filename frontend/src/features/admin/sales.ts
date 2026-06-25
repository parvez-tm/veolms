import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export interface PaymentRow {
  id: number
  userId: number
  courseId: number
  amount: number // paise
  currency: string
  status: 'created' | 'paid' | 'failed'
  razorpayPaymentId?: string | null
  createdAt: string
  course?: { id: number; title: string }
  user?: { id: number; firstName?: string; lastName?: string; email: string }
}

/** All payments across the platform (Admin only). */
export function useAllPayments() {
  return useQuery({
    queryKey: ['all-payments'],
    queryFn: async () =>
      (await api.get<{ data: PaymentRow[] }>('/payment/all')).data.data,
  })
}
