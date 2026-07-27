export type Item = {
  _id: string
  name: string
  stockQuantity: number
  stockUnit: 'kg' | 'gram' | 'numbers' | 'litre'
  weightage: string
  price: number
  category: string
  available: boolean
}

export type Category = {
  _id: string
  name: string
  active: boolean
}

export type DiningTable = {
  _id: string
  code: string
  label: string
  active: boolean
}

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'served' | 'cancelled'
export type BillStatus = 'unpaid' | 'paid'
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'razorpay'
export type PaymentStatus = 'pending' | 'paid'
export type FeedbackStatus = 'new' | 'reviewed' | 'resolved'

export type Order = {
  _id: string
  invoiceNumber?: string
  customerName: string
  customerPhone: string
  tableCode: string
  totalAmount: number
  status: OrderStatus
  billStatus: BillStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod | null
  paymentPaidAt: string | null
  billSettledAt: string | null
  preparationTimeMinutes: number | null
  scheduledAt: string | null
  acceptedAt: string | null
  preparingAt: string | null
  createdAt: string
  updatedAt: string
  items: Array<{
    itemId: string
    name: string
    price: number
    quantity: number
    lineTotal: number
  }>
}

export type AdminAuthResponse = {
  admin: {
    username: string
    role: 'admin'
  }
  csrfToken: string
}

export type AdminSessionResponse =
  | {
      authenticated: false
    }
  | {
      authenticated: true
      admin: {
        username: string
        role: 'admin'
      }
      csrfToken: string
    }

export type AdminChangePasswordResponse = {
  message: string
  csrfToken: string
}

export type CustomerBillingSummary = {
  customerName: string
  customerPhone: string
  lastTableCode: string
  totalOrders: number
  totalSpent: number
  unpaidAmount: number
  lastOrderedAt: string
}

export type Feedback = {
  _id: string
  customerName: string
  customerPhone: string
  message: string
  status: FeedbackStatus
  createdAt: string
}
