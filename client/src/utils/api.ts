import type {
  AdminAuthResponse,
  AdminChangePasswordResponse,
  AdminForgotPasswordResponse,
  AdminSessionResponse,
  BillStatus,
  Category,
  CustomerBillingSummary,
  DiningTable,
  Feedback,
  FeedbackStatus,
  Item,
  Order,
  OrderStatus,
  PaymentMethod,
} from '../types'

let adminCsrfToken = ''

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const mergedHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init?.headers ?? {}),
  }

  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: mergedHeaders,
  })

  if (!response.ok) {
    let message = 'Request failed'

    try {
      const payload = (await response.json()) as { message?: string }
      if (payload.message) {
        message = payload.message
      }
    } catch {
      message = response.statusText
    }

    throw new Error(message)
  }

  return (await response.json()) as T
}

const getCsrfHeaders = (): Record<string, string> => {
  if (!adminCsrfToken) {
    return {}
  }

  return {
    'x-csrf-token': adminCsrfToken,
  }
}

const ensureAdminCsrfToken = async () => {
  if (adminCsrfToken) {
    return true
  }

  try {
    const session = await request<AdminSessionResponse>('/api/auth/admin/me')

    if (!session.authenticated) {
      adminCsrfToken = ''
      return false
    }

    adminCsrfToken = session.csrfToken
    return true
  } catch {
    adminCsrfToken = ''
    return false
  }
}

const requestWithAdminCsrf = async <T>(path: string, init: RequestInit) => {
  await ensureAdminCsrfToken()

  try {
    return await request<T>(path, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...getCsrfHeaders(),
      },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message.toLowerCase() : ''
    const shouldRetryCsrf = errorMessage.includes('csrf') || errorMessage.includes('403')

    if (!shouldRetryCsrf) {
      throw err
    }

    const hasToken = await ensureAdminCsrfToken()
    if (!hasToken) {
      throw err
    }

    return request<T>(path, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...getCsrfHeaders(),
      },
    })
  }
}

export const adminLogin = async (payload: { username: string; password: string }) => {
  const response = await request<AdminAuthResponse>('/api/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  adminCsrfToken = response.csrfToken
  return response
}

export const adminMe = async () => {
  const response = await request<AdminSessionResponse>('/api/auth/admin/me')

  if (response.authenticated) {
    adminCsrfToken = response.csrfToken
  } else {
    adminCsrfToken = ''
  }

  return response
}

export const adminLogout = async () => {
  const response = await requestWithAdminCsrf<{ message: string }>('/api/auth/admin/logout', {
    method: 'POST',
  })

  adminCsrfToken = ''
  return response
}

export const changeAdminPassword = async (payload: {
  currentPassword: string
  newPassword: string
}) => {
  const response = await requestWithAdminCsrf<AdminChangePasswordResponse>(
    '/api/auth/admin/change-password',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )

  adminCsrfToken = response.csrfToken
  return response
}

export const forgotAdminPassword = async (payload: {
  username: string
  resetSecret: string
  newPassword: string
  confirmPassword: string
}) => {
  const response = await request<AdminForgotPasswordResponse>('/api/auth/admin/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return response
}

export const listItems = () => request<Item[]>('/api/items')

export const listCategories = () => request<Category[]>('/api/categories')

export const createCategory = (payload: { name: string }) =>
  requestWithAdminCsrf<Category>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateCategory = (
  id: string,
  payload: { name?: string; active?: boolean }
) =>
  requestWithAdminCsrf<Category>(`/api/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const deleteCategory = (id: string) =>
  requestWithAdminCsrf<{ message: string }>(`/api/categories/${id}`, {
    method: 'DELETE',
  })

export const listTables = () => request<DiningTable[]>('/api/tables')

export const createTable = (payload: { code: string; label: string }) =>
  requestWithAdminCsrf<DiningTable>('/api/tables', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateTable = (
  id: string,
  payload: { code?: string; label?: string; active?: boolean }
) =>
  requestWithAdminCsrf<DiningTable>(`/api/tables/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const deleteTable = (id: string) =>
  requestWithAdminCsrf<{ message: string }>(`/api/tables/${id}`, {
    method: 'DELETE',
  })

export const createItem = (payload: {
  name: string
  stockQuantity: number
  stockUnit: 'kg' | 'gram' | 'numbers' | 'litre'
  weightage: string
  price: number
  gstRate: number
  category: string
}) =>
  requestWithAdminCsrf<Item>('/api/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const setItemAvailability = (id: string, available: boolean) =>
  requestWithAdminCsrf<Item>(`/api/items/${id}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ available }),
  })

export const updateItemInventory = (
  id: string,
  payload: {
    name: string
    stockQuantity: number
    stockUnit: 'kg' | 'gram' | 'numbers' | 'litre'
    weightage: string
    price: number
    gstRate: number
    category: string
    available: boolean
  }
) =>
  requestWithAdminCsrf<Item>(`/api/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const getGstRate = () => request<{ gstRate: number }>('/api/orders/gst')

export const updateGstRate = (gstRate: number) =>
  requestWithAdminCsrf<{ gstRate: number }>('/api/orders/gst', {
    method: 'PATCH',
    body: JSON.stringify({ gstRate }),
  })

export const createOrder = (payload: {
  customerName: string
  customerPhone: string
  tableCode: string
  items: Array<{ itemId: string; quantity: number }>
  gstRate?: number
}) =>
  request<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const listOrders = (filters?: { from?: string; to?: string }) => {
  const query = new URLSearchParams()

  if (filters?.from) {
    query.set('from', filters.from)
  }

  if (filters?.to) {
    query.set('to', filters.to)
  }

  const suffix = query.toString() ? `?${query.toString()}` : ''

  return request<Order[]>(`/api/orders${suffix}`)
}

export const updateCustomerOrder = (
  id: string,
  payload: {
    customerName: string
    customerPhone: string
    tableCode: string
    items: Array<{ itemId: string; quantity: number }>
  }
) =>
  request<Order>(`/api/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const payForOrder = (id: string, paymentMethod: PaymentMethod) =>
  request<Order>(`/api/orders/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify({ paymentMethod }),
  })

export const getLatestCustomerOrder = (params: {
  customerPhone: string
  tableCode: string
}) => {
  const query = new URLSearchParams({
    customerPhone: params.customerPhone,
    tableCode: params.tableCode,
  })

  return request<Order | null>(`/api/orders/latest?${query.toString()}`)
}

export const updateOrderStatus = (id: string, status: OrderStatus) =>
  requestWithAdminCsrf<Order>(`/api/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

export const updateOrderBillStatus = (id: string, billStatus: BillStatus) =>
  requestWithAdminCsrf<Order>(`/api/orders/${id}/bill-status`, {
    method: 'PATCH',
    body: JSON.stringify({ billStatus }),
  })

export const setPreparationTime = (
  id: string,
  payload: { mode: 'manual' | 'auto'; preparationTimeMinutes?: number }
) =>
  requestWithAdminCsrf<Order>(`/api/orders/${id}/set-prep-time`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const getPendingOrders = () =>
  requestWithAdminCsrf<Order[]>('/api/orders/pending/all', {
    method: 'GET',
  })

export const getOrdersForAutoTransition = () =>
  requestWithAdminCsrf<{ preparingOrders: Order[]; readyOrders: Order[] }>(
    '/api/orders/auto-transition/check',
    {
      method: 'GET',
    }
  )

export const autoTransitionOrderStatus = (id: string, targetStatus: 'preparing' | 'ready') =>
  requestWithAdminCsrf<Order>(`/api/orders/${id}/auto-transition`, {
    method: 'PATCH',
    body: JSON.stringify({ targetStatus }),
  })

export const listCustomerBillingSummaries = () =>
  request<CustomerBillingSummary[]>('/api/customers/summary')

export const createFeedback = (payload: {
  customerName: string
  customerPhone: string
  message: string
}) =>
  request<Feedback>('/api/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const listFeedback = () => request<Feedback[]>('/api/feedback')

export const updateFeedbackStatus = (id: string, status: FeedbackStatus) =>
  requestWithAdminCsrf<Feedback>(`/api/feedback/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
