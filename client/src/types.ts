export type Role = 'customer' | 'admin'

export type Item = {
  _id: string
  name: string
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

export type Order = {
  _id: string
  invoiceNumber?: string
  customerName: string
  customerPhone: string
  tableCode: string
  totalAmount: number
  status: OrderStatus
  billStatus: BillStatus
  billSettledAt: string | null
  createdAt: string
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
