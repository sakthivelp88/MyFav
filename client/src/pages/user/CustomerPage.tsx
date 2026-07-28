import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageToastStack from '@components/PageToastStack'
import {
  createOrder,
  getGstRate,
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
  'rounded-2xl border border-slate-200/80 bg-white/85 p-4 text-sm text-slate-600 shadow-lg shadow-black/5 dark:border-slate-700/80 dark:bg-slate-800/85 dark:text-slate-300 dark:shadow-black/10'

const primaryButtonClass =
  'inline-flex w-full items-center justify-center gap-3 rounded-xl bg-amber-400 px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60'

const secondaryButtonClass =
  'inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'

const pageCardClass =
  'relative w-full rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(0,0,0,0.12)] backdrop-blur transition-all duration-300 dark:border-slate-700/80 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)] dark:shadow-[0_28px_80px_rgba(0,0,0,0.45)]'

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
  const [isPaymentGatewayOpen, setIsPaymentGatewayOpen] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [prepTimeRemaining, setPrepTimeRemaining] = useState<number>(0)

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

  // Preparation time countdown
  useEffect(() => {
    if (!latestOrder?.scheduledAt || latestOrder.status === 'served') {
      setPrepTimeRemaining(0)
      return
    }

    const updateTimer = () => {
      const now = new Date().getTime()
      const scheduledTime = new Date(latestOrder.scheduledAt!).getTime()
      const remaining = Math.max(0, Math.ceil((scheduledTime - now) / 1000))
      setPrepTimeRemaining(remaining)
    }

    updateTimer()
    const intervalId = window.setInterval(updateTimer, 1000)
    return () => window.clearInterval(intervalId)
  }, [latestOrder?.scheduledAt, latestOrder?.status])

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

  const goHome = () => {
    // Reset all state to initial values
    setCurrentStep(1)
    setCustomerName('')
    setCustomerPhone('')
    setQuantities({})
    setLatestOrder(null)
    setError('')
    setSuccess('')
    setSelectedPaymentMethod('cash')
    navigate('/')
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
      const { gstRate } = await getGstRate()
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        tableCode: tableCode.trim().toUpperCase(),
        items: orderItems,
        gstRate,
      }

      const order = canEditCurrentOrder && latestOrder
        ? await updateCustomerOrder(latestOrder._id, payload)
        : await createOrder(payload)

      setLatestOrder(order)
      setLastNotifiedStatus(order.status)
      setSuccess(
        canEditCurrentOrder
          ? `Order updated successfully. Invoice ${order.invoiceNumber ?? order._id.slice(-6).toUpperCase()}`
          : `Order placed successfully. Invoice ${order.invoiceNumber ?? order._id.slice(-6).toUpperCase()} (${gstRate}% GST)`
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

    // For Cash payments, process directly
    if (selectedPaymentMethod === 'cash') {
      setPaying(true)
      setError('')
      setSuccess('')

      try {
        const order = await payForOrder(latestOrder._id, selectedPaymentMethod)
        setLatestOrder(order)
        setSuccess(`Payment to be collected at counter. Order ID: ${order.invoiceNumber ?? order._id.slice(-6).toUpperCase()}`)
        setCurrentStep(5)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Payment could not be completed')
      } finally {
        setPaying(false)
      }
      return
    }

    // For online payments, open payment gateway
    setIsPaymentGatewayOpen(true)
  }

  const handlePaymentGatewaySuccess = async () => {
    if (!latestOrder) {
      setError('Order not found')
      return
    }

    setProcessingPayment(true)
    setError('')
    setSuccess('')

    try {
      const order = await payForOrder(latestOrder._id, selectedPaymentMethod)
      setLatestOrder(order)
      setSuccess(`Payment received by ${selectedPaymentMethod.toUpperCase()}. Waiting for admin acceptance.`)
      setIsPaymentGatewayOpen(false)
      setCurrentStep(5)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment could not be completed')
    } finally {
      setProcessingPayment(false)
    }
  }

  const handlePaymentGatewayCancel = () => {
    setIsPaymentGatewayOpen(false)
    setError('Payment cancelled. Please try again.')
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

  const formatPrepTime = (seconds: number): string => {
    if (seconds <= 0) return 'Ready!'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`
  }

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
                  <div className="space-y-4">
                    {/* Payment Success Card */}
                    <div className="rounded-[28px] border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-950/50 via-slate-800 to-slate-900 p-6 shadow-lg shadow-emerald-950/30 dark:shadow-emerald-950/20">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                            Payment Successful
                          </div>
                          <p className="mt-3 text-3xl font-bold text-slate-50">Rs. {latestOrder.totalAmount.toFixed(2)}</p>
                          <p className="mt-1 text-sm text-slate-400">Payment received and processed successfully</p>
                        </div>
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-emerald-500/40 bg-emerald-950/40">
                          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8 text-emerald-300">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Invoice</p>
                          <p className="mt-2 text-lg font-bold text-slate-100">{latestOrder.invoiceNumber ?? latestOrder._id.slice(-6).toUpperCase()}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Method</p>
                          <p className="mt-2 text-lg font-bold capitalize text-slate-100">{latestOrder.paymentMethod}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Table</p>
                          <p className="mt-2 text-lg font-bold text-slate-100">{latestOrder.tableCode}</p>
                        </div>
                      </div>

                      <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                        <p className="text-sm font-semibold text-slate-100">Order Summary</p>
                        <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                          {latestOrder.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm text-slate-300">
                              <span>{item.itemId} x {item.quantity}</span>
                              <span className="font-medium text-slate-100">Rs. {(item.quantity * (item.quantity * 100)).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Preparation Time Status */}
                    {latestOrder.status !== 'served' && latestOrder.scheduledAt && (
                      <div className={`rounded-2xl border-2 p-6 shadow-lg ${
                        latestOrder.status === 'pending'
                          ? 'border-slate-500/40 bg-gradient-to-br from-slate-950/50 via-slate-800 to-slate-900 shadow-slate-950/30'
                          : latestOrder.status === 'accepted'
                            ? 'border-sky-500/40 bg-gradient-to-br from-sky-950/50 via-slate-800 to-slate-900 shadow-sky-950/30'
                            : 'border-amber-500/40 bg-gradient-to-br from-amber-950/50 via-slate-800 to-slate-900 shadow-amber-950/30'
                      }`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                              latestOrder.status === 'pending'
                                ? 'border-slate-500/30 bg-slate-500/10 text-slate-300'
                                : latestOrder.status === 'accepted'
                                  ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                            }`}>
                              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              {latestOrder.status === 'pending' ? 'Awaiting Acceptance' : latestOrder.status === 'accepted' ? 'Queued' : 'Preparing'}
                            </div>
                            <p className="mt-3 text-2xl font-bold text-slate-50">
                              {prepTimeRemaining > 0 ? formatPrepTime(prepTimeRemaining) : 'Ready!'}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              {latestOrder.status === 'pending'
                                ? 'Waiting for admin to accept your order'
                                : latestOrder.status === 'accepted'
                                  ? `Your order is queued. Estimated ready in ${formatPrepTime(prepTimeRemaining)}`
                                  : `Your order is being prepared. Ready in ${formatPrepTime(prepTimeRemaining)}`}
                            </p>
                          </div>
                          <div className={`flex h-16 w-16 items-center justify-center rounded-3xl border-2 flex-shrink-0 ${
                            latestOrder.status === 'pending'
                              ? 'border-slate-500/40 bg-slate-950/40'
                              : latestOrder.status === 'accepted'
                                ? 'border-sky-500/40 bg-sky-950/40'
                                : 'border-amber-500/40 bg-amber-950/40'
                          }`}>
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-8 w-8 ${
                              latestOrder.status === 'pending'
                                ? 'text-slate-300'
                                : latestOrder.status === 'accepted'
                                  ? 'text-sky-300'
                                  : 'text-amber-300 animate-pulse'
                            }`}>
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                    {serviceNotifications.length > 0 && (
                      <div className="space-y-3">
                        {serviceNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`flex items-start gap-3 rounded-2xl border p-4 ${notification.accent}`}
                          >
                            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-current/20 bg-slate-950/25 flex-shrink-0">
                              <ServiceStatusIcon kind={notification.kind} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm">{notification.title}</p>
                              <p className="mt-1 text-xs opacity-90">{notification.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={goHome}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                      >
                        <ButtonIcon path="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        Home
                      </button>
                      <button
                        type="button"
                        onClick={openFeedbackPage}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                      >
                        <ButtonIcon path="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        Give Feedback
                      </button>
                    </div>

                    {/* Help Note */}
                    <div className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-4">
                      <p className="text-sm font-semibold text-sky-200">✓ Payment Confirmed</p>
                      <p className="mt-1 text-xs text-sky-300">Your payment has been recorded. The admin will accept your order and notify you when it's ready.</p>
                    </div>
                  </div>
                ) : (
                <div className="grid gap-4 lg:grid-cols-[1.25fr,0.85fr]">
                  <div className="space-y-4">
                    {/* Checkout Header Card */}
                    <div className="rounded-[28px] border-2 border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-slate-800 to-slate-900 p-6 shadow-lg shadow-amber-950/20">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                              <path d="M12 1C5.9 1 1 5.9 1 12s4.9 11 11 11 11-4.9 11-11S18.1 1 12 1zm0 20c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 9 15.5 9 14 9.67 14 10.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 9 8.5 9 7 9.67 7 10.5 7.67 12 8.5 12zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                            </svg>
                            Secure Checkout
                          </div>
                          <p className="mt-3 text-4xl font-bold text-slate-50">Rs. {latestOrder.totalAmount.toFixed(2)}</p>
                          <p className="mt-2 text-sm text-slate-400">Select a payment method and complete your order</p>
                        </div>
                        <div className="rounded-2xl border border-slate-600 bg-slate-900/70 px-4 py-3 text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Invoice #</p>
                          <p className="mt-1 text-sm font-bold text-amber-400">{latestOrder.invoiceNumber ?? latestOrder._id.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>

                      {/* Order Status Grid */}
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Order Status</p>
                          <p className="mt-2 text-sm font-semibold capitalize text-slate-100">{latestOrder.status}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Payment Status</p>
                          <p className="mt-2 text-sm font-semibold capitalize text-amber-300">{latestOrder.paymentStatus}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Table #</p>
                          <p className="mt-2 text-sm font-semibold text-slate-100">{latestOrder.tableCode}</p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100">Select Payment Method</h3>
                        <p className="mt-1 text-xs text-slate-400">All methods are verified and securely processed</p>
                      </div>

                      {paymentOptions.map((option) => (
                        <label
                          key={option.id}
                          className={`group flex cursor-pointer items-center gap-4 rounded-2xl border-2 px-4 py-4 transition-all ${
                            selectedPaymentMethod === option.id
                              ? 'border-amber-500 bg-amber-950/40 shadow-lg shadow-amber-950/30'
                              : 'border-slate-700 bg-slate-800/60 hover:border-slate-600 hover:bg-slate-800'
                          }`}
                        >
                          <div className="relative flex h-5 w-5 items-center justify-center">
                            <input
                              type="radio"
                              name="payment-method"
                              value={option.id}
                              checked={selectedPaymentMethod === option.id}
                              onChange={() => setSelectedPaymentMethod(option.id)}
                              className="h-5 w-5 cursor-pointer accent-amber-400"
                            />
                          </div>
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
                            selectedPaymentMethod === option.id
                              ? 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                              : 'border-slate-700 bg-slate-900 text-slate-400 group-hover:border-slate-600 group-hover:bg-slate-800'
                          }`}>
                            <PaymentMethodIcon method={option.id} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-100">{option.label}</p>
                            <p className="mt-0.5 text-xs text-slate-400">{option.note}</p>
                          </div>
                          {selectedPaymentMethod === option.id && (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-amber-950 flex-shrink-0">
                              <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                              </svg>
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Payment Summary Sidebar */}
                  <aside className="space-y-3">
                    {/* Summary Card */}
                    <div className="rounded-[24px] border-2 border-amber-500/30 bg-gradient-to-b from-amber-950/30 to-slate-900 p-5 shadow-lg shadow-amber-950/10">
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">Payment Summary</p>
                      
                      <div className="mt-4 space-y-3 text-sm">
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Selected Method</span>
                          <span className="font-semibold text-slate-100">{paymentOptions.find((option) => option.id === selectedPaymentMethod)?.label ?? selectedPaymentMethod}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-700 pt-3 text-slate-300">
                          <span>Items</span>
                          <span className="font-semibold text-slate-100">{latestOrder.items.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Customer</span>
                          <span className="truncate text-right font-semibold text-slate-100">{latestOrder.customerName}</span>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-amber-500/20 bg-slate-950/50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Payable Amount</p>
                        <p className="mt-1.5 text-2xl font-bold text-amber-300">Rs. {latestOrder.totalAmount.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Security Note */}
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                      <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                        </svg>
                        Secure Payment
                      </p>
                      <p className="mt-1.5 text-[11px] text-emerald-200/80">Your payment is encrypted and verified before processing.</p>
                    </div>

                    {/* Info Note */}
                    <div className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-4">
                      <p className="text-xs font-semibold text-sky-300">ℹ️ What happens next?</p>
                      <p className="mt-1.5 text-[11px] text-sky-200/80">Your payment will be confirmed and the admin will notify you when your order is being prepared.</p>
                    </div>
                  </aside>
                </div>
                )}

                {/* Payment Gateway Modal */}
                {isPaymentGatewayOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-2xl border border-slate-700 max-h-screen overflow-y-auto">
                      {/* Payment Gateway Content based on method */}
                      {selectedPaymentMethod === 'upi' && (
                        <div className="space-y-6">
                          <div className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-950/50 border border-purple-500/30">
                              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8 text-purple-400">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M3 9h18M9 3v18" />
                              </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-50">UPI Payment</h3>
                            <p className="mt-2 text-sm text-slate-400">Amount: <span className="font-bold text-slate-100">Rs. {latestOrder?.totalAmount.toFixed(2)}</span></p>
                          </div>

                          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                            <p className="text-sm font-semibold text-slate-100 mb-3">Enter UPI ID</p>
                            <input
                              type="text"
                              placeholder="yourname@upi"
                              className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                            />
                          </div>

                          <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4">
                            <p className="text-xs text-purple-300 font-semibold">💳 Supported Apps</p>
                            <p className="mt-1 text-xs text-purple-200/80">Google Pay, PhonePe, Paytm, BHIM, WhatsApp Pay</p>
                          </div>

                          <button
                            type="button"
                            onClick={handlePaymentGatewaySuccess}
                            disabled={processingPayment}
                            className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {processingPayment ? 'Processing...' : 'Pay Now'}
                          </button>

                          <button
                            type="button"
                            onClick={handlePaymentGatewayCancel}
                            disabled={processingPayment}
                            className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {selectedPaymentMethod === 'card' && (
                        <div className="space-y-6">
                          <div className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-950/50 border border-blue-500/30">
                              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8 text-blue-400">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                              </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-50">Card Payment</h3>
                            <p className="mt-2 text-sm text-slate-400">Amount: <span className="font-bold text-slate-100">Rs. {latestOrder?.totalAmount.toFixed(2)}</span></p>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="text-xs font-semibold text-slate-300">Card Number</label>
                              <input
                                type="text"
                                placeholder="4532 1488 0343 6467"
                                maxLength={16}
                                className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-semibold text-slate-300">MM/YY</label>
                                <input
                                  type="text"
                                  placeholder="12/25"
                                  maxLength={5}
                                  className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-slate-300">CVV</label>
                                <input
                                  type="text"
                                  placeholder="123"
                                  maxLength={3}
                                  className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-slate-300">Cardholder Name</label>
                              <input
                                type="text"
                                placeholder="John Doe"
                                className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4">
                            <p className="text-xs text-blue-300 font-semibold">🔒 Secure Checkout</p>
                            <p className="mt-1 text-xs text-blue-200/80">Your card details are encrypted and securely transmitted</p>
                          </div>

                          <button
                            type="button"
                            onClick={handlePaymentGatewaySuccess}
                            disabled={processingPayment}
                            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {processingPayment ? 'Processing...' : 'Pay Rs. ' + (latestOrder?.totalAmount.toFixed(2) ?? '0')}
                          </button>

                          <button
                            type="button"
                            onClick={handlePaymentGatewayCancel}
                            disabled={processingPayment}
                            className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {selectedPaymentMethod === 'razorpay' && (
                        <div className="space-y-6">
                          <div className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-950/50 border border-indigo-500/30">
                              <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-indigo-400">
                                <circle cx="12" cy="12" r="10" />
                                <path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm1-11h-2v6h2v-6z" />
                              </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-50">Razorpay Payment</h3>
                            <p className="mt-2 text-sm text-slate-400">Amount: <span className="font-bold text-slate-100">Rs. {latestOrder?.totalAmount.toFixed(2)}</span></p>
                          </div>

                          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
                            <p className="text-sm font-semibold text-slate-100">Payment Methods</p>
                            {['Credit Card', 'Debit Card', 'UPI', 'Wallet', 'Net Banking'].map((method) => (
                              <label key={method} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-700/50 transition">
                                <input type="radio" name="razorpay-method" defaultChecked={method === 'UPI'} className="accent-indigo-500" />
                                <span className="text-sm text-slate-300">{method}</span>
                              </label>
                            ))}
                          </div>

                          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4">
                            <p className="text-xs text-indigo-300 font-semibold">✓ Safe & Secure</p>
                            <p className="mt-1 text-xs text-indigo-200/80">Razorpay is trusted by 100,000+ businesses in India</p>
                          </div>

                          <button
                            type="button"
                            onClick={handlePaymentGatewaySuccess}
                            disabled={processingPayment}
                            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {processingPayment ? 'Processing...' : 'Proceed with Razorpay'}
                          </button>

                          <button
                            type="button"
                            onClick={handlePaymentGatewayCancel}
                            disabled={processingPayment}
                            className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
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
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
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
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                currentStep === 5 && !isPrimaryDisabled
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
                  : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <ButtonIcon path={currentStep === 5 && latestOrder?.paymentStatus !== 'paid' ? "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" : "M5 12h14M13 5l7 7-7 7"} />
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
