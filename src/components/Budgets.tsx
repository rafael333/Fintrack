import { useState, useMemo, useEffect } from 'react'
import { useTransactionsContext } from '../contexts/TransactionsContext'
import { useCategories } from '../hooks/useCategories'
import { useAuth } from '../contexts/AuthContext'
import Lottie from 'lottie-react';
import { settingsService } from '../firebase/services/settings';
import { CSSProperties } from 'react';
import { sumAmounts } from '../utils/money';
import { formatLocalDate } from '../utils/dates';


// Dados de exemplo para gráficos (será substituído pelos dados reais das transações)
const salesData = [
  { date: '2024-01-01', value: 1000 },
  { date: '2024-01-02', value: 1200 },
  { date: '2024-01-03', value: 800 },
  { date: '2024-01-04', value: 1500 },
  { date: '2024-01-05', value: 900 }
];

let data = salesData.map((d) => ({ ...d, date: new Date(d.date) }));

export function AreaChartSemiFilled() {
  // Estados para editar meta
  const [metaMensal, setMetaMensal] = useState(25000)
  const [isEditingMeta, setIsEditingMeta] = useState(false)
  const [novaMeta, setNovaMeta] = useState('')
  
  // Estados para paginação da tabela
  const [currentPage, setCurrentPage] = useState(1)
  const [mobilePage, setMobilePage] = useState(1)
  const itemsPerPage = 5

  
  // Usar dados reais das transações
  const { transactions, loading } = useTransactionsContext()
  
  // Hook para autenticação
  const { user } = useAuth()
  
  // Carregar meta mensal do Firebase
  useEffect(() => {
    const loadMonthlyGoal = async () => {
      if (user?.uid) {
        try {
          const settings = await settingsService.getSettings(user.uid)
          if (settings) {
            setMetaMensal(settings.monthlyGoal)
            console.log('✅ Meta mensal carregada do Firebase:', settings.monthlyGoal)
          }
        } catch (error) {
          console.warn('⚠️ Erro ao carregar meta mensal do Firebase, usando valor padrão:', error)
          // Mantém o valor padrão (25000) se não conseguir carregar do Firebase
        }
      }
    }

    loadMonthlyGoal()
  }, [user?.uid])
  
  // Debug: Log quando o componente renderiza
  console.log('🔄 [Budgets] Componente renderizado com', transactions.length, 'transações')

  // Processar dados reais das transações para o GRÁFICO (TODAS as transações, sem filtros)
  const cashFlowData = useMemo(() => {
    console.log('🔄 [Budgets] Iniciando processamento do GRÁFICO com', transactions.length, 'transações')
    
    if (!transactions || transactions.length === 0) {
      console.log('📊 [Budgets] Nenhuma transação encontrada')
      return []
    }

    // Usar TODAS as transações (sem filtros)
    const allTransactions = transactions

    console.log('📊 [Budgets] Usando TODAS as transações para GRÁFICO:', {
      total: allTransactions.length
    })

    // Agrupar transações por data
    const transactionsByDate = allTransactions.reduce((acc, transaction) => {
      // Verificar se a transação tem uma data válida
      if (!transaction || !transaction.date) {
        console.warn('⚠️ [Budgets] Transação sem data válida no gráfico:', transaction)
        return acc;
      }
      
      // Usar a data local para evitar problemas de fuso horário
      const transactionDate = new Date(transaction.date)
      const year = transactionDate.getFullYear()
      const month = String(transactionDate.getMonth() + 1).padStart(2, '0')
      const day = String(transactionDate.getDate()).padStart(2, '0')
      const date = `${year}-${month}-${day}`
      
      if (!acc[date]) {
        acc[date] = { receitas: 0, despesas: 0 }
      }
      
      if (transaction.type === 'receita') {
        acc[date].receitas += transaction.amount
      } else {
        acc[date].despesas += transaction.amount
      }
      
      return acc
    }, {} as Record<string, { receitas: number; despesas: number }>)

    // Converter para array e calcular saldo
    const result = Object.entries(transactionsByDate)
      .map(([date, values]) => {
        const resultItem = {
          date,
          receitas: (values as { receitas: number; despesas: number }).receitas,
          despesas: (values as { receitas: number; despesas: number }).despesas,
          saldo: (values as { receitas: number; despesas: number }).receitas - (values as { receitas: number; despesas: number }).despesas
        }
        
        // Debug: Log para verificar a data processada
        console.log('📊 [AreaChartSemiFilled] Item processado:', {
          dateString: date,
          dateObject: new Date(date),
          localString: new Date(date).toLocaleDateString('pt-BR'),
          receitas: (values as { receitas: number; despesas: number }).receitas,
          despesas: (values as { receitas: number; despesas: number }).despesas
        })
        
        return resultItem
      })
      .sort((a, b) => a.date.localeCompare(b.date)) // Ordenar por string de data (YYYY-MM-DD)

    return result
  }, [transactions]) // Usar apenas transactions como dependência

  // Processar dados para a TABELA "Movimentação Diária" (filtrando TODAS as transações pagas)
  const dailyMovementData = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return []
    }

    // Filtrar APENAS transações NÃO PAGAS para a tabela
    const unpaidTransactions = transactions.filter(transaction => {
      return transaction.isPaid !== true;
    });

    // Agrupar APENAS transações NÃO PAGAS por data
    const transactionsByDate = unpaidTransactions.reduce((acc, transaction) => {
      // Verificar se a transação tem uma data válida
      if (!transaction || !transaction.date) {
        return acc;
      }
      
      
      // Usar a data local para evitar problemas de fuso horário
      const transactionDate = new Date(transaction.date)
      const year = transactionDate.getFullYear()
      const month = String(transactionDate.getMonth() + 1).padStart(2, '0')
      const day = String(transactionDate.getDate()).padStart(2, '0')
      const date = `${year}-${month}-${day}`
      
      if (!acc[date]) {
        acc[date] = { receitas: 0, despesas: 0 }
      }
      
      if (transaction.type === 'receita') {
        acc[date].receitas += transaction.amount
      } else {
        acc[date].despesas += transaction.amount
      }
      
      return acc
    }, {} as Record<string, { receitas: number; despesas: number }>)

    // Converter para array e calcular saldo
    const result = Object.entries(transactionsByDate)
      .map(([date, values]) => {
        const resultItem = {
          date,
          receitas: (values as { receitas: number; despesas: number }).receitas,
          despesas: (values as { receitas: number; despesas: number }).despesas,
          saldo: (values as { receitas: number; despesas: number }).receitas - (values as { receitas: number; despesas: number }).despesas
        }
        
        return resultItem
      })
      .sort((a, b) => {
        const today = formatLocalDate(new Date()) // YYYY-MM-DD
        const dateA = a.date
        const dateB = b.date
        
        // Se uma data é hoje, ela vem primeiro
        if (dateA === today && dateB !== today) return -1
        if (dateB === today && dateA !== today) return 1
        
        // Se ambas são hoje, manter ordem original
        if (dateA === today && dateB === today) return 0
        
        // Se uma é futuro e outra é passado, passado vem primeiro
        if (dateA > today && dateB < today) return 1
        if (dateB > today && dateA < today) return -1
        
        // Se ambas são futuro, ordenar por data crescente (mais próximo primeiro)
        if (dateA > today && dateB > today) return dateA.localeCompare(dateB)
        
        // Se ambas são passado, ordenar por data decrescente (mais recente primeiro)
        if (dateA < today && dateB < today) return dateB.localeCompare(dateA)
        
        // Fallback para ordenação padrão
        return dateA.localeCompare(dateB)
      })

    console.log('📊 [Movimentação Diária] Resultado final após filtragem:', result);
    console.log('📊 [Movimentação Diária] Valores calculados:', result.map(item => ({
      data: item.date,
      receitas: item.receitas,
      despesas: item.despesas,
      saldo: item.saldo
    })));
    
    return result
  }, [transactions])

  // Função para renderizar a movimentação diária no mobile
  const renderMobileDailyMovement = () => {
    const mobileItemsPerPage = 4
    const mobileStartIndex = (mobilePage - 1) * mobileItemsPerPage
    const mobileEndIndex = mobileStartIndex + mobileItemsPerPage
    const mobileData = dailyMovementData.slice(mobileStartIndex, mobileEndIndex)

    return (
      <div className="bg-white rounded-xl border-0 lg:border border-gray-200 overflow-hidden">
        <div className="px-4 lg:px-6 py-4 lg:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">Movimentação Diária</h3>
          <p className="text-xs text-gray-500">Últimos 7 dias de movimentação</p>
        </div>
        
        {/* Mobile Layout */}
        <div className="lg:hidden">
          {mobileData.length > 0 ? (
            mobileData.map((item, index) => {
              const isPositive = item.saldo >= 0
              const borderColor = ''
              const iconBg = isPositive ? 'bg-green-100' : 'bg-red-100'
              const iconText = isPositive ? 'text-green-600' : 'text-red-600'
              const icon = isPositive ? (
                <img src="/tendencia-de-seta-para-cima.svg" alt="Seta para cima" className="w-4 h-4" />
              ) : (
                <img src="/seta-para-baixo.svg" alt="Seta para baixo" className="w-4 h-4" />
              )
              const statusBg = isPositive ? 'bg-green-100' : 'bg-red-100'
              const statusText = isPositive ? 'text-green-700' : 'text-red-700'
              const statusLabel = isPositive ? 'Positivo' : 'Negativo'
              const saldoColor = isPositive ? 'text-green-600' : 'text-red-600'
              
              return (
                <div key={index} className="mb-4 p-5 rounded-2xl shadow-lg border border-gray-100 transition-all duration-300 hover:shadow-xl bg-white hover:scale-[1.02]">
                  {/* Header com data e status */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${iconBg}`}>
                        <span className={`text-sm ${iconText}`}>{icon}</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{item.date}</h4>
                        <p className="text-sm text-gray-500 font-medium">{new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-full shadow-sm ${statusBg} ${statusText}`}>
                      {statusLabel}
                    </span>
                  </div>
                  
                  {/* Saldo principal */}
                  <div className="text-center mb-6">
                    <div className={`text-4xl font-black ${saldoColor} mb-1`}>
                      R$ {item.saldo.toFixed(2).replace('.', ',')}
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Saldo do dia</p>
                  </div>
                  
                  {/* Cards de receitas e despesas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <span className="text-sm font-semibold text-green-700">Receitas</span>
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        R$ {item.receitas.toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <span className="text-sm font-semibold text-red-700">Despesas</span>
                      </div>
                      <div className="text-lg font-bold text-red-600">
                        R$ {item.despesas.toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-base">Nenhuma movimentação encontrada</p>
              <p className="text-sm mt-1">Adicione transações para ver a movimentação diária</p>
            </div>
          )}
          
          {/* Paginação Mobile */}
          {dailyMovementData.length > mobileItemsPerPage && (
            <div className="px-2 py-3 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-gray-500">
                  Mostrando {mobileStartIndex + 1} a {Math.min(mobileEndIndex, dailyMovementData.length)} de {dailyMovementData.length} transações
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setMobilePage(Math.max(1, mobilePage - 1))}
                    disabled={mobilePage === 1}
                    className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-400 cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white">
                    {mobilePage}
                  </button>
                  <button
                    onClick={() => setMobilePage(Math.min(Math.ceil(dailyMovementData.length / mobileItemsPerPage), mobilePage + 1))}
                    disabled={mobilePage >= Math.ceil(dailyMovementData.length / mobileItemsPerPage)}
                    className="px-2 py-1 text-xs rounded-md bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 disabled:opacity-50"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Calcular totais do mês atual
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  const monthlyTotals = useMemo(() => {
    const currentMonthTransactions = transactions.filter(transaction => {
      // Verificar se a transação tem uma data válida
      if (!transaction || !transaction.date) {
        return false;
      }
      
      const transactionDate = new Date(transaction.date)
      const isCurrentMonth = transactionDate.getMonth() === currentMonth && 
                            transactionDate.getFullYear() === currentYear
      
      // Incluir apenas transações do mês atual (sem filtros de parcelas pagas)
      return isCurrentMonth
    })

    const receitas = sumAmounts(currentMonthTransactions
      .filter(t => t.type === 'receita')
      .map(t => t.amount))
    
    // Debug: Log das transações de receita do mês atual
    const receitasTransactions = currentMonthTransactions.filter(t => t.type === 'receita')
    console.log('🔍 Debug Meta Mensal:', {
      currentMonth,
      currentYear,
      currentMonthTransactions: currentMonthTransactions.length,
      receitasTransactions: receitasTransactions,
      totalReceitas: receitas,
      todasTransacoes: currentMonthTransactions.map(t => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        type: t.type,
        date: t.date
      }))
    })
    
    // Debug adicional para verificar se há transações de outros meses
    console.log('🔍 Debug Todas as Transações:', {
      totalTransactions: transactions.length,
      allReceitas: transactions.filter(t => t.type === 'receita').map(t => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        date: t.date,
        month: new Date(t.date).getMonth(),
        year: new Date(t.date).getFullYear()
      }))
    })
    
    const despesas = sumAmounts(currentMonthTransactions
      .filter(t => t.type === 'despesa')
      .map(t => t.amount))

    return { receitas, despesas, saldo: sumAmounts([receitas, -despesas]) }
  }, [transactions, currentMonth, currentYear])

  // Calcular dias restantes no mês
  const daysRemaining = useMemo(() => {
    const today = new Date()
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return lastDayOfMonth.getDate() - today.getDate()
  }, [])

  // Calcular média diária necessária para atingir a meta
  const dailyAverageNeeded = useMemo(() => {
    if (daysRemaining <= 0) return 0
    const remainingAmount = metaMensal - monthlyTotals.receitas
    return remainingAmount > 0 ? Math.ceil(remainingAmount / daysRemaining) : 0
  }, [metaMensal, monthlyTotals.receitas, daysRemaining])

  const totalReceitas = monthlyTotals.receitas;
  const totalDespesas = monthlyTotals.despesas;
  const saldoAtual = monthlyTotals.saldo;
  const saldoPositivo = saldoAtual >= 0;

  // Lógica de paginação
  const totalPages = Math.ceil(cashFlowData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = cashFlowData.slice(startIndex, endIndex)

  // Função para mudar página
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleMobilePageChange = (page: number) => {
    setMobilePage(page)
  }
  
  // Funções para editar meta
  const handleEditMeta = () => {
    setIsEditingMeta(true)
    setNovaMeta(metaMensal.toString())
  }
  
  const handleSaveMeta = async () => {
    const valor = parseFloat(novaMeta.replace(/[^\d,]/g, '').replace(',', '.'))
    if (!isNaN(valor) && valor > 0) {
      try {
        if (user?.uid) {
          await settingsService.saveMonthlyGoal(user.uid, valor)
          console.log('✅ Meta mensal salva no Firebase:', valor)
        }
        setMetaMensal(valor)
        setIsEditingMeta(false)
        setNovaMeta('')
      } catch (error) {
        console.warn('⚠️ Erro ao salvar meta mensal no Firebase, salvando localmente:', error)
        // Ainda atualiza o estado local mesmo se der erro no Firebase
        setMetaMensal(valor)
        setIsEditingMeta(false)
        setNovaMeta('')
      }
    }
  }
  
  const handleCancelEdit = () => {
    setIsEditingMeta(false)
    setNovaMeta('')
  }

  // Mostrar loading se estiver carregando
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Carregando dados do dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  // Mostrar mensagem se não há transações
  if (!transactions || transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma transação encontrada</h3>
            <p className="text-gray-500 mb-4">Adicione algumas transações para ver seu dashboard personalizado</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Adicionar Transação
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Desktop: Grid original */}
      <div className="hidden lg:grid grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">🎯</span>
              </div>
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Meta Mensal</p>
                {!isEditingMeta && (
                  <button
                    onClick={handleEditMeta}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    Editar
                  </button>
                )}
              </div>

              {isEditingMeta ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">R$</span>
                    <input
                      type="text"
                      value={novaMeta}
                      onChange={(e) => setNovaMeta(e.target.value)}
                      className="text-lg font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1 w-24"
                      placeholder="25000"
                      autoFocus
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveMeta}
                      className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="bg-gray-300 text-gray-700 text-xs px-3 py-1 rounded hover:bg-gray-400"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-lg font-semibold text-gray-900">
                    R$ {totalReceitas.toLocaleString('pt-BR')} / R$ {metaMensal.toLocaleString('pt-BR')}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full ${
                        (totalReceitas / metaMensal) * 100 < 33 
                          ? 'bg-yellow-500' 
                          : (totalReceitas / metaMensal) * 100 < 66 
                          ? 'bg-blue-600' 
                          : 'bg-green-500'
                      }`}
                      style={{width: `${Math.min((totalReceitas / metaMensal) * 100, 100)}%`}}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((totalReceitas / metaMensal) * 100)}% concluído
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 text-lg">📅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Dias Restantes</p>
              <p className="text-lg font-semibold text-gray-900">{daysRemaining} dias</p>
              <p className="text-xs text-gray-500">até o fim do mês</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-lg">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Média Diária</p>
              <p className="text-lg font-semibold text-gray-900">R$ {dailyAverageNeeded.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-gray-500">necessária para meta</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-lg">📈</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tendência</p>
              <p className="text-lg font-semibold text-green-600">
                <img src="/tendencia-de-seta-para-cima.svg" alt="Seta para cima" className="w-5 h-5 inline mr-1" />
                Crescendo
              </p>
              <p className="text-xs text-gray-500">+15% vs mês anterior</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tabela de Movimentação Diária */}
      <div className="bg-white rounded-xl border-0 lg:border border-gray-200 overflow-hidden">
        <div className="px-4 lg:px-6 py-4 lg:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">Movimentação Diária</h3>
          <p className="text-xs text-gray-500">Últimos 7 dias de movimentação</p>
        </div>
        
        {/* Mobile Layout */}
        <div className="lg:hidden">
          {(() => {
            const mobileItemsPerPage = 4
            const mobileStartIndex = (mobilePage - 1) * mobileItemsPerPage
            const mobileEndIndex = mobileStartIndex + mobileItemsPerPage
            const mobileData = dailyMovementData.slice(mobileStartIndex, mobileEndIndex)
            
            return mobileData.map((item, index) => {
            const [year, month, day] = item.date.split('-').map(Number)
            const localDate = new Date(year, month - 1, day)
            
            return (
              <div key={index} className="mb-4 p-5 rounded-2xl shadow-lg border border-gray-100 transition-all duration-300 hover:shadow-xl bg-white hover:scale-[1.02]">
                {/* Header com data e status */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                      item.saldo >= 0 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <span className={`text-sm ${
                        item.saldo >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.saldo >= 0 ? (
                          <img src="/tendencia-de-seta-para-cima.svg" alt="Seta para cima" className="w-4 h-4" />
                        ) : (
                          <img src="/seta-para-baixo.svg" alt="Seta para baixo" className="w-4 h-4" />
                        )}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">
                        {localDate.toLocaleDateString('pt-BR')}
                      </h4>
                      <p className="text-sm text-gray-500 font-medium">
                        {localDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-full shadow-sm ${
                    item.saldo >= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {item.saldo >= 0 ? 'Positivo' : 'Negativo'}
                  </span>
                </div>
                
                {/* Saldo principal */}
                <div className="text-center mb-6">
                  <div className={`text-4xl font-black ${
                    item.saldo >= 0 ? 'text-green-600' : 'text-red-600'
                  } mb-1`}>
                    R$ {item.saldo.toLocaleString('pt-BR')}
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Saldo do dia</p>
                </div>
                
                {/* Cards de receitas e despesas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className="text-sm font-semibold text-green-700">Receitas</span>
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      R$ {item.receitas.toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className="text-sm font-semibold text-red-700">Despesas</span>
                    </div>
                    <div className="text-lg font-bold text-red-600">
                      R$ {item.despesas.toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
              </div>
            )
            })
          })()}
          
          {/* Paginação Mobile - só aparece se houver mais de 4 transações */}
          {dailyMovementData.length > 4 && (() => {
            const mobileItemsPerPage = 4
            const mobileTotalPages = Math.ceil(dailyMovementData.length / mobileItemsPerPage)
            const mobileStartIndex = (mobilePage - 1) * mobileItemsPerPage
            const mobileEndIndex = Math.min(mobileStartIndex + mobileItemsPerPage, dailyMovementData.length)
            
            return (
              <div className="px-2 py-3 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-xs text-gray-500">
                    Mostrando {mobileStartIndex + 1} a {mobileEndIndex} de {dailyMovementData.length} transações
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-400 cursor-not-allowed" 
                      disabled={mobilePage === 1}
                      onClick={() => handleMobilePageChange(mobilePage - 1)}
                    >
                      Anterior
                    </button>
                    {Array.from({ length: mobileTotalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        className={`px-2 py-1 text-xs rounded-md ${
                          mobilePage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                        onClick={() => handleMobilePageChange(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button 
                      className="px-2 py-1 text-xs rounded-md bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                      disabled={mobilePage === mobileTotalPages}
                      onClick={() => handleMobilePageChange(mobilePage + 1)}
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block overflow-x-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receitas</th>
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Despesas</th>
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dailyMovementData.map((item, index) => {
                // Criar data local para evitar problemas de fuso horário
                const [year, month, day] = item.date.split('-').map(Number)
                const localDate = new Date(year, month - 1, day)
                
                // Debug: Log da data corrigida
                console.log('📊 [Tabela] Data corrigida:', {
                  original: item.date,
                  localDate: localDate,
                  localString: localDate.toLocaleDateString('pt-BR')
                })
                
                return (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-3 lg:px-6 py-3 lg:py-4 text-sm text-gray-900">
                    {localDate.toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-3 lg:px-6 py-3 lg:py-4 text-sm text-green-600 font-medium">
                    R$ {item.receitas.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-3 lg:px-6 py-3 lg:py-4 text-sm text-red-600 font-medium">
                    R$ {item.despesas.toLocaleString('pt-BR')}
                  </td>
                  <td className={`px-3 lg:px-6 py-3 lg:py-4 text-sm font-medium ${item.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {item.saldo.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-3 lg:px-6 py-3 lg:py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.saldo >= 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.saldo >= 0 ? 'Positivo' : 'Negativo'}
                    </span>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Barra de navegação - só aparece se houver mais de 4 transações */}
        {cashFlowData.length > 4 && (
          <div className="hidden lg:block px-2 lg:px-6 py-3 lg:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 lg:gap-0">
              <div className="text-xs lg:text-sm text-gray-500">
                Mostrando {startIndex + 1} a {Math.min(endIndex, cashFlowData.length)} de {cashFlowData.length} transações
              </div>
              <div className="flex space-x-1 lg:space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-2 lg:px-3 py-1 text-xs lg:text-sm rounded-md ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  Anterior
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-2 lg:px-3 py-1 text-xs lg:text-sm rounded-md ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-2 lg:px-3 py-1 text-xs lg:text-sm rounded-md ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  Próximo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Mini Indicadores Visuais */}
      <div className="bg-white p-3 lg:p-6 rounded-xl border-0 lg:border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progresso do Mês</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Receitas</span>
              <span>{Math.round((totalReceitas / metaMensal) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-500 h-3 rounded-full" 
                style={{width: `${Math.min((totalReceitas / metaMensal) * 100, 100)}%`}}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Despesas</span>
              <span>{Math.round((totalDespesas / metaMensal) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-red-500 h-3 rounded-full" 
                style={{width: `${Math.min((totalDespesas / metaMensal) * 100, 100)}%`}}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Saldo</span>
              <span>{saldoPositivo ? '+' : ''}{Math.round((saldoAtual / metaMensal) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${saldoPositivo ? 'bg-blue-500' : 'bg-red-500'}`}
                style={{width: `${Math.min(Math.abs(saldoAtual / metaMensal) * 100, 100)}%`}}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente de gráfico de barras fino para receitas por categoria
function BarChartThinBreakdown({ data }: { data: any[] }) {
  const gap = 0.3; // gap between bars
  const totalValue = data.reduce((acc, d) => acc + d.value, 0);
  const barHeight = 12;
  const totalWidth = totalValue + gap * (data.length - 1);
  let cumulativeWidth = 0;

  const cornerRadius = 4; // Adjust this value to change the roundness

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-gray-500">
        <p>Nenhuma receita encontrada</p>
      </div>
    )
  }

  return (
    <div
      className="relative h-[var(--height)] mt-4 mb-8"
      style={
        {
          "--marginTop": "0px",
          "--marginRight": "0px",
          "--marginBottom": "0px",
          "--marginLeft": "0px",
          "--height": `${barHeight}px`,
        } as CSSProperties
      }
    >
      {/* Chart Area */}
      <div
        className="absolute inset-0 
          h-[calc(100%-var(--marginTop)-var(--marginBottom))]
          w-[calc(100%-var(--marginLeft)-var(--marginRight))]
          translate-x-[var(--marginLeft)]
          translate-y-[var(--marginTop)]
          overflow-visible
        "
      >
        {/* Bars with Gradient Fill */}
        {data.map((d, index) => {
          const barWidth = (d.value / totalWidth) * 100;
          const xPosition = cumulativeWidth;
          const percentage = (d.value / totalValue) * 100;
          cumulativeWidth += barWidth + gap;

          return (
            <div
              key={index}
              className="relative group"
              style={{
                width: `${barWidth}%`,
                height: `${barHeight}px`,
                left: `${xPosition}%`,
                position: "absolute",
              }}
            >
              <div
                className="transition-all duration-200 group-hover:opacity-80 group-hover:scale-105 cursor-pointer"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: `${cornerRadius}px`,
                  backgroundColor: d.color,
                }}
              />
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <div className="font-semibold">{d.key}</div>
                <div>R$ {d.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="text-gray-300">{percentage.toFixed(1)}% do total</div>
                {/* Seta do tooltip */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
              
              <div
                className="text-xs text-gray-400 text-center"
                style={{
                  left: `${xPosition + barWidth / 2}%`,
                  top: `${barHeight + 18}px`,
                }}
              >
                {d.key}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


const Budgets = () => {
  const [activeReport, setActiveReport] = useState('cashflow')
  const [viewMode, setViewMode] = useState('table')
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false)

  // Estados dos filtros
  const [periodFilter, setPeriodFilter] = useState('este-mes')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('todas')
  
  // Estados para editar meta (mobile)
  const [metaMensal, setMetaMensal] = useState(25000)
  const [isEditingMeta, setIsEditingMeta] = useState(false)
  const [novaMeta, setNovaMeta] = useState('')
  
  // Estado para animação do troféu
  const [trophyAnimation, setTrophyAnimation] = useState(null)
  
  // Estados para paginação da tabela
  const [currentPage, setCurrentPage] = useState(1)
  const [mobilePage, setMobilePage] = useState(1)
  const itemsPerPage = 5
  
  // Hook do contexto para transações
  const { transactions, loading: transactionsLoading, error: transactionsError } = useTransactionsContext()
  
  // Processar dados para a TABELA "Movimentação Diária" (filtrando TODAS as transações pagas)
  const dailyMovementData = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return []
    }

    // Filtrar APENAS transações NÃO PAGAS para a tabela
    const unpaidTransactions = transactions.filter(transaction => {
      return transaction.isPaid !== true;
    });

    // Agrupar APENAS transações NÃO PAGAS por data
    const transactionsByDate = unpaidTransactions.reduce((acc, transaction) => {
      // Verificar se a transação tem uma data válida
      if (!transaction || !transaction.date) {
        return acc;
      }
      
      
      // Usar a data local para evitar problemas de fuso horário
      const transactionDate = new Date(transaction.date)
      const year = transactionDate.getFullYear()
      const month = String(transactionDate.getMonth() + 1).padStart(2, '0')
      const day = String(transactionDate.getDate()).padStart(2, '0')
      const date = `${year}-${month}-${day}`
      
      if (!acc[date]) {
        acc[date] = { receitas: 0, despesas: 0 }
      }
      
      if (transaction.type === 'receita') {
        acc[date].receitas += transaction.amount
      } else if (transaction.type === 'despesa') {
        acc[date].despesas += transaction.amount
      }
      
      return acc
    }, {})

    // Converter para array e calcular saldo
    const result = Object.entries(transactionsByDate)
      .map(([date, values]) => ({
        date,
        receitas: (values as { receitas: number; despesas: number }).receitas,
        despesas: (values as { receitas: number; despesas: number }).despesas,
        saldo: (values as { receitas: number; despesas: number }).receitas - (values as { receitas: number; despesas: number }).despesas
      }))
      .sort((a, b) => {
        const today = formatLocalDate(new Date()) // YYYY-MM-DD
        const dateA = a.date
        const dateB = b.date
        
        // Se uma data é hoje, ela vem primeiro
        if (dateA === today && dateB !== today) return -1
        if (dateB === today && dateA !== today) return 1
        
        // Se ambas são hoje, manter ordem original
        if (dateA === today && dateB === today) return 0
        
        // Se uma é futuro e outra é passado, passado vem primeiro
        if (dateA > today && dateB < today) return 1
        if (dateB > today && dateA < today) return -1
        
        // Se ambas são futuro, ordenar por data crescente (mais próximo primeiro)
        if (dateA > today && dateB > today) return dateA.localeCompare(dateB)
        
        // Se ambas são passado, ordenar por data decrescente (mais recente primeiro)
        if (dateA < today && dateB < today) return dateB.localeCompare(dateA)
        
        // Fallback para ordenação padrão
        return dateA.localeCompare(dateB)
      })
      .slice(0, 7) // Pegar apenas os últimos 7 dias

    // Debug: Log do primeiro item para verificar
    if (result.length > 0) {
      console.log('🔍 [DEBUG] Primeiro item da tabela:', {
        data: result[0].date,
        receitas: result[0].receitas,
        despesas: result[0].despesas,
        saldo: result[0].saldo,
        tipo: typeof result[0].saldo
      });
    }
    return result
  }, [transactions])
  
  // Função para mudar página mobile
  const handleMobilePageChange = (page: number) => {
    setMobilePage(page)
  }
  
  // Hook para categorias
  const { user } = useAuth()
  const { categories } = useCategories(user?.uid || 'test-user-123')

  // Carregar meta mensal do Firebase
  useEffect(() => {
    const loadMonthlyGoal = async () => {
      if (user?.uid) {
        try {
          const settings = await settingsService.getSettings(user.uid)
          if (settings) {
            setMetaMensal(settings.monthlyGoal)
            console.log('✅ Meta mensal carregada do Firebase:', settings.monthlyGoal)
          }
        } catch (error) {
          console.warn('⚠️ Erro ao carregar meta mensal do Firebase, usando valor padrão:', error)
          // Mantém o valor padrão (25000) se não conseguir carregar do Firebase
        }
      }
    }

    loadMonthlyGoal()
  }, [user?.uid])

  // Calcular totais do mês atual
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  const monthlyTotals = useMemo(() => {
    const currentMonthTransactions = transactions.filter(transaction => {
      // Verificar se a transação tem uma data válida
      if (!transaction || !transaction.date) {
        return false;
      }
      
      const transactionDate = new Date(transaction.date)
      const isCurrentMonth = transactionDate.getMonth() === currentMonth && 
                            transactionDate.getFullYear() === currentYear
      
      return isCurrentMonth
    })

    // Calcular receitas e despesas do mês atual
    const receitas = sumAmounts(currentMonthTransactions
      .filter(t => t.type === 'receita')
      .map(t => t.amount))
    
    const despesas = sumAmounts(currentMonthTransactions
      .filter(t => t.type === 'despesa')
      .map(t => t.amount))

    // Calcular saldo considerando todas as transações do mês (receitas - despesas)
    const saldo = sumAmounts([receitas, -despesas])

    return { receitas, despesas, saldo }
  }, [transactions, currentMonth, currentYear])

  // Calcular saldo
  const totalReceitas = monthlyTotals.receitas
  const totalDespesas = monthlyTotals.despesas
  const saldoAtual = monthlyTotals.saldo

  // Calcular dias restantes no mês
  const daysRemaining = useMemo(() => {
    const today = new Date()
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return lastDayOfMonth.getDate() - today.getDate()
  }, [])

  // Calcular média diária necessária para atingir a meta
  const dailyAverageNeeded = useMemo(() => {
    if (daysRemaining <= 0) return 0
    const remainingAmount = metaMensal - totalReceitas
    return remainingAmount > 0 ? Math.ceil(remainingAmount / daysRemaining) : 0
  }, [metaMensal, totalReceitas, daysRemaining])

  // Funções para editar meta
  const handleEditMeta = () => {
    setIsEditingMeta(true)
    setNovaMeta(metaMensal.toString())
  }
  
  const handleSaveMeta = async () => {
    const valor = parseFloat(novaMeta.replace(/[^\d,]/g, '').replace(',', '.'))
    if (!isNaN(valor) && valor > 0) {
      try {
        if (user?.uid) {
          await settingsService.saveMonthlyGoal(user.uid, valor)
          console.log('✅ Meta mensal salva no Firebase:', valor)
        }
        setMetaMensal(valor)
        setIsEditingMeta(false)
        setNovaMeta('')
      } catch (error) {
        console.warn('⚠️ Erro ao salvar meta mensal no Firebase, salvando localmente:', error)
        // Ainda atualiza o estado local mesmo se der erro no Firebase
        setMetaMensal(valor)
        setIsEditingMeta(false)
        setNovaMeta('')
      }
    }
  }
  
  const handleCancelEdit = () => {
    setIsEditingMeta(false)
    setNovaMeta('')
  }

  // Função para calcular datas baseadas no período
  const getDateRange = (period: string) => {
      const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    switch (period) {
        case 'este-mes':
        const firstDay = new Date(currentYear, currentMonth, 1)
        const lastDay = new Date(currentYear, currentMonth + 1, 0)
        return {
          start: formatLocalDate(firstDay),
          end: formatLocalDate(lastDay)
        }
        case 'mes-passado':
        const firstDayLastMonth = new Date(currentYear, currentMonth - 1, 1)
        const lastDayLastMonth = new Date(currentYear, currentMonth, 0)
        return {
          start: formatLocalDate(firstDayLastMonth),
          end: formatLocalDate(lastDayLastMonth)
        }
        case 'ultimos-3-meses':
        const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1) // Corrigido: -2 em vez de -3
        const lastDayCurrentMonth = new Date(currentYear, currentMonth + 1, 0)
        return {
          start: formatLocalDate(threeMonthsAgo),
          end: formatLocalDate(lastDayCurrentMonth)
        }
      default:
        return { start: '', end: '' }
    }
  }

  // Inicializar datas quando o componente carregar
  useEffect(() => {
    const { start, end } = getDateRange(periodFilter)
    setStartDate(start)
    setEndDate(end)
  }, [periodFilter])



  // Função para calcular crescimento mensal
  const calculateMonthlyGrowth = () => {
    if (!transactions || transactions.length === 0) return 0

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear

    // Filtrar transações do mês atual
    const currentMonthTransactions = transactions.filter(transaction => {
      // Verificar se a transação tem uma data válida
      if (!transaction || !transaction.date) {
        return false;
      }
      
      const transactionDate = new Date(transaction.date)
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear &&
             transaction.type === 'receita'
    })

    // Filtrar transações do mês anterior
    const previousMonthTransactions = transactions.filter(transaction => {
      // Verificar se a transação tem uma data válida
      if (!transaction || !transaction.date) {
        return false;
      }
      
      const transactionDate = new Date(transaction.date)
      return transactionDate.getMonth() === previousMonth && 
             transactionDate.getFullYear() === previousYear &&
             transaction.type === 'receita'
    })

    const currentRevenue = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0)
    const previousRevenue = previousMonthTransactions.reduce((sum, t) => sum + t.amount, 0)

    if (previousRevenue === 0) return currentRevenue > 0 ? 100 : 0

    return ((currentRevenue - previousRevenue) / previousRevenue) * 100
  }

  // Função para calcular projeção dos próximos 6 meses
  const calculateProjection = () => {
    if (!transactions || transactions.length === 0) return 0

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Calcular receita média dos últimos 3 meses
    let totalRevenue = 0
    let monthCount = 0

    for (let i = 0; i < 3; i++) {
      const month = currentMonth - i < 0 ? currentMonth - i + 12 : currentMonth - i
      const year = currentMonth - i < 0 ? currentYear - 1 : currentYear

      const monthTransactions = transactions.filter(transaction => {
        // Verificar se a transação tem uma data válida
        if (!transaction || !transaction.date) {
          return false;
        }
        
        const transactionDate = new Date(transaction.date)
        return transactionDate.getMonth() === month && 
               transactionDate.getFullYear() === year &&
               transaction.type === 'receita'
      })

      const monthRevenue = monthTransactions.reduce((sum, t) => sum + t.amount, 0)
      if (monthRevenue > 0) {
        totalRevenue += monthRevenue
        monthCount++
      }
    }

    if (monthCount === 0) return 0

    const averageMonthlyRevenue = totalRevenue / monthCount
    return averageMonthlyRevenue * 6 // Projeção para 6 meses
  }

  // Fechar modal quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.classList.contains('modal-backdrop')) {
        setIsFiltersModalOpen(false)
      }
    }

    if (isFiltersModalOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isFiltersModalOpen])

  // Carregar animação do troféu
  useEffect(() => {
    fetch('/Trophy.json')
      .then(response => response.json())
      .then(data => setTrophyAnimation(data))
      .catch(error => console.error('Erro ao carregar animação do troféu:', error))
  }, [])


  // Função para aplicar filtros nas transações
  const filteredTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return []

    let filtered = [...transactions]

    // Filtro por período - usar as mesmas datas da função getDateRange
    const { start, end } = getDateRange(periodFilter)
    const startDateObj = new Date(start)
    const endDateObj = new Date(end)
    
    // Adicionar um dia ao final para incluir o último dia (criar nova instância)
    const endDateInclusive = new Date(endDateObj)
    endDateInclusive.setDate(endDateInclusive.getDate() + 1)

    filtered = filtered.filter(t => {
      const transactionDate = new Date(t.date)
      return transactionDate >= startDateObj && transactionDate < endDateInclusive
    })

    // Filtro por tipo de transação
    switch (transactionTypeFilter) {
      case 'receitas':
        filtered = filtered.filter(t => t.type === 'receita')
        break
      case 'despesas':
        filtered = filtered.filter(t => t.type === 'despesa')
        break
      case 'contas-parceladas':
        filtered = filtered.filter(t => t.installments && t.installments > 1)
        break
      case 'receitas-parceladas':
        filtered = filtered.filter(t => t.type === 'receita' && t.installments && t.installments > 1)
        break
    }

    return filtered
  }, [transactions, periodFilter, startDate, endDate, transactionTypeFilter])

  // Processar dados das receitas por categoria para o gráfico de barras
  const revenueData = useMemo(() => {
    
    if (!filteredTransactions || filteredTransactions.length === 0) {
      return []
    }

    // Filtrar apenas receitas
    const revenues = filteredTransactions.filter(t => t.type === 'receita')
    
    // Agrupar por categoria
    const categoryTotals = revenues.reduce((acc, transaction) => {
      const category = transaction.category
      if (!acc[category]) {
        acc[category] = 0
      }
      acc[category] += transaction.amount
      return acc
    }, {} as Record<string, number>)
    

    // Função para buscar categoria por nome e obter cor
    const getCategoryColor = (categoryName: string, index: number) => {
      const category = categories.find(cat => cat.name === categoryName)
      if (category && category.color) {
        // Usar a cor hex diretamente como background-color
        return category.color
      }
      // Cores padrão se não encontrar a categoria
      const defaultColors = [
        "#8b5cf6", // fuchsia-500
        "#3b82f6", // blue-500
        "#10b981", // emerald-500
        "#f59e0b", // amber-500
        "#ef4444", // red-500
        "#06b6d4", // cyan-500
        "#84cc16", // lime-500
        "#f97316", // orange-500
      ]
      return defaultColors[index % defaultColors.length]
    }

    // Converter para array e adicionar cores reais das categorias
    const result = Object.entries(categoryTotals)
      .map(([category, amount], index) => ({
        key: category,
        value: amount,
        color: getCategoryColor(category, index)
      }))
      .sort((a, b) => (b.value as number) - (a.value as number)) // Ordenar por valor decrescente
    
    return result
  }, [transactions, categories])

  // Processar dados das transações para o fluxo de caixa
  const { cashFlowData, chartData } = useMemo(() => {
    
    if (!transactions || transactions.length === 0) {
      return {
        cashFlowData: [],
        chartData: []
      }
    }

    // Se há apenas uma transação, criar dados mínimos para o gráfico
    if (transactions.length === 1) {
      const transaction = transactions[0]
      
      // Verificar se a transação tem uma data válida
      if (!transaction || !transaction.date) {
        return {
          cashFlowData: [],
          chartData: []
        }
      }
      
      const singleData = {
        date: transaction.date,
        name: transaction.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        receitas: transaction.type === 'receita' ? transaction.amount : 0,
        despesas: transaction.type === 'despesa' ? transaction.amount : 0,
        saldo: transaction.type === 'receita' ? transaction.amount : -transaction.amount
      }
      
      return {
        cashFlowData: [{
          date: transaction.date.toLocaleDateString('pt-BR'),
          description: transaction.description,
          category: transaction.category,
          account: 'Única',
          income: singleData.receitas,
          expense: singleData.despesas,
          balance: singleData.saldo
        }],
        chartData: [singleData]
      }
    }

    // Agrupar transações por data (excluindo parcelas pagas)
    const transactionsByDate = transactions.reduce((acc, transaction) => {
      // Verificar se a transação tem uma data válida
      if (!transaction || !transaction.date) {
        console.warn('⚠️ [Budgets] Transação sem data válida no fluxo de caixa:', transaction)
        return acc;
      }
      
      // Filtrar parcelas pagas - se for uma parcela e estiver marcada como paga, não incluir no gráfico
      const isPaidInstallment = transaction.installmentNumber && transaction.isPaid === true;
      if (isPaidInstallment) {
        return acc;
      }
      
      // Usar a data local para evitar problemas de fuso horário
      const transactionDate = new Date(transaction.date)
      const year = transactionDate.getFullYear()
      const month = String(transactionDate.getMonth() + 1).padStart(2, '0')
      const day = String(transactionDate.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`
      
      if (!acc[dateKey]) {
        acc[dateKey] = { receitas: 0, despesas: 0, transactions: [] }
      }
      
      if (transaction.type === 'receita') {
        acc[dateKey].receitas += transaction.amount
      } else {
        acc[dateKey].despesas += transaction.amount
      }
      
      acc[dateKey].transactions.push(transaction)
      return acc
    }, {} as Record<string, { receitas: number; despesas: number; transactions: any[] }>)

    // Converter para arrays ordenados
    const sortedDates = Object.keys(transactionsByDate).sort()
    
    let balance = 0
    const processedCashFlowData = sortedDates.map(date => {
      const dayData = transactionsByDate[date]
      balance += dayData.receitas - dayData.despesas
      
      return {
        date: new Date(date).toLocaleDateString('pt-BR'),
        description: `${dayData.transactions.length} transação(ões)`,
        category: 'Múltiplas',
        account: 'Múltiplas',
        income: dayData.receitas,
        expense: dayData.despesas,
        balance: balance
      }
    })

    const processedChartData = sortedDates.map((date, index) => {
      const dayData = transactionsByDate[date]
      return {
        date: new Date(date),
        name: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        receitas: dayData.receitas,
        despesas: dayData.despesas,
        saldo: processedCashFlowData[index].balance
      }
    })

    // Se há poucos dados, criar pontos adicionais para melhor visualização
    let finalChartData = processedChartData
    if (processedChartData.length < 3) {
      const firstDate = new Date(processedChartData[0].date)
      const lastDate = new Date(processedChartData[processedChartData.length - 1].date)
      
      // Adicionar pontos antes e depois para melhor visualização
      const extendedData = []
      
      // Ponto anterior (se necessário)
      if (processedChartData.length === 1) {
        const beforeDate = new Date(firstDate)
        beforeDate.setDate(beforeDate.getDate() - 1)
        extendedData.push({
          date: beforeDate,
          name: beforeDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          receitas: 0,
          despesas: 0,
          saldo: 0
        })
      }
      
      // Dados existentes
      extendedData.push(...processedChartData)
      
      // Ponto posterior (se necessário)
      if (processedChartData.length === 1) {
        const afterDate = new Date(lastDate)
        afterDate.setDate(afterDate.getDate() + 1)
        extendedData.push({
          date: afterDate,
          name: afterDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          receitas: 0,
          despesas: 0,
          saldo: processedChartData[0].saldo
        })
      }
      
      finalChartData = extendedData
    }


    return {
      cashFlowData: processedCashFlowData,
      chartData: finalChartData
    }
  }, [transactions])

  const reportTypes = [
    { id: 'cashflow', name: 'Fluxo de Caixa', icon: '📊', active: true },
    { id: 'equity', name: 'Evolução Patrimonial', icon: '📈', active: false },
    { id: 'expenses', name: 'Análise de Gastos', icon: '💰', active: false }
  ]

  // Relatório de Fluxo de Caixa
  const renderCashFlowReport = () => (
    <div className="space-y-4 lg:space-y-6">
      {/* Mobile: Mostrar apenas Movimentação Diária */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl border-0 lg:border border-gray-200 overflow-hidden">
          <div className="px-4 lg:px-6 py-4 lg:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xl lg:text-2xl font-bold text-gray-900">Movimentação Diária</h3>
            </div>
            <p className="text-xs text-gray-500">Últimos 7 dias de movimentação</p>
          </div>
          
          {/* Mobile Layout */}
          <div className="lg:hidden">
            {(() => {
              const mobileItemsPerPage = 8
              const mobileStartIndex = 0
              const mobileEndIndex = mobileItemsPerPage
              const mobileData = dailyMovementData.slice(mobileStartIndex, mobileEndIndex)
              
              return mobileData.length > 0 ? (
                mobileData.map((item, index) => {
                  const isPositive = item.saldo >= 0
                  const borderColor = ''
                  const iconBg = isPositive ? 'bg-green-100' : 'bg-red-100'
                  const iconText = isPositive ? 'text-green-600' : 'text-red-600'
                  const icon = isPositive ? (
                <img src="/tendencia-de-seta-para-cima.svg" alt="Seta para cima" className="w-4 h-4" />
              ) : (
                <img src="/seta-para-baixo.svg" alt="Seta para baixo" className="w-4 h-4" />
              )
                  const statusBg = isPositive ? 'bg-green-100' : 'bg-red-100'
                  const statusText = isPositive ? 'text-green-700' : 'text-red-700'
                  const statusLabel = isPositive ? 'Positivo' : 'Negativo'
                  const saldoColor = isPositive ? 'text-green-600' : 'text-red-600'
                  
                  return (
                    <div key={index} className={`mb-3 p-4 rounded-xl border-2 shadow-sm transition-all duration-200 hover:shadow-md bg-white border-l-4 ${borderColor}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
                            <span className={`text-sm ${iconText}`}>{icon}</span>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">{item.date}</h4>
                            <p className="text-xs text-gray-500">{new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${statusBg} ${statusText}`}>{statusLabel}</span>
                      </div>
                      <div className="text-center mb-4">
                        <div className={`text-3xl font-black ${saldoColor}`}>R$ {item.saldo.toFixed(2).replace('.', ',')}</div>
                        <p className="text-xs text-gray-500 mt-1">Saldo do dia</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <span className="text-xs font-medium text-gray-600">Receitas</span>
                          </div>
                          <div className="text-sm font-semibold text-green-600">R$ {item.receitas.toFixed(2).replace('.', ',')}</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <span className="text-xs font-medium text-gray-600">Despesas</span>
                          </div>
                          <div className="text-sm font-semibold text-red-600">R$ {item.despesas.toFixed(2).replace('.', ',')}</div>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-base">Nenhuma movimentação encontrada</p>
                  <p className="text-sm mt-1">Adicione transações para ver a movimentação diária</p>
                </div>
              )
            })()}
            
            {/* Botão Mostrar Mais Mobile */}
            {dailyMovementData.length > 8 && (
              <div className="px-4 py-3 border-t border-gray-200">
                <button 
                  className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                  onClick={() => {
                    // Aqui você pode implementar a lógica para mostrar mais itens
                    // Por exemplo, aumentar o limite de itens mostrados
                    console.log('Mostrar mais transações')
                  }}
                >
                  Mostrar mais
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: Layout original */}
      <div className="hidden lg:block">
        {/* Título e Botões */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 lg:mb-4 gap-3 lg:gap-0">
          <h2 className="text-lg lg:text-xl font-bold text-gray-900">
            Fluxo de Caixa - {getPeriodName()}
          </h2>
          <div className="flex space-x-1 lg:space-x-2">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg text-sm lg:text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                viewMode === 'chart'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
              }`}
            >
              📊 Gráfico
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg text-sm lg:text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                viewMode === 'table'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
              }`}
            >
              📋 Tabela
            </button>
          </div>
        </div>

        {/* Conteúdo baseado no modo de visualização */}
        {viewMode === 'chart' ? (
          <div className="space-y-6">
            {/* Gráfico de Barras */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-4 lg:px-6 py-4 lg:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <h3 className="text-lg lg:text-xl font-bold text-gray-900">Movimentação Diária</h3>
                <p className="text-sm text-gray-600 mt-1">Receitas e despesas por dia</p>
              </div>
              <div className="p-4 lg:p-6">
                <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
                  <p className="text-gray-500">Gráfico de Barras - {dailyMovementData.length} pontos de dados</p>
                </div>
              </div>
            </div>

            {/* Gráfico de Linha - Saldo Acumulado */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-4 lg:px-6 py-4 lg:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <h3 className="text-lg lg:text-xl font-bold text-gray-900">Saldo Acumulado</h3>
                <p className="text-sm text-gray-600 mt-1">Evolução do saldo ao longo do tempo</p>
              </div>
              <div className="p-4 lg:p-6">
                <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
                  <p className="text-gray-500">Gráfico de Linha - {dailyMovementData.length} pontos de dados</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-4 lg:px-6 py-4 lg:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <h3 className="text-lg lg:text-xl font-bold text-gray-900">Movimentação Diária</h3>
              <p className="text-sm text-gray-600 mt-1">Últimos 7 dias de movimentação</p>
            </div>
            
            {/* Tabela Desktop */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receitas</th>
                    <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Despesas</th>
                    <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                    <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dailyMovementData.map((item, index) => {
                    // Criar data local para evitar problemas de fuso horário
                    const [year, month, day] = item.date.split('-').map(Number)
                    const localDate = new Date(year, month - 1, day)
                    
                    
                    const isPositive = item.saldo >= 0
                    const borderColor = ''
                    const iconBg = isPositive ? 'bg-green-100' : 'bg-red-100'
                    const iconText = isPositive ? 'text-green-600' : 'text-red-600'
                    const icon = isPositive ? (
                <img src="/tendencia-de-seta-para-cima.svg" alt="Seta para cima" className="w-4 h-4" />
              ) : (
                <img src="/seta-para-baixo.svg" alt="Seta para baixo" className="w-4 h-4" />
              )
                    const statusBg = isPositive ? 'bg-green-100' : 'bg-red-100'
                    const statusText = isPositive ? 'text-green-700' : 'text-red-700'
                    const statusLabel = isPositive ? 'Positivo' : 'Negativo'
                    const saldoColor = isPositive ? 'text-green-600' : 'text-red-600'
                    
                    return (
                      <tr key={index} className={`hover:bg-gray-50 transition-colors duration-200`}>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${iconBg}`}>
                              <span className={`text-sm ${iconText}`}>{icon}</span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.date}</div>
                              <div className="text-xs text-gray-500">{localDate.toLocaleDateString('pt-BR', { weekday: 'long' })}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-600">R$ {item.receitas.toFixed(2).replace('.', ',')}</div>
                        </td>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-red-600">R$ {item.despesas.toFixed(2).replace('.', ',')}</div>
                        </td>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                          <div className={`text-lg font-bold ${saldoColor}`}>R$ {item.saldo.toFixed(2).replace('.', ',')}</div>
                        </td>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${statusBg} ${statusText}`}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // Função para renderizar o conteúdo do relatório baseado no tipo selecionado
  const renderReportContent = () => {
    switch (activeReport) {
      case 'cashflow':
        return renderCashFlowReport()
      case 'equity':
        return renderEquityReport()
      case 'expenses':
        return renderExpensesReport()
      default:
        return renderCashFlowReport()
    }
  }


  // Função para obter o nome do período baseado no filtro
  const getPeriodName = () => {
    if (periodFilter === 'personalizado') {
      if (startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const startMonth = start.toLocaleDateString('pt-BR', { month: 'long' })
        const startYear = start.getFullYear()
        const endMonth = end.toLocaleDateString('pt-BR', { month: 'long' })
        const endYear = end.getFullYear()
        
        if (startMonth === endMonth && startYear === endYear) {
          return `${startMonth} de ${startYear}`
        } else {
          return `${startMonth} de ${startYear} a ${endMonth} de ${endYear}`
        }
      }
      return 'Período Personalizado'
    }
    
    const { start, end } = getDateRange(periodFilter)
    // Criar datas sem problemas de fuso horário
    const startDateObj = new Date(start + 'T00:00:00')
    const endDateObj = new Date(end + 'T23:59:59')
    
    switch (periodFilter) {
      case 'este-mes':
        return endDateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      case 'mes-passado':
        return startDateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      case 'ultimos-3-meses':
        const startMonth = startDateObj.toLocaleDateString('pt-BR', { month: 'long' })
        const startYear = startDateObj.getFullYear()
        const endMonth = endDateObj.toLocaleDateString('pt-BR', { month: 'long' })
        const endYear = endDateObj.getFullYear()
        return `${startMonth} de ${startYear} a ${endMonth} de ${endYear}`
      default:
        return 'Período Selecionado'
    }
  }

  // Relatório de Evolução Patrimonial
  const renderEquityReport = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          Evolução Patrimonial - {getPeriodName()}
        </h2>
      </div>

      {/* Gráfico de Barras Horizontais - Receitas por Categoria */}
      <div className="bg-white p-2 lg:p-6 rounded-lg shadow border-0 lg:border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Receitas por Categoria</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <BarChartThinBreakdown data={revenueData} />
        </div>
      </div>

      {/* Top 5 Maiores Receitas */}
      <div className="hidden lg:block bg-white p-2 lg:p-6 rounded-lg shadow border-0 lg:border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Maiores Receitas</h3>
        <div className="space-y-3">
          {filteredTransactions
            .filter(t => t.type === 'receita')
            .sort((a: any, b: any) => b.amount - a.amount)
            .slice(0, 5)
            .map((revenue: any, index: number) => (
              <div key={revenue.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <div>
                    <div className="font-medium text-gray-900">{revenue.description}</div>
                    <div className="text-sm text-gray-600">{revenue.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    R$ {revenue.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-gray-500">
                    {revenue.date.toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Cards de Resumo Patrimonial */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-6">
        <div className="bg-white p-2 lg:p-6 rounded-lg shadow border-0 lg:border">
          <h3 className="text-sm lg:text-lg font-semibold text-gray-900 mb-2 lg:mb-4">Patrimônio Atual</h3>
          <div className="space-y-2 lg:space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Saldo Total</span>
              <span className="text-2xl font-bold text-green-600">
                R$ {revenueData.reduce((acc, item) => acc + item.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Baseado nas receitas do período
            </div>
          </div>
        </div>

        <div className="bg-white p-2 lg:p-6 rounded-lg shadow border-0 lg:border">
          <h3 className="text-sm lg:text-lg font-semibold text-gray-900 mb-2 lg:mb-4">Crescimento</h3>
          <div className="space-y-2 lg:space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Variação Mensal</span>
              <span className={`text-lg font-bold ${
                calculateMonthlyGrowth() >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {calculateMonthlyGrowth() >= 0 ? '+' : ''}{calculateMonthlyGrowth().toFixed(1)}%
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Comparado ao mês anterior
            </div>
          </div>
        </div>

        <div className="bg-white p-2 lg:p-6 rounded-lg shadow border-0 lg:border">
          <h3 className="text-sm lg:text-lg font-semibold text-gray-900 mb-2 lg:mb-4">Projeção</h3>
          <div className="space-y-2 lg:space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Próximos 6 meses</span>
              <span className="text-lg font-bold text-purple-600">
                R$ {calculateProjection().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Baseado na tendência atual
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Relatório de Análise de Gastos
  const renderExpensesReport = () => {
    // Filtrar apenas despesas
    const expenses = filteredTransactions.filter(t => t.type === 'despesa')
    
    // Agrupar despesas por categoria
    const expenseData = expenses.reduce((acc, transaction) => {
      const category = transaction.category
      if (!acc[category]) {
        acc[category] = 0
      }
      acc[category] += transaction.amount
      return acc
    }, {} as Record<string, number>)

    const expenseArray = Object.entries(expenseData)
      .map(([category, amount]) => ({
        key: category,
        value: amount,
        color: categories.find(cat => cat.name === category)?.color || '#ef4444'
      }))
      .sort((a, b) => (b.value as number) - (a.value as number))

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Análise de Gastos - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>
        </div>

        {/* Resumo de Gastos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-2 lg:p-4 rounded-lg shadow border-0 lg:border">
            <div className="text-sm text-gray-600">Total Gasto</div>
            <div className="text-2xl font-bold text-red-600">
              R$ {expenses.reduce((acc, t) => acc + t.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white p-2 lg:p-4 rounded-lg shadow border-0 lg:border">
            <div className="text-sm text-gray-600">Categorias</div>
            <div className="text-2xl font-bold text-blue-600">{Object.keys(expenseData).length}</div>
          </div>
          <div className="bg-white p-2 lg:p-4 rounded-lg shadow border-0 lg:border">
            <div className="text-sm text-gray-600">Transações</div>
            <div className="text-2xl font-bold text-green-600">{expenses.length}</div>
          </div>
          <div className="bg-white p-2 lg:p-4 rounded-lg shadow border-0 lg:border">
            <div className="text-sm text-gray-600">Média por Transação</div>
            <div className="text-2xl font-bold text-purple-600">
              R$ {expenses.length > 0 ? (expenses.reduce((acc, t) => acc + t.amount, 0) / expenses.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
            </div>
          </div>
        </div>

        {/* Gráfico de Gastos por Categoria */}
        <div className="bg-white p-2 lg:p-6 rounded-lg shadow border-0 lg:border">
          <h3 className="text-sm lg:text-lg font-semibold text-gray-900 mb-2 lg:mb-4">Gastos por Categoria</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <BarChartThinBreakdown data={expenseArray} />
          </div>
        </div>

        {/* Top 5 Maiores Gastos */}
        <div className="hidden lg:block bg-white p-2 lg:p-6 rounded-lg shadow border-0 lg:border">
          <h3 className="text-sm lg:text-lg font-semibold text-gray-900 mb-2 lg:mb-4">Top 5 Maiores Gastos</h3>
          <div className="space-y-2 lg:space-y-3">
            {expenses
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 5)
              .map((expense, index) => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <div>
                      <div className="font-medium text-gray-900">{expense.description}</div>
                      <div className="text-sm text-gray-600">{expense.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-600">
                      R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-500">
                      {expense.date.toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    )
  }

  // Tabela de transações (reutilizada)
  const renderTransactionsTable = () => {
    return (
            <div className="overflow-x-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                    <th className="text-left py-3 lg:py-4 px-3 lg:px-4 font-bold text-gray-900 text-sm lg:text-base">Data</th>
                    <th className="text-left py-3 lg:py-4 px-3 lg:px-4 font-bold text-gray-900 text-sm lg:text-base hidden sm:table-cell">Descrição</th>
                    <th className="text-left py-3 lg:py-4 px-3 lg:px-4 font-bold text-gray-900 text-sm lg:text-base">Categoria</th>
                    <th className="text-left py-3 lg:py-4 px-3 lg:px-4 font-bold text-gray-900 text-sm lg:text-base hidden md:table-cell">Parcelas</th>
                    <th className="text-right py-3 lg:py-4 px-3 lg:px-4 font-bold text-gray-900 text-sm lg:text-base">Valor</th>
                    <th className="text-right py-3 lg:py-4 px-3 lg:px-4 font-bold text-gray-900 text-sm lg:text-base hidden lg:table-cell">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 px-4 text-center text-gray-500">
                        Nenhuma transação encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((transaction) => (
                        <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200">
                          <td className="py-3 lg:py-4 px-3 lg:px-4 text-sm lg:text-base text-gray-900 font-semibold">
                            {transaction.date ? transaction.date.toLocaleDateString('pt-BR') : 'Data inválida'}
                          </td>
                          <td className="py-3 lg:py-4 px-3 lg:px-4 text-sm lg:text-base text-gray-700 font-medium hidden sm:table-cell">
                            {transaction.description}
                          </td>
                          <td className="py-3 lg:py-4 px-3 lg:px-4 text-sm lg:text-base text-gray-700 font-medium">
                            {transaction.category}
                          </td>
                          <td className="py-3 lg:py-4 px-3 lg:px-4 text-sm lg:text-base text-gray-700 hidden md:table-cell">
                            {transaction.installments && transaction.installments > 1 ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-900">
                                  {transaction.installmentNumber || 1}/{transaction.installments}
                                </span>
                                <span className={`text-xs ${
                                  transaction.isPaid 
                                    ? 'text-gray-500' 
                                    : transaction.type === 'receita' 
                                      ? 'text-green-600 font-medium' 
                                      : 'text-gray-500'
                                }`}>
                                  {transaction.isPaid 
                                    ? 'Pago' 
                                    : transaction.type === 'receita' 
                                      ? 'Receber' 
                                      : 'Pendente'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="text-xs text-gray-500">À vista</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 lg:py-4 px-3 lg:px-4 text-right">
                            <span className={`text-lg lg:text-xl font-black ${
                              transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'receita' ? '+' : '-'}R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-3 lg:py-4 px-3 lg:px-4 text-right hidden lg:table-cell">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              transaction.type === 'receita' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )
  }

  return (
    <>
      <div className="space-y-3 lg:space-y-6 px-2 lg:px-0">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 lg:gap-0">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Relatórios</h1>
        <button 
          className="text-white px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors"
          style={{ backgroundColor: 'rgb(34 197 94)' }}
          onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = 'rgb(30 180 85)'}
          onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'rgb(34 197 94)'}
        >
          Salvar Relatório Personalizado
        </button>
      </div>

      {/* Mobile Cards - Carrossel */}
      <div className="lg:hidden space-y-3">
        {/* Primeira linha: Meta Mensal - KPI Principal */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 mobile-carousel-item shadow-lg overflow-hidden">
          {/* Cabeçalho */}
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-0">
                <div>
                  <div className="mb-1 flex items-center space-x-2">
                    <h3 className="text-base font-bold text-gray-800">Meta Mensal</h3>
                    {!isEditingMeta && (
                      <button
                        onClick={handleEditMeta}
                        className="text-blue-600 hover:text-blue-800 text-xs font-semibold bg-blue-100 px-2 py-1 rounded-md transition-colors"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                  
                  {/* Valor Principal e Meta total - Logo abaixo do título */}
                  <div className="flex items-center space-x-1 mb-3">
                    <div className="text-sm font-bold text-gray-700">
                      R$ {totalReceitas.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-xs text-gray-600">
                      /{metaMensal.toLocaleString('pt-BR')}
                    </div>
                  </div>
                  
                </div>
              </div>
              {/* Ícone de Troféu */}
              <div className="w-16 h-16 -ml-6 -mt-2">
                {trophyAnimation ? (
                  <Lottie 
                    animationData={trophyAnimation}
                    loop={true}
                    autoplay={true}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🏆</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Barra de Progresso ocupando todo o espaço restante */}
          <div className="relative w-full bg-gray-200 h-8 shadow-inner overflow-hidden">
            {/* Barra de progresso animada */}
            <div 
              className={`h-8 transition-all duration-2000 ease-out relative overflow-hidden ${
                (totalReceitas / metaMensal) * 100 < 33 
                  ? 'bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500' 
                  : (totalReceitas / metaMensal) * 100 < 66 
                  ? 'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600' 
                  : 'bg-gradient-to-r from-green-500 via-green-400 to-green-600'
              }`}
              style={{width: `${Math.min((totalReceitas / metaMensal) * 100, 100)}%`}}
            >
              {/* Efeito de brilho animado */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent progress-shimmer"></div>
              
              {/* Efeito de ondas */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent progress-wave"></div>
              
              {/* Efeito de partículas flutuantes */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1 left-2 w-0.5 h-0.5 bg-white/30 rounded-full progress-float"></div>
                <div className="absolute top-1 right-4 w-0.5 h-0.5 bg-white/40 rounded-full progress-float animation-delay-1000"></div>
                <div className="absolute bottom-1 left-6 w-0.5 h-0.5 bg-white/20 rounded-full progress-float animation-delay-2000"></div>
              </div>
              
              {/* Percentual centralizado na barra */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-bold text-white drop-shadow-sm">
                    {Math.round((totalReceitas / metaMensal) * 100)}%
                  </span>
                  <span className="text-xs text-white/90 drop-shadow-sm">concluído</span>
                </div>
              </div>
            </div>
          </div>


          {isEditingMeta ? (
            <div className="space-y-3 mt-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <span className="text-sm sm:text-base font-bold text-gray-700">R$</span>
                <input
                  type="text"
                  value={novaMeta}
                  onChange={(e) => setNovaMeta(e.target.value)}
                  className="text-sm sm:text-lg font-bold text-gray-900 border-2 border-blue-300 rounded-md px-3 py-2 w-full sm:w-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="25000"
                  autoFocus
                />
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  onClick={handleSaveMeta}
                  className="text-white text-sm px-4 py-2 rounded-md font-semibold transition-colors w-full sm:w-auto"
                  style={{ backgroundColor: 'rgb(34 197 94)' }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = 'rgb(30 180 85)'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'rgb(34 197 94)'}
                >
                  Salvar
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="bg-gray-300 text-gray-700 text-sm px-4 py-2 rounded-md hover:bg-gray-400 font-semibold transition-colors w-full sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Informações Secundárias */}
            </>
          )}
        </div>
        
        {/* Segunda linha: Cards Secundários - Grid 2x1 */}
        <div className="grid grid-cols-2 gap-3">
          {/* Dias Restantes */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-center">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-gray-600 text-sm">📅</span>
              </div>
              <p className="text-xs font-medium text-gray-500 mb-1">Dias Restantes</p>
              <p className="text-2xl font-bold text-orange-600">{daysRemaining}</p>
              <p className="text-xs text-gray-400">até o fim do mês</p>
            </div>
          </div>
          
          {/* Média Diária */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-center">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-gray-600 text-sm">📊</span>
              </div>
              <p className="text-xs font-medium text-gray-500 mb-1">Média Diária</p>
              <p className="text-2xl font-bold text-green-600">R$ {dailyAverageNeeded.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-gray-400">necessária para meta</p>
            </div>
          </div>
        </div>
        
        {/* Terceira linha: Tendência - Largura total */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-center">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <span className="text-gray-600 text-sm">📈</span>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1">Tendência</p>
            <div className="flex items-center justify-center space-x-2">
              <p className={`text-xl font-bold ${calculateMonthlyGrowth() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {calculateMonthlyGrowth() >= 0 ? (
                  <>
                    <img src="/tendencia-de-seta-para-cima.svg" alt="Seta para cima" className="w-5 h-5 inline mr-1" />
                    Crescendo
                  </>
                ) : (
                  <>
                    <img src="/seta-para-baixo.svg" alt="Seta para baixo" className="w-5 h-5 inline mr-1" />
                    Decrescendo
                  </>
                )}
              </p>
              <p className={`text-sm font-semibold ${calculateMonthlyGrowth() >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {calculateMonthlyGrowth() >= 0 ? '+' : ''}{calculateMonthlyGrowth().toFixed(1)}%
              </p>
            </div>
            <p className="text-xs text-gray-400">vs mês anterior</p>
          </div>
        </div>
      </div>

      <div className="hidden lg:grid grid-cols-3 gap-6">
        {/* Maior Receita */}
        <div className="bg-white p-3 lg:p-6 rounded-lg shadow border-0 lg:border">
          <h3 className="text-xs lg:text-lg font-medium text-gray-600 mb-1 lg:mb-4">Maior Receita</h3>
          <div className="text-xs lg:text-sm text-gray-500">Em desenvolvimento</div>
        </div>

        {/* Maior Despesa */}
        <div className="bg-white p-3 lg:p-6 rounded-lg shadow border-0 lg:border">
          <h3 className="text-xs lg:text-lg font-medium text-gray-600 mb-1 lg:mb-4">Maior Despesa</h3>
          <div className="text-xs lg:text-sm text-gray-500">Em desenvolvimento</div>
        </div>

        {/* Economia Potencial */}
        <div className="bg-white p-3 lg:p-6 rounded-lg shadow border-0 lg:border">
          <h3 className="text-xs lg:text-lg font-medium text-gray-600 mb-1 lg:mb-4">Economia Potencial</h3>
          <div className="text-xs lg:text-sm text-gray-500">Em desenvolvimento</div>
        </div>
      </div>

      <div className="space-y-3 lg:space-y-4">
        {/* Navegação Principal - Carrossel Horizontal */}
        <div className="bg-white p-2 lg:p-4 rounded-lg shadow border-0 lg:border">
          <div className="flex justify-start">
            {/* Mobile: Carrossel horizontal com scroll */}
            <div className="lg:hidden w-full">
              <div className="flex overflow-x-auto scrollbar-hide space-x-2 pb-2">
                <div className="flex space-x-2">
                  {/* Botão de Filtros */}
                  <button 
                    onClick={() => setIsFiltersModalOpen(true)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-full text-xs font-medium transition-all duration-300 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-md whitespace-nowrap"
                  >
                    <img 
                      src="/options.png" 
                      alt="Filtros" 
                      className="w-3 h-3"
                    />
                    <span>Filtros</span>
                  </button>
                  
                  {reportTypes.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setActiveReport(report.id)}
                      className={`flex items-center px-3 py-2 rounded-full text-xs font-medium transition-all duration-300 whitespace-nowrap ${
                        activeReport === report.id
                          ? 'text-white shadow-md transform scale-105 border-2 bg-custom-green border-custom-green-hover hover:bg-custom-green-hover'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      }`}
                    >
                      <span>{report.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop: Layout original */}
            <div className="hidden lg:block">
              <div className="flex flex-wrap gap-1 bg-gray-50 p-1 rounded-lg border">
                {/* Botão de Filtros */}
                <button 
                  onClick={() => setIsFiltersModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <img 
                    src="/options.png" 
                    alt="Filtros" 
                    className="w-4 h-4"
                  />
                  <span>Filtros</span>
                </button>
                
                {reportTypes.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setActiveReport(report.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      activeReport === report.id
                        ? 'text-white shadow-md transform scale-105 bg-custom-green hover:bg-custom-green-hover'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-base">{report.icon}</span>
                    <span>{report.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="bg-white p-2 lg:p-6 rounded-lg shadow border-0 lg:border">
        {/* Estados de Loading e Erro */}
        {transactionsLoading ? (
          <div className="h-64 lg:h-96 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 lg:h-6 lg:w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm lg:text-base text-gray-600">Carregando dados...</span>
            </div>
          </div>
        ) : transactionsError ? (
          <div className="h-64 lg:h-96 flex items-center justify-center">
            <div className="text-center text-red-600">
              <p className="text-sm lg:text-base">Erro ao carregar dados</p>
              <p className="text-xs lg:text-sm mt-1">{transactionsError}</p>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="h-64 lg:h-96 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl lg:text-6xl mb-3 lg:mb-4">📊</div>
              <p className="text-base lg:text-lg">Nenhuma transação encontrada</p>
              <p className="text-xs lg:text-sm mt-2">Adicione transações para ver os relatórios</p>
            </div>
          </div>
        ) : (
          renderReportContent()
        )}
      </div>

      {isFiltersModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-3 lg:mx-4">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200">
              <h3 className="text-base lg:text-lg font-semibold text-gray-900">Filtros</h3>
              <button
                onClick={() => setIsFiltersModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-lg lg:text-xl">×</span>
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-4 lg:p-6 space-y-3 lg:space-y-4">
              {/* Período */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 lg:gap-0">
                <label className="text-xs lg:text-sm font-medium text-gray-700">Período</label>
                <select 
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                >
                  <option value="personalizado">Personalizado</option>
                  <option value="este-mes">Este mês</option>
                  <option value="mes-passado">Mês passado</option>
                  <option value="ultimos-3-meses">Últimos 3 meses</option>
                </select>
              </div>

              {/* Data Inicial */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 lg:gap-0">
                <label className="text-xs lg:text-sm font-medium text-gray-700">De</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={periodFilter !== 'personalizado'}
                    className={`border border-gray-300 rounded-lg px-2 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full lg:min-w-[140px] ${
                      periodFilter !== 'personalizado' 
                        ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
                        : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (periodFilter === 'personalizado') {
                        const input = document.querySelector('input[type="date"][value="' + startDate + '"]') as HTMLInputElement
                        input?.showPicker()
                      }
                    }}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 ${
                      periodFilter === 'personalizado' ? 'cursor-pointer hover:text-gray-600' : 'cursor-not-allowed'
                    }`}
                    disabled={periodFilter !== 'personalizado'}
                  >
                    📅
                  </button>
                </div>
              </div>

              {/* Data Final */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 lg:gap-0">
                <label className="text-xs lg:text-sm font-medium text-gray-700">Até</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={periodFilter !== 'personalizado'}
                    className={`border border-gray-300 rounded-lg px-2 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full lg:min-w-[140px] ${
                      periodFilter !== 'personalizado' 
                        ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
                        : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (periodFilter === 'personalizado') {
                        const input = document.querySelector('input[type="date"][value="' + endDate + '"]') as HTMLInputElement
                        input?.showPicker()
                      }
                    }}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 ${
                      periodFilter === 'personalizado' ? 'cursor-pointer hover:text-gray-600' : 'cursor-not-allowed'
                    }`}
                    disabled={periodFilter !== 'personalizado'}
                  >
                    📅
                  </button>
                </div>
              </div>

              {/* Tipo de Transação */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 lg:gap-0">
                <label className="text-xs lg:text-sm font-medium text-gray-700">Tipo</label>
                <select 
                  value={transactionTypeFilter}
                  onChange={(e) => setTransactionTypeFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                >
                  <option value="todas">Todas</option>
                  <option value="receitas">Receitas</option>
                  <option value="despesas">Despesas</option>
                  <option value="contas-parceladas">Parceladas</option>
                  <option value="receitas-parceladas">Rec. Parceladas</option>
                </select>
              </div>
            </div>

            {/* Botões do Modal */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 lg:gap-0 p-4 lg:p-6 border-t border-gray-200">
              <button 
                onClick={() => {
                  setPeriodFilter('este-mes')
                  setTransactionTypeFilter('todas')
                  const { start, end } = getDateRange('este-mes')
                  setStartDate(start)
                  setEndDate(end)
                }}
                className="flex items-center space-x-1 lg:space-x-2 px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                <span>♻️</span>
                <span>Limpar filtros</span>
              </button>
              
              <button 
                onClick={() => setIsFiltersModalOpen(false)}
                className="flex items-center space-x-1 lg:space-x-2 px-4 lg:px-6 py-1.5 lg:py-2 text-xs lg:text-sm font-medium text-white border rounded-lg transition-colors shadow-md"
                style={{ 
                  backgroundColor: 'rgb(34 197 94)', 
                  borderColor: 'rgb(34 197 94)' 
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'rgb(30 180 85)';
                  (e.target as HTMLElement).style.borderColor = 'rgb(30 180 85)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'rgb(34 197 94)';
                  (e.target as HTMLElement).style.borderColor = 'rgb(34 197 94)';
                }}
              >
                <span>✅</span>
                <span>Aplicar</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

export default Budgets











