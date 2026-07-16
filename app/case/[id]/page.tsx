import { CaseEditor } from '@/components/case-editor'
import { requireServerSession } from '@/lib/security/auth'

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireServerSession(['user', 'admin'])
  const { id } = await params
  return (
    <div className="min-h-dvh bg-background bg-dot-grid">
      <CaseEditor id={id} />
    </div>
  )
}
