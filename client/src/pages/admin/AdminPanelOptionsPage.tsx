import { Link } from 'react-router-dom'

const adminOptions = [
  {
    title: 'Dashboard',
    description: 'View today transactions, revenue, and monthly history.',
    path: '/admin/dashboard',
  },
  {
    title: 'Inventory Management',
    description: 'Manage categories, stock items, tables, and QR cards.',
    path: '/admin/inventory',
  },
  {
    title: 'Item Management',
    description: 'Control menu item visibility, pricing, and sold insights.',
    path: '/admin/items',
  },
  {
    title: 'Payment Management',
    description: 'Track bill status and payment method progress.',
    path: '/admin/payments',
  },
  {
    title: 'Service Management',
    description: 'Handle live active orders and update service status.',
    path: '/admin/service',
  },
  {
    title: 'Reports and Analytics',
    description: 'Analyze revenue trends and export filtered audit records.',
    path: '/admin/reports',
  },
  {
    title: 'Feedback Management',
    description: 'Review customer feedback and update follow-up status.',
    path: '/admin/feedback',
  },
  {
    title: 'User Management',
    description: 'Review customer billing summaries and outstanding dues.',
    path: '/admin/users',
  },
]

function AdminPanelOptionsPage() {
  return (
    <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(0,0,0,0.08)] dark:border-slate-700/80 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.92)_100%)] dark:shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin Panel Options</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This page contains all admin options. Use the left sidebar or choose a card below to open its related page.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {adminOptions.map((option) => (
          <Link
            key={option.path}
            to={option.path}
            className="group rounded-2xl border border-slate-200 bg-slate-50/85 p-4 transition hover:border-amber-400/60 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/85 dark:hover:border-amber-400/60 dark:hover:bg-slate-800"
          >
            <p className="text-lg font-semibold text-slate-900 group-hover:text-amber-600 dark:text-slate-100 dark:group-hover:text-amber-300">{option.title}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{option.description}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-500 dark:text-amber-300">Open Page</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default AdminPanelOptionsPage
