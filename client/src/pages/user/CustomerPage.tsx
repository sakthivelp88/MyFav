import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageToastStack from '@components/PageToastStack'
import {
  createOrder,
  getLatestCustomerOrder,
  listCategories,
  listItems,
  listTables,
  payForOrder,
  updateCustomerOrder,
} from '@utils/api'
import type {
  Category,
  DiningTable,
  Item,
  Order,
  OrderStatus,
  PaymentMethod,
} from '../../types'

type BookStep = 1 | 2 | 3 | 4 | 5
const serviceStatusStages = ['accepted', 'preparing', 'served'] as const

const paymentOptions: Array<{ id: PaymentMethod; label: string; note: string }> = [
  { id: 'cash', label: 'Cash', note: 'Checkout at the Cash Counter.' },
  { id: 'upi', label: 'UPI', note: 'Pay instantly using any UPI application.' },
  { id: 'card', label: 'Card', note: 'Use debit or credit card on the shop terminal.' },
  { id: 'razorpay', label: 'Razorpay', note: 'Pay online securely using Razorpay.' },
]

const stepLabels: Record<BookStep, string> = {
  1: 'MyFav',
  2: 'Customer Details',
  3: 'Menu Items',
  4: 'Order Confirmation',
  5: 'Payment',
}

const stepNotes: Record<BookStep, string> = {
  1: 'Customer ordering portal',
  2: 'Happy Serving...',
  3: 'Choose menu items and quantities.',
  4: 'Review the order before placing it.',
  5: 'Complete payment and finish the flow.',
}

const panelClass =
  'rounded-2xl border border-slate-700/80 bg-slate-800/85 p-4 text-sm text-slate-300 shadow-lg shadow-black/10'

const primaryButtonClass =
  'inline-flex w-full items-center justify-center gap-3 rounded-xl bg-amber-400 px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60'

const secondaryButtonClass =
  'inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-slate-200 transition hover:bg-slate-700'

const footerButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition'

const pageCardClass =
  'relative w-full rounded-[28px] border border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur transition-all duration-300'

function ButtonIcon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d={path} />
    </svg>
  )
}

function PaymentMethodIcon({ method }: { method: PaymentMethod }) {
  if (method === 'cash') {
    return <ButtonIcon path="M3 7h18v10H3zM7 11h.01M17 11h.01M12 10v4" />
  }

  if (method === 'upi') {
    return <ButtonIcon path="M7 7h10M7 12h6M7 17h10M17 7l-2 5 2 5" />
  }

  if (method === 'card') {
    return <ButtonIcon path="M3 8h18M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm2 8h4" />
  }

  return <ButtonIcon path="M12 3v3M18.36 5.64l-2.12 2.12M21 12h-3M18.36 18.36l-2.12-2.12M12 21v-3M5.64 18.36l2.12-2.12M3 12h3M5.64 5.64l2.12 2.12M12 8a4 4 0 1 1 0 8a4 4 0 0 1 0-8z" />
}

type ServiceNotificationKind = 'payment' | 'accepted' | 'preparing' | 'served'

function ServiceStatusIcon({ kind }: { kind: ServiceNotificationKind }) {
  if (kind === 'payment') {
    return <ButtonIcon path="M3 7h18v10H3zM7 11h.01M17 11h.01M12 10v4" />
  }

  if (kind === 'accepted') {
    return <ButtonIcon path="M20 6L9 17l-5-5" />
  }

  if (kind === 'preparing') {
    return <ButtonIcon path="M8 3v3M16 3v3M4 10h16M6 21h12a2 2 0 0 0 2-2V8H4v11a2 2 0 0 0 2 2z" />
  }

  return <ButtonIcon path="M8 13h8M8 17h5M7 4h10l1 5H6l1-5zm-1 5h12v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9z" />
}

function CustomerPage() {
  const navigate = useNavigate()
  const { tableCode: scannedTableCode } = useParams<{ tableCode: string }>()
  const [items, setItems] = useState<Item[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [tableCode, setTableCode] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [latestOrder, setLatestOrder] = useState<Order | null>(null)
  const [lastNotifiedStatus, setLastNotifiedStatus] = useState<OrderStatus | null>(null)
  const [currentStep, setCurrentStep] = useState<BookStep>(scannedTableCode ? 2 : 1)
  const [activeCategory, setActiveCategory] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash')

  const isScanMode = Boolean(scannedTableCode)
  const isPaidNotificationView = currentStep === 5 && latestOrder?.paymentStatus === 'paid'
  const cardWidthClass = isPaidNotificationView ? 'max-w-md' : currentStep >= 3 ? 'max-w-2xl' : 'max-w-md'
  const availableItems = useMemo(() => items.filter((item) => item.available), [items])
  const activeTables = useMemo(() => tables.filter((table) => table.active), [tables])

  const visibleCategories = useMemo(() => {
    const counts = new Map<string, number>()

    for (const item of availableItems) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
    }

    const configuredCategories = categories
      .filter((entry) => entry.active && counts.has(entry.name))
      .map((entry) => ({ name: entry.name, count: counts.get(entry.name) ?? 0 }))

    if (configuredCategories.length > 0) {
      return configuredCategories
    }

    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }))
  }, [availableItems, categories])

  const categoryItems = useMemo(
    () => availableItems.filter((item) => item.category === activeCategory),
    [activeCategory, availableItems]
  )

  const selectedItems = useMemo(() => {
    return availableItems
      .filter((item) => (quantities[item._id] ?? 0) > 0)
      .map((item) => ({ ...item, quantity: quantities[item._id] ?? 0 }))
  }, [availableItems, quantities])

  const total = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.quantity * item.price, 0),
    [selectedItems]
  )

  const canEditCurrentOrder = Boolean(
    latestOrder && latestOrder.status === 'pending' && latestOrder.paymentStatus === 'pending'
  )

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const [itemResult, tableResult, categoryResult] = await Promise.all([
        listItems(),
        listTables(),
        listCategories(),
      ])

      setItems(itemResult)
      setTables(tableResult)
      setCategories(categoryResult)

      if (scannedTableCode) {
        setTableCode(scannedTableCode.toUpperCase())
      } else if (!tableCode && tableResult.length > 0) {
        const firstActive = tableResult.find((table) => table.active)
        if (firstActive) {
          setTableCode(firstActive.code)
        }
      }

      if (!activeCategory) {
        const firstCategory = categoryResult.find((entry) =>
          entry.active && itemResult.some((item) => item.available && item.category === entry.name)
        )

        if (firstCategory) {
          setActiveCategory(firstCategory.name)
        } else if (itemResult[0]) {
          setActiveCategory(itemResult[0].category)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load customer book')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [scannedTableCode])

  useEffect(() => {
    setCurrentStep(scannedTableCode ? 2 : 1)
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
            setSuccess('Your order is served. Enjoy your tea.')
          }

          setLastNotifiedStatus(order.status)
        }
      } catch {
        // Ignore no-order cases for customer polling.
      }
    }

    void pollLatestOrder()
    const intervalId = window.setInterval(() => {
      void pollLatestOrder()
    }, 8000)

    return () => window.clearInterval(intervalId)
  }, [customerPhone, tableCode, lastNotifiedStatus])

  const updateQty = (id: string, delta: number) => {
    setQuantities((current) => {
      const nextValue = Math.max(0, (current[id] ?? 0) + delta)
      return { ...current, [id]: nextValue }
    })
  }

  const goToStep = (step: BookStep) => {
    setError('')
    setCurrentStep(step)
  }

  const validateDetails = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Please enter the customer name and phone number')
      return false
    }

    if (!tableCode.trim()) {
      setError('Please enter or select the table number')
      return false
    }

    return true
  }

  const openCategory = (categoryName: string) => {
    setActiveCategory(categoryName)
  }

  const openFeedbackPage = () => {
    navigate('/feedback', {
      state: {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        tableCode: tableCode.trim().toUpperCase(),
        invoiceNumber: latestOrder?.invoiceNumber ?? latestOrder?._id.slice(-6).toUpperCase() ?? '',
      },
    })
  }

  const submitOrder = async () => {
    const orderItems = selectedItems.map((item) => ({ itemId: item._id, quantity: item.quantity }))

    if (!validateDetails()) {
      setCurrentStep(2)
      return
    }

    if (orderItems.length === 0) {
      setError('Please mark at least one item before placing the order')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        tableCode: tableCode.trim().toUpperCase(),
        items: orderItems,
      }

      const order = canEditCurrentOrder && latestOrder
        ? await updateCustomerOrder(latestOrder._id, payload)
        : await createOrder(payload)

      setLatestOrder(order)
      setLastNotifiedStatus(order.status)
      setSuccess(
        canEditCurrentOrder
          ? `Order updated successfully. Invoice ${order.invoiceNumber ?? order._id.slice(-6).toUpperCase()}`
          : `Order placed successfully. Invoice ${order.invoiceNumber ?? order._id.slice(-6).toUpperCase()}`
      )
      setCurrentStep(5)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const completePayment = async () => {
    if (!latestOrder) {
      setError('Place an order before opening the payment page')
      return
    }

    setPaying(true)
    setError('')
    setSuccess('')

    try {
      const order = await payForOrder(latestOrder._id, selectedPaymentMethod)
      setLatestOrder(order)
      setSuccess(`Payment received by ${selectedPaymentMethod.toUpperCase()}. Waiting for admin acceptance.`)
      setCurrentStep(5)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment could not be completed')
    } finally {
      setPaying(false)
    }
  }

  const goToNextStep = () => {
    if (currentStep === 1) {
      goToStep(2)
      return
    }

    if (currentStep === 2) {
      if (validateDetails()) {
        goToStep(3)
      }
      return
    }

    if (currentStep === 3) {
      if (selectedItems.length === 0) {
        setError('Please mark at least one item before continuing')
        return
      }

      goToStep(4)
      return
    }

    if (currentStep === 4) {
      if (!submitting) {
        void submitOrder()
      }
      return
    }

    if (currentStep === 5) {
      if (!paying) {
        void completePayment()
      }
    }
  }

  const getPrimaryActionLabel = () => {
    if (currentStep === 1) {
      return 'Order >'
    }

    if (currentStep === 2) {
      return 'Continue >'
    }

    if (currentStep === 3) {
      return 'Continue >'
    }

    if (currentStep === 4) {
      return submitting ? 'Saving...' : canEditCurrentOrder ? 'Update Order >' : 'Place Order >'
    }

    if (latestOrder?.paymentStatus === 'paid') {
      return 'Paid'
    }

    return paying ? 'Processing...' : 'Confirm Payment >'
  }

  const isPrimaryDisabled =
    (currentStep === 4 && submitting) ||
    (currentStep === 5 && latestOrder?.paymentStatus === 'paid') ||
    (currentStep === 5 && (!latestOrder || paying))

  const serviceNotifications: Array<{
    id: string
    title: string
    description: string
    kind: ServiceNotificationKind
    accent: string
  }> = latestOrder
    ? [
        ...(latestOrder.paymentStatus === 'paid'
          ? [{
              id: 'payment',
              title: 'Payment Successful',
              description: `Payment recorded through ${latestOrder.paymentMethod?.toUpperCase() ?? selectedPaymentMethod.toUpperCase()}.`,
              kind: 'payment' as const,
              accent: 'border-emerald-500/30 bg-emerald-950/25 text-emerald-200',
            }]
          : []),
        ...serviceStatusStages
          .filter((status) => {
            if (status === 'accepted') return ['accepted', 'preparing', 'served'].includes(latestOrder.status)
            if (status === 'preparing') return ['preparing', 'served'].includes(latestOrder.status)
            return latestOrder.status === 'served'
          })
          .map((status) => ({
            id: status,
            title:
              status === 'accepted'
                ? 'Order Accepted'
                : status === 'preparing'
                  ? 'Order in Preparation'
                  : 'Order Served',
            description:
              status === 'accepted'
                ? 'Our team has accepted your order and queued it for service.'
                : status === 'preparing'
                  ? 'Your order is currently being prepared for your table.'
                  : 'Your order has been served. Enjoy your food and drinks.',
            kind: status,
            accent:
              status === 'accepted'
                ? 'border-sky-500/30 bg-sky-950/25 text-sky-200'
                : status === 'preparing'
                  ? 'border-amber-500/30 bg-amber-950/25 text-amber-200'
                  : 'border-violet-500/30 bg-violet-950/25 text-violet-200',
          })),
      ]
    : []

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) {
        return
      }

      const tagName = target.tagName
      if (
        target.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT'
      ) {
        return
      }

      if (event.key === 'ArrowLeft' && currentStep > (isScanMode ? 2 : 1)) {
        event.preventDefault()
        goToStep((currentStep - 1) as BookStep)
        return
      }

      if (event.key === 'ArrowRight' && currentStep < 5) {
        event.preventDefault()
        goToStep((currentStep + 1) as BookStep)
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        goToNextStep()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    activeCategory,
    currentStep,
    isScanMode,
    latestOrder,
    paying,
    submitting,
    tableCode,
    customerName,
    customerPhone,
    selectedItems,
  ])

  return (
    <div className={`mx-auto mt-8 w-full ${cardWidthClass}`}>
      <div>
        <section className={pageCardClass}>
          <PageToastStack
            notifications={[
              ...(loading ? [{ id: 'loading', message: 'Loading customer flow...', variant: 'info' as const }] : []),
              ...(error ? [{ id: 'error', message: error, variant: 'error' as const }] : []),
              ...(success ? [{ id: 'success', message: success, variant: 'success' as const }] : []),
              ...(latestOrder
                ? [{
                    id: 'latest-order',
                    message: `Invoice ${latestOrder.invoiceNumber ?? latestOrder._id.slice(-6).toUpperCase()} | ${latestOrder.status} | ${latestOrder.paymentStatus}`,
                    variant: 'info' as const,
                  }]
                : []),
            ]}
          />
          <div className="flex flex-col gap-6">
        <div>
          {currentStep === 1 ? (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                    Customer Panel
                  </span>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                    Ready to Order
                  </span>
                </div>

                <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-50">MyFav</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">Customer ordering portal</p>

                <div className="mt-6 rounded-3xl border border-amber-500/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.16)_0%,rgba(30,41,59,0.15)_100%)] p-5 text-sm leading-6 text-slate-200">
                  Place your order, review everything before confirming, and complete payment with cash, card, or UPI.
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className={primaryButtonClass}
                  >
                    <ButtonIcon path="M5 12h14M13 5l7 7-7 7" />
                    Order
                  </button>
                  <button
                    type="button"
                    onClick={openFeedbackPage}
                    className={secondaryButtonClass}
                  >
                    <ButtonIcon path="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    Feedback
                  </button>
                  <Link
                    to="/admin/login"
                    className={secondaryButtonClass}
                  >
                    <ButtonIcon path="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
                    Admin Login
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-50">{stepLabels[currentStep]}</h2>
                <p className="mt-2 text-sm text-slate-400">{stepNotes[currentStep]}</p>
              </div>

              <div className={panelClass}>
                {isScanMode
                  ? `Scanned table: ${tableCode || scannedTableCode}`
                  : 'Enter name and phone number and choose the table to continue.'}
              </div>

              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Customer name"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none ring-amber-400/40 placeholder:text-slate-500 focus:ring"
              />
              <input
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="Phone number"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none ring-amber-400/40 placeholder:text-slate-500 focus:ring"
              />
              <select
                value={tableCode}
                onChange={(event) => setTableCode(event.target.value)}
                disabled={isScanMode}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none ring-amber-400/40 focus:ring disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-500"
              >
                <option value="">Select table number</option>
                {activeTables.map((table) => (
                  <option key={table._id} value={table.code}>
                    {table.code} - {table.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-50">{stepLabels[currentStep]}</h2>
                <p className="mt-2 text-sm text-slate-400">{stepNotes[currentStep]}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {visibleCategories.map((entry) => (
                  <button
                    key={entry.name}
                    type="button"
                    onClick={() => openCategory(entry.name)}
                    className={`rounded-full px-3 py-2 text-sm font-semibold ${
                      activeCategory === entry.name
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {entry.name}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 pr-1 sm:grid-cols-2">
                {categoryItems.map((item) => {
                  const quantity = quantities[item._id] ?? 0

                  return (
                    <article
                      key={item._id}
                      className={`rounded-2xl border p-4 ${
                        quantity > 0
                          ? 'border-amber-500/70 bg-[linear-gradient(135deg,rgba(120,53,15,0.55)_0%,rgba(15,23,42,0.95)_100%)] shadow-lg shadow-amber-950/10'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{item.name}</p>
                          <p className="mt-1 text-sm text-slate-400">Rs. {item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-2 py-1">
                          <button
                            type="button"
                            onClick={() => updateQty(item._id, -1)}
                            className="h-8 w-8 rounded-lg text-base font-bold text-slate-200 hover:bg-slate-800"
                          >
                            -
                          </button>
                          <span className="min-w-6 text-center text-sm font-semibold text-slate-100">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(item._id, 1)}
                            className="h-8 w-8 rounded-lg text-base font-bold text-slate-200 hover:bg-slate-800"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}

                {!loading && categoryItems.length === 0 ? (
                  <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-400">
                    No items are available in this category.
                  </div>
                ) : null}
              </div>

              <div className={panelClass}>
                <p className="font-semibold text-slate-100">Selected items: {selectedItems.length}</p>
                <p className="mt-1">Total Rs. {total.toFixed(2)}</p>
              </div>
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-50">{stepLabels[currentStep]}</h2>
                <p className="mt-2 text-sm text-slate-400">{stepNotes[currentStep]}</p>
              </div>

              <div className={panelClass}>
                <p><span className="font-semibold text-slate-100">Customer:</span> {customerName || '-'}</p>
                <p className="mt-2"><span className="font-semibold text-slate-100">Phone:</span> {customerPhone || '-'}</p>
                <p className="mt-2"><span className="font-semibold text-slate-100">Table:</span> {tableCode || '-'}</p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-800/85 p-4 shadow-lg shadow-black/10">
                <p className="text-sm font-semibold text-slate-100">Order summary</p>
                <div className="mt-3 space-y-3 overflow-y-auto">
                  {selectedItems.map((item) => (
                    <div key={item._id} className="flex items-center justify-between text-sm text-slate-300">
                      <span>{item.name} x {item.quantity}</span>
                      <span>Rs. {(item.quantity * item.price).toFixed(2)}</span>
                    </div>
                  ))}
                  {selectedItems.length === 0 ? (
                    <p className="text-sm text-slate-400">No items selected yet.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-200 shadow-lg shadow-amber-950/10">
                Total amount: Rs. {total.toFixed(2)}
              </div>
            </div>
          ) : null}

          {currentStep === 5 ? (
            latestOrder ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-50">{stepLabels[currentStep]}</h2>
                  <p className="mt-2 text-sm text-slate-400">{stepNotes[currentStep]}</p>
                </div>

                {latestOrder.paymentStatus === 'paid' ? (
                  <div className="rounded-[24px] border border-slate-700 bg-slate-800/85 p-5 shadow-lg shadow-black/10">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Live Service Status</p>
                        <p className="mt-2 text-2xl font-bold text-slate-50">Payment Confirmed</p>
                        <p className="mt-1 text-sm text-slate-400">Track every update for this order from this notification card.</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-200">
                        <ServiceStatusIcon kind="payment" />
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
                      <p><span className="font-semibold text-slate-100">Invoice:</span> {latestOrder.invoiceNumber ?? latestOrder._id.slice(-6).toUpperCase()}</p>
                      <p className="mt-2"><span className="font-semibold text-slate-100">Table:</span> {latestOrder.tableCode}</p>
                      <p className="mt-2"><span className="font-semibold text-slate-100">Paid Amount:</span> Rs. {latestOrder.totalAmount.toFixed(2)}</p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {serviceNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`flex items-start gap-3 rounded-2xl border p-4 ${notification.accent}`}
                        >
                          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-current/20 bg-slate-950/25">
                            <ServiceStatusIcon kind={notification.kind} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{notification.title}</p>
                            <p className="mt-1 text-sm opacity-90">{notification.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                      <p className="text-sm font-semibold text-slate-100">Need anything else?</p>
                      <p className="mt-1 text-sm text-slate-400">Share your experience once your order is served.</p>
                      <button
                        type="button"
                        onClick={openFeedbackPage}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                      >
                        <ButtonIcon path="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        Give Feedback
                      </button>
                    </div>
                  </div>
                ) : (
                <div className="grid gap-4 lg:grid-cols-[1.25fr,0.85fr]">
                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-slate-700 bg-[linear-gradient(135deg,rgba(14,165,233,0.14)_0%,rgba(15,23,42,0.96)_48%,rgba(245,158,11,0.12)_100%)] p-5 shadow-lg shadow-black/10">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Secure Checkout</p>
                          <p className="mt-2 text-2xl font-bold text-slate-50">Rs. {latestOrder.totalAmount.toFixed(2)}</p>
                          <p className="mt-1 text-sm text-slate-400">Choose a payment method and confirm your order payment.</p>
                        </div>
                        <div className="rounded-2xl border border-slate-600 bg-slate-900/70 px-4 py-3 text-right">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Invoice</p>
                          <p className="mt-1 text-sm font-semibold text-slate-100">{latestOrder.invoiceNumber ?? latestOrder._id.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Order Status</p>
                          <p className="mt-2 text-sm font-semibold capitalize text-slate-100">{latestOrder.status}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Payment Status</p>
                          <p className="mt-2 text-sm font-semibold capitalize text-slate-100">{latestOrder.paymentStatus}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Table</p>
                          <p className="mt-2 text-sm font-semibold text-slate-100">{latestOrder.tableCode}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">Select payment method</p>
                        <p className="mt-1 text-sm text-slate-400">All methods are verified and mapped to your order invoice.</p>
                      </div>
                      {paymentOptions.map((option) => (
                        <label
                          key={option.id}
                          className={`flex cursor-pointer items-start gap-4 rounded-2xl border px-4 py-4 transition ${
                            selectedPaymentMethod === option.id
                              ? 'border-sky-500 bg-sky-950/40 shadow-lg shadow-sky-950/20'
                              : 'border-slate-700 bg-slate-800 hover:bg-slate-700/80'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment-method"
                            value={option.id}
                            checked={selectedPaymentMethod === option.id}
                            onChange={() => setSelectedPaymentMethod(option.id)}
                            className="mt-1 h-4 w-4"
                          />
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-600 bg-slate-900/70 text-slate-100">
                            <PaymentMethodIcon method={option.id} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-slate-100">{option.label}</span>
                              {selectedPaymentMethod === option.id ? (
                                <span className="rounded-full bg-sky-400/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                                  Selected
                                </span>
                              ) : null}
                            </div>
                            <span className="mt-1 block text-sm text-slate-400">{option.note}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <aside className="space-y-4">
                    <div className="rounded-[24px] border border-amber-500/30 bg-amber-950/25 p-5 shadow-lg shadow-amber-950/10">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Payment Summary</p>
                      <div className="mt-4 space-y-3 text-sm text-slate-300">
                        <div className="flex items-center justify-between gap-3">
                          <span>Selected Method</span>
                          <span className="font-semibold text-slate-100">{paymentOptions.find((option) => option.id === selectedPaymentMethod)?.label ?? selectedPaymentMethod}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Items</span>
                          <span className="font-semibold text-slate-100">{latestOrder.items.length}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Customer</span>
                          <span className="font-semibold text-slate-100">{latestOrder.customerName}</span>
                        </div>
                      </div>
                      <div className="mt-4 rounded-2xl border border-amber-500/20 bg-slate-950/40 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Payable Now</p>
                        <p className="mt-1 text-2xl font-bold text-slate-50">Rs. {latestOrder.totalAmount.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-700 bg-slate-800/85 p-5 shadow-lg shadow-black/10">
                      <p className="text-sm font-semibold text-slate-100">Checkout Note</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Your payment confirmation will be attached to this invoice and immediately reflected in the admin billing view.
                      </p>
                    </div>
                  </aside>
                </div>
                )}

              </div>
            ) : (
              <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-400">
                Place an order before opening payment.
              </div>
            )
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-700 pt-4">
          {currentStep > (isScanMode ? 2 : 1) ? (
            <button
              type="button"
              onClick={() => goToStep((currentStep - 1) as BookStep)}
              className={`${footerButtonClass} border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700`}
            >
              <ButtonIcon path="M19 12H5M11 5l-7 7 7 7" />
              Back
            </button>
          ) : (
            <span />
          )}

          {currentStep === 1 ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={() => void goToNextStep()}
              disabled={isPrimaryDisabled}
              className={`${footerButtonClass} bg-amber-400 text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <ButtonIcon path="M5 12h14M13 5l7 7-7 7" />
              {getPrimaryActionLabel()}
            </button>
          )}
        </div>
          </div>
        </section>

      </div>
    </div>
  )
}

export default CustomerPage
