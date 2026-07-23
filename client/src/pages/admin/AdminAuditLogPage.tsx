import { useEffect, useMemo, useState } from 'react'
import { listItems, listOrders } from '@utils/api'
import type { Item, Order } from '../../types'

function AdminAuditLogPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

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

  const grossTotal = useMemo(
    () => orders.reduce((sum, order) => sum + order.totalAmount, 0),
    [orders]
  )

  const itemCategoryMap = useMemo(() => {
    return new Map(items.map((item) => [item._id, item.category]))
  }, [items])

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>()

    for (const order of orders) {
      for (const line of order.items) {
        const category = itemCategoryMap.get(line.itemId) ?? 'uncategorized'
        totals.set(category, (totals.get(category) ?? 0) + line.lineTotal)
      }
    }

    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
  }, [orders, itemCategoryMap])

  const itemTotals = useMemo(() => {
    const totals = new Map<string, number>()

    for (const order of orders) {
      for (const line of order.items) {
        totals.set(line.name, (totals.get(line.name) ?? 0) + line.lineTotal)
      }
    }

    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
  }, [orders])

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

          <h3 style="text-align:right;margin-top:18px;">Grand Total: Rs. ${order.totalAmount.toFixed(2)}</h3>
          <p style="text-align:right;margin-top:4px;">Bill Status: ${order.billStatus}</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const exportCsv = () => {
    if (orders.length === 0) {
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

    const rows = orders.map((order) => {
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

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-100">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Audit Log</h2>
          <p className="text-sm text-slate-500">Operational timeline of customer orders and current statuses.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadAuditData()}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh Log
        </button>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <input
          type="date"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={applyDateFilter}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Apply Date Filter
        </button>
        <button
          type="button"
          onClick={clearDateFilter}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Clear Filter
        </button>
      </div>

      <div className="mb-4">
        <button
          type="button"
          onClick={exportCsv}
          disabled={orders.length === 0}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading audit records...</p> : null}
      {error ? <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Gross Total</p>
          <p className="mt-1 text-lg font-bold text-slate-900">Rs. {grossTotal.toFixed(2)}</p>
        </article>
        <article className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-amber-800">Category-wise Total</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {categoryTotals.map(([category, total]) => (
              <span
                key={category}
                className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-900"
              >
                {category}: Rs. {total.toFixed(2)}
              </span>
            ))}
            {!loading && categoryTotals.length === 0 ? (
              <span className="text-xs text-slate-500">No category totals yet.</span>
            ) : null}
          </div>
        </article>
      </div>

      <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-xs uppercase tracking-wide text-sky-900">Item-wise Total</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {itemTotals.map(([itemName, total]) => (
            <span
              key={itemName}
              className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-900"
            >
              {itemName}: Rs. {total.toFixed(2)}
            </span>
          ))}
          {!loading && itemTotals.length === 0 ? (
            <span className="text-xs text-slate-500">No item totals yet.</span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
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
          <tbody className="divide-y divide-slate-100 bg-white">
            {orders.map((order) => (
              <tr key={order._id}>
                <td className="px-3 py-2 text-slate-600">{new Date(order.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 font-medium text-slate-800">{order.invoiceNumber ?? `ORD-${order._id.slice(-6).toUpperCase()}`}</td>
                <td className="px-3 py-2 text-slate-700">{order.customerName}</td>
                <td className="px-3 py-2 text-slate-700">{order.tableCode}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-700">
                    {order.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-700">{order.billStatus}</td>
                <td className="px-3 py-2 text-slate-700">Rs. {order.totalAmount.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => printOrderBill(order)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Print Bill
                  </button>
                </td>
              </tr>
            ))}
            {!loading && orders.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-center text-slate-500" colSpan={8}>
                  No audit records found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default AdminAuditLogPage
