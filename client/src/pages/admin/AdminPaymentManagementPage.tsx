import { useEffect, useMemo, useState } from 'react'
import AdminPagination from '@components/AdminPagination'
import PageToastStack from '@components/PageToastStack'
import { listOrders, updateOrderBillStatus } from '@utils/api'
import type { BillStatus, Order, PaymentMethod, PaymentStatus } from '../../types'

function AdminPaymentManagementPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [billFilter, setBillFilter] = useState<'all' | BillStatus>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | PaymentStatus>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | PaymentMethod | 'unassigned'>('all')
  const [amountFilter, setAmountFilter] = useState<'all' | 'high' | 'low'>('all')
  const [sortOption, setSortOption] = useState<'latest' | 'amountHigh' | 'amountLow'>('latest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadPayments = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await listOrders()
      setOrders(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPayments()
  }, [])

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const next = orders.filter((order) => {
      if (normalizedSearch) {
        const invoice = order.invoiceNumber ?? order._id.slice(-6).toUpperCase()
        const matchesSearch =
          order.customerName.toLowerCase().includes(normalizedSearch) ||
          order.customerPhone.toLowerCase().includes(normalizedSearch) ||
          order.tableCode.toLowerCase().includes(normalizedSearch) ||
          invoice.toLowerCase().includes(normalizedSearch)
        if (!matchesSearch) {
          return false
        }
      }

      if (billFilter !== 'all' && order.billStatus !== billFilter) {
        return false
      }

      if (paymentStatusFilter !== 'all' && order.paymentStatus !== paymentStatusFilter) {
        return false
      }

      if (paymentMethodFilter === 'unassigned' && order.paymentMethod !== null) {
        return false
      }

      if (paymentMethodFilter !== 'all' && paymentMethodFilter !== 'unassigned' && order.paymentMethod !== paymentMethodFilter) {
        return false
      }

      if (amountFilter === 'high' && order.totalAmount < 500) {
        return false
      }

      if (amountFilter === 'low' && order.totalAmount >= 500) {
        return false
      }

      return true
    })

    return next.sort((a, b) => {
      if (sortOption === 'amountHigh') {
        return b.totalAmount - a.totalAmount
      }

      if (sortOption === 'amountLow') {
        return a.totalAmount - b.totalAmount
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [amountFilter, billFilter, orders, paymentMethodFilter, paymentStatusFilter, searchTerm, sortOption])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredOrders.length / pageSize)), [filteredOrders.length, pageSize])

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredOrders.slice(start, start + pageSize)
  }, [filteredOrders, page, pageSize])

  const sectionClass =
    'relative space-y-5 rounded-[28px] border border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.38)]'

  const setBillStatus = async (orderId: string, billStatus: BillStatus) => {
    setError('')
    setSuccess('')
    try {
      await updateOrderBillStatus(orderId, billStatus)
      setSuccess('Bill status updated successfully')
      await loadPayments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bill status')
    }
  }

  const applyQuickPaymentFilter = (preset: 'all' | 'unpaid' | 'razorpay' | 'highValue' | 'pendingPayment') => {
    setSearchTerm('')
    setBillFilter('all')
    setPaymentStatusFilter('all')
    setPaymentMethodFilter('all')
    setAmountFilter('all')
    setSortOption('latest')

    if (preset === 'unpaid') {
      setBillFilter('unpaid')
      return
    }

    if (preset === 'razorpay') {
      setPaymentMethodFilter('razorpay')
      return
    }

    if (preset === 'highValue') {
      setAmountFilter('high')
      setSortOption('amountHigh')
      return
    }

    if (preset === 'pendingPayment') {
      setPaymentStatusFilter('pending')
    }
  }

  return (
    <section className={sectionClass}>
      <PageToastStack
        notifications={[
          ...(loading ? [{ id: 'loading', message: 'Loading payment records...', variant: 'info' as const }] : []),
          ...(error ? [{ id: 'error', message: error, variant: 'error' as const }] : []),
          ...(success ? [{ id: 'success', message: success, variant: 'success' as const }] : []),
        ]}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Payment Management</h2>
          <p className="text-sm text-slate-400">Review customer payments, bill status and payment methods.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadPayments()}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Refresh Payments
        </button>
      </div>

      <article className="rounded-2xl border border-slate-700 bg-slate-800/85 p-4 shadow-lg shadow-black/10">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search customer, phone, table, invoice"
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
          <select value={billFilter} onChange={(event) => setBillFilter(event.target.value as 'all' | BillStatus)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
            <option value="all">All bill status</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
          <select value={paymentStatusFilter} onChange={(event) => setPaymentStatusFilter(event.target.value as 'all' | PaymentStatus)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
            <option value="all">All payment status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
          <select value={paymentMethodFilter} onChange={(event) => setPaymentMethodFilter(event.target.value as 'all' | PaymentMethod | 'unassigned')} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
            <option value="all">All payment methods</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="razorpay">Razorpay</option>
            <option value="unassigned">Not selected</option>
          </select>
          <select value={amountFilter} onChange={(event) => setAmountFilter(event.target.value as 'all' | 'high' | 'low')} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
            <option value="all">All amounts</option>
            <option value="high">500 and above</option>
            <option value="low">Below 500</option>
          </select>
          <select value={sortOption} onChange={(event) => setSortOption(event.target.value as 'latest' | 'amountHigh' | 'amountLow')} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
            <option value="latest">Sort: Latest</option>
            <option value="amountHigh">Sort: Amount High-Low</option>
            <option value="amountLow">Sort: Amount Low-High</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => applyQuickPaymentFilter('all')} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700">All Payments</button>
          <button type="button" onClick={() => applyQuickPaymentFilter('unpaid')} className="rounded-full border border-amber-500/30 bg-amber-950/20 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-900/30">Unpaid Bills</button>
          <button type="button" onClick={() => applyQuickPaymentFilter('pendingPayment')} className="rounded-full border border-rose-500/30 bg-rose-950/20 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-900/30">Pending Payments</button>
          <button type="button" onClick={() => applyQuickPaymentFilter('razorpay')} className="rounded-full border border-sky-500/30 bg-sky-950/20 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-900/30">Razorpay</button>
          <button type="button" onClick={() => applyQuickPaymentFilter('highValue')} className="rounded-full border border-violet-500/30 bg-violet-950/20 px-3 py-1 text-xs font-semibold text-violet-300 hover:bg-violet-900/30">High Value</button>
        </div>

        <p className="mt-3 text-xs text-slate-400">Showing {filteredOrders.length} of {orders.length} orders.</p>
      </article>

      <div className="space-y-3">
        {paginatedOrders.map((order) => (
          <article key={order._id} className="rounded-2xl border border-slate-700 bg-slate-800/85 p-4 shadow-lg shadow-black/10">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-semibold text-slate-100">{order.customerName} | Invoice {order.invoiceNumber ?? order._id.slice(-6).toUpperCase()}</p>
                <p className="text-sm text-slate-400">{order.customerPhone} | Table {order.tableCode}</p>
                <p className="text-sm text-slate-400">Payment method: {order.paymentMethod ?? 'not selected yet'}</p>
                <p className="text-sm text-slate-400">Payment status: {order.paymentStatus}</p>
                <p className="text-sm text-slate-400">Bill status: {order.billStatus}</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">Rs. {order.totalAmount.toFixed(2)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['unpaid', 'paid'] as BillStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => void setBillStatus(order._id, status)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                      order.billStatus === status
                        ? 'bg-amber-400 text-slate-950'
                        : 'border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
        {!loading && filteredOrders.length === 0 ? (
          <p className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-400">No payment records found.</p>
        ) : null}
      </div>

      <AdminPagination
        totalItems={filteredOrders.length}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
        label="payment records"
      />
    </section>
  )
}

export default AdminPaymentManagementPage
