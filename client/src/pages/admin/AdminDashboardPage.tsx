import { useEffect, useMemo, useState } from 'react'
import AdminPagination from '@components/AdminPagination'
import PageToastStack from '@components/PageToastStack'
import {
  changeAdminPassword,
  listCategories,
  listItems,
  listOrders,
  listTables,
} from '@utils/api'
import type { Category, DiningTable, Item, Order } from '../../types'

const getPasswordStrength = (password: string) => {
  let score = 0

  if (password.length >= 8) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z\d]/.test(password)) score += 1

  if (score <= 2) {
    return { label: 'Weak', color: 'bg-red-500', width: 'w-1/4' }
  }
  if (score <= 4) {
    return { label: 'Medium', color: 'bg-amber-500', width: 'w-2/4' }
  }

  return { label: 'Strong', color: 'bg-emerald-500', width: 'w-full' }
}

function AdminDashboardPage() {
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [todaySearchTerm, setTodaySearchTerm] = useState('')
  const [todayBillFilter, setTodayBillFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [todaySortOption, setTodaySortOption] = useState<'latest' | 'amountHigh' | 'amountLow'>('latest')
  const [todayPage, setTodayPage] = useState(1)
  const [todayPageSize, setTodayPageSize] = useState(10)

  const loadOverview = async () => {
    setLoading(true)
    setError('')

    try {
      const [itemResult, orderResult, categoryResult, tableResult] = await Promise.all([
        listItems(),
        listOrders(),
        listCategories(),
        listTables(),
      ])

      setItems(itemResult)
      setOrders(orderResult)
      setCategories(categoryResult)
      setTables(tableResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOverview()
  }, [])

  useEffect(() => {
    if (!success) {
      return
    }

    const timer = window.setTimeout(() => setSuccess(''), 3000)
    return () => window.clearTimeout(timer)
  }, [success])

  const submitPasswordChange = async () => {
    setPasswordMessage('')
    setPasswordError('')
    setSuccess('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required')
      return
    }

    const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

    if (!strongPasswordPattern.test(newPassword)) {
      setPasswordError('Use at least 8 chars with upper, lower, number, and symbol')
      return
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password must match')
      return
    }

    try {
      const response = await changeAdminPassword({
        currentPassword,
        newPassword,
      })

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage(response.message)
      setSuccess('Password changed successfully')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password')
    }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  const now = new Date()
  const activeItems = useMemo(() => items.filter((item) => item.available).length, [items])
  const activeTables = useMemo(() => tables.filter((table) => table.active).length, [tables])
  const unpaidOrders = useMemo(() => orders.filter((order) => order.billStatus === 'unpaid').length, [orders])
  const grossRevenue = useMemo(() => orders.reduce((sum, order) => sum + order.totalAmount, 0), [orders])

  const todayOrders = useMemo(() => {
    return orders.filter((order) => {
      const createdAt = new Date(order.createdAt)
      return (
        createdAt.getFullYear() === now.getFullYear() &&
        createdAt.getMonth() === now.getMonth() &&
        createdAt.getDate() === now.getDate()
      )
    })
  }, [orders, now])

  const todayRevenue = useMemo(
    () => todayOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    [todayOrders]
  )

  const filteredTodayOrders = useMemo(() => {
    const normalizedSearch = todaySearchTerm.trim().toLowerCase()

    const next = todayOrders.filter((order) => {
      if (normalizedSearch) {
        const invoice = order.invoiceNumber ?? `ORD-${order._id.slice(-6).toUpperCase()}`
        const matchesSearch =
          order.customerName.toLowerCase().includes(normalizedSearch) ||
          order.customerPhone.toLowerCase().includes(normalizedSearch) ||
          order.tableCode.toLowerCase().includes(normalizedSearch) ||
          invoice.toLowerCase().includes(normalizedSearch)
        if (!matchesSearch) {
          return false
        }
      }

      if (todayBillFilter !== 'all' && order.billStatus !== todayBillFilter) {
        return false
      }

      return true
    })

    return next.sort((a, b) => {
      if (todaySortOption === 'amountHigh') {
        return b.totalAmount - a.totalAmount
      }

      if (todaySortOption === 'amountLow') {
        return a.totalAmount - b.totalAmount
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [todayBillFilter, todayOrders, todaySearchTerm, todaySortOption])

  const todayTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTodayOrders.length / todayPageSize)),
    [filteredTodayOrders.length, todayPageSize]
  )

  useEffect(() => {
    setTodayPage((current) => Math.min(current, todayTotalPages))
  }, [todayTotalPages])

  const paginatedTodayOrders = useMemo(() => {
    const start = (todayPage - 1) * todayPageSize
    return filteredTodayOrders.slice(start, start + todayPageSize)
  }, [filteredTodayOrders, todayPage, todayPageSize])

  const applyTodayQuickFilter = (preset: 'all' | 'paid' | 'unpaid' | 'highValue') => {
    setTodaySearchTerm('')
    setTodayBillFilter('all')
    setTodaySortOption('latest')

    if (preset === 'paid') {
      setTodayBillFilter('paid')
      return
    }

    if (preset === 'unpaid') {
      setTodayBillFilter('unpaid')
      return
    }

    if (preset === 'highValue') {
      setTodaySortOption('amountHigh')
    }
  }

  const monthlyHistory = useMemo(() => {
    const monthlyMap = new Map<
      string,
      {
        label: string
        orders: number
        revenue: number
        paid: number
        unpaid: number
      }
    >()

    for (const order of orders) {
      const createdAt = new Date(order.createdAt)
      const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`
      const existing = monthlyMap.get(key)

      if (existing) {
        existing.orders += 1
        existing.revenue += order.totalAmount
        if (order.billStatus === 'paid') {
          existing.paid += 1
        } else {
          existing.unpaid += 1
        }
        continue
      }

      monthlyMap.set(key, {
        label: createdAt.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
        orders: 1,
        revenue: order.totalAmount,
        paid: order.billStatus === 'paid' ? 1 : 0,
        unpaid: order.billStatus === 'unpaid' ? 1 : 0,
      })
    }

    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([key, value]) => ({ key, ...value }))
  }, [orders])

  const monthlyPeak = useMemo(() => {
    if (monthlyHistory.length === 0) {
      return 0
    }

    return Math.max(...monthlyHistory.map((month) => month.revenue))
  }, [monthlyHistory])

  const panelClass =
    'rounded-2xl border border-slate-700/80 bg-slate-800/85 p-4 shadow-lg shadow-black/10'

  const inputClass =
    'min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-amber-400/40 placeholder:text-slate-500 focus:ring'

  return (
    <section className="relative space-y-5 rounded-[28px] border border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
      <PageToastStack
        notifications={[
          ...(loading ? [{ id: 'loading', message: 'Loading dashboard...', variant: 'info' as const }] : []),
          ...(error ? [{ id: 'error', message: error, variant: 'error' as const }] : []),
          ...(success ? [{ id: 'success', message: success, variant: 'success' as const }] : []),
          ...(passwordError ? [{ id: 'password-error', message: passwordError, variant: 'error' as const }] : []),
          ...(passwordMessage ? [{ id: 'password-message', message: passwordMessage, variant: 'success' as const }] : []),
        ]}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-50">Dashboard</h2>
          <p className="text-sm text-slate-400">Professional operations overview with today transactions and monthly history.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            Refresh Dashboard
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-sky-900/50 bg-[linear-gradient(135deg,rgba(8,47,73,0.95)_0%,rgba(15,23,42,0.98)_100%)] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Today Transactions</p>
          <p className="mt-2 text-3xl font-bold text-slate-50">{todayOrders.length}</p>
          <p className="mt-1 text-sm text-slate-400">Orders created today</p>
        </article>
        <article className="rounded-2xl border border-emerald-900/50 bg-[linear-gradient(135deg,rgba(6,78,59,0.95)_0%,rgba(15,23,42,0.98)_100%)] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Today Revenue</p>
          <p className="mt-2 text-lg font-semibold text-slate-50">Rs. {todayRevenue.toFixed(2)}</p>
          <p className="mt-1 text-sm text-slate-400">Collected from today's transactions</p>
        </article>
        <article className="rounded-2xl border border-amber-900/50 bg-[linear-gradient(135deg,rgba(120,53,15,0.95)_0%,rgba(15,23,42,0.98)_100%)] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Pending Bills</p>
          <p className="mt-2 text-3xl font-bold text-slate-50">{unpaidOrders}</p>
          <p className="mt-1 text-sm text-slate-400">Unpaid across all recorded orders</p>
        </article>
        <article className="rounded-2xl border border-violet-900/50 bg-[linear-gradient(135deg,rgba(76,29,149,0.92)_0%,rgba(15,23,42,0.98)_100%)] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Gross Revenue</p>
          <p className="mt-2 text-lg font-semibold text-slate-50">Rs. {grossRevenue.toFixed(2)}</p>
          <p className="mt-1 text-sm text-slate-400">Sum of recorded orders</p>
        </article>
      </div>

      <article className={panelClass}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Today Transactions</h3>
            <p className="text-sm text-slate-400">Live register of today's customer orders and bill state.</p>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            {now.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <input
            value={todaySearchTerm}
            onChange={(event) => setTodaySearchTerm(event.target.value)}
            placeholder="Search customer, phone, table, invoice"
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
          <select
            value={todayBillFilter}
            onChange={(event) => setTodayBillFilter(event.target.value as 'all' | 'paid' | 'unpaid')}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All bill status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <select
            value={todaySortOption}
            onChange={(event) => setTodaySortOption(event.target.value as 'latest' | 'amountHigh' | 'amountLow')}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="latest">Sort: Latest</option>
            <option value="amountHigh">Sort: Amount High-Low</option>
            <option value="amountLow">Sort: Amount Low-High</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => applyTodayQuickFilter('all')} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700">All Today</button>
          <button type="button" onClick={() => applyTodayQuickFilter('paid')} className="rounded-full border border-emerald-500/30 bg-emerald-950/20 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/30">Paid</button>
          <button type="button" onClick={() => applyTodayQuickFilter('unpaid')} className="rounded-full border border-amber-500/30 bg-amber-950/20 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-900/30">Unpaid</button>
          <button type="button" onClick={() => applyTodayQuickFilter('highValue')} className="rounded-full border border-violet-500/30 bg-violet-950/20 px-3 py-1 text-xs font-semibold text-violet-300 hover:bg-violet-900/30">High Value First</button>
        </div>

        <p className="mt-3 text-xs text-slate-400">Showing {filteredTodayOrders.length} of {todayOrders.length} transactions.</p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/70">
          <table className="min-w-full divide-y divide-slate-700 text-sm">
            <thead className="bg-slate-800 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Table</th>
                <th className="px-3 py-2">Bill</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
              {paginatedTodayOrders.map((order) => (
                <tr key={order._id}>
                  <td className="px-3 py-2 text-slate-400">{new Date(order.createdAt).toLocaleTimeString()}</td>
                  <td className="px-3 py-2 font-medium text-slate-100">{order.invoiceNumber ?? `ORD-${order._id.slice(-6).toUpperCase()}`}</td>
                  <td className="px-3 py-2 text-slate-300">{order.customerName}</td>
                  <td className="px-3 py-2 text-slate-300">{order.tableCode}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        order.billStatus === 'paid'
                          ? 'bg-emerald-950/60 text-emerald-300'
                          : 'bg-amber-950/60 text-amber-300'
                      }`}
                    >
                      {order.billStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-300">Rs. {order.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
              {!loading && filteredTodayOrders.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-center text-slate-400" colSpan={6}>
                    No transactions recorded for today.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <AdminPagination
          totalItems={filteredTodayOrders.length}
          currentPage={todayPage}
          pageSize={todayPageSize}
          onPageChange={setTodayPage}
          onPageSizeChange={(size) => {
            setTodayPageSize(size)
            setTodayPage(1)
          }}
          label="today transactions"
        />
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className={panelClass}>
          <h3 className="text-lg font-semibold text-slate-100">Shop Snapshot</h3>
          <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            <p className="rounded-lg bg-slate-900/70 px-3 py-2">Categories: <span className="font-semibold text-slate-100">{categories.length}</span></p>
            <p className="rounded-lg bg-slate-900/70 px-3 py-2">Tables: <span className="font-semibold text-slate-100">{tables.length}</span></p>
            <p className="rounded-lg bg-slate-900/70 px-3 py-2">Active Tables: <span className="font-semibold text-slate-100">{activeTables}</span></p>
            <p className="rounded-lg bg-slate-900/70 px-3 py-2">Visible Items: <span className="font-semibold text-slate-100">{activeItems}</span></p>
          </div>
        </article>

        <article className={panelClass}>
          <h3 className="text-lg font-semibold text-slate-100">Monthly Wise History</h3>
          <p className="text-sm text-slate-400">Month-by-month transaction summary with revenue trend.</p>
          <div className="mt-3 space-y-3">
            {monthlyHistory.map((month) => {
              const widthPercent = monthlyPeak > 0 ? (month.revenue / monthlyPeak) * 100 : 0

              return (
                <div key={month.key} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-100">{month.label}</p>
                    <p className="text-sm font-semibold text-slate-300">Rs. {month.revenue.toFixed(2)}</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500"
                      style={{ width: `${Math.max(widthPercent, 6)}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
                    <p>Orders: <span className="font-semibold text-slate-100">{month.orders}</span></p>
                    <p>Paid: <span className="font-semibold text-emerald-700">{month.paid}</span></p>
                    <p>Unpaid: <span className="font-semibold text-amber-700">{month.unpaid}</span></p>
                  </div>
                </div>
              )
            })}
            {!loading && monthlyHistory.length === 0 ? (
              <p className="text-sm text-slate-400">No monthly history available yet.</p>
            ) : null}
          </div>
        </article>
      </div>

      <article className={panelClass}>
        <h3 className="text-lg font-semibold text-slate-100">Change Admin Password</h3>
        <p className="mt-1 text-sm text-slate-400">Update your admin password securely.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="flex gap-2">
            <input
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current Password"
              type={showCurrentPassword ? 'text' : 'password'}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword((value) => !value)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 hover:bg-slate-800"
            >
              {showCurrentPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New Password"
              type={showNewPassword ? 'text' : 'password'}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((value) => !value)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 hover:bg-slate-800"
            >
              {showNewPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 hover:bg-slate-800"
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
            <span>Password Strength</span>
            <span>{passwordStrength.label}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
            <div className={`h-2 transition-all ${passwordStrength.color} ${passwordStrength.width}`}></div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Use at least 8 characters including upper, lower, number, and symbol.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void submitPasswordChange()}
          className="mt-3 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300"
        >
          Change Password
        </button>
      </article>
    </section>
  )
}

export default AdminDashboardPage
