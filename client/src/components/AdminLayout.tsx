import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { adminLogout, listFeedback, listOrders } from '@utils/api'
import { useTheme } from '../context/ThemeContext'
import type { Feedback, Order } from '../types'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
    isActive
      ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/20'
      : 'text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
  }`

function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const notificationRef = useRef<HTMLDivElement | null>(null)
  const previousPendingCountRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [feedbackNotifications, setFeedbackNotifications] = useState<Feedback[]>([])
  const [highlightNotification, setHighlightNotification] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)

  const loadNotifications = async () => {
    try {
      const [orders, feedback] = await Promise.all([listOrders(), listFeedback()])
      setActiveOrders(orders.filter((order) => ['pending', 'accepted', 'preparing'].includes(order.status)))
      setFeedbackNotifications(feedback.filter((entry) => entry.status === 'new'))
    } catch {
      setActiveOrders([])
      setFeedbackNotifications([])
    }
  }

  useEffect(() => {
    void loadNotifications()
    const intervalId = window.setInterval(() => {
      void loadNotifications()
    }, 8000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    setNotificationOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (!notificationRef.current) {
        return
      }

      if (!notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false)
      }
    }

    window.addEventListener('mousedown', closeOnOutside)
    return () => window.removeEventListener('mousedown', closeOnOutside)
  }, [])

  const currentOrderNotifications = useMemo(
    () => activeOrders.filter((order) => order.status === 'pending'),
    [activeOrders]
  )

  const newFeedbackNotifications = useMemo(
    () => feedbackNotifications.filter((entry) => entry.status === 'new'),
    [feedbackNotifications]
  )

  const totalNotificationCount = currentOrderNotifications.length + newFeedbackNotifications.length

  useEffect(() => {
    const enableAudio = () => {
      setAudioEnabled(true)
    }

    window.addEventListener('pointerdown', enableAudio, { once: true })
    window.addEventListener('keydown', enableAudio, { once: true })

    return () => {
      window.removeEventListener('pointerdown', enableAudio)
      window.removeEventListener('keydown', enableAudio)
    }
  }, [])

  const playNotificationTone = () => {
    if (!audioEnabled || typeof window === 'undefined') {
      return
    }

    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

    if (!AudioContextClass) {
      return
    }

    try {
      const audioContext = audioContextRef.current ?? new AudioContextClass()
      audioContextRef.current = audioContext

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.035, audioContext.currentTime + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.28)

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch {
      // Ignore audio API failures and keep visual alert only.
    }
  }

  useEffect(() => {
    const nextCount = totalNotificationCount

    if (previousPendingCountRef.current === 0) {
      previousPendingCountRef.current = nextCount
      return
    }

    if (nextCount > previousPendingCountRef.current) {
      setHighlightNotification(true)
      playNotificationTone()
      const timeoutId = window.setTimeout(() => setHighlightNotification(false), 3000)
      previousPendingCountRef.current = nextCount
      return () => window.clearTimeout(timeoutId)
    }

    previousPendingCountRef.current = nextCount
  }, [totalNotificationCount])

  const logoutAdmin = async () => {
    try {
      await adminLogout()
    } catch {
      // Ignore API logout errors and still move to login page.
    }

    navigate('/admin/login', { replace: true })
  }

  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex h-screen flex-col bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] dark:bg-[radial-gradient(circle_at_95%_0%,rgba(56,189,248,0.16),transparent_35%),radial-gradient(circle_at_5%_0%,rgba(245,158,11,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_55%,#111827_100%)]">
      {/* Fixed Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm dark:border-slate-700/70 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)]" ref={notificationRef}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">MyFav Admin</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Admin-only control room for shop operations.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationOpen((value) => !value)
                  setHighlightNotification(false)
                }}
                className={`relative rounded-2xl border p-3 text-slate-600 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 ${
                  highlightNotification
                    ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_0_4px_rgba(251,191,36,0.18)]'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
                }`}
                aria-label="Open order notifications"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${highlightNotification ? 'animate-pulse text-amber-300' : ''}`}>
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path d="M10 21a2 2 0 0 0 4 0" />
                </svg>
                {totalNotificationCount > 0 ? (
                  <span className={`absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-slate-950 ${highlightNotification ? 'animate-pulse' : ''}`}>
                    {totalNotificationCount}
                  </span>
                ) : null}
              </button>

              {notificationOpen ? (
                <div className="absolute right-0 top-16 z-30 w-96 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900/95">
                  <div className="px-2 pb-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Admin Notifications</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Open active orders or new customer feedback from here.</p>
                  </div>

                  <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                    {currentOrderNotifications.length > 0 ? (
                      <div className="px-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                        Current Orders
                      </div>
                    ) : null}
                    {currentOrderNotifications.map((order) => (
                      <button
                        key={order._id}
                        type="button"
                        onClick={() => {
                          navigate(`/admin/service?orderId=${order._id}`)
                          setNotificationOpen(false)
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                      >
                        <p className="font-semibold text-slate-900 dark:text-slate-100">Table {order.tableCode}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{order.customerName}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-amber-300">Pending Order</p>
                      </button>
                    ))}

                    {newFeedbackNotifications.length > 0 ? (
                      <div className="px-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">
                        New Feedback
                      </div>
                    ) : null}
                    {newFeedbackNotifications.map((entry) => (
                      <button
                        key={entry._id}
                        type="button"
                        onClick={() => {
                          navigate('/admin/feedback')
                          setNotificationOpen(false)
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                      >
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{entry.customerName}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{entry.customerPhone}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{entry.message}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-sky-300">New Feedback</p>
                      </button>
                    ))}

                    {totalNotificationCount === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        No current admin notifications.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => void logoutAdmin()}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              aria-label="Logout admin"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Sidebar */}
        <aside className="flex w-64 flex-col border-r border-slate-200 bg-white/50 dark:border-slate-700/70 dark:bg-slate-900/50">
          {/* Logo Header */}
          <div className="border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-slate-700/70 dark:bg-gradient-to-r dark:from-amber-950/30 dark:to-orange-950/30">
            <div className="flex items-center gap-2">
              {/* Fork and Spoon Icon */}
              <div className="rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 p-2.5 shadow-md">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M3 2v7c0 1.1.9 2 2 2h2v9" />
                  <path d="M17 2v9h2c1.1 0 2-.9 2-2V2" />
                  <path d="M6 9v9M18 9v9" />
                  <path d="M9 20h6" />
                </svg>
              </div>
              {/* MyFav Text Logo */}
              <div className="flex flex-col">
                <p className="text-lg font-black tracking-tight text-amber-600 dark:text-amber-400">MyFav</p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">App</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            <NavLink to="/admin/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/admin/orders" className={navLinkClass}>
              Order Management
            </NavLink>
            <NavLink to="/admin/inventory" className={navLinkClass}>
              Inventory Management
            </NavLink>
            <NavLink to="/admin/items" className={navLinkClass}>
              Item Management
            </NavLink>
            <NavLink to="/admin/payments" className={navLinkClass}>
              Payment Management
            </NavLink>
            <NavLink to="/admin/service" className={navLinkClass}>
              Service Management
            </NavLink>
            <NavLink to="/admin/reports" className={navLinkClass}>
              Reports and Analytics
            </NavLink>
            <NavLink to="/admin/feedback" className={navLinkClass}>
              Feedback Management
            </NavLink>
            <NavLink to="/admin/users" className={navLinkClass}>
              User Management
            </NavLink>
          </nav>
        </aside>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/70 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
