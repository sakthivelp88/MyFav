import type {
  AdminChangePasswordResponse,
  AdminAuthResponse,
  AdminSessionResponse,
  BillStatus,
  Category,
  CustomerBillingSummary,
  DiningTable,
  Item,
  Order,
  OrderStatus,
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
  const response = await request<{ message: string }>('/api/auth/admin/logout', {
    method: 'POST',
    headers: getCsrfHeaders(),
  })

  adminCsrfToken = ''
  return response
}

export const changeAdminPassword = async (payload: {
  currentPassword: string
  newPassword: string
}) => {
  const response = await request<AdminChangePasswordResponse>(
    '/api/auth/admin/change-password',
    {
      method: 'POST',
      headers: getCsrfHeaders(),
      body: JSON.stringify(payload),
    }
  )

  adminCsrfToken = response.csrfToken
  return response
}

export const listItems = () => request<Item[]>('/api/items')

export const listCategories = () => request<Category[]>('/api/categories')

export const createCategory = (payload: { name: string }) =>
  request<Category>('/api/categories', {
    method: 'POST',
    headers: getCsrfHeaders(),
    body: JSON.stringify(payload),
  })

export const updateCategory = (
  id: string,
  payload: { name?: string; active?: boolean }
) =>
  request<Category>(`/api/categories/${id}`, {
    method: 'PATCH',
    headers: getCsrfHeaders(),
    body: JSON.stringify(payload),
  })

export const deleteCategory = (id: string) =>
  request<{ message: string }>(`/api/categories/${id}`, {
    method: 'DELETE',
    headers: getCsrfHeaders(),
  })

export const listTables = () => request<DiningTable[]>('/api/tables')

export const createTable = (payload: { code: string; label: string }) =>
  request<DiningTable>('/api/tables', {
    method: 'POST',
    headers: getCsrfHeaders(),
    body: JSON.stringify(payload),
  })

export const updateTable = (
  id: string,
  payload: { code?: string; label?: string; active?: boolean }
) =>
  request<DiningTable>(`/api/tables/${id}`, {
    method: 'PATCH',
    headers: getCsrfHeaders(),
    body: JSON.stringify(payload),
  })

export const deleteTable = (id: string) =>
  request<{ message: string }>(`/api/tables/${id}`, {
    method: 'DELETE',
    headers: getCsrfHeaders(),
  })

export const createItem = (payload: {
  name: string
  price: number
  category: string
}) =>
  request<Item>('/api/items', {
    method: 'POST',
    headers: getCsrfHeaders(),
    body: JSON.stringify(payload),
  })

export const setItemAvailability = (id: string, available: boolean) =>
  request<Item>(`/api/items/${id}/availability`, {
    method: 'PATCH',
    headers: getCsrfHeaders(),
    body: JSON.stringify({ available }),
  })

export const createOrder = (payload: {
  customerName: string
  customerPhone: string
  tableCode: string
  items: Array<{ itemId: string; quantity: number }>
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
  request<Order>(`/api/orders/${id}/status`, {
    method: 'PATCH',
    headers: getCsrfHeaders(),
    body: JSON.stringify({ status }),
  })

export const updateOrderBillStatus = (id: string, billStatus: BillStatus) =>
  request<Order>(`/api/orders/${id}/bill-status`, {
    method: 'PATCH',
    headers: getCsrfHeaders(),
    body: JSON.stringify({ billStatus }),
  })

export const listCustomerBillingSummaries = () =>
  request<CustomerBillingSummary[]>('/api/customers/summary')
