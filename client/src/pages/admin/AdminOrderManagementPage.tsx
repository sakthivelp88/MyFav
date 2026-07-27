import { useEffect, useState, useCallback } from 'react'
import PageToastStack from '@components/PageToastStack'
import {
  getPendingOrders,
  setPreparationTime,
  autoTransitionOrderStatus,
  updateOrderStatus,
} from '@utils/api'
import type { Order } from '../../types'

type PageToast = {
  id: string
  message: string
  variant: 'info' | 'success' | 'error'
}

function AdminOrderManagementPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<PageToast[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [manualPrepTimeInput, setManualPrepTimeInput] = useState<{
    [key: string]: string
  }>({})
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)
  const [timers, setTimers] = useState<{ [key: string]: number }>({})

  const addToast = (message: string, variant: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, variant }])
  }

  // Load pending orders
  const loadOrders = useCallback(async () => {
    setLoading(true)

    try {
      const fetchedOrders = await getPendingOrders()
      setOrders(fetchedOrders)

      // Initialize timers for orders with scheduled times
      const newTimers: { [key: string]: number } = {}
      fetchedOrders.forEach((order) => {
        if (order.scheduledAt) {
          const diff = new Date(order.scheduledAt).getTime() - Date.now()
          newTimers[order._id] = Math.max(0, Math.ceil(diff / 1000))
        }
      })
      setTimers(newTimers)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load orders', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [loadOrders])

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prevTimers) => {
        const newTimers = { ...prevTimers }
        Object.keys(newTimers).forEach((orderId) => {
          newTimers[orderId] = Math.max(0, newTimers[orderId] - 1)

          // Auto-transition when timer reaches 0
          const order = orders.find((o) => o._id === orderId)
          if (order && newTimers[orderId] === 0 && order.status === 'accepted') {
            handleAutoTransition(orderId, 'preparing')
          }
        })
        return newTimers
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [orders])

  const handleSetPrepTime = async (orderId: string, mode: 'manual' | 'auto') => {
    setProcessingOrderId(orderId)

    try {
      const payload: { mode: 'manual' | 'auto'; preparationTimeMinutes?: number } = { mode }

      if (mode === 'manual') {
        const minutes = parseInt(manualPrepTimeInput[orderId] || '0', 10)
        if (!minutes || minutes < 1) {
          addToast('Please enter a valid preparation time (minimum 1 minute)', 'error')
          setProcessingOrderId(null)
          return
        }
        payload.preparationTimeMinutes = minutes
      }

      const updatedOrder = await setPreparationTime(orderId, payload)
      setOrders(orders.map((o) => (o._id === orderId ? updatedOrder : o)))
      addToast(
        `Preparation time set to ${updatedOrder.preparationTimeMinutes} minutes (${mode})`,
        'success'
      )
      setExpandedOrderId(null)
      setManualPrepTimeInput({})

      // Initialize timer
      if (updatedOrder.scheduledAt) {
        const diff = new Date(updatedOrder.scheduledAt).getTime() - Date.now()
        setTimers((prev) => ({
          ...prev,
          [orderId]: Math.max(0, Math.ceil(diff / 1000)),
        }))
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to set preparation time', 'error')
    } finally {
      setProcessingOrderId(null)
    }
  }

  const handleAutoTransition = async (orderId: string, targetStatus: 'preparing' | 'ready') => {
    try {
      const updatedOrder = await autoTransitionOrderStatus(orderId, targetStatus)
      setOrders(orders.map((o) => (o._id === orderId ? updatedOrder : o)))
    } catch (err) {
      console.error('Failed to auto-transition order:', err)
    }
  }

  const handleManualStatusChange = async (orderId: string, newStatus: string) => {
    setProcessingOrderId(orderId)

    try {
      const updatedOrder = await updateOrderStatus(orderId, newStatus as any)
      setOrders(orders.map((o) => (o._id === orderId ? updatedOrder : o)))
      addToast(`Order status updated to ${newStatus}`, 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update order status', 'error')
    } finally {
      setProcessingOrderId(null)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleTimeString()
  }

  const getTotalQuantity = (order: Order): number => {
    return order.items.reduce((sum, item) => sum + item.quantity, 0)
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800'
      case 'accepted':
        return 'bg-blue-100 text-blue-800'
      case 'preparing':
        return 'bg-purple-100 text-purple-800'
      case 'served':
        return 'bg-emerald-100 text-emerald-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const paginatedOrders = orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="space-y-6">
      <PageToastStack notifications={toasts} />

      <div className="rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-900 p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-white">Order Management</h2>
        <p className="mt-2 text-amber-100">Manage order preparation times and statuses</p>
      </div>

      {loading && !orders.length ? (
        <div className="rounded-2xl bg-slate-900 p-8 text-center">
          <p className="text-slate-400">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 p-8 text-center">
          <p className="text-slate-400">No pending or active orders</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedOrders.map((order) => (
              <div
                key={order._id}
                className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-lg"
              >
                {/* Header Row */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold text-white">{order.invoiceNumber}</h3>
                        <p className="text-sm text-slate-400">
                          {order.customerName} • Table {order.tableCode}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status.toUpperCase()}
                    </span>

                    <button
                      onClick={() =>
                        setExpandedOrderId(expandedOrderId === order._id ? null : order._id)
                      }
                      className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
                    >
                      {expandedOrderId === order._id ? '−' : '+'}
                    </button>
                  </div>
                </div>

                {/* Details - Shown when expanded */}
                {expandedOrderId === order._id && (
                  <div className="mt-6 space-y-4 border-t border-slate-700 pt-6">
                    {/* Order Items */}
                    <div>
                      <h4 className="mb-2 font-semibold text-white">Items</h4>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between rounded-lg bg-slate-800 px-3 py-2 text-sm"
                          >
                            <span className="text-slate-300">
                              {item.name} × {item.quantity}
                            </span>
                            <span className="text-amber-400">Rs. {item.lineTotal.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex justify-between rounded-lg bg-slate-700 px-3 py-2 font-semibold">
                        <span className="text-white">Total Amount</span>
                        <span className="text-emerald-400">Rs. {order.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Preparation Time Section */}
                    {order.status === 'pending' ? (
                      <div className="space-y-3 rounded-lg bg-slate-800 p-4">
                        <h4 className="font-semibold text-white">Set Preparation Time</h4>
                        <p className="text-sm text-slate-400">
                          Total items: {getTotalQuantity(order)} • Auto calc: ~
                          {5 + (getTotalQuantity(order) - 1) * 2} min
                        </p>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {/* Auto Button */}
                          <button
                            onClick={() => handleSetPrepTime(order._id, 'auto')}
                            disabled={processingOrderId === order._id}
                            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {processingOrderId === order._id ? 'Processing...' : 'Auto Calculate'}
                          </button>

                          {/* Manual Input + Button */}
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="1"
                              max="120"
                              placeholder="Minutes"
                              value={manualPrepTimeInput[order._id] || ''}
                              onChange={(e) =>
                                setManualPrepTimeInput({
                                  ...manualPrepTimeInput,
                                  [order._id]: e.target.value,
                                })
                              }
                              className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                            />
                            <button
                              onClick={() => handleSetPrepTime(order._id, 'manual')}
                              disabled={processingOrderId === order._id}
                              className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                            >
                              {processingOrderId === order._id ? '...' : 'Set'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 rounded-lg bg-slate-800 p-4">
                        <h4 className="font-semibold text-white">Preparation Details</h4>
                        <div className="grid gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Prep Time</span>
                            <span className="text-white">
                              {order.preparationTimeMinutes} minute
                              {order.preparationTimeMinutes !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Scheduled At</span>
                            <span className="text-white">{formatDate(order.scheduledAt)}</span>
                          </div>
                          {order.acceptedAt && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Accepted At</span>
                              <span className="text-white">{formatDate(order.acceptedAt)}</span>
                            </div>
                          )}
                          {order.preparingAt && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Preparing At</span>
                              <span className="text-white">{formatDate(order.preparingAt)}</span>
                            </div>
                          )}

                          {/* Timer */}
                          {order.status === 'accepted' && timers[order._id] !== undefined && (
                            <div className="mt-3 flex justify-between rounded-lg bg-purple-900/30 px-3 py-2">
                              <span className="text-slate-300">Time Remaining</span>
                              <span
                                className={
                                  timers[order._id] <= 60 ? 'font-bold text-red-400' : 'text-white'
                                }
                              >
                                {formatTime(timers[order._id])}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status Management */}
                    {order.status !== 'served' && order.status !== 'cancelled' && (
                      <div className="space-y-3 rounded-lg bg-slate-800 p-4">
                        <h4 className="font-semibold text-white">Status Management</h4>
                        {order.status === 'preparing' ? (
                          <button
                            onClick={() => handleManualStatusChange(order._id, 'served')}
                            disabled={processingOrderId === order._id}
                            className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {processingOrderId === order._id ? 'Processing...' : '✓ Mark as Served'}
                          </button>
                        ) : null}

                        <button
                          onClick={() => handleManualStatusChange(order._id, 'cancelled')}
                          disabled={processingOrderId === order._id}
                          className="w-full rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Cancel Order
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {Math.ceil(orders.length / itemsPerPage) > 1 && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-100/60 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, orders.length)} of {orders.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Page {currentPage}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(Math.ceil(orders.length / itemsPerPage), currentPage + 1))}
                  disabled={currentPage >= Math.ceil(orders.length / itemsPerPage)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AdminOrderManagementPage
