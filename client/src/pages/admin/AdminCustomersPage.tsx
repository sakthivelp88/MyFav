import { useEffect, useMemo, useState } from 'react'
import AdminPagination from '@components/AdminPagination'
import PageToastStack from '@components/PageToastStack'
import { listCustomerBillingSummaries } from '@utils/api'
import type { CustomerBillingSummary } from '../../types'

function AdminCustomersPage() {
  const [rows, setRows] = useState<CustomerBillingSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [outstandingFilter, setOutstandingFilter] = useState<'all' | 'withOutstanding' | 'cleared'>('all')
  const [customerTierFilter, setCustomerTierFilter] = useState<'all' | 'frequent' | 'new'>('all')
  const [sortOption, setSortOption] = useState<'latest' | 'highSpent' | 'nameAZ'>('latest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const next = rows.filter((row) => {
      if (normalizedSearch) {
        const matchesSearch =
          row.customerName.toLowerCase().includes(normalizedSearch) ||
          row.customerPhone.toLowerCase().includes(normalizedSearch) ||
          row.lastTableCode.toLowerCase().includes(normalizedSearch)
        if (!matchesSearch) {
          return false
        }
      }

      if (outstandingFilter === 'withOutstanding' && row.unpaidAmount <= 0) {
        return false
      }

      if (outstandingFilter === 'cleared' && row.unpaidAmount > 0) {
        return false
      }

      if (customerTierFilter === 'frequent' && row.totalOrders < 5) {
        return false
      }

      if (customerTierFilter === 'new' && row.totalOrders > 2) {
        return false
      }

      return true
    })

    return next.sort((a, b) => {
      if (sortOption === 'highSpent') {
        return b.totalSpent - a.totalSpent
      }

      if (sortOption === 'nameAZ') {
        return a.customerName.localeCompare(b.customerName)
      }

      return new Date(b.lastOrderedAt).getTime() - new Date(a.lastOrderedAt).getTime()
    })
  }, [customerTierFilter, outstandingFilter, rows, searchTerm, sortOption])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredRows.length / pageSize)), [filteredRows.length, pageSize])

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  const applyQuickCustomerFilter = (preset: 'all' | 'outstanding' | 'frequent' | 'new') => {
    setSearchTerm('')
    setOutstandingFilter('all')
    setCustomerTierFilter('all')
    setSortOption('latest')

    if (preset === 'outstanding') {
      setOutstandingFilter('withOutstanding')
      return
    }

    if (preset === 'frequent') {
      setCustomerTierFilter('frequent')
      setSortOption('highSpent')
      return
    }

    if (preset === 'new') {
      setCustomerTierFilter('new')
      return
    }
  }

  const sectionClass =
    'relative rounded-[28px] border border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.38)]'

  return (
    <section className={sectionClass}>
      <PageToastStack
        notifications={[
          ...(loading ? [{ id: 'loading', message: 'Loading customer billing records...', variant: 'info' as const }] : []),
          ...(error ? [{ id: 'error', message: error, variant: 'error' as const }] : []),
        ]}
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">User Management</h2>
          <p className="text-sm text-slate-400">Manage customer records, order history summary, and outstanding bill tracking.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadSummaries()}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Refresh
        </button>
      </div>

      <article className="mb-4 rounded-2xl border border-slate-700 bg-slate-800/85 p-4 shadow-lg shadow-black/10">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search customer, phone, table"
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
          <select
            value={outstandingFilter}
            onChange={(event) => setOutstandingFilter(event.target.value as 'all' | 'withOutstanding' | 'cleared')}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All outstanding states</option>
            <option value="withOutstanding">With outstanding</option>
            <option value="cleared">Cleared customers</option>
          </select>
          <select
            value={customerTierFilter}
            onChange={(event) => setCustomerTierFilter(event.target.value as 'all' | 'frequent' | 'new')}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All customer tiers</option>
            <option value="frequent">Frequent (5+ orders)</option>
            <option value="new">New (up to 2 orders)</option>
          </select>
          <select
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as 'latest' | 'highSpent' | 'nameAZ')}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="latest">Sort: Latest order</option>
            <option value="highSpent">Sort: Highest spent</option>
            <option value="nameAZ">Sort: Name A-Z</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => applyQuickCustomerFilter('all')} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700">All Customers</button>
          <button type="button" onClick={() => applyQuickCustomerFilter('outstanding')} className="rounded-full border border-amber-500/30 bg-amber-950/20 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-900/30">Outstanding</button>
          <button type="button" onClick={() => applyQuickCustomerFilter('frequent')} className="rounded-full border border-sky-500/30 bg-sky-950/20 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-900/30">Frequent Customers</button>
          <button type="button" onClick={() => applyQuickCustomerFilter('new')} className="rounded-full border border-emerald-500/30 bg-emerald-950/20 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/30">New Customers</button>
        </div>

        <p className="mt-3 text-xs text-slate-400">Showing {filteredRows.length} of {rows.length} customers.</p>
      </article>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/60">
        <table className="min-w-full divide-y divide-slate-700 text-sm">
          <thead className="bg-slate-800 text-left text-xs uppercase tracking-wide text-slate-400">
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
          <tbody className="divide-y divide-slate-800 bg-slate-900/40">
            {paginatedRows.map((row) => (
              <tr key={`${row.customerPhone}-${row.lastOrderedAt}`}>
                <td className="px-3 py-2 font-medium text-slate-100">{row.customerName}</td>
                <td className="px-3 py-2 text-slate-300">{row.customerPhone}</td>
                <td className="px-3 py-2 text-slate-300">{row.lastTableCode}</td>
                <td className="px-3 py-2 text-slate-300">{row.totalOrders}</td>
                <td className="px-3 py-2 text-slate-300">Rs. {row.totalSpent.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      row.unpaidAmount > 0
                        ? 'bg-amber-950/60 text-amber-300'
                        : 'bg-emerald-950/60 text-emerald-300'
                    }`}
                  >
                    Rs. {row.unpaidAmount.toFixed(2)}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-400">{new Date(row.lastOrderedAt).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && filteredRows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-center text-slate-400" colSpan={7}>
                  No customer billing records found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <AdminPagination
        totalItems={filteredRows.length}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
        label="customers"
      />
    </section>
  )
}

export default AdminCustomersPage
