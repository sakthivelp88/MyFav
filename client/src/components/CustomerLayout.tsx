import { Outlet } from 'react-router-dom'

function CustomerLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_5%_0%,rgba(245,158,11,0.18),transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_55%,#111827_100%)] px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <Outlet />
      </div>
    </div>
  )
}

export default CustomerLayout
