import { useEffect, useMemo, useState } from 'react'
import AdminPagination from '@components/AdminPagination'
import PageToastStack from '@components/PageToastStack'
import { listFeedback, updateFeedbackStatus } from '@utils/api'
import type { Feedback, FeedbackStatus } from '../../types'

function AdminFeedbackManagementPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all')
  const [ratingFilter, setRatingFilter] = useState<'all' | 'hasRating' | 'withoutRating'>('all')
  const [sortOption, setSortOption] = useState<'latest' | 'oldest' | 'nameAZ'>('latest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadFeedback = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await listFeedback()
      setFeedback(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFeedback()
  }, [])

  const filteredFeedback = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const next = feedback.filter((entry) => {
      if (normalizedSearch) {
        const matchesSearch =
          entry.customerName.toLowerCase().includes(normalizedSearch) ||
          entry.customerPhone.toLowerCase().includes(normalizedSearch) ||
          entry.message.toLowerCase().includes(normalizedSearch)
        if (!matchesSearch) {
          return false
        }
      }

      if (statusFilter !== 'all' && entry.status !== statusFilter) {
        return false
      }

      const hasRating = entry.message.includes('[Rating:')
      if (ratingFilter === 'hasRating' && !hasRating) {
        return false
      }

      if (ratingFilter === 'withoutRating' && hasRating) {
        return false
      }

      return true
    })

    return next.sort((a, b) => {
      if (sortOption === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }

      if (sortOption === 'nameAZ') {
        return a.customerName.localeCompare(b.customerName)
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [feedback, ratingFilter, searchTerm, sortOption, statusFilter])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredFeedback.length / pageSize)), [filteredFeedback.length, pageSize])

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const paginatedFeedback = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredFeedback.slice(start, start + pageSize)
  }, [filteredFeedback, page, pageSize])

  const sectionClass =
    'relative space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(0,0,0,0.08)] dark:border-slate-700/80 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)] dark:shadow-[0_28px_80px_rgba(0,0,0,0.38)]'

  const setStatus = async (id: string, status: FeedbackStatus) => {
    setError('')
    setSuccess('')
    try {
      await updateFeedbackStatus(id, status)
      setSuccess('Feedback status updated successfully')
      await loadFeedback()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feedback')
    }
  }

  const applyQuickFeedbackFilter = (preset: 'all' | 'new' | 'reviewed' | 'resolved' | 'rated') => {
    setSearchTerm('')
    setStatusFilter('all')
    setRatingFilter('all')
    setSortOption('latest')

    if (preset === 'new') {
      setStatusFilter('new')
      return
    }

    if (preset === 'reviewed') {
      setStatusFilter('reviewed')
      return
    }

    if (preset === 'resolved') {
      setStatusFilter('resolved')
      return
    }

    if (preset === 'rated') {
      setRatingFilter('hasRating')
    }
  }

  return (
    <section className={sectionClass}>
      <PageToastStack
        notifications={[
          ...(loading ? [{ id: 'loading', message: 'Loading feedback...', variant: 'info' as const }] : []),
          ...(error ? [{ id: 'error', message: error, variant: 'error' as const }] : []),
          ...(success ? [{ id: 'success', message: success, variant: 'success' as const }] : []),
        ]}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Feedback Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Review what customers are saying and track follow-up status.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadFeedback()}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Refresh Feedback
        </button>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-lg shadow-black/5 dark:border-slate-700 dark:bg-slate-800/85 dark:shadow-black/10">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search name, phone, feedback text"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | FeedbackStatus)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="all">All status</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            value={ratingFilter}
            onChange={(event) => setRatingFilter(event.target.value as 'all' | 'hasRating' | 'withoutRating')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="all">All ratings</option>
            <option value="hasRating">With rating</option>
            <option value="withoutRating">Without rating tag</option>
          </select>
          <select
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as 'latest' | 'oldest' | 'nameAZ')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="latest">Sort: Latest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="nameAZ">Sort: Name A-Z</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => applyQuickFeedbackFilter('all')} className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700">All Feedback</button>
          <button type="button" onClick={() => applyQuickFeedbackFilter('new')} className="rounded-full border border-amber-500/30 bg-amber-50/20 px-3 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-100/50 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-900/30">New</button>
          <button type="button" onClick={() => applyQuickFeedbackFilter('reviewed')} className="rounded-full border border-sky-500/30 bg-sky-50/20 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-100/50 dark:bg-sky-950/20 dark:text-sky-300 dark:hover:bg-sky-900/30">Reviewed</button>
          <button type="button" onClick={() => applyQuickFeedbackFilter('resolved')} className="rounded-full border border-emerald-500/30 bg-emerald-50/20 px-3 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30">Resolved</button>
          <button type="button" onClick={() => applyQuickFeedbackFilter('rated')} className="rounded-full border border-violet-500/30 bg-violet-50/20 px-3 py-1 text-xs font-semibold text-violet-600 hover:bg-violet-100/50 dark:bg-violet-950/20 dark:text-violet-300 dark:hover:bg-violet-900/30">With Rating</button>
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Showing {filteredFeedback.length} of {feedback.length} feedback entries.</p>
      </article>

      <div className="space-y-3">
        {paginatedFeedback.map((entry) => (
          <article key={entry._id} className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-lg shadow-black/5 dark:border-slate-700 dark:bg-slate-800/85 dark:shadow-black/10">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{entry.customerName}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{entry.customerPhone}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{entry.message}</p>
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['new', 'reviewed', 'resolved'] as FeedbackStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => void setStatus(entry._id, status)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                      entry.status === status
                        ? 'bg-amber-400 text-slate-950'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
        {!loading && filteredFeedback.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">No feedback submitted yet.</p>
        ) : null}
      </div>

      <AdminPagination
        totalItems={filteredFeedback.length}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
        label="feedback entries"
      />
    </section>
  )
}

export default AdminFeedbackManagementPage
