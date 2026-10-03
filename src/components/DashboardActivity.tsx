import { useState } from 'react'
import { useTransactionsContext } from '../contexts/TransactionsContext'
import { useAuth } from '../contexts/AuthContext'
import { formatLocalDate } from '../utils/dates'
import NewTransactionModal from './NewTransactionModal'
import NoticeToast from './NoticeToast'
import { useNotice } from '../hooks/useNotice'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const DashboardActivity = () => {
  const { transactions, loading } = useTransactionsContext()
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { notice, notify, dismissNotice } = useNotice()

  const recent = [...transactions]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 4)
  const today = formatLocalDate(new Date())
  const upcoming = transactions
    .filter(transaction => transaction.type === 'despesa' && !transaction.isPaid && formatLocalDate(transaction.date) >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3)

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-6">
      <section className="rounded-xl border bg-white p-4 shadow-sm lg:p-6" aria-labelledby="recent-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="recent-heading" className="text-lg font-semibold text-gray-900">Atividades recentes</h2>
            <p className="text-sm text-gray-500">Seus últimos lançamentos</p>
          </div>
          <button type="button" onClick={() => setIsModalOpen(true)} className="min-h-11 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">
            Nova transação
          </button>
        </div>
        {loading ? <p className="text-sm text-gray-500">Carregando lançamentos...</p> : recent.length === 0 ? (
          <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Ainda não há lançamentos. Registre a primeira transação para começar.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recent.map(transaction => (
              <li key={transaction.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{transaction.description || transaction.category}</p>
                  <p className="text-gray-500">{transaction.date.toLocaleDateString('pt-BR')} · {transaction.isPaid ? 'Pago' : 'Pendente'}</p>
                </div>
                <span className={`shrink-0 font-semibold ${transaction.type === 'receita' ? 'text-green-700' : 'text-red-700'}`}>
                  {transaction.type === 'receita' ? '+' : '−'}{currency.format(transaction.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-xl border bg-white p-4 shadow-sm lg:p-6" aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="text-lg font-semibold text-gray-900">Próximos vencimentos</h2>
        <p className="mb-4 text-sm text-gray-500">Despesas pendentes a partir de hoje</p>
        {loading ? <p className="text-sm text-gray-500">Carregando vencimentos...</p> : upcoming.length === 0 ? (
          <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Nenhum vencimento pendente nos próximos dias.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcoming.map(transaction => (
              <li key={transaction.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{transaction.description || transaction.category}</p>
                  <p className="text-gray-500">{transaction.date.toLocaleDateString('pt-BR')} · {transaction.category}</p>
                </div>
                <span className={`shrink-0 font-semibold ${transaction.type === 'receita' ? 'text-green-700' : 'text-red-700'}`}>
                  {currency.format(transaction.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <NewTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} userId={user?.uid || ''} onTransactionSaved={message => notify(message, 'success')} />
      <NoticeToast notice={notice} onDismiss={dismissNotice} />
    </div>
  )
}

export default DashboardActivity
