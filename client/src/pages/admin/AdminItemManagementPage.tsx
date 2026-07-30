import { useEffect, useMemo, useState } from 'react'
import AdminPagination from '@components/AdminPagination'
import PageToastStack from '@components/PageToastStack'
import { createItem, listCategories, listItems, listOrders, setItemAvailability } from '@utils/api'
import type { Category, Item, Order } from '../../types'

function AdminItemManagementPage() {
  const [items, setItems] = useState<Item[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [weightage, setWeightage] = useState('')
  const [price, setPrice] = useState('')
  const [gstRate, setGstRate] = useState('0')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [itemSearchTerm, setItemSearchTerm] = useState('')
  const [itemCategoryFilter, setItemCategoryFilter] = useState('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'visible' | 'hidden'>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'outOfStock' | 'lowStock'>('all')
  const [salesFilter, setSalesFilter] = useState<'all' | 'sold' | 'unsold'>('all')
  const [sortOption, setSortOption] = useState<'nameAsc' | 'nameDesc' | 'priceHigh' | 'priceLow' | 'stockHigh' | 'stockLow' | 'soldHigh'>('nameAsc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const [itemResult, categoryResult, orderResult] = await Promise.all([listItems(), listCategories(), listOrders()])
      setItems(itemResult)
      setCategories(categoryResult)
      setOrders(orderResult)
      if (!category && categoryResult.length > 0) {
        setCategory(categoryResult[0].name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const inputClass =
    'rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500'

  const gstPreview = useMemo(() => {
    const numericPrice = Number(price)
    const parsedGstRate = Number(gstRate)

    if (!Number.isFinite(numericPrice) || numericPrice < 0 || !Number.isFinite(parsedGstRate)) {
      return { gstAmount: 0, totalAmount: 0 }
    }

    const gstAmount = (numericPrice * parsedGstRate) / 100
    const roundedGstAmount = Math.round(gstAmount)
    const roundedTotalAmount = Math.round(numericPrice + roundedGstAmount)
    return {
      gstAmount: roundedGstAmount,
      totalAmount: roundedTotalAmount,
    }
  }, [price, gstRate])

  const itemSalesMap = useMemo(() => {
    const totals = new Map<string, { soldQuantity: number; soldRevenue: number }>()

    for (const order of orders) {
      if (order.status === 'cancelled') {
        continue
      }

      for (const line of order.items) {
        const current = totals.get(line.name) ?? { soldQuantity: 0, soldRevenue: 0 }
        current.soldQuantity += line.quantity
        current.soldRevenue += line.lineTotal
        totals.set(line.name, current)
      }
    }

    return totals
  }, [orders])

  const categoryOptions = useMemo(() => {
    return Array.from(new Set([...categories.map((entry) => entry.name), ...items.map((item) => item.category)])).sort((a, b) =>
      a.localeCompare(b)
    )
  }, [categories, items])

  const filteredItems = useMemo(() => {
    const normalizedSearch = itemSearchTerm.trim().toLowerCase()

    const next = items.filter((item) => {
      if (normalizedSearch) {
        const matchesSearch =
          item.name.toLowerCase().includes(normalizedSearch) ||
          item.category.toLowerCase().includes(normalizedSearch) ||
          item.weightage.toLowerCase().includes(normalizedSearch)
        if (!matchesSearch) {
          return false
        }
      }

      if (itemCategoryFilter !== 'all' && item.category !== itemCategoryFilter) {
        return false
      }

      if (availabilityFilter === 'visible' && !item.available) {
        return false
      }

      if (availabilityFilter === 'hidden' && item.available) {
        return false
      }

      if (stockFilter === 'inStock' && item.stockQuantity <= 0) {
        return false
      }

      if (stockFilter === 'outOfStock' && item.stockQuantity > 0) {
        return false
      }

      if (stockFilter === 'lowStock' && (item.stockQuantity <= 0 || item.stockQuantity > 10)) {
        return false
      }

      const soldQuantity = itemSalesMap.get(item.name)?.soldQuantity ?? 0
      if (salesFilter === 'sold' && soldQuantity <= 0) {
        return false
      }

      if (salesFilter === 'unsold' && soldQuantity > 0) {
        return false
      }

      return true
    })

    return next.sort((a, b) => {
      switch (sortOption) {
        case 'nameDesc':
          return b.name.localeCompare(a.name)
        case 'priceHigh':
          return b.price - a.price
        case 'priceLow':
          return a.price - b.price
        case 'stockHigh':
          return b.stockQuantity - a.stockQuantity
        case 'stockLow':
          return a.stockQuantity - b.stockQuantity
        case 'soldHigh':
          return (itemSalesMap.get(b.name)?.soldQuantity ?? 0) - (itemSalesMap.get(a.name)?.soldQuantity ?? 0)
        case 'nameAsc':
        default:
          return a.name.localeCompare(b.name)
      }
    })
  }, [availabilityFilter, itemCategoryFilter, itemSalesMap, itemSearchTerm, items, salesFilter, sortOption, stockFilter])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredItems.length / pageSize)), [filteredItems.length, pageSize])

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, page, pageSize])

  const categorySales = useMemo(() => {
    const totals = new Map<string, { soldQuantity: number; soldRevenue: number; stockQuantity: number; availableCount: number; totalItems: number }>()

    for (const item of filteredItems) {
      const itemSale = itemSalesMap.get(item.name) ?? { soldQuantity: 0, soldRevenue: 0 }
      const current = totals.get(item.category) ?? {
        soldQuantity: 0,
        soldRevenue: 0,
        stockQuantity: 0,
        availableCount: 0,
        totalItems: 0,
      }

      current.soldQuantity += itemSale.soldQuantity
      current.soldRevenue += itemSale.soldRevenue
      current.stockQuantity += item.stockQuantity
      current.availableCount += item.available ? 1 : 0
      current.totalItems += 1
      totals.set(item.category, current)
    }

    return Array.from(totals.entries()).map(([categoryName, stats]) => ({ categoryName, ...stats }))
  }, [filteredItems, itemSalesMap])

  const totalAvailableItems = useMemo(() => filteredItems.filter((item) => item.available).length, [filteredItems])
  const totalStockQuantity = useMemo(() => filteredItems.reduce((sum, item) => sum + item.stockQuantity, 0), [filteredItems])

  const submitItem = async () => {
    const numericPrice = Number(price)
    const parsedGstRate = Number(gstRate)

    if (!name.trim() || !weightage.trim() || !Number.isFinite(numericPrice) || numericPrice < 0 || !category.trim()) {
      setError('Item name, weightage, price and category are required')
      return
    }

    if (!Number.isFinite(parsedGstRate) || ![0, 5, 18].includes(parsedGstRate)) {
      setError('GST rate must be one of 0%, 5%, or 18%')
      return
    }

    setError('')
    setSuccess('')

    try {
      await createItem({
        name: name.trim(),
        stockQuantity: 0,
        stockUnit: 'numbers',
        weightage: weightage.trim(),
        price: numericPrice,
        gstRate: parsedGstRate,
        category: category.trim(),
      })
      setName('')
      setWeightage('')
      setPrice('')
      setGstRate('0')
      setSuccess('Item created successfully')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item')
    }
  }

  const toggleAvailability = async (item: Item) => {
    setError('')
    setSuccess('')
    try {
      await setItemAvailability(item._id, !item.available)
      setSuccess(`Item ${item.available ? 'hidden' : 'shown'} successfully`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update availability')
    }
  }

  const clearFilters = () => {
    setItemSearchTerm('')
    setItemCategoryFilter('all')
    setAvailabilityFilter('all')
    setStockFilter('all')
    setSalesFilter('all')
    setSortOption('nameAsc')
  }

  const applyQuickItemFilter = (preset: 'all' | 'visibleLowStock' | 'hidden' | 'topSold' | 'outOfStock') => {
    clearFilters()

    if (preset === 'visibleLowStock') {
      setAvailabilityFilter('visible')
      setStockFilter('lowStock')
      return
    }

    if (preset === 'hidden') {
      setAvailabilityFilter('hidden')
      return
    }

    if (preset === 'topSold') {
      setSalesFilter('sold')
      setSortOption('soldHigh')
      return
    }

    if (preset === 'outOfStock') {
      setStockFilter('outOfStock')
    }
  }

  return (
    <section className="relative space-y-5 rounded-[28px] border border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
      <PageToastStack
        notifications={[
          ...(loading ? [{ id: 'loading', message: 'Loading items...', variant: 'info' as const }] : []),
          ...(error ? [{ id: 'error', message: error, variant: 'error' as const }] : []),
          ...(success ? [{ id: 'success', message: success, variant: 'success' as const }] : []),
        ]}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Item Management</h2>
          <p className="text-sm text-slate-400">Create menu items and control what customers can see.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Refresh Items
        </button>
      </div>

      <article className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
        <h3 className="text-lg font-semibold text-slate-100">Add Item</h3>
        <p className="mt-1 text-sm text-slate-400">Use the Inventory page to enter stock quantity/unit. This page keeps item master details and visibility.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-6">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Item name"
            className={inputClass}
          />
          <input
            value={weightage}
            onChange={(event) => setWeightage(event.target.value)}
            placeholder="Weightage"
            className={inputClass}
          />
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            type="number"
            placeholder="Price"
            className={inputClass}
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={inputClass}
          >
            <option value="">Select category</option>
            {categories.map((entry) => (
              <option key={entry._id} value={entry.name}>
                {entry.name}
              </option>
            ))}
          </select>
          <select
            value={gstRate}
            onChange={(event) => setGstRate(event.target.value)}
            className={inputClass}
          >
            <option value="0">0% GST</option>
            <option value="5">5% GST</option>
            <option value="18">18% GST</option>
          </select>
          <button
            type="button"
            onClick={() => void submitItem()}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300"
          >
            Save Item
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
          <span>GST preview</span>
          <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">
            GST amount: Rs. {gstPreview.gstAmount.toFixed(2)}
          </span>
          <span className="rounded-full bg-amber-950/50 px-2 py-1 text-xs font-semibold text-amber-300">
            Total with GST: Rs. {gstPreview.totalAmount.toFixed(2)}
          </span>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-700 bg-slate-800/85 p-4 shadow-lg shadow-black/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Search and Filter Items</h3>
            <p className="mt-1 text-sm text-slate-400">Find items quickly using multiple filter options.</p>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            Clear Filters
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <input
            value={itemSearchTerm}
            onChange={(event) => setItemSearchTerm(event.target.value)}
            placeholder="Search name, category, weightage"
            className={inputClass}
          />
          <select
            value={itemCategoryFilter}
            onChange={(event) => setItemCategoryFilter(event.target.value)}
            className={inputClass}
          >
            <option value="all">All categories</option>
            {categoryOptions.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <select
            value={availabilityFilter}
            onChange={(event) => setAvailabilityFilter(event.target.value as 'all' | 'visible' | 'hidden')}
            className={inputClass}
          >
            <option value="all">All visibility</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value as 'all' | 'inStock' | 'outOfStock' | 'lowStock')}
            className={inputClass}
          >
            <option value="all">All stock</option>
            <option value="inStock">In stock</option>
            <option value="outOfStock">Out of stock</option>
            <option value="lowStock">Low stock (1 to 10)</option>
          </select>
          <select
            value={salesFilter}
            onChange={(event) => setSalesFilter(event.target.value as 'all' | 'sold' | 'unsold')}
            className={inputClass}
          >
            <option value="all">All sales</option>
            <option value="sold">Sold items</option>
            <option value="unsold">Unsold items</option>
          </select>
          <select
            value={sortOption}
            onChange={(event) =>
              setSortOption(
                event.target.value as 'nameAsc' | 'nameDesc' | 'priceHigh' | 'priceLow' | 'stockHigh' | 'stockLow' | 'soldHigh'
              )
            }
            className={inputClass}
          >
            <option value="nameAsc">Sort: Name A-Z</option>
            <option value="nameDesc">Sort: Name Z-A</option>
            <option value="priceHigh">Sort: Price High-Low</option>
            <option value="priceLow">Sort: Price Low-High</option>
            <option value="stockHigh">Sort: Stock High-Low</option>
            <option value="stockLow">Sort: Stock Low-High</option>
            <option value="soldHigh">Sort: Sold Quantity High-Low</option>
          </select>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Showing {filteredItems.length} of {items.length} items.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyQuickItemFilter('all')}
            className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            All Items
          </button>
          <button
            type="button"
            onClick={() => applyQuickItemFilter('visibleLowStock')}
            className="rounded-full border border-amber-500/30 bg-amber-950/20 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-900/30"
          >
            Visible + Low Stock
          </button>
          <button
            type="button"
            onClick={() => applyQuickItemFilter('hidden')}
            className="rounded-full border border-rose-500/30 bg-rose-950/20 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-900/30"
          >
            Hidden Items
          </button>
          <button
            type="button"
            onClick={() => applyQuickItemFilter('topSold')}
            className="rounded-full border border-sky-500/30 bg-sky-950/20 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-900/30"
          >
            Top Sold
          </button>
          <button
            type="button"
            onClick={() => applyQuickItemFilter('outOfStock')}
            className="rounded-full border border-orange-500/30 bg-orange-950/20 px-3 py-1 text-xs font-semibold text-orange-300 hover:bg-orange-900/30"
          >
            Out of Stock
          </button>
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-sky-900/50 bg-[linear-gradient(135deg,rgba(8,47,73,0.95)_0%,rgba(15,23,42,0.98)_100%)] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Categories</p>
          <p className="mt-2 text-3xl font-bold text-slate-50">{categorySales.length}</p>
          <p className="mt-1 text-sm text-slate-400">Category-wise sold items and current stock overview.</p>
        </article>
        <article className="rounded-2xl border border-emerald-900/50 bg-[linear-gradient(135deg,rgba(6,78,59,0.95)_0%,rgba(15,23,42,0.98)_100%)] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Available Stock</p>
          <p className="mt-2 text-3xl font-bold text-slate-50">{totalStockQuantity}</p>
          <p className="mt-1 text-sm text-slate-400">Units currently available across all managed items.</p>
        </article>
        <article className="rounded-2xl border border-amber-900/50 bg-[linear-gradient(135deg,rgba(120,53,15,0.95)_0%,rgba(15,23,42,0.98)_100%)] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Visible Items</p>
          <p className="mt-2 text-3xl font-bold text-slate-50">{totalAvailableItems}</p>
          <p className="mt-1 text-sm text-slate-400">Items currently visible for customer ordering.</p>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-700 bg-slate-800/85 p-4 shadow-lg shadow-black/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Category-wise Sold and Stock Summary</h3>
            <p className="mt-1 text-sm text-slate-400">Review sold quantity, revenue, visible items and remaining stock by category.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {categorySales.map((entry) => (
            <article key={entry.categoryName} className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-sm font-semibold text-slate-100">{entry.categoryName}</p>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p>Sold Items: <span className="font-semibold text-slate-100">{entry.soldQuantity}</span></p>
                <p>Sales Revenue: <span className="font-semibold text-slate-100">Rs. {entry.soldRevenue.toFixed(2)}</span></p>
                <p>Available Stock: <span className="font-semibold text-slate-100">{entry.stockQuantity}</span></p>
                <p>Visible Items: <span className="font-semibold text-slate-100">{entry.availableCount}/{entry.totalItems}</span></p>
              </div>
            </article>
          ))}
          {!loading && categorySales.length === 0 ? (
            <p className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">No category sales data available yet.</p>
          ) : null}
        </div>
      </article>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {paginatedItems.map((item) => (
          <article key={item._id} className="rounded-2xl border border-slate-700 bg-slate-800/85 p-4 shadow-lg shadow-black/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-100">{item.name}</h3>
                <p className="text-sm text-slate-400">{item.category}</p>
              </div>
              <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-200">
                Rs. {item.price.toFixed(2)}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300">Stock: {item.stockQuantity} {item.stockUnit}</p>
            <p className="mt-1 text-xs text-slate-400">Weightage: {item.weightage}</p>
            <p className="mt-1 text-xs text-slate-400">
              Sold Items: {itemSalesMap.get(item.name)?.soldQuantity ?? 0} | Revenue: Rs. {(itemSalesMap.get(item.name)?.soldRevenue ?? 0).toFixed(2)}
            </p>
            <p className={`mt-3 text-sm font-medium ${item.available ? 'text-emerald-700' : 'text-red-600'}`}>
              {item.available ? 'Visible on customer menu' : 'Hidden from customer menu'}
            </p>
            <button
              type="button"
              onClick={() => void toggleAvailability(item)}
              className="mt-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              {item.available ? 'Hide Item' : 'Show Item'}
            </button>
          </article>
        ))}
        {!loading && filteredItems.length === 0 ? (
          <p className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">
            No items found for the selected filters.
          </p>
        ) : null}
      </div>

      <AdminPagination
        totalItems={filteredItems.length}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
        label="items"
      />
    </section>
  )
}

export default AdminItemManagementPage
