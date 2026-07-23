import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
    <section className="mx-auto mt-8 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-100">
      <h2 className="text-2xl font-bold text-slate-900">Admin Sign In</h2>
      <p className="mt-2 text-sm text-slate-500">Login required to access menu and order controls.</p>

      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Admin Username"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring"
        />
        <div className="flex gap-2">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Admin Password"
            type={showPassword ? 'text' : 'password'}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="rounded-xl border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <p className="mt-4 text-center text-sm text-slate-600">
        Continue as customer?{' '}
        <Link to="/user" className="font-semibold text-amber-700 hover:text-amber-800">
          Open customer page
        </Link>
      </p>
    </section>
  )
}

export default AdminLoginPage
