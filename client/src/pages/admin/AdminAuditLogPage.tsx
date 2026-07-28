import { useEffect, useMemo, useState } from 'react'
import AdminPagination from '@components/AdminPagination'
import PageToastStack from '@components/PageToastStack'
import { listItems, listOrders } from '@utils/api'
import type { BillStatus, Item, Order, OrderStatus, PaymentMethod } from '../../types'

function AdminAuditLogPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all')
  const [billStatusFilter, setBillStatusFilter] = useState<'all' | BillStatus>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | PaymentMethod | 'unassigned'>('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [sortOption, setSortOption] = useState<'latest' | 'oldest' | 'amountHigh' | 'amountLow' | 'customerAZ'>('latest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadAuditData = async (filters?: { from?: string; to?: string }) => {
    setLoading(true)
    setError('')

    try {
      const [orderResult, itemResult] = await Promise.all([
        listOrders(filters),
        listItems(),
      ])
      setOrders(orderResult)
      setItems(itemResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const minValue = Number(minAmount)
    const maxValue = Number(maxAmount)

    const next = orders.filter((order) => {
      if (normalizedSearch) {
        const invoice = order.invoiceNumber ?? `ORD-${order._id.slice(-6).toUpperCase()}`
        const itemNames = order.items.map((line) => line.name).join(' ')
        const matchesSearch =
          order.customerName.toLowerCase().includes(normalizedSearch) ||
          order.customerPhone.toLowerCase().includes(normalizedSearch) ||
          order.tableCode.toLowerCase().includes(normalizedSearch) ||
          invoice.toLowerCase().includes(normalizedSearch) ||
          itemNames.toLowerCase().includes(normalizedSearch)
        if (!matchesSearch) {
          return false
        }
      }

      if (orderStatusFilter !== 'all' && order.status !== orderStatusFilter) {
        return false
      }

      if (billStatusFilter !== 'all' && order.billStatus !== billStatusFilter) {
        return false
      }

      if (paymentMethodFilter === 'unassigned' && order.paymentMethod !== null) {
        return false
      }

      if (paymentMethodFilter !== 'all' && paymentMethodFilter !== 'unassigned' && order.paymentMethod !== paymentMethodFilter) {
        return false
      }

      if (Number.isFinite(minValue) && minAmount.trim() !== '' && order.totalAmount < minValue) {
        return false
      }

      if (Number.isFinite(maxValue) && maxAmount.trim() !== '' && order.totalAmount > maxValue) {
        return false
      }

      return true
    })

    return next.sort((a, b) => {
      switch (sortOption) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'amountHigh':
          return b.totalAmount - a.totalAmount
        case 'amountLow':
          return a.totalAmount - b.totalAmount
        case 'customerAZ':
          return a.customerName.localeCompare(b.customerName)
        case 'latest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })
  }, [billStatusFilter, maxAmount, minAmount, orderStatusFilter, orders, paymentMethodFilter, searchTerm, sortOption])

  const grossTotal = useMemo(
    () => filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    [filteredOrders]
  )

  const itemCategoryMap = useMemo(() => {
    return new Map(items.map((item) => [item._id, item.category]))
  }, [items])

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>()

    for (const order of filteredOrders) {
      for (const line of order.items) {
        const category = itemCategoryMap.get(line.itemId) ?? 'uncategorized'
        totals.set(category, (totals.get(category) ?? 0) + line.lineTotal)
      }
    }

    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
  }, [filteredOrders, itemCategoryMap])

  const itemTotals = useMemo(() => {
    const totals = new Map<string, number>()

    for (const order of filteredOrders) {
      for (const line of order.items) {
        totals.set(line.name, (totals.get(line.name) ?? 0) + line.lineTotal)
      }
    }

    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
  }, [filteredOrders])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredOrders.length / pageSize)), [filteredOrders.length, pageSize])

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredOrders.slice(start, start + pageSize)
  }, [filteredOrders, page, pageSize])

  useEffect(() => {
    void loadAuditData()
  }, [])

  const applyDateFilter = () => {
    void loadAuditData({
      from: fromDate || undefined,
      to: toDate || undefined,
    })
  }

  const clearDateFilter = () => {
    setFromDate('')
    setToDate('')
    void loadAuditData()
  }

  const printOrderBill = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900')
    if (!printWindow) {
      return
    }

    const invoiceNumber = order.invoiceNumber ?? `ORD-${order._id.slice(-6).toUpperCase()}`
    const rows = order.items
      .map(
        (line) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${line.name}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${line.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">Rs. ${line.price.toFixed(2)}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">Rs. ${line.lineTotal.toFixed(2)}</td>
          </tr>
        `
      )
      .join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Bill ${invoiceNumber}</title>
        </head>
        <body style="font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#0f172a;">
          <h2 style="margin:0 0 8px;">MyFav - Customer Bill</h2>
          <p style="margin:4px 0;">Invoice: <strong>${invoiceNumber}</strong></p>
          <p style="margin:4px 0;">Customer: <strong>${order.customerName}</strong> (${order.customerPhone})</p>
          <p style="margin:4px 0;">Table: <strong>${order.tableCode}</strong></p>
          <p style="margin:4px 0 16px;">Date: ${new Date(order.createdAt).toLocaleString()}</p>

          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #cbd5e1;">Item</th>
                <th style="text-align:right;padding:8px;border-bottom:2px solid #cbd5e1;">Qty</th>
                <th style="text-align:right;padding:8px;border-bottom:2px solid #cbd5e1;">Price</th>
                <th style="text-align:right;padding:8px;border-bottom:2px solid #cbd5e1;">Line Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div style="text-align:right;margin-top:18px;">
            <p>Sub Total: Rs. ${order.subTotalAmount.toFixed(2)}</p>
            <p>GST (${order.gstRate.toFixed(2)}%): Rs. ${order.gstAmount.toFixed(2)}</p>
            <h3 style="margin:8px 0 0;">Grand Total: Rs. ${order.totalAmount.toFixed(2)}</h3>
          </div>
          <p style="text-align:right;margin-top:4px;">Bill Status: ${order.billStatus}</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const exportCsv = () => {
    if (filteredOrders.length === 0) {
      return
    }

    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`
    const header = [
      'Invoice',
      'OrderId',
      'Customer',
      'Phone',
      'Table',
      'OrderStatus',
      'BillStatus',
      'TotalAmount',
      'CreatedAt',
    ]

    const rows = filteredOrders.map((order) => {
      const invoice = order.invoiceNumber ?? `ORD-${order._id.slice(-6).toUpperCase()}`

      return [
        escapeCell(invoice),
        escapeCell(order._id),
        escapeCell(order.customerName),
        escapeCell(order.customerPhone),
        escapeCell(order.tableCode),
        escapeCell(order.status),
        escapeCell(order.billStatus),
        String(order.totalAmount.toFixed(2)),
        escapeCell(new Date(order.createdAt).toISOString()),
      ].join(',')
    })

    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const dateLabel = new Date().toISOString().slice(0, 10)

    anchor.href = url
    anchor.download = `myfav-audit-${dateLabel}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const clearAdvancedFilters = () => {
    setSearchTerm('')
    setOrderStatusFilter('all')
    setBillStatusFilter('all')
    setPaymentMethodFilter('all')
    setMinAmount('')
    setMaxAmount('')
    setSortOption('latest')
  }

  const applyQuickReportFilter = (preset: 'today' | 'pending' | 'unpaid' | 'razorpay' | 'highValue' | 'all') => {
    clearAdvancedFilters()

    if (preset === 'today') {
      const today = new Date().toISOString().slice(0, 10)
      setFromDate(today)
      setToDate(today)
      void loadAuditData({ from: today, to: today })
      return
    }

    if (preset === 'pending') {
      setOrderStatusFilter('pending')
      return
    }

    if (preset === 'unpaid') {
      setBillStatusFilter('unpaid')
      return
    }

    if (preset === 'razorpay') {
      setPaymentMethodFilter('razorpay')
      return
    }

    if (preset === 'highValue') {
      setMinAmount('500')
      setSortOption('amountHigh')
      return
    }

    setFromDate('')
    setToDate('')
    void loadAuditData()
  }

  const panelClass =
    'rounded-2xl border border-slate-700 bg-slate-800/85 p-4 shadow-lg shadow-black/10'

  const inputClass =
    'rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-amber-400/40 focus:ring'

  return (
    <section className="relative rounded-[28px] border border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
      <PageToastStack
        notifications={[
          ...(loading ? [{ id: 'loading', message: 'Loading audit records...', variant: 'info' as const }] : []),
          ...(error ? [{ id: 'error', message: error, variant: 'error' as const }] : []),
        ]}
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Reports and Analytics</h2>
          <p className="text-sm text-slate-400">Analyze orders, revenue trends, category performance, and billing outcomes.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadAuditData()}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Refresh Reports
        </button>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <input
          type="date"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          className={inputClass}
        />
        <input
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          onClick={applyDateFilter}
          className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300"
        >
          Apply Date Filter
        </button>
        <button
          type="button"
          onClick={clearDateFilter}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Clear Filter
        </button>
      </div>

      <article className="mb-4 rounded-2xl border border-slate-700 bg-slate-800/85 p-4 shadow-lg shadow-black/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Search and Filter Reports</h3>
            <p className="mt-1 text-sm text-slate-400">Use multiple options to narrow audit records and analytics instantly.</p>
          </div>
          <button
            type="button"
            onClick={clearAdvancedFilters}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            Reset Search Filters
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search customer, phone, table, invoice, item"
            className={inputClass}
          />
          <select
            value={orderStatusFilter}
            onChange={(event) => setOrderStatusFilter(event.target.value as 'all' | OrderStatus)}
            className={inputClass}
          >
            <option value="all">All order status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="preparing">Preparing</option>
            <option value="served">Served</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={billStatusFilter}
            onChange={(event) => setBillStatusFilter(event.target.value as 'all' | BillStatus)}
            className={inputClass}
          >
            <option value="all">All bill status</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
          <select
            value={paymentMethodFilter}
            onChange={(event) => setPaymentMethodFilter(event.target.value as 'all' | PaymentMethod | 'unassigned')}
            className={inputClass}
          >
            <option value="all">All payment methods</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="razorpay">Razorpay</option>
            <option value="unassigned">Not assigned</option>
          </select>
          <input
            type="number"
            min="0"
            value={minAmount}
            onChange={(event) => setMinAmount(event.target.value)}
            placeholder="Min amount"
            className={inputClass}
          />
          <input
            type="number"
            min="0"
            value={maxAmount}
            onChange={(event) => setMaxAmount(event.target.value)}
            placeholder="Max amount"
            className={inputClass}
          />
          <select
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as 'latest' | 'oldest' | 'amountHigh' | 'amountLow' | 'customerAZ')}
            className={inputClass}
          >
            <option value="latest">Sort: Latest first</option>
            <option value="oldest">Sort: Oldest first</option>
            <option value="amountHigh">Sort: Amount High-Low</option>
            <option value="amountLow">Sort: Amount Low-High</option>
            <option value="customerAZ">Sort: Customer A-Z</option>
          </select>
        </div>

        <p className="mt-3 text-xs text-slate-400">Showing {filteredOrders.length} of {orders.length} records.</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyQuickReportFilter('all')}
            className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            All Records
          </button>
          <button
            type="button"
            onClick={() => applyQuickReportFilter('today')}
            className="rounded-full border border-emerald-500/30 bg-emerald-950/20 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/30"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => applyQuickReportFilter('pending')}
            className="rounded-full border border-amber-500/30 bg-amber-950/20 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-900/30"
          >
            Pending Service
          </button>
          <button
            type="button"
            onClick={() => applyQuickReportFilter('unpaid')}
            className="rounded-full border border-rose-500/30 bg-rose-950/20 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-900/30"
          >
            Unpaid Bills
          </button>
          <button
            type="button"
            onClick={() => applyQuickReportFilter('razorpay')}
            className="rounded-full border border-sky-500/30 bg-sky-950/20 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-900/30"
          >
            Razorpay Orders
          </button>
          <button
            type="button"
            onClick={() => applyQuickReportFilter('highValue')}
            className="rounded-full border border-violet-500/30 bg-violet-950/20 px-3 py-1 text-xs font-semibold text-violet-300 hover:bg-violet-900/30"
          >
            High Value (500+)
          </button>
        </div>
      </article>

      <div className="mb-4">
        <button
          type="button"
          onClick={exportCsv}
          disabled={filteredOrders.length === 0}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export CSV (Filtered)
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <article className={panelClass}>
          <p className="text-xs uppercase tracking-wide text-slate-400">Gross Total</p>
          <p className="mt-1 text-lg font-bold text-slate-100">Rs. {grossTotal.toFixed(2)}</p>
        </article>
        <article className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-amber-300">Category-wise Total</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {categoryTotals.map(([category, total]) => (
              <span
                key={category}
                className="rounded-full border border-amber-500/30 bg-slate-900 px-3 py-1 text-xs font-semibold text-amber-300"
              >
                {category}: Rs. {total.toFixed(2)}
              </span>
            ))}
            {!loading && categoryTotals.length === 0 ? (
              <span className="text-xs text-slate-400">No category totals yet.</span>
            ) : null}
          </div>
        </article>
      </div>

      <div className="mt-4 rounded-xl border border-sky-500/30 bg-sky-950/20 p-4">
        <p className="text-xs uppercase tracking-wide text-sky-300">Item-wise Total</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {itemTotals.map(([itemName, total]) => (
            <span
              key={itemName}
              className="rounded-full border border-sky-500/30 bg-slate-900 px-3 py-1 text-xs font-semibold text-sky-300"
            >
              {itemName}: Rs. {total.toFixed(2)}
            </span>
          ))}
          {!loading && itemTotals.length === 0 ? (
            <span className="text-xs text-slate-400">No item totals yet.</span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/60">
        <table className="min-w-full divide-y divide-slate-700 text-sm">
          <thead className="bg-slate-800 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Table</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Bill</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/40">
            {paginatedOrders.map((order) => (
              <tr key={order._id}>
                <td className="px-3 py-2 text-slate-400">{new Date(order.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 font-medium text-slate-100">{order.invoiceNumber ?? `ORD-${order._id.slice(-6).toUpperCase()}`}</td>
                <td className="px-3 py-2 text-slate-300">{order.customerName}</td>
                <td className="px-3 py-2 text-slate-300">{order.tableCode}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-slate-700 px-2 py-1 text-xs font-semibold uppercase text-slate-200">
                    {order.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-300">{order.billStatus}</td>
                <td className="px-3 py-2 text-slate-300">Rs. {order.totalAmount.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => printOrderBill(order)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
                  >
                    Print Bill
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filteredOrders.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-center text-slate-400" colSpan={8}>
                  No audit records found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
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
        label="audit records"
      />
    </section>
  )
}

export default AdminAuditLogPage
