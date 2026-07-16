import { requireServerSession } from '@/lib/security/auth'
import { UserPanel } from '@/components/user-panel'

export default async function UserPanelPage() {
  await requireServerSession(['user'])
  return <UserPanel />
}
