import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageToastStack from '@components/PageToastStack'
import { adminLogin } from '@utils/api'

function AdminLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void submitLogin()
  }

  const submitLogin = async () => {
    setLoading(true)
    setError('')

    try {
      await adminLogin({ username, password })
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative mx-auto mt-8 w-full max-w-md rounded-[28px] border border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.38)] backdrop-blur">
      <PageToastStack
        notifications={[
          ...(error ? [{ id: 'error', message: error, variant: 'error' as const }] : []),
        ]}
      />
      <h2 className="text-2xl font-bold text-slate-50">Admin Sign In</h2>
      <p className="mt-2 text-sm text-slate-400">Login required to access menu and order controls.</p>

      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Admin Username"
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-amber-400/40 placeholder:text-slate-500 focus:ring"
        />
        <div className="flex gap-2">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Admin Password"
            type={showPassword ? 'text' : 'password'}
            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-amber-400/40 placeholder:text-slate-500 focus:ring"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm text-slate-200 hover:bg-slate-700"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-400">
        Continue as customer?{' '}
        <Link to="/user" className="font-semibold text-amber-700 hover:text-amber-800">
          Open customer page
        </Link>
      </p>
    </section>
  )
}

export default AdminLoginPage
