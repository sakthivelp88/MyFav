import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import PageToastStack from '@components/PageToastStack'
import { createFeedback } from '@utils/api'

type FeedbackLocationState = {
  customerName?: string
  customerPhone?: string
  tableCode?: string
  invoiceNumber?: string
}

function StarIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-6 w-6 ${active ? 'text-amber-500' : 'text-slate-300'}`}
      fill="currentColor"
    >
      <path d="M12 2.75l2.85 5.77 6.37.93-4.61 4.49 1.09 6.34L12 17.29l-5.7 2.99 1.09-6.34-4.61-4.49 6.37-.93L12 2.75z" />
    </svg>
  )
}

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

function CustomerFeedbackPage() {
  const location = useLocation()
  const navigationState = (location.state ?? {}) as FeedbackLocationState
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (navigationState.customerName && !name) {
      setName(navigationState.customerName)
    }

    if (navigationState.customerPhone && !phone) {
      setPhone(navigationState.customerPhone)
    }
  }, [name, navigationState.customerName, navigationState.customerPhone, phone])

  const submitFeedback = async () => {
    setError('')
    setSuccess('')

    if (!name.trim() || !phone.trim() || !message.trim() || rating < 1) {
      setError('Please fill your name, phone, rating and feedback message')
      return
    }

    try {
      await createFeedback({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        message: `${navigationState.tableCode ? `Table: ${navigationState.tableCode} | ` : ''}${navigationState.invoiceNumber ? `Invoice: ${navigationState.invoiceNumber} | ` : ''}Rating: ${rating}/5 | ${message.trim()}`,
      })
      setSuccess('Thanks for your feedback. Our team will review it shortly.')
      setName('')
      setPhone('')
      setRating(0)
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit feedback')
    }
  }

  return (
    <section className="relative mx-auto w-full max-w-3xl rounded-[28px] border border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
      <PageToastStack
        notifications={[
          ...(error ? [{ id: 'error', message: error, variant: 'error' as const }] : []),
          ...(success ? [{ id: 'success', message: success, variant: 'success' as const }] : []),
        ]}
      />
      <h2 className="text-2xl font-bold text-slate-50">Customer Feedback</h2>
      <p className="mt-1 text-sm text-slate-400">Share your experience with MyFav ordering.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your Name"
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-amber-400/40 placeholder:text-slate-500 focus:ring"
        />
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Phone Number"
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-amber-400/40 placeholder:text-slate-500 focus:ring"
        />
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-slate-200">Rate your experience</p>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className="rounded-md p-1 hover:bg-amber-500/10"
              aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
            >
              <StarIcon active={value <= rating} />
            </button>
          ))}
          <span className="ml-2 text-xs text-slate-400">{rating > 0 ? `${rating}/5` : 'Select rating'}</span>
        </div>
      </div>

      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Tell us what went well or what can be improved"
        rows={5}
        className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-amber-400/40 placeholder:text-slate-500 focus:ring"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void submitFeedback()}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300"
        >
          <ButtonIcon path="M22 2L11 13" />
          <ButtonIcon path="M22 2L15 22L11 13L2 9L22 2Z" />
          Submit Feedback
        </button>
        <Link
          to="/user"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
        >
          <ButtonIcon path="M19 12H5M11 5L4 12L11 19" />
          Back
        </Link>
      </div>
    </section>
  )
}

export default CustomerFeedbackPage
