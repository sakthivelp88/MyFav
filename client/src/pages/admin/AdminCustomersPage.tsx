import { useEffect, useState } from 'react'
import { listCustomerBillingSummaries } from '@utils/api'
import type { CustomerBillingSummary } from '../../types'

function AdminCustomersPage() {
  const [rows, setRows] = useState<CustomerBillingSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadSummaries = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await listCustomerBillingSummaries()
      setRows(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer billing data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSummaries()
  }, [])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-100">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customers and Bills</h2>
          <p className="text-sm text-slate-500">Stored customer records with outstanding bill tracking.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadSummaries()}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading customer billing records...</p> : null}
      {error ? <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Last Table</th>
              <th className="px-3 py-2">Orders</th>
              <th className="px-3 py-2">Total Spent</th>
              <th className="px-3 py-2">Outstanding</th>
              <th className="px-3 py-2">Last Order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={`${row.customerPhone}-${row.lastOrderedAt}`}>
                <td className="px-3 py-2 font-medium text-slate-800">{row.customerName}</td>
                <td className="px-3 py-2 text-slate-700">{row.customerPhone}</td>
                <td className="px-3 py-2 text-slate-700">{row.lastTableCode}</td>
                <td className="px-3 py-2 text-slate-700">{row.totalOrders}</td>
                <td className="px-3 py-2 text-slate-700">Rs. {row.totalSpent.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      row.unpaidAmount > 0
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Rs. {row.unpaidAmount.toFixed(2)}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-600">{new Date(row.lastOrderedAt).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-center text-slate-500" colSpan={7}>
                  No customer billing records found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default AdminCustomersPage
