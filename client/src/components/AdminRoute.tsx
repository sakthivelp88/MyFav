import { Navigate } from 'react-router-dom'
import { adminMe } from '@utils/api'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

type AdminRouteProps = {
  children: ReactNode
}

function AdminRoute({ children }: AdminRouteProps) {
  const [checking, setChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const session = await adminMe()
      setIsAuthenticated(session.authenticated)
      setChecking(false)
    }

    void checkAuth().catch(() => {
      setIsAuthenticated(false)
      setChecking(false)
    })
  }, [])

  if (checking) {
    return (
      <section className="mx-auto mt-8 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-xl shadow-slate-100">
        Verifying admin session...
      </section>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}

export default AdminRoute
