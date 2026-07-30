import { useEffect, useMemo, useState } from 'react'
import { toDataURL } from 'qrcode'
import AdminPagination from '@components/AdminPagination'
import PageToastStack from '@components/PageToastStack'
import {
  createCategory,
  createItem,
  createTable,
  listCategories,
  listItems,
  listTables,
  updateItemInventory,
} from '@utils/api'
import type { Category, DiningTable, Item } from '../../types'

const stockUnits = ['kg', 'gram', 'numbers', 'litre'] as const

function AdminInventoryPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [tableQrCodes, setTableQrCodes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState<(typeof stockUnits)[number]>('numbers')
  const [weightage, setWeightage] = useState('')
  const [price, setPrice] = useState('')
  const [gstRate, setGstRate] = useState('0')
  const [category, setCategory] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [tableCode, setTableCode] = useState('')
  const [tableLabel, setTableLabel] = useState('')
  const [inventorySearchTerm, setInventorySearchTerm] = useState('')
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('all')
  const [inventoryAvailabilityFilter, setInventoryAvailabilityFilter] = useState<'all' | 'visible' | 'hidden'>('all')
  const [inventoryStockFilter, setInventoryStockFilter] = useState<'all' | 'inStock' | 'outOfStock' | 'lowStock'>('all')
  const [inventorySortOption, setInventorySortOption] = useState<'nameAZ' | 'stockHigh' | 'priceHigh' | 'priceLow'>('nameAZ')
  const [inventoryPage, setInventoryPage] = useState(1)
  const [inventoryPageSize, setInventoryPageSize] = useState(10)
  const [tableSearchTerm, setTableSearchTerm] = useState('')
  const [tableStatusFilter, setTableStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [tablePage, setTablePage] = useState(1)
  const [tablePageSize, setTablePageSize] = useState(10)
  const [editingItem, setEditingItem] = useState<{
    id: string
    name: string
    stockQuantity: string
    stockUnit: (typeof stockUnits)[number]
    weightage: string
    price: string
    gstRate: string
    category: string
    available: boolean
  } | null>(null)

  const loadInventory = async () => {
    setLoading(true)
    setError('')

    try {
      const [categoryResult, tableResult, itemResult] = await Promise.all([
        listCategories(),
        listTables(),
        listItems(),
      ])
      setCategories(categoryResult)
      setTables(tableResult)
      setItems(itemResult)

      if (!category && categoryResult.length > 0) {
        setCategory(categoryResult[0].name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInventory()
  }, [])

  useEffect(() => {
    let cancelled = false

    const buildQrCodes = async () => {
      if (tables.length === 0) {
        setTableQrCodes({})
        return
      }

      const nextCodes = await Promise.all(
        tables.map(async (table) => {
          const scanUrl = `${window.location.origin}/scan/${encodeURIComponent(table.code)}`
          const qrDataUrl = await toDataURL(scanUrl, {
            width: 220,
            margin: 1,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          })

          return [table._id, qrDataUrl] as const
        })
      )

      if (!cancelled) {
        setTableQrCodes(Object.fromEntries(nextCodes))
      }
    }

    void buildQrCodes().catch(() => {
      if (!cancelled) {
        setError('Could not generate QR cards for tables')
      }
    })

    return () => {
      cancelled = true
    }
  }, [tables])

  const activeCategories = useMemo(
    () => categories.filter((entry) => entry.active).length,
    [categories]
  )
  const activeTables = useMemo(() => tables.filter((entry) => entry.active).length, [tables])
  const stockValue = useMemo(
    () => items.reduce((sum, item) => sum + item.stockQuantity * item.price, 0),
    [items]
  )

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(categories.map((entry) => entry.name))).sort((a, b) => a.localeCompare(b))
  }, [categories])

  const filteredItems = useMemo(() => {
    const normalizedSearch = inventorySearchTerm.trim().toLowerCase()

    const next = items.filter((entry) => {
      if (normalizedSearch) {
        const matchesSearch =
          entry.name.toLowerCase().includes(normalizedSearch) ||
          entry.category.toLowerCase().includes(normalizedSearch) ||
          entry.weightage.toLowerCase().includes(normalizedSearch)
        if (!matchesSearch) {
          return false
        }
      }

      if (inventoryCategoryFilter !== 'all' && entry.category !== inventoryCategoryFilter) {
        return false
      }

      if (inventoryAvailabilityFilter === 'visible' && !entry.available) {
        return false
      }

      if (inventoryAvailabilityFilter === 'hidden' && entry.available) {
        return false
      }

      if (inventoryStockFilter === 'inStock' && entry.stockQuantity <= 0) {
        return false
      }

      if (inventoryStockFilter === 'outOfStock' && entry.stockQuantity > 0) {
        return false
      }

      if (inventoryStockFilter === 'lowStock' && (entry.stockQuantity <= 0 || entry.stockQuantity > 10)) {
        return false
      }

      return true
    })

    return next.sort((a, b) => {
      if (inventorySortOption === 'stockHigh') {
        return b.stockQuantity - a.stockQuantity
      }

      if (inventorySortOption === 'priceHigh') {
        return b.price - a.price
      }

      if (inventorySortOption === 'priceLow') {
        return a.price - b.price
      }

      return a.name.localeCompare(b.name)
    })
  }, [inventoryAvailabilityFilter, inventoryCategoryFilter, inventorySearchTerm, inventorySortOption, inventoryStockFilter, items])

  const filteredTables = useMemo(() => {
    const normalizedSearch = tableSearchTerm.trim().toLowerCase()

    return tables.filter((table) => {
      if (normalizedSearch) {
        const matchesSearch =
          table.code.toLowerCase().includes(normalizedSearch) ||
          table.label.toLowerCase().includes(normalizedSearch)
        if (!matchesSearch) {
          return false
        }
      }

      if (tableStatusFilter === 'active' && !table.active) {
        return false
      }

      if (tableStatusFilter === 'inactive' && table.active) {
        return false
      }

      return true
    })
  }, [tableSearchTerm, tableStatusFilter, tables])

  const inventoryTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredItems.length / inventoryPageSize)),
    [filteredItems.length, inventoryPageSize]
  )

  useEffect(() => {
    setInventoryPage((current) => Math.min(current, inventoryTotalPages))
  }, [inventoryTotalPages])

  const paginatedItems = useMemo(() => {
    const start = (inventoryPage - 1) * inventoryPageSize
    return filteredItems.slice(start, start + inventoryPageSize)
  }, [filteredItems, inventoryPage, inventoryPageSize])

  const tableTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTables.length / tablePageSize)),
    [filteredTables.length, tablePageSize]
  )

  useEffect(() => {
    setTablePage((current) => Math.min(current, tableTotalPages))
  }, [tableTotalPages])

  const paginatedTables = useMemo(() => {
    const start = (tablePage - 1) * tablePageSize
    return filteredTables.slice(start, start + tablePageSize)
  }, [filteredTables, tablePage, tablePageSize])

  const panelClass =
    'rounded-2xl border border-slate-700 bg-slate-800/85 p-4 shadow-lg shadow-black/10'

  const inputClass =
    'rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500'

  const gstPreview = useMemo(() => {
    const numericPrice = Number(price)
    const parsedGstRate = Number(gstRate)

    if (!Number.isFinite(numericPrice) || numericPrice < 0 || !Number.isFinite(parsedGstRate)) {
      return { gstAmount: 0, totalAmount: 0 }
    }

    const gstAmount = (numericPrice * parsedGstRate) / 100
    return {
      gstAmount: Math.round((gstAmount + Number.EPSILON) * 100) / 100,
      totalAmount: Math.round((numericPrice + gstAmount + Number.EPSILON) * 100) / 100,
    }
  }, [price, gstRate])

  const editingGstPreview = useMemo(() => {
    if (!editingItem) {
      return { gstAmount: 0, totalAmount: 0 }
    }

    const numericPrice = Number(editingItem.price)
    const parsedGstRate = Number(editingItem.gstRate)

    if (!Number.isFinite(numericPrice) || numericPrice < 0 || !Number.isFinite(parsedGstRate)) {
      return { gstAmount: 0, totalAmount: 0 }
    }

    const gstAmount = (numericPrice * parsedGstRate) / 100
    return {
      gstAmount: Math.round((gstAmount + Number.EPSILON) * 100) / 100,
      totalAmount: Math.round((numericPrice + gstAmount + Number.EPSILON) * 100) / 100,
    }
  }, [editingItem])

  const submitInventoryItem = async () => {
    const numericQuantity = Number(quantity)
    const numericPrice = Number(price)
    const parsedGstRate = Number(gstRate)

    if (!name.trim() || !weightage.trim() || !Number.isFinite(numericQuantity) || numericQuantity < 0 || !Number.isFinite(numericPrice) || numericPrice < 0) {
      setError('Item name, quantity, weightage and price are required')
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
        stockQuantity: numericQuantity,
        stockUnit: unit,
        weightage: weightage.trim(),
        price: numericPrice,
        gstRate: parsedGstRate,
        category: category.trim() || 'tea',
      })
      setName('')
      setQuantity('')
      setWeightage('')
      setPrice('')
      setGstRate('0')
      setUnit('numbers')
      setSuccess('Inventory item created successfully')
      await loadInventory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create inventory item')
    }
  }

  const saveInventoryEdit = async () => {
    if (!editingItem) {
      return
    }

    const numericQuantity = Number(editingItem.stockQuantity)
    const numericPrice = Number(editingItem.price)
    const parsedGstRate = Number(editingItem.gstRate)

    if (!editingItem.name.trim() || !editingItem.weightage.trim() || !Number.isFinite(numericQuantity) || numericQuantity < 0 || !Number.isFinite(numericPrice) || numericPrice < 0) {
      setError('Valid item name, quantity, weightage and price are required')
      return
    }

    if (!Number.isFinite(parsedGstRate) || ![0, 5, 18].includes(parsedGstRate)) {
      setError('GST rate must be one of 0%, 5%, or 18%')
      return
    }

    setError('')
    setSuccess('')

    try {
      await updateItemInventory(editingItem.id, {
        name: editingItem.name.trim(),
        stockQuantity: numericQuantity,
        stockUnit: editingItem.stockUnit,
        weightage: editingItem.weightage.trim(),
        price: numericPrice,
        gstRate: parsedGstRate,
        category: editingItem.category.trim() || 'tea',
        available: editingItem.available,
      })
      setEditingItem(null)
      setSuccess('Inventory item updated successfully')
      await loadInventory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update inventory item')
    }
  }

  const submitCategory = async () => {
    const trimmedName = newCategoryName.trim()

    if (!trimmedName) {
      setError('Category name is required')
      return
    }

    setError('')
    setSuccess('')

    try {
      await createCategory({ name: trimmedName })
      setNewCategoryName('')
      setSuccess('Category created successfully')
      await loadInventory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category')
    }
  }

  const submitTable = async () => {
    const nextCode = tableCode.trim().toUpperCase()
    const nextLabel = tableLabel.trim()

    if (!nextCode || !nextLabel) {
      setError('Table code and table label are required')
      return
    }

    setError('')
    setSuccess('')

    try {
      await createTable({
        code: nextCode,
        label: nextLabel,
      })
      setTableCode('')
      setTableLabel('')
      setSuccess('Table created successfully')
      await loadInventory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create table')
    }
  }

  const downloadQrCard = (table: DiningTable) => {
    const qrDataUrl = tableQrCodes[table._id]
    if (!qrDataUrl) {
      return
    }

    const anchor = document.createElement('a')
    anchor.href = qrDataUrl
    anchor.download = `${table.code}-menu-qr.png`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  }

  const printQrCard = (table: DiningTable) => {
    const qrDataUrl = tableQrCodes[table._id]
    if (!qrDataUrl) {
      return
    }

    const scanUrl = `${window.location.origin}/scan/${encodeURIComponent(table.code)}`
    const printWindow = window.open('', '_blank', 'width=700,height=900')
    if (!printWindow) {
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${table.code} QR Card</title>
        </head>
        <body style="font-family:Segoe UI,Arial,sans-serif;padding:32px;text-align:center;color:#0f172a;">
          <h1 style="margin-bottom:8px;">MyFav Tea Shop</h1>
          <p style="margin:0 0 8px;font-size:20px;font-weight:600;">Table ${table.code}</p>
          <p style="margin:0 0 24px;color:#475569;">${table.label}</p>
          <img src="${qrDataUrl}" alt="QR code for ${table.code}" style="width:280px;height:280px;" />
          <p style="margin-top:24px;font-size:14px;color:#475569;">Scan to open: ${scanUrl}</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const applyQuickInventoryFilter = (preset: 'all' | 'lowStock' | 'outOfStock' | 'hidden') => {
    setInventorySearchTerm('')
    setInventoryCategoryFilter('all')
    setInventoryAvailabilityFilter('all')
    setInventoryStockFilter('all')
    setInventorySortOption('nameAZ')

    if (preset === 'lowStock') {
      setInventoryStockFilter('lowStock')
      return
    }

    if (preset === 'outOfStock') {
      setInventoryStockFilter('outOfStock')
      return
    }

    if (preset === 'hidden') {
      setInventoryAvailabilityFilter('hidden')
    }
  }

  const applyQuickTableFilter = (preset: 'all' | 'active' | 'inactive') => {
    setTableSearchTerm('')
    setTableStatusFilter('all')

    if (preset === 'active') {
      setTableStatusFilter('active')
      return
    }

    if (preset === 'inactive') {
      setTableStatusFilter('inactive')
    }
  }

  return (
    <section className="relative space-y-5 rounded-[28px] border border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
      <PageToastStack
        notifications={[
          ...(loading ? [{ id: 'loading', message: 'Loading inventory...', variant: 'info' as const }] : []),
          ...(error ? [{ id: 'error', message: error, variant: 'error' as const }] : []),
          ...(success ? [{ id: 'success', message: success, variant: 'success' as const }] : []),
        ]}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Inventory</h2>
          <p className="text-sm text-slate-400">Track customer-facing categories and table readiness.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadInventory()}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Refresh Inventory
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-sky-900/50 bg-[linear-gradient(135deg,rgba(8,47,73,0.95)_0%,rgba(15,23,42,0.98)_100%)] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Categories</p>
          <p className="mt-2 text-3xl font-bold text-slate-50">{categories.length}</p>
          <p className="mt-1 text-sm text-slate-400">{activeCategories} active for customers</p>
        </article>
        <article className="rounded-2xl border border-emerald-900/50 bg-[linear-gradient(135deg,rgba(6,78,59,0.95)_0%,rgba(15,23,42,0.98)_100%)] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Tables</p>
          <p className="mt-2 text-3xl font-bold text-slate-50">{tables.length}</p>
          <p className="mt-1 text-sm text-slate-400">{activeTables} active dining tables</p>
        </article>
        <article className="rounded-2xl border border-amber-900/50 bg-[linear-gradient(135deg,rgba(120,53,15,0.95)_0%,rgba(15,23,42,0.98)_100%)] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Stock Value</p>
          <p className="mt-2 text-lg font-semibold text-slate-50">Rs. {stockValue.toFixed(2)}</p>
          <p className="mt-1 text-sm text-slate-400">Combined estimated value of current inventory items.</p>
        </article>
      </div>

      <article className={panelClass}>
        <h3 className="text-lg font-semibold text-slate-100">Create Category</h3>
        <p className="mt-1 text-sm text-slate-400">Add a category before creating items under it.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Category name"
            className={`${inputClass} sm:col-span-2`}
          />
          <button
            type="button"
            onClick={() => void submitCategory()}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300"
          >
            Add Category
          </button>
        </div>
      </article>

      <article className={panelClass}>
        <h3 className="text-lg font-semibold text-slate-100">Create Table</h3>
        <p className="mt-1 text-sm text-slate-400">Add a table code and label before generating QR cards.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            value={tableCode}
            onChange={(event) => setTableCode(event.target.value.toUpperCase())}
            placeholder="Table code (e.g. T-01)"
            className={inputClass}
          />
          <input
            value={tableLabel}
            onChange={(event) => setTableLabel(event.target.value)}
            placeholder="Table label (e.g. Window Table)"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => void submitTable()}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300"
          >
            Add Table
          </button>
        </div>
      </article>

      <article className={panelClass}>
        <h3 className="text-lg font-semibold text-slate-100">Enter Inventory Item</h3>
        <p className="mt-1 text-sm text-slate-400">Add item name, quantity, weightage, stock unit, price, and category for inventory entry.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-7">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Item name"
            className={inputClass}
          />
          <input
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            type="number"
            placeholder="Quantity"
            className={inputClass}
          />
          <input
            value={weightage}
            onChange={(event) => setWeightage(event.target.value)}
            placeholder="Weightage (e.g. 100g, 500ml)"
            className={inputClass}
          />
          <select
            value={unit}
            onChange={(event) => setUnit(event.target.value as (typeof stockUnits)[number])}
            className={inputClass}
          >
            {stockUnits.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            type="number"
            placeholder="Price"
            className={inputClass}
          />
          <select
            value={gstRate}
            onChange={(event) => setGstRate(event.target.value)}
            className={inputClass}
          >
            <option value="0">0% GST</option>
            <option value="5">5% GST</option>
            <option value="18">18% GST</option>
          </select>
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
        <button
          type="button"
          onClick={() => void submitInventoryItem()}
          className="mt-4 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300"
        >
          Save Inventory Item
        </button>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className={panelClass}>
          <h3 className="text-lg font-semibold text-slate-100">Category Shelf</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((entry) => (
              <span
                key={entry._id}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  entry.active
                    ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                    : 'border-slate-700 bg-slate-900 text-slate-400'
                }`}
              >
                {entry.name}
              </span>
            ))}
            {!loading && categories.length === 0 ? <span className="text-sm text-slate-400">No categories yet.</span> : null}
          </div>
        </article>

        <article className={panelClass}>
          <h3 className="text-lg font-semibold text-slate-100">Inventory Stock</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <input
              value={inventorySearchTerm}
              onChange={(event) => setInventorySearchTerm(event.target.value)}
              placeholder="Search item, category, weightage"
              className={inputClass}
            />
            <select
              value={inventoryCategoryFilter}
              onChange={(event) => setInventoryCategoryFilter(event.target.value)}
              className={inputClass}
            >
              <option value="all">All categories</option>
              {categoryOptions.map((entry) => (
                <option key={entry} value={entry}>{entry}</option>
              ))}
            </select>
            <select
              value={inventoryAvailabilityFilter}
              onChange={(event) => setInventoryAvailabilityFilter(event.target.value as 'all' | 'visible' | 'hidden')}
              className={inputClass}
            >
              <option value="all">All visibility</option>
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
            <select
              value={inventoryStockFilter}
              onChange={(event) => setInventoryStockFilter(event.target.value as 'all' | 'inStock' | 'outOfStock' | 'lowStock')}
              className={inputClass}
            >
              <option value="all">All stock states</option>
              <option value="inStock">In stock</option>
              <option value="outOfStock">Out of stock</option>
              <option value="lowStock">Low stock (1 to 10)</option>
            </select>
            <select
              value={inventorySortOption}
              onChange={(event) => setInventorySortOption(event.target.value as 'nameAZ' | 'stockHigh' | 'priceHigh' | 'priceLow')}
              className={inputClass}
            >
              <option value="nameAZ">Sort: Name A-Z</option>
              <option value="stockHigh">Sort: Stock High-Low</option>
              <option value="priceHigh">Sort: Price High-Low</option>
              <option value="priceLow">Sort: Price Low-High</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => applyQuickInventoryFilter('all')} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700">All Items</button>
            <button type="button" onClick={() => applyQuickInventoryFilter('lowStock')} className="rounded-full border border-amber-500/30 bg-amber-950/20 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-900/30">Low Stock</button>
            <button type="button" onClick={() => applyQuickInventoryFilter('outOfStock')} className="rounded-full border border-rose-500/30 bg-rose-950/20 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-900/30">Out of Stock</button>
            <button type="button" onClick={() => applyQuickInventoryFilter('hidden')} className="rounded-full border border-sky-500/30 bg-sky-950/20 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-900/30">Hidden Items</button>
          </div>

          <p className="mt-3 text-xs text-slate-400">Showing {filteredItems.length} of {items.length} inventory items.</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {paginatedItems.map((entry) => (
              <div key={entry._id} className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-100">{entry.name}</p>
                    <p className="text-sm text-slate-400">{entry.category}</p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">
                    Rs. {entry.price.toFixed(2)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  Stock: {entry.stockQuantity} {entry.stockUnit}
                </p>
                <p className="mt-1 text-xs text-slate-400">Weightage: {entry.weightage}</p>
                <p className={`mt-1 text-xs font-semibold ${entry.available ? 'text-emerald-700' : 'text-red-600'}`}>
                  {entry.available ? 'Visible on customer menu' : 'Hidden from customer menu'}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setEditingItem({
                      id: entry._id,
                      name: entry.name,
                      stockQuantity: String(entry.stockQuantity),
                      stockUnit: entry.stockUnit,
                      weightage: entry.weightage,
                      price: String(entry.price),
                      gstRate: String(entry.gstRate),
                      category: entry.category,
                      available: entry.available,
                    })
                  }
                  className="mt-3 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                >
                  Edit Stock
                </button>
              </div>
            ))}
            {!loading && filteredItems.length === 0 ? <span className="text-sm text-slate-400">No inventory items found for the selected filters.</span> : null}
          </div>

          <AdminPagination
            totalItems={filteredItems.length}
            currentPage={inventoryPage}
            pageSize={inventoryPageSize}
            onPageChange={setInventoryPage}
            onPageSizeChange={(size) => {
              setInventoryPageSize(size)
              setInventoryPage(1)
            }}
            label="inventory items"
          />
        </article>
      </div>

      <article className={panelClass}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Table QR Cards</h3>
            <p className="text-sm text-slate-400">Download or print one QR card for each table and place it on the desk.</p>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Scan route: /scan/:tableCode</p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <input
              value={tableSearchTerm}
              onChange={(event) => setTableSearchTerm(event.target.value)}
              placeholder="Search table code or label"
              className={inputClass}
            />
            <select
              value={tableStatusFilter}
              onChange={(event) => setTableStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
              className={inputClass}
            >
              <option value="all">All table states</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button type="button" onClick={() => applyQuickTableFilter('active')} className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-900/30">Active Tables</button>
            <button type="button" onClick={() => applyQuickTableFilter('all')} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700">Reset Table Filter</button>
          </div>

          {paginatedTables.map((table) => {
            const qrDataUrl = tableQrCodes[table._id]
            const scanUrl = `${window.location.origin}/scan/${encodeURIComponent(table.code)}`

            return (
              <article key={table._id} className="rounded-3xl border border-slate-700 bg-slate-900/70 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-100">{table.code}</p>
                    <p className="text-sm text-slate-400">{table.label}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${table.active ? 'bg-emerald-950/50 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                    {table.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 flex min-h-[240px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-700 bg-slate-800 p-4">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt={`QR code for ${table.code}`} className="h-52 w-52 rounded-2xl bg-white p-3" />
                  ) : (
                    <span className="text-sm text-slate-400">Generating QR...</span>
                  )}
                </div>

                <p className="mt-4 break-all rounded-2xl bg-slate-800 px-3 py-2 text-xs text-slate-400">{scanUrl}</p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => downloadQrCard(table)}
                    disabled={!qrDataUrl}
                    className="flex-1 rounded-2xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Download QR
                  </button>
                  <button
                    type="button"
                    onClick={() => printQrCard(table)}
                    disabled={!qrDataUrl}
                    className="flex-1 rounded-2xl bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Print Card
                  </button>
                </div>
              </article>
            )
          })}
          {!loading && filteredTables.length === 0 ? (
            <p className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-400">No tables found for the selected table filters.</p>
          ) : null}
        </div>

        <AdminPagination
          totalItems={filteredTables.length}
          currentPage={tablePage}
          pageSize={tablePageSize}
          onPageChange={setTablePage}
          onPageSizeChange={(size) => {
            setTablePageSize(size)
            setTablePage(1)
          }}
          label="tables"
        />
      </article>

      {editingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-100">Edit Inventory Item</h3>
                <p className="text-sm text-slate-400">Update quantity, unit, price and customer visibility.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                <span className="block font-medium text-slate-200">Item Name</span>
                <input
                  value={editingItem.name}
                  onChange={(event) => setEditingItem((current) => (current ? { ...current, name: event.target.value } : current))}
                  placeholder="Item name"
                  className={inputClass}
                />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span className="block font-medium text-slate-200">Category</span>
                <select
                  value={editingItem.category}
                  onChange={(event) => setEditingItem((current) => (current ? { ...current, category: event.target.value } : current))}
                  className={inputClass}
                >
                  {categories.map((entry) => (
                    <option key={entry._id} value={entry.name}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span className="block font-medium text-slate-200">Quantity</span>
                <input
                  value={editingItem.stockQuantity}
                  onChange={(event) => setEditingItem((current) => (current ? { ...current, stockQuantity: event.target.value } : current))}
                  type="number"
                  placeholder="Quantity"
                  className={inputClass}
                />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span className="block font-medium text-slate-200">Stock Unit</span>
                <select
                  value={editingItem.stockUnit}
                  onChange={(event) => setEditingItem((current) => (current ? { ...current, stockUnit: event.target.value as (typeof stockUnits)[number] } : current))}
                  className={inputClass}
                >
                  {stockUnits.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span className="block font-medium text-slate-200">Weightage</span>
                <input
                  value={editingItem.weightage}
                  onChange={(event) => setEditingItem((current) => (current ? { ...current, weightage: event.target.value } : current))}
                  placeholder="Weightage"
                  className={inputClass}
                />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span className="block font-medium text-slate-200">Price</span>
                <input
                  value={editingItem.price}
                  onChange={(event) => setEditingItem((current) => (current ? { ...current, price: event.target.value } : current))}
                  type="number"
                  placeholder="Price"
                  className={inputClass}
                />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span className="block font-medium text-slate-200">GST</span>
                <select
                  value={editingItem.gstRate}
                  onChange={(event) => setEditingItem((current) => (current ? { ...current, gstRate: event.target.value } : current))}
                  className={inputClass}
                >
                  <option value="0">0% GST</option>
                  <option value="5">5% GST</option>
                  <option value="18">18% GST</option>
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={editingItem.available}
                  onChange={(event) => setEditingItem((current) => (current ? { ...current, available: event.target.checked } : current))}
                />
                Show this item on customer menu
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
              <span>GST preview</span>
              <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">
                GST amount: Rs. {editingGstPreview.gstAmount.toFixed(2)}
              </span>
              <span className="rounded-full bg-amber-950/50 px-2 py-1 text-xs font-semibold text-amber-300">
                Total with GST: Rs. {editingGstPreview.totalAmount.toFixed(2)}
              </span>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveInventoryEdit()}
                className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default AdminInventoryPage
