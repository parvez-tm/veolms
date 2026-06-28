import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { loadRazorpay, openRazorpay } from '@/lib/razorpay'
import { useAuth } from '@/context/AuthContext'
import type { Course } from '@/types'

export interface EnrolledCourse {
  id: number
  courseId: number
  status: 'active' | 'completed'
  course?: Course
  progress?: { total: number; completed: number; percent: number }
}

/** Courses the current user is enrolled in (with progress). */
export function useMyEnrollments() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['my-enrollments'],
    queryFn: async () =>
      (await api.get<{ data: EnrolledCourse[] }>('/enrollment/my-courses')).data.data,
    enabled: isAuthenticated,
  })
}

interface CreateOrderResult {
  free?: boolean
  alreadyPurchased?: boolean
  enrolled?: boolean
  orderId?: string
  amount?: number
  currency?: string
  keyId?: string
  courseTitle?: string
}

/**
 * Returns a function that runs the full purchase flow for a course:
 *  - free / already-purchased → enroll immediately (resolves true)
 *  - paid → open Razorpay Checkout, verify the signature on success (true),
 *    or resolve false if the user dismisses the modal.
 */
export function useCheckout() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useCallback(
    async (course: Course): Promise<boolean> => {
      const refresh = () => {
        qc.invalidateQueries({ queryKey: ['my-enrollments'] })
        qc.invalidateQueries({ queryKey: ['course', String(course.id)] })
      }

      const { data } = await api.post<{ data: CreateOrderResult }>(
        '/payment/create-order',
        { courseId: course.id }
      )
      const order = data.data

      if (order.free || order.alreadyPurchased) {
        refresh()
        return true
      }

      await loadRazorpay()
      return new Promise<boolean>((resolve, reject) => {
        let failureMessage: string | null = null
        const rzp = openRazorpay({
          key: order.keyId!,
          order_id: order.orderId!,
          amount: order.amount!,
          currency: order.currency!,
          name: 'VeoLMS',
          description: order.courseTitle ?? course.title,
          prefill: {
            name:
              [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
              user?.userName,
            email: user?.email,
          },
          theme: { color: '#7c5cff' },
          handler: async (resp) => {
            try {
              await api.post('/payment/verify', {
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              })
              refresh()
              resolve(true)
            } catch (err) {
              reject(err)
            }
          },
          // Razorpay keeps the modal open after a failed attempt so the user can
          // retry; we just record why. If they then close without succeeding,
          // surface the reason (a plain dismiss stays a silent cancel).
          modal: {
            ondismiss: () => {
              if (failureMessage) reject(new Error(failureMessage))
              else resolve(false)
            },
          },
        })
        rzp.on('payment.failed', (e) => {
          const description = (e as { error?: { description?: string } })?.error
            ?.description
          failureMessage = description || 'Payment failed. Please try again.'
        })
      })
    },
    [qc, user]
  )
}
