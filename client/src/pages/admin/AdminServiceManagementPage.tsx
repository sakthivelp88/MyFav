import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminPagination from '@components/AdminPagination'
import PageToastStack from '@components/PageToastStack'
import { listOrders, updateOrderStatus } from '@utils/api'
import type { Order, OrderStatus } from '../../types'

const serviceStatuses: OrderStatus[] = ['accepted', 'preparing', 'served']

const getStatusActionLabel = (status: OrderStatus) => {
  if (status === 'accepted') return 'Accept Order'
  if (status === 'preparing') return 'Mark Preparing'
  return 'Mark Served'
}

function AdminServiceManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'preparing'>('all')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending'>('all')
  const [sortOption, setSortOption] = useState<'latest' | 'tableAZ' | 'status'>('latest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const selectedOrderId = searchParams.get('orderId') ?? ''

  const loadOrders = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await listOrders()
      setOrders(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load service orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrders()

    const intervalId = window.setInterval(() => {
      void loadOrders()
    }, 8000)

    return () => window.clearInterval(intervalId)
  }, [])

  const activeOrders = useMemo(
    () => orders.filter((order) => ['pending', 'accepted', 'preparing'].includes(order.status)),
    [orders]
  )

  const filteredActiveOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const next = activeOrders.filter((order) => {
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

      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false
      }

      if (paymentFilter !== 'all' && order.paymentStatus !== paymentFilter) {
        return false
      }

      return true
    })

    return next.sort((a, b) => {
      if (sortOption === 'tableAZ') {
        return a.tableCode.localeCompare(b.tableCode)
      }

      if (sortOption === 'status') {
        return a.status.localeCompare(b.status)
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [activeOrders, paymentFilter, searchTerm, sortOption, statusFilter])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredActiveOrders.length / pageSize)), [filteredActiveOrders.length, pageSize])

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const paginatedActiveOrders = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredActiveOrders.slice(start, start + pageSize)
  }, [filteredActiveOrders, page, pageSize])

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) {
      return filteredActiveOrders[0] ?? null
    }

    return filteredActiveOrders.find((order) => order._id === selectedOrderId) ?? null
  }, [filteredActiveOrders, selectedOrderId])

  useEffect(() => {
    if (!selectedOrder && selectedOrderId) {
      setSearchParams({})
      return
    }

    if (selectedOrder && selectedOrder._id !== selectedOrderId) {
      setSearchParams({ orderId: selectedOrder._id }, { replace: true })
    }
  }, [selectedOrder, selectedOrderId, setSearchParams])

  const setServiceStatus = async (status: OrderStatus) => {
    if (!selectedOrder) {
      return
    }

    setError('')
    setSuccess('')

    try {
      const updated = await updateOrderStatus(selectedOrder._id, status)
      setSuccess(`Order for table ${updated.tableCode} marked as ${status}.`)
      await loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service status')
    }
  }

  const applyQuickServiceFilter = (preset: 'all' | 'pending' | 'preparing' | 'unpaid') => {
    setSearchTerm('')
    setStatusFilter('all')
    setPaymentFilter('all')
    setSortOption('latest')

    if (preset === 'pending') {
      setStatusFilter('pending')
      return
    }

    if (preset === 'preparing') {
      setStatusFilter('preparing')
      return
    }

    if (preset === 'unpaid') {
      setPaymentFilter('pending')
    }
  }

  return (
    <section className="relative space-y-5 rounded-[28px] border border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
      <PageToastStack
        notifications={[
          ...(loading ? [{ id: 'loading', message: 'Loading service orders...', variant: 'info' as const }] : []),
          ...(error ? [{ id: 'error', message: error, variant: 'error' as const }] : []),
          ...(success ? [{ id: 'success', message: success, variant: 'success' as const }] : []),
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Service Management</h2>
          <p className="text-sm text-slate-400">Receive active customer orders and update service status in real time.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders()}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Refresh Orders
        </button>
      </div>

      <article className="rounded-2xl border border-slate-700 bg-slate-800/85 p-4 shadow-lg shadow-black/10">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search table, customer, phone, invoice"
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | 'pending' | 'accepted' | 'preparing')}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All active statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="preparing">Preparing</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value as 'all' | 'paid' | 'pending')}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All payment states</option>
            <option value="pending">Payment pending</option>
            <option value="paid">Payment paid</option>
          </select>
          <select
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as 'latest' | 'tableAZ' | 'status')}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="latest">Sort: Latest</option>
            <option value="tableAZ">Sort: Table A-Z</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => applyQuickServiceFilter('all')} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700">All Active</button>
          <button type="button" onClick={() => applyQuickServiceFilter('pending')} className="rounded-full border border-amber-500/30 bg-amber-950/20 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-900/30">Pending</button>
          <button type="button" onClick={() => applyQuickServiceFilter('preparing')} className="rounded-full border border-sky-500/30 bg-sky-950/20 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-900/30">Preparing</button>
          <button type="button" onClick={() => applyQuickServiceFilter('unpaid')} className="rounded-full border border-rose-500/30 bg-rose-950/20 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-900/30">Payment Pending</button>
        </div>

        <p className="mt-3 text-xs text-slate-400">Showing {filteredActiveOrders.length} of {activeOrders.length} active orders.</p>
      </article>

      {filteredActiveOrders.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {paginatedActiveOrders.map((order) => (
            <button
              key={order._id}
              type="button"
              onClick={() => setSearchParams({ orderId: order._id })}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedOrder?._id === order._id
                  ? 'bg-amber-400 text-slate-950'
                  : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {order.tableCode} | {order.customerName}
            </button>
          ))}
        </div>
      ) : null}

      <AdminPagination
        totalItems={filteredActiveOrders.length}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
        label="active service orders"
      />

      {selectedOrder ? (
        <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
          <article className="rounded-[24px] border border-slate-700 bg-slate-800/85 p-5 shadow-lg shadow-black/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Current Customer</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-50">Table {selectedOrder.tableCode}</h3>
                <p className="mt-1 text-sm text-slate-400">{selectedOrder.customerName} | {selectedOrder.customerPhone}</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Invoice</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{selectedOrder.invoiceNumber ?? selectedOrder._id.slice(-6).toUpperCase()}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Current Status</p>
                <p className="mt-2 text-sm font-semibold capitalize text-slate-100">{selectedOrder.status}</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Payment</p>
                <p className="mt-2 text-sm font-semibold capitalize text-slate-100">{selectedOrder.paymentStatus}</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Total</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">Rs. {selectedOrder.totalAmount.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-sm font-semibold text-slate-100">Order Summary</p>
              <div className="mt-3 space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={`${selectedOrder._id}-${item.itemId}`} className="flex items-center justify-between gap-3 text-sm text-slate-300">
                    <span>{item.name} x {item.quantity}</span>
                    <span>Rs. {item.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="rounded-[24px] border border-slate-700 bg-slate-800/85 p-5 shadow-lg shadow-black/10">
            <p className="text-sm font-semibold text-slate-100">Update Service Status</p>
            <p className="mt-1 text-sm text-slate-400">Inform the customer about the current service stage.</p>

            <div className="mt-4 space-y-3">
              {serviceStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => void setServiceStatus(status)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                    selectedOrder.status === status
                      ? 'border-amber-400 bg-amber-400 text-slate-950'
                      : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <span className="font-semibold">{getStatusActionLabel(status)}</span>
                  <span className="text-xs uppercase tracking-[0.18em]">{status}</span>
                </button>
              ))}
            </div>
          </article>
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
          <p className="text-lg font-semibold text-slate-100">No current customers in service queue</p>
          <p className="mt-2 text-sm text-slate-400">Active customer orders that match the selected filters will appear here.</p>
        </div>
      )}
    </section>
  )
}

export default AdminServiceManagementPage