import { LiveDashboard } from '@/components/operator/live-dashboard'

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted">Live stream status polled every 5 seconds.</p>
      </div>
      <LiveDashboard intervalSec={5} />
    </div>
  )
}
