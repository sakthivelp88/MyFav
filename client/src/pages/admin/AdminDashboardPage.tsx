import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  adminLogout,
  changeAdminPassword,
  createCategory,
  createItem,
  createTable,
  deleteCategory,
  deleteTable,
  listCategories,
  listItems,
  listOrders,
  listTables,
  setItemAvailability,
  updateOrderBillStatus,
  updateCategory,
  updateTable,
  updateOrderStatus,
} from '@utils/api'
import type { BillStatus, Category, DiningTable, Item, Order, OrderStatus } from '../../types'

const getPasswordStrength = (password: string) => {
  let score = 0

  if (password.length >= 8) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z\d]/.test(password)) score += 1

  if (score <= 2) {
    return { label: 'Weak', color: 'bg-red-500', width: 'w-1/4' }
  }
  if (score <= 4) {
    return { label: 'Medium', color: 'bg-amber-500', width: 'w-2/4' }
  }

  return { label: 'Strong', color: 'bg-emerald-500', width: 'w-full' }
}

function AdminDashboardPage() {
  const navigate = useNavigate()
  const modalCardRef = useRef<HTMLElement | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('tea')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [tableCode, setTableCode] = useState('')
  const [tableLabel, setTableLabel] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [editingTable, setEditingTable] = useState<{ id: string; code: string; label: string } | null>(null)
  const [deletingTable, setDeletingTable] = useState<DiningTable | null>(null)
  const [modalBusy, setModalBusy] = useState(false)

  const closeAllModals = () => {
    setEditingCategory(null)
    setDeletingCategory(null)
    setEditingTable(null)
    setDeletingTable(null)
  }

  const loadAll = async () => {
    setError('')

    try {
      const [itemResult, orderResult, categoryResult, tableResult] = await Promise.all([
        listItems(),
        listOrders(),
        listCategories(),
        listTables(),
      ])
      setItems(itemResult)
      setOrders(orderResult)
      setCategories(categoryResult)
      setTables(tableResult)

      if (!category && categoryResult.length > 0) {
        setCategory(categoryResult[0].name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load admin data')
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  useEffect(() => {
    if (!success) {
      return
    }

    const timer = window.setTimeout(() => {
      setSuccess('')
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [success])

  useEffect(() => {
    const hasModalOpen = Boolean(editingCategory || deletingCategory || editingTable || deletingTable)
    if (!hasModalOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !modalBusy) {
        closeAllModals()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const modalNode = modalCardRef.current
      if (!modalNode) {
        return
      }

      const focusableNodes = modalNode.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const visibleNodes = Array.from(focusableNodes).filter((node) => !node.hasAttribute('disabled'))

      if (visibleNodes.length === 0) {
        return
      }

      const firstNode = visibleNodes[0]
      const lastNode = visibleNodes[visibleNodes.length - 1]
      const activeNode = document.activeElement as HTMLElement | null

      if (event.shiftKey && activeNode === firstNode) {
        event.preventDefault()
        lastNode.focus()
      } else if (!event.shiftKey && activeNode === lastNode) {
        event.preventDefault()
        firstNode.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingCategory, deletingCategory, editingTable, deletingTable, modalBusy])

  useEffect(() => {
    const hasModalOpen = Boolean(editingCategory || deletingCategory || editingTable || deletingTable)
    if (!hasModalOpen) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
    }
  }, [editingCategory, deletingCategory, editingTable, deletingTable])

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target || modalBusy) {
      return
    }

    closeAllModals()
  }

  const addMenuItem = async () => {
    const numericPrice = Number(price)

    if (!name || !Number.isFinite(numericPrice) || numericPrice < 0) {
      setError('Valid name and price are required')
      return
    }

    setError('')
    setSuccess('')

    try {
      await createItem({ name, price: numericPrice, category })
      setName('')
      setPrice('')
      setSuccess('Menu item created successfully')
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item')
    }
  }

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      setError('Category name is required')
      return
    }

    setError('')
    setSuccess('')

    try {
      await createCategory({ name: newCategoryName })
      setNewCategoryName('')
      setSuccess('Category created successfully')
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category')
    }
  }

  const renameCategory = async (entry: Category) => {
    setEditingCategory({ id: entry._id, name: entry.name })
  }

  const removeCategory = async (entry: Category) => {
    setDeletingCategory(entry)
  }

  const saveCategoryEdit = async () => {
    if (!editingCategory) {
      return
    }

    const trimmedName = editingCategory.name.trim()
    if (!trimmedName) {
      setError('Category name is required')
      return
    }

    setError('')
    setSuccess('')
    setModalBusy(true)
    try {
      await updateCategory(editingCategory.id, { name: trimmedName })
      setEditingCategory(null)
      setSuccess('Category updated successfully')
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category')
    } finally {
      setModalBusy(false)
    }
  }

  const confirmCategoryDelete = async () => {
    if (!deletingCategory) {
      return
    }

    setError('')
    setSuccess('')
    setModalBusy(true)
    try {
      await deleteCategory(deletingCategory._id)
      setDeletingCategory(null)
      setSuccess('Category deleted successfully')
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category')
    } finally {
      setModalBusy(false)
    }
  }

  const addTable = async () => {
    if (!tableCode.trim() || !tableLabel.trim()) {
      setError('Table code and table label are required')
      return
    }

    setError('')
    setSuccess('')

    try {
      await createTable({
        code: tableCode,
        label: tableLabel,
      })
      setTableCode('')
      setTableLabel('')
      setSuccess('Table created successfully')
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create table')
    }
  }

  const editTable = async (entry: DiningTable) => {
    setEditingTable({ id: entry._id, code: entry.code, label: entry.label })
  }

  const toggleTableActive = async (entry: DiningTable) => {
    setError('')
    setSuccess('')
    try {
      await updateTable(entry._id, { active: !entry.active })
      setSuccess(`Table ${entry.active ? 'deactivated' : 'activated'} successfully`)
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update table state')
    }
  }

  const removeTable = async (entry: DiningTable) => {
    setDeletingTable(entry)
  }

  const saveTableEdit = async () => {
    if (!editingTable) {
      return
    }

    const nextCode = editingTable.code.trim().toUpperCase()
    const nextLabel = editingTable.label.trim()

    if (!nextCode || !nextLabel) {
      setError('Table code and label are required')
      return
    }

    setError('')
    setSuccess('')
    setModalBusy(true)
    try {
      await updateTable(editingTable.id, { code: nextCode, label: nextLabel })
      setEditingTable(null)
      setSuccess('Table updated successfully')
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update table')
    } finally {
      setModalBusy(false)
    }
  }

  const confirmTableDelete = async () => {
    if (!deletingTable) {
      return
    }

    setError('')
    setSuccess('')
    setModalBusy(true)
    try {
      await deleteTable(deletingTable._id)
      setDeletingTable(null)
      setSuccess('Table deleted successfully')
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete table')
    } finally {
      setModalBusy(false)
    }
  }

  const toggleAvailability = async (item: Item) => {
    setSuccess('')
    try {
      await setItemAvailability(item._id, !item.available)
      setSuccess(`Item ${item.available ? 'hidden' : 'shown'} successfully`)
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item')
    }
  }

  const setStatus = async (orderId: string, status: OrderStatus) => {
    setSuccess('')
    try {
      await updateOrderStatus(orderId, status)
      setSuccess('Order status updated successfully')
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order')
    }
  }

  const setBillStatus = async (orderId: string, billStatus: BillStatus) => {
    setSuccess('')
    try {
      await updateOrderBillStatus(orderId, billStatus)
      setSuccess('Bill status updated successfully')
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bill status')
    }
  }

  const logoutAdmin = async () => {
    try {
      await adminLogout()
    } catch {
      // Ignore logout API errors and still redirect to login.
    }
    navigate('/admin/login', { replace: true })
  }

  const submitPasswordChange = async () => {
    setPasswordMessage('')
    setPasswordError('')
    setSuccess('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required')
      return
    }

    const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

    if (!strongPasswordPattern.test(newPassword)) {
      setPasswordError('Use at least 8 chars with upper, lower, number, and symbol')
      return
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password must match')
      return
    }

    try {
      const response = await changeAdminPassword({
        currentPassword,
        newPassword,
      })

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage(response.message)
      setSuccess('Password changed successfully')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password')
    }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  return (
    <>
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Admin Control Dashboard</h2>
          <p className="text-sm text-slate-500">Control customer-visible items and track order lifecycle.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadAll()}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void logoutAdmin()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </div>


      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-base font-semibold text-slate-900">Change Admin Password</h3>
        <p className="mt-1 text-sm text-slate-500">Update your admin password securely.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="flex gap-2">
            <input
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current Password"
              type={showCurrentPassword ? 'text' : 'password'}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword((value) => !value)}
              className="rounded-xl border border-slate-300 px-3 text-sm text-slate-700 hover:bg-white"
            >
              {showCurrentPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New Password"
              type={showNewPassword ? 'text' : 'password'}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((value) => !value)}
              className="rounded-xl border border-slate-300 px-3 text-sm text-slate-700 hover:bg-white"
            >
              {showNewPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="rounded-xl border border-slate-300 px-3 text-sm text-slate-700 hover:bg-white"
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
            <span>Password Strength</span>
            <span>{passwordStrength.label}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-2 transition-all ${passwordStrength.color} ${passwordStrength.width}`}
            ></div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Use at least 8 characters including upper, lower, number, and symbol.
          </p>
        </div>
        {passwordError ? (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{passwordError}</p>
        ) : null}
        {passwordMessage ? (
          <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{passwordMessage}</p>
        ) : null}
        <button
          type="button"
          onClick={() => void submitPasswordChange()}
          className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Change Password
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
        <h3 className="text-base font-semibold text-slate-900">Create Category</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Category Name"
            className="sm:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring"
          />
          <button
            type="button"
            onClick={addCategory}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Add Category
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((entry) => (
            <div
              key={entry._id}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700"
            >
              {entry.name}
              <button
                type="button"
                onClick={() => void renameCategory(entry)}
                className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void removeCategory(entry)}
                className="rounded-full border border-red-200 px-2 py-0.5 text-[10px] text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
        <h3 className="text-base font-semibold text-slate-900">Create Table</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            value={tableCode}
            onChange={(event) => setTableCode(event.target.value.toUpperCase())}
            placeholder="Table Code (e.g. T-01)"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 focus:ring"
          />
          <input
            value={tableLabel}
            onChange={(event) => setTableLabel(event.target.value)}
            placeholder="Table Label (e.g. Window Table)"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 focus:ring"
          />
          <button
            type="button"
            onClick={addTable}
            className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
          >
            Add Table
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((entry) => (
            <div key={entry._id} className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm">
              <p className="font-semibold text-slate-800">{entry.code}</p>
              <p className="text-slate-600">{entry.label}</p>
              <p className={`mt-1 text-xs ${entry.active ? 'text-emerald-600' : 'text-red-600'}`}>
                {entry.active ? 'Active' : 'Inactive'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void editTable(entry)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void toggleTableActive(entry)}
                  className="rounded-lg border border-sky-200 px-2 py-1 text-xs text-sky-700 hover:bg-sky-50"
                >
                  {entry.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  type="button"
                  onClick={() => void removeTable(entry)}
                  className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
        <h3 className="text-base font-semibold text-slate-900">Add New Menu Item</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Item Name"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring"
          />
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="Price"
            type="number"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring"
          />
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Category"
            list="category-options"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring"
          />
          <datalist id="category-options">
            {categories.map((entry) => (
              <option key={entry._id} value={entry.name} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={addMenuItem}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Add Item
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Menu Visibility Control</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item._id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900">{item.name}</h4>
              <p className="text-sm text-slate-500">{item.category}</p>
              <p className="mt-1 text-amber-700">Rs. {item.price.toFixed(2)}</p>
              <p className={`mt-2 text-sm ${item.available ? 'text-emerald-700' : 'text-red-600'}`}>
                {item.available ? 'Visible to customers' : 'Hidden from customers'}
              </p>
              <button
                type="button"
                onClick={() => toggleAvailability(item)}
                className="mt-3 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                {item.available ? 'Hide Item' : 'Show Item'}
              </button>
            </article>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Live Customer Orders</h3>
        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order._id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold text-slate-900">
                  {order.customerName} | Table {order.tableCode}
                </p>
                <p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <p className="text-sm text-slate-500">Phone: {order.customerPhone}</p>
              <p className="mt-1 text-sm text-slate-700">Total: Rs. {order.totalAmount.toFixed(2)}</p>
              <p className="mt-1 text-sm text-slate-700">Status: {order.status}</p>
              <p className="mt-1 text-sm text-slate-700">Bill: {order.billStatus}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {(['accepted', 'preparing', 'served', 'cancelled'] as OrderStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatus(order._id, status)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                      status === order.status
                        ? 'bg-amber-200 text-amber-900'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {(['unpaid', 'paid'] as BillStatus[]).map((billStatus) => (
                  <button
                    key={billStatus}
                    type="button"
                    onClick={() => setBillStatus(order._id, billStatus)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                      billStatus === order.billStatus
                        ? 'bg-sky-200 text-sky-900'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {billStatus}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
      </section>

      <div className="fixed right-4 top-4 z-[60] space-y-2">
        {error ? (
          <div className="w-[min(92vw,360px)] rounded-xl border border-red-200 bg-white p-3 text-sm text-red-700 shadow-lg transition-all duration-300">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{error}</p>
              <button
                type="button"
                onClick={() => setError('')}
                className="rounded-md px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {success ? (
          <div className="w-[min(92vw,360px)] rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-700 shadow-lg transition-all duration-300">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{success}</p>
              <button
                type="button"
                onClick={() => setSuccess('')}
                className="rounded-md px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {editingCategory ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          onMouseDown={handleBackdropMouseDown}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void saveCategoryEdit()
            }}
            ref={(node) => {
              modalCardRef.current = node
            }}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Edit category dialog"
          >
            <h3 className="text-base font-semibold text-slate-900">Edit Category</h3>
            <p className="mt-1 text-sm text-slate-500">Update the category name used in your menu.</p>
            <input
              value={editingCategory.name}
              onChange={(event) =>
                setEditingCategory((value) =>
                  value
                    ? {
                        ...value,
                        name: event.target.value,
                      }
                    : value
                )
              }
              placeholder="Category name"
              autoFocus
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={modalBusy}
                onClick={closeAllModals}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalBusy}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {modalBusy ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deletingCategory ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          onMouseDown={handleBackdropMouseDown}
        >
          <div
            ref={(node) => {
              modalCardRef.current = node
            }}
            className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Delete category dialog"
          >
            <h3 className="text-base font-semibold text-slate-900">Delete Category</h3>
            <p className="mt-1 text-sm text-slate-600">
              Delete <span className="font-semibold text-slate-900">{deletingCategory.name}</span>? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={modalBusy}
                onClick={closeAllModals}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={modalBusy}
                onClick={() => void confirmCategoryDelete()}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {modalBusy ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingTable ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          onMouseDown={handleBackdropMouseDown}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void saveTableEdit()
            }}
            ref={(node) => {
              modalCardRef.current = node
            }}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Edit table dialog"
          >
            <h3 className="text-base font-semibold text-slate-900">Edit Table</h3>
            <p className="mt-1 text-sm text-slate-500">Update table code and label shown to staff and customers.</p>
            <div className="mt-3 space-y-3">
              <input
                value={editingTable.code}
                onChange={(event) =>
                  setEditingTable((value) =>
                    value
                      ? {
                          ...value,
                          code: event.target.value.toUpperCase(),
                        }
                      : value
                  )
                }
                placeholder="Table code"
                autoFocus
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 focus:ring"
              />
              <input
                value={editingTable.label}
                onChange={(event) =>
                  setEditingTable((value) =>
                    value
                      ? {
                          ...value,
                          label: event.target.value,
                        }
                      : value
                  )
                }
                placeholder="Table label"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 focus:ring"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={modalBusy}
                onClick={closeAllModals}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalBusy}
                className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {modalBusy ? 'Saving...' : 'Save Table'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deletingTable ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          onMouseDown={handleBackdropMouseDown}
        >
          <div
            ref={(node) => {
              modalCardRef.current = node
            }}
            className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Delete table dialog"
          >
            <h3 className="text-base font-semibold text-slate-900">Delete Table</h3>
            <p className="mt-1 text-sm text-slate-600">
              Delete table <span className="font-semibold text-slate-900">{deletingTable.code}</span> ({deletingTable.label})?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={modalBusy}
                onClick={closeAllModals}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={modalBusy}
                onClick={() => void confirmTableDelete()}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {modalBusy ? 'Deleting...' : 'Delete Table'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default AdminDashboardPage
