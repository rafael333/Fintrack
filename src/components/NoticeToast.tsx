import { Notice } from '../hooks/useNotice'

interface NoticeToastProps {
  notice: Notice | null
  onDismiss: () => void
}

const NoticeToast = ({ notice, onDismiss }: NoticeToastProps) => {
  if (!notice) return null

  const toneClass = notice.tone === 'error'
    ? 'border-red-200 bg-red-50 text-red-900'
    : notice.tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-900'
      : 'border-blue-200 bg-blue-50 text-blue-900'

  return (
    <div className="fixed bottom-24 right-4 z-[11000] max-w-sm sm:bottom-6" role="status" aria-live="polite">
      <div className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg ${toneClass}`}>
        <p className="text-sm font-medium">{notice.message}</p>
        <button type="button" onClick={onDismiss} aria-label="Fechar mensagem" className="min-h-8 min-w-8 rounded-md hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">×</button>
      </div>
    </div>
  )
}

export default NoticeToast
