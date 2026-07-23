import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { createOrder, getLatestCustomerOrder, listItems, listTables } from '@utils/api'
import type { DiningTable, Item, Order, OrderStatus } from '../../types'

function CustomerPage() {
  const { tableCode: scannedTableCode } = useParams<{ tableCode: string }>()
  const [items, setItems] = useState<Item[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [tableCode, setTableCode] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [latestOrder, setLatestOrder] = useState<Order | null>(null)
  const [lastNotifiedStatus, setLastNotifiedStatus] = useState<OrderStatus | null>(null)
  const [openSections, setOpenSections] = useState({
    details: true,
    menu: true,
    summary: true,
  })

  const isScanMode = Boolean(scannedTableCode)

  const availableItems = useMemo(
    () => items.filter((item) => item.available),
    [items]
  )

  const total = useMemo(() => {
    return availableItems.reduce((sum, item) => {
      const qty = quantities[item._id] ?? 0
      return sum + qty * item.price
    }, 0)
  }, [availableItems, quantities])

  const activeTables = useMemo(
    () => tables.filter((table) => table.active),
    [tables]
  )

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const [itemResult, tableResult] = await Promise.all([listItems(), listTables()])
      setItems(itemResult)
      setTables(tableResult)

      if (scannedTableCode) {
        setTableCode(scannedTableCode.toUpperCase())
        return
      }

      if (!tableCode && tableResult.length > 0) {
        const firstActive = tableResult.find((table) => table.active)
        if (firstActive) {
          setTableCode(firstActive.code)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load menu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [scannedTableCode])

  useEffect(() => {
    const normalizedPhone = customerPhone.trim()
    const normalizedTableCode = tableCode.trim().toUpperCase()

    if (normalizedPhone.length < 7 || !normalizedTableCode) {
      setLatestOrder(null)
      return
    }

    const pollLatestOrder = async () => {
      try {
        const order = await getLatestCustomerOrder({
          customerPhone: normalizedPhone,
          tableCode: normalizedTableCode,
        })

        if (!order) {
          setLatestOrder(null)
          return
        }

        setLatestOrder(order)

        if (order.status !== lastNotifiedStatus) {
          if (order.status === 'accepted') {
            setSuccess('Your order has been accepted by admin.')
          }

          if (order.status === 'preparing') {
            setSuccess('Your order is now preparing.')
          }

          if (order.status === 'served') {
            setSuccess('Your order is served. Enjoy your meal.')
          }

          setLastNotifiedStatus(order.status)
        }
      } catch {
        // Ignore when no order yet for this phone/table combination.
      }
    }

    void pollLatestOrder()
    const intervalId = window.setInterval(() => {
      void pollLatestOrder()
    }, 8000)

    return () => window.clearInterval(intervalId)
  }, [customerPhone, tableCode, lastNotifiedStatus])

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

  const updateQty = (id: string, delta: number) => {
    setQuantities((current) => {
      const nextValue = Math.max(0, (current[id] ?? 0) + delta)
      return { ...current, [id]: nextValue }
    })
  }

  const submitOrder = async () => {
    const selectedItems = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }))

    if (!customerName || !customerPhone) {
      setError('Please enter your name and phone number')
      return
    }

    if (!tableCode) {
      setError('Please select your table')
      return
    }

    if (selectedItems.length === 0) {
      setError('Please choose at least one item')
      return
    }

    setError('')
    setSuccess('')

    try {
      const order = await createOrder({
        customerName,
        customerPhone,
        tableCode,
        items: selectedItems,
      })

      setSuccess(`Order placed successfully. Order ID: ${order._id.slice(-6).toUpperCase()}`)
      setLatestOrder(order)
      setLastNotifiedStatus(order.status)
      setQuantities({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order creation failed')
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-100">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Panel</h2>
          <p className="text-sm text-slate-500">
            {isScanMode
              ? `Table ${tableCode || scannedTableCode} scan detected. Customer ordering only mode is active.`
              : 'Choose your items and place your order quickly.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh Data
        </button>
      </div>

      {loading ? <p className="mt-3 text-sm text-slate-500">Loading menu and tables...</p> : null}
      {!loading && activeTables.length === 0 ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
          No active tables found. Ask admin to create/activate tables.
        </p>
      ) : null}
      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      {latestOrder ? (
        <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-800">
          Latest Order #{latestOrder._id.slice(-6).toUpperCase()} status: {latestOrder.status}
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => toggleSection('details')}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            <span>Page 1: Customer Details</span>
            <span>{openSections.details ? 'Collapse' : 'Expand'}</span>
          </button>
          {openSections.details ? (
            <div className="grid gap-3 border-t border-slate-200 bg-white p-4 sm:grid-cols-3">
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Customer Name"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring"
              />
              <input
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="Phone Number"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring"
              />
              <select
                value={tableCode}
                onChange={(event) => setTableCode(event.target.value)}
                disabled={isScanMode}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">Select Table</option>
                {activeTables.map((table) => (
                  <option key={table._id} value={table.code}>
                    {table.code} - {table.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </article>

        <article className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/30">
          <button
            type="button"
            onClick={() => toggleSection('menu')}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-amber-900 hover:bg-amber-100/60"
          >
            <span>Page 2: Menu Book</span>
            <span>{openSections.menu ? 'Collapse' : 'Expand'}</span>
          </button>
          {openSections.menu ? (
            <div className="grid gap-3 border-t border-amber-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableItems.map((item) => (
                <article key={item._id} className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                  <h3 className="font-semibold text-slate-900">{item.name}</h3>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.category}</p>
                  <p className="mt-1 text-lg font-bold text-amber-700">Rs. {item.price.toFixed(2)}</p>
                  <div className="mt-3 inline-flex items-center gap-3 rounded-lg border border-slate-300 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => updateQty(item._id, -1)}
                      className="h-8 w-8 rounded-md text-lg font-bold text-slate-700 hover:bg-slate-100"
                    >
                      -
                    </button>
                    <strong className="min-w-6 text-center text-sm">{quantities[item._id] ?? 0}</strong>
                    <button
                      type="button"
                      onClick={() => updateQty(item._id, 1)}
                      className="h-8 w-8 rounded-md text-lg font-bold text-slate-700 hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </article>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => toggleSection('summary')}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            <span>Page 3: Order Summary</span>
            <span>{openSections.summary ? 'Collapse' : 'Expand'}</span>
          </button>
          {openSections.summary ? (
            <div className="border-t border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-base font-semibold text-slate-800">Order Total: Rs. {total.toFixed(2)}</p>
                <button
                  type="button"
                  onClick={submitOrder}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Place Order
                </button>
              </div>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  )
}

export default CustomerPage
