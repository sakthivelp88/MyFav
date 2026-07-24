import { useEffect, useMemo, useState } from 'react'

type PageToast = {
  id: string
  message: string
  variant: 'info' | 'success' | 'error'
}

type PageToastStackProps = {
  notifications: PageToast[]
}

const variantClassMap: Record<PageToast['variant'], string> = {
  info: 'border-sky-900/60 bg-sky-950/90 text-sky-200',
  success: 'border-emerald-900/60 bg-emerald-950/90 text-emerald-200',
  error: 'border-red-900/60 bg-red-950/90 text-red-200',
}

function PageToastStack({ notifications }: PageToastStackProps) {
  const [dismissedKeys, setDismissedKeys] = useState<string[]>([])

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !dismissedKeys.includes(`${notification.id}:${notification.message}`)),
    [dismissedKeys, notifications]
  )

  useEffect(() => {
    if (notifications.length === 0) {
      setDismissedKeys([])
      return
    }

    const timers = notifications.map((notification) => {
      const key = `${notification.id}:${notification.message}`

      return window.setTimeout(() => {
        setDismissedKeys((current) => (current.includes(key) ? current : [...current, key]))
      }, 3500)
    })

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [notifications])

  useEffect(() => {
    const activeKeys = notifications.map((notification) => `${notification.id}:${notification.message}`)
    setDismissedKeys((current) => current.filter((key) => activeKeys.includes(key)))
  }, [notifications])

  if (visibleNotifications.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-none absolute left-4 right-4 top-4 z-20 flex flex-col gap-3 sm:left-auto sm:w-full sm:max-w-sm">
      {visibleNotifications.map((notification) => (
        <div
          key={`${notification.id}:${notification.message}`}
          role="status"
          className={`rounded-2xl border px-4 py-3 text-sm shadow-[0_18px_45px_rgba(0,0,0,0.28)] backdrop-blur ${variantClassMap[notification.variant]}`}
        >
          {notification.message}
        </div>
      ))}
    </div>
  )
}

export default PageToastStack