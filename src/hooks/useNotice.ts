import { useCallback, useEffect, useState } from 'react'

export interface Notice {
  message: string
  tone: 'success' | 'error' | 'info'
}

export const useNotice = () => {
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 5000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const notify = useCallback((message: string, tone: Notice['tone'] = 'info') => {
    setNotice({ message, tone })
  }, [])

  return { notice, notify, dismissNotice: () => setNotice(null) }
}
