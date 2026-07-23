import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

const menuLinkClass =
  'block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-900'

function AdminLayout() {
  const location = useLocation()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (!menuRef.current) {
        return
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', closeOnOutside)
    return () => window.removeEventListener('mousedown', closeOnOutside)
  }, [])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_95%_0%,#dbeafe,transparent_45%),linear-gradient(180deg,#f8fbff_0%,#f1f5f9_100%)] px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 rounded-2xl border border-sky-200 bg-white/95 p-5 shadow-lg shadow-sky-100/60 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">MyFav Admin</h1>
              <p className="mt-1 text-sm text-slate-600">Admin-only control and billing workspace</p>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                aria-label="Open admin menu"
              >
                <span aria-hidden="true">&#9776;</span>
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-12 z-40 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <Link to="/admin/dashboard" className={menuLinkClass}>
                    Admin Dashboard
                  </Link>
                  <Link to="/admin/audit" className={menuLinkClass}>
                    Audit Log
                  </Link>
                  <Link to="/admin/customers" className={menuLinkClass}>
                    Customers and Bills
                  </Link>
                  <Link to="/user" className={menuLinkClass}>
                    Open Customer Page
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  )
}

export default AdminLayout
