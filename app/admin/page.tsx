import { requireServerSession } from '@/lib/security/auth'
import { AdminPanel } from '@/components/admin-panel'

export default async function AdminPage() {
  await requireServerSession(['admin'])
  return <AdminPanel />
}
