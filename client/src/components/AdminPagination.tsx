import { useEffect, useRef } from 'react'

type AdminPaginationProps = {
  totalItems: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]
  label?: string
}

function AdminPagination({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20],
  label = 'records',
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(currentPage, 1), totalPages)
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(totalItems, safePage * pageSize)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) {
      return
    }

    initializedRef.current = true

    if (typeof window === 'undefined') {
      return
    }

    const targetPageSize = window.innerWidth < 768 ? 5 : 10
    const fallback = pageSizeOptions[0] ?? targetPageSize
    const nextPageSize = pageSizeOptions.includes(targetPageSize) ? targetPageSize : fallback

    if (nextPageSize !== pageSize) {
      onPageSizeChange(nextPageSize)
    }
  }, [onPageSizeChange, pageSize, pageSizeOptions])

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-100/60 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Showing {start}-{end} of {totalItems} {label}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-slate-500 dark:text-slate-400">
          Page size
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>

        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Page {safePage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default AdminPagination
