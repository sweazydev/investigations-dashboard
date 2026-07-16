import { Dashboard } from '@/components/dashboard'
import { requireServerSession } from '@/lib/security/auth'

export default async function Page() {
  await requireServerSession(['user', 'admin'])

  return (
    <div className="min-h-dvh bg-background bg-dot-grid">
      <Dashboard />
    </div>
  )
}
