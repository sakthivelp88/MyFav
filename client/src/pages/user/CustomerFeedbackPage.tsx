import { useState } from 'react'

function CustomerFeedbackPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const submitFeedback = () => {
    setError('')
    setSuccess('')

    if (!name.trim() || !phone.trim() || !message.trim()) {
      setError('Please fill your name, phone and feedback message')
      return
    }

    setSuccess('Thanks for your feedback. Our team will review it shortly.')
    setName('')
    setPhone('')
    setMessage('')
  }

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-100">
      <h2 className="text-xl font-bold text-slate-900">Customer Feedback</h2>
      <p className="mt-1 text-sm text-slate-500">Share your experience with ShopQR ordering.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your Name"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring"
        />
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Phone Number"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring"
        />
      </div>

      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Tell us what went well or what can be improved"
        rows={5}
        className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-200 focus:ring"
      />

      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      <button
        type="button"
        onClick={submitFeedback}
        className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
      >
        Submit Feedback
      </button>
    </section>
  )
}

export default CustomerFeedbackPage
