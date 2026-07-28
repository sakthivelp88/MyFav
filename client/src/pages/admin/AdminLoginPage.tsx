import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageToastStack from '@components/PageToastStack'
import { adminLogin, forgotAdminPassword } from '@utils/api'

function AdminLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showResetSecret, setShowResetSecret] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetSecret, setResetSecret] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void submitLogin()
  }

  const submitLogin = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await adminLogin({ username, password })
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const submitForgotPassword = async () => {
    setResetLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await forgotAdminPassword({
        username,
        resetSecret,
        newPassword,
        confirmPassword,
      })
      setMessage(response.message)
      setResetSecret('')
      setNewPassword('')
      setConfirmPassword('')
      setShowForgotPassword(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <section className="relative mx-auto mt-8 w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(0,0,0,0.12)] backdrop-blur dark:border-slate-700/80 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)] dark:shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
      <PageToastStack
        notifications={[
          ...(error ? [{ id: 'error', message: error, variant: 'error' as const }] : []),
          ...(message ? [{ id: 'success', message, variant: 'success' as const }] : []),
        ]}
      />
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Admin Sign In</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Login required to access menu and order controls.</p>

      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Admin Username"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-amber-400/40 placeholder:text-slate-400 focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <div className="flex gap-2">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Admin Password"
            type={showPassword ? 'text' : 'password'}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-amber-400/40 placeholder:text-slate-400 focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
        <button
          type="button"
          onClick={() => setShowForgotPassword((value) => !value)}
          className="text-sm font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
        >
          {showForgotPassword ? 'Hide password reset' : 'Forgot password?'}
        </button>

        {showForgotPassword ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enter the username, the recovery secret from the server environment, and a new strong password.
            </p>
            <div className="flex gap-2">
              <input
                value={resetSecret}
                onChange={(event) => setResetSecret(event.target.value)}
                placeholder="Recovery Secret"
                type={showResetSecret ? 'text' : 'password'}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-amber-400/40 placeholder:text-slate-400 focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowResetSecret((value) => !value)}
                className="rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {showResetSecret ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New Password"
                type={showNewPassword ? 'text' : 'password'}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-amber-400/40 placeholder:text-slate-400 focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((value) => !value)}
                className="rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {showNewPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-amber-400/40 placeholder:text-slate-400 focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void submitForgotPassword()}
              disabled={resetLoading}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              {resetLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        Continue as customer?{' '}
        <Link to="/user" className="font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-700 dark:hover:text-amber-800">
          Open customer page
        </Link>
      </p>
    </section>
  )
}

export default AdminLoginPage
