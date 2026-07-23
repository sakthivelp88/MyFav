import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

const menuLinkClass =
  'block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-900'

function CustomerLayout() {
  const location = useLocation()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const isScanMode = location.pathname.startsWith('/scan/')

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_5%_0%,#fde6bf,transparent_40%),linear-gradient(180deg,#fff9f0_0%,#f8fbff_100%)] px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 rounded-2xl border border-amber-200 bg-white/90 p-5 shadow-lg shadow-amber-100/40 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">MyFav</h1>
              <p className="mt-1 text-sm text-slate-600">
                {isScanMode
                  ? 'Scan mode: customer ordering only'
                  : 'Customer ordering portal'}
              </p>
            </div>

            {!isScanMode ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((value) => !value)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  aria-label="Open customer menu"
                >
                  <span aria-hidden="true">&#9776;</span>
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 top-12 z-40 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <Link to="/user" className={menuLinkClass}>
                      Customer Order Page
                    </Link>
                    <Link to="/feedback" className={menuLinkClass}>
                      Customer Feedback
                    </Link>
                    <Link to="/admin/login" className={menuLinkClass}>
                      Admin Login
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  )
}

export default CustomerLayout
