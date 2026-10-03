import React, { useState, useEffect } from 'react'
import { useBudget } from '../hooks/useBudget'
import { useTransactionsContext } from '../contexts/TransactionsContext'
import { useCategories } from '../hooks/useCategories'
import { useAuth } from '../contexts/AuthContext'
import { sumAmounts } from '../utils/money'
import { formatLocalDate, parseLocalDate } from '../utils/dates'

interface BudgetProps {
  selectedPeriod?: string
  userId?: string
  transactionTypeFilter?: 'receita' | 'despesa' | 'all'
}

const Budget: React.FC<BudgetProps> = ({ 
  selectedPeriod = 'current-month', 
  userId,
  transactionTypeFilter = 'all'
}) => {
  const { user } = useAuth()
  const actualUserId = userId || user?.uid || 'test-user-123'
  const { budgetData, categories, loading, error } = useBudget(selectedPeriod, actualUserId, transactionTypeFilter as 'receita' | 'despesa' | 'all')
  const { transactions } = useTransactionsContext()
  const { categories: allCategories } = useCategories(actualUserId)
  const [activeTab, setActiveTab] = useState('todas')
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false)
  
  // Estados para os filtros
  const [periodFilter, setPeriodFilter] = useState('personalizado')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [typeFilter, setTypeFilter] = useState('todas')
  
  
  // Debug: Log dos estados dos filtros (removido para produção)

  // Aplicar filtro de período quando as datas mudarem
  useEffect(() => {
    if (startDate && endDate) {
      // O filtro será aplicado automaticamente no useMemo abaixo
    }
  }, [startDate, endDate])
  
  // Função para aplicar filtros de período
  const applyPeriodFilter = (period: string) => {
    const today = new Date()
    const currentMonthIndex = today.getMonth()
    const currentYear = today.getFullYear()
    
    switch (period) {
      case 'este-mes':
        const firstDay = new Date(currentYear, currentMonthIndex, 1)
        const lastDay = new Date(currentYear, currentMonthIndex + 1, 0)
        setStartDate(formatLocalDate(firstDay))
        setEndDate(formatLocalDate(lastDay))
        break
      case 'mes-passado':
        const firstDayLastMonth = new Date(currentYear, currentMonthIndex - 1, 1)
        const lastDayLastMonth = new Date(currentYear, currentMonthIndex, 0)
        setStartDate(formatLocalDate(firstDayLastMonth))
        setEndDate(formatLocalDate(lastDayLastMonth))
        break
      case 'ultimos-3-meses':
        const threeMonthsAgo = new Date(currentYear, currentMonthIndex - 3, 1)
        const lastDayCurrentMonth = new Date(currentYear, currentMonthIndex + 1, 0)
        setStartDate(formatLocalDate(threeMonthsAgo))
        setEndDate(formatLocalDate(lastDayCurrentMonth))
        break
      default:
        // Personalizado - manter as datas atuais
        break
    }
  }


  // Calcular dados reais das transações
  const currentMonthIndex = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  // Filtrar transações baseado no período selecionado
  const filteredTransactions = React.useMemo(() => {
    // console.log('📅 [Budget] Filtrando transações:', {
    //   totalTransactions: transactions.length,
    //   periodFilter,
    //   startDate,
    //   endDate,
    //   currentMonthIndex,
    //   currentYear
    // })
    
    let filtered = transactions
    
    // Se estiver no modo personalizado e tiver datas definidas, usar essas datas
    if (periodFilter === 'personalizado' && startDate && endDate) {
      const start = parseLocalDate(startDate)
      const end = parseLocalDate(endDate)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      
      filtered = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date)
        return transactionDate >= start && transactionDate <= end
      })
      
      // console.log('📅 [Budget] Transações filtradas por período personalizado:', filtered.length)
    } else {
      // Usar o mês atual como padrão
      filtered = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date)
      return transactionDate.getMonth() === currentMonthIndex && transactionDate.getFullYear() === currentYear
    })
    
      // console.log('📅 [Budget] Transações do mês atual encontradas:', filtered.length)
    }
    
    return filtered
  }, [transactions, periodFilter, startDate, endDate, currentMonthIndex, currentYear])

  // Função para buscar categoria por nome
  const getCategoryByName = (categoryName: string) => {
    const category = allCategories.find(cat => cat.name === categoryName)
    return category || { 
      name: categoryName, 
      color: '#9CA3AF', 
      icon: '📦',
      type: 'despesa' as const
    }
  }

  // Função para calcular o período baseado no filtro selecionado
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
        const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1)
        const lastDayCurrentMonth = new Date(currentYear, currentMonth + 1, 0)
        return {
          start: formatLocalDate(threeMonthsAgo),
          end: formatLocalDate(lastDayCurrentMonth)
        }
      default:
        return { start: '', end: '' }
    }
  }

  // Agrupar transações parceladas para calcular corretamente o progresso
  const groupedTransactions = React.useMemo(() => {
    const groups: { [key: string]: any[] } = {}
    
    // Primeiro, agrupar TODAS as transações parceladas (não apenas as filtradas)
    const allInstallmentGroups: { [key: string]: any[] } = {}
    
    transactions.forEach(transaction => {
      if (transaction.installments && transaction.installments > 1) {
        const groupKey = transaction.installmentGroupId || 
          `${transaction.description.replace(/\s*\(\d+\/\d+\)$/, '')}_${transaction.totalInstallmentAmount || transaction.amount}`
        
        if (!allInstallmentGroups[groupKey]) {
          allInstallmentGroups[groupKey] = []
        }
        allInstallmentGroups[groupKey].push(transaction)
      }
    })
    
    // Agora verificar quais grupos devem aparecer baseado no filtro de data
    Object.entries(allInstallmentGroups).forEach(([groupKey, groupTransactions]) => {
      // Calcular datas do filtro
      const { start, end } = getDateRange(periodFilter)
      const effectiveStartDate = periodFilter === 'personalizado' ? startDate : start
      const effectiveEndDate = periodFilter === 'personalizado' ? endDate : end
      
      // console.log('🔍 [Budget] Processando grupo:', {
      //   groupKey,
      //   totalParcels: groupTransactions.length,
      //   effectiveStartDate,
      //   effectiveEndDate,
      //   periodFilter
      // })
      
      // Filtrar parcelas que estão no período selecionado
      const transactionsInPeriod = groupTransactions.filter(transaction => {
        if (effectiveStartDate && effectiveEndDate) {
          const transactionDate = formatLocalDate(transaction.date)
          const isInPeriod = transactionDate >= effectiveStartDate && transactionDate <= effectiveEndDate
          
          // console.log('📅 [Budget] Verificando parcela:', {
          //   description: transaction.description,
          //   transactionDate,
          //   effectiveStartDate,
          //   effectiveEndDate,
          //   isInPeriod
          // })
          
          return isInPeriod
        }
        return true
      })
      
      // Se não há parcelas no período, verificar se há parcelas próximas ao período
      let finalTransactionsInPeriod = transactionsInPeriod
      if (transactionsInPeriod.length === 0) {
        const hasFutureParcels = groupTransactions.some(transaction => {
          const transactionDate = formatLocalDate(transaction.date)
          return transactionDate > effectiveEndDate
        })
        
        const hasPastParcels = groupTransactions.some(transaction => {
          const transactionDate = formatLocalDate(transaction.date)
          return transactionDate < effectiveStartDate
        })
        
        // Se há parcelas passadas E futuras, incluir todas as parcelas do grupo
        if (hasPastParcels && hasFutureParcels) {
          // console.log('🔄 [Budget] Grupo com parcelas passadas e futuras - incluindo todas:', groupKey)
          finalTransactionsInPeriod = groupTransactions
        }
        // Se há apenas parcelas passadas, mas o grupo tem parcelas não pagas, incluir também
        else if (hasPastParcels && !hasFutureParcels) {
          const hasUnpaidParcels = groupTransactions.some(transaction => !transaction.isPaid)
          if (hasUnpaidParcels) {
            // console.log('🔄 [Budget] Grupo com parcelas passadas não pagas - incluindo todas:', groupKey)
            finalTransactionsInPeriod = groupTransactions
          }
        }
      }
      
      // console.log('📊 [Budget] Parcelas no período:', {
      //   groupKey,
      //   totalParcels: groupTransactions.length,
      //   parcelsInPeriod: finalTransactionsInPeriod.length
      // })
      
      // Se não há parcelas no período, não mostrar o grupo
      if (finalTransactionsInPeriod.length === 0) {
        // console.log('❌ [Budget] Grupo removido - nenhuma parcela no período:', groupKey)
        return
      }
      
      // Verificar se há pelo menos uma parcela NÃO PAGA no período
      const unpaidInPeriod = finalTransactionsInPeriod.filter(transaction => transaction.isPaid === false)
      
      // console.log('💰 [Budget] Parcelas não pagas no período:', {
      //   groupKey,
      //   unpaidInPeriod: unpaidInPeriod.length,
      //   totalInPeriod: finalTransactionsInPeriod.length
      // })
      
      // Se todas as parcelas no período estão pagas, não mostrar o grupo
      if (unpaidInPeriod.length === 0) {
        // console.log('❌ [Budget] Grupo removido - todas as parcelas no período estão pagas:', groupKey)
        return
      }
      
      // Adicionar o grupo (usando apenas as parcelas do período)
      groups[groupKey] = finalTransactionsInPeriod
      
      // console.log('✅ [Budget] Grupo de parcelas adicionado:', {
      //   groupKey,
      //   totalParcels: groupTransactions.length,
      //   parcelsInPeriod: finalTransactionsInPeriod.length,
      //   unpaidInPeriod: unpaidInPeriod.length,
      //   effectiveStartDate,
      //   effectiveEndDate
      // })
    })
    
    // Adicionar transações únicas (não parceladas) que estão no período filtrado
    filteredTransactions.forEach(transaction => {
      if (!transaction.installments || transaction.installments <= 1) {
        groups[transaction.id] = [transaction]
      }
    })
    
    const result = Object.values(groups)
    // console.log('📊 [Budget] Grupos criados:', result.length)
    
    // Debug: Log de cada grupo
    // result.forEach((group, index) => {
    //   if (group[0].installments && group[0].installments > 1) {
    //     console.log(`📦 [Budget] Grupo ${index + 1}:`, {
    //       description: group[0].description,
    //       totalInstallments: group[0].installments,
    //       transactions: group.map(t => ({
    //         id: t.id.substring(0, 8) + '...',
    //         installmentNumber: t.installmentNumber,
    //         isPaid: t.isPaid,
    //         description: t.description,
    //         date: t.date.toLocaleDateString('pt-BR')
    //       }))
    //     })
    //   }
    // })
    
    return result
  }, [filteredTransactions, currentMonthIndex, currentYear])

  // Criar um card para cada grupo de transações
  const transactionCards = groupedTransactions.map(group => {
    const firstTransaction = group[0]
    const categoryData = getCategoryByName(firstTransaction.category || 'Outros')
    
    // Para transações parceladas
    const isInstallment = firstTransaction.installments && firstTransaction.installments > 1
    const actualAmount = firstTransaction.amount
    const totalAmount = isInstallment 
      ? (firstTransaction.totalInstallmentAmount || firstTransaction.amount * (firstTransaction.installments || 1))
      : firstTransaction.amount
    
    // Calcular parcelas pagas para transações parceladas
    let paidInstallments = 0
    let totalInstallments = 1
    
    if (isInstallment) {
      totalInstallments = firstTransaction.installments || 1
      paidInstallments = group.filter(t => t.isPaid === true).length
      
      // console.log('💰 [Budget] Calculando parcelas pagas:', {
      //   description: firstTransaction.description,
      //   totalInstallments,
      //   paidInstallments,
      //   groupTransactions: group.map(t => ({
      //     id: t.id.substring(0, 8) + '...',
      //     installmentNumber: t.installmentNumber,
      //     isPaid: t.isPaid
      //   }))
      // })
    } else {
      paidInstallments = firstTransaction.isPaid ? 1 : 0
    }
    
    // Calcular percentual de pagamento baseado nas parcelas pagas
    const paymentPercentage = isInstallment 
      ? (paidInstallments / totalInstallments) * 100
      : (firstTransaction.isPaid ? 100 : 0)
    
    // console.log('📊 [Budget] Percentual calculado:', {
    //   description: firstTransaction.description,
    //   paidInstallments,
    //   totalInstallments,
    //   paymentPercentage: paymentPercentage.toFixed(1) + '%',
    //   isInstallment
    // })
    
    // Definir cor da barra baseada no progresso de pagamento
    let barColor = 'bg-gray-400' // Padrão cinza
    if (paymentPercentage > 0 && paymentPercentage <= 33) {
      barColor = 'bg-red-500' // Vermelho: começo (0-33%)
    } else if (paymentPercentage > 33 && paymentPercentage <= 66) {
      barColor = 'bg-yellow-500' // Amarelo: meio (34-66%)
    } else if (paymentPercentage > 66) {
      barColor = 'bg-green-500' // Verde: passou do meio (67-100%)
    }
    
    return {
      id: firstTransaction.id,
      name: firstTransaction.description.replace(/\s*\(\d+\/\d+\)$/, ''), // Remove (1/2) da descrição
      categoryName: categoryData.name,
      actual: actualAmount,
      totalAmount: totalAmount,
      type: firstTransaction.type,
      color: categoryData.color,
      emoji: categoryData.icon,
      isInstallment: isInstallment,
      paidInstallments: paidInstallments,
      totalInstallments: totalInstallments,
      paymentPercentage: paymentPercentage,
      barColor: barColor,
      isPaid: firstTransaction.isPaid,
      installmentNumber: firstTransaction.installmentNumber,
      installments: firstTransaction.installments,
      date: firstTransaction.date // Adicionar a data da transação
    }
  }).sort((a, b) => b.actual - a.actual) // Ordenar por valor

  // Calcular totais
  const totalRevenue = sumAmounts(filteredTransactions
    .filter(t => t.type === 'receita')
    .map(t => t.amount))
  
  const totalExpense = sumAmounts(filteredTransactions
    .filter(t => t.type === 'despesa')
    .map(t => t.amount))
  
  const available = sumAmounts([totalRevenue, -totalExpense])
  const progress = totalRevenue > 0 ? (totalExpense / totalRevenue) * 100 : 0

  // Filtrar dados baseado na aba ativa e filtros do modal
  const filteredData = transactionCards.filter(item => {
    // Filtro por aba ativa (Todas, Receitas, Despesas)
    if (activeTab === 'receitas' && item.type !== 'receita') return false
    if (activeTab === 'despesas' && item.type !== 'despesa') return false
    
    // Filtro por tipo do modal (só aplica se não for 'todas')
    if (typeFilter !== 'todas') {
      if (typeFilter === 'receitas' && item.type !== 'receita') return false
      if (typeFilter === 'despesas' && item.type !== 'despesa') return false
      if (typeFilter === 'contas-parceladas' && !item.isInstallment) return false
      if (typeFilter === 'receitas-parceladas' && (!item.isInstallment || item.type !== 'receita')) return false
    }
    
  // Filtro por período (só aplica se não for 'personalizado' ou se tiver datas definidas)
  if (periodFilter !== 'personalizado' || (startDate && endDate)) {
    const itemDate = new Date(item.date)
    const start = parseLocalDate(startDate)
    const end = parseLocalDate(endDate)
    
    // Ajustar para incluir o dia inteiro
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    
    // Para transações parceladas, usar a lógica de agrupamento que já foi aplicada
    if (item.isInstallment && item.installments) {
      // As transações parceladas já foram filtradas corretamente no groupedTransactions
      // Aqui só precisamos verificar se a data da transação está no período
      const isInRange = itemDate >= start && itemDate <= end
      
      // console.log('🔍 [Budget] Verificando transação parcelada:', {
      //   name: item.name,
      //   date: item.date,
      //   itemDate: itemDate.toISOString().split('T')[0],
      //   start: start.toISOString().split('T')[0],
      //   end: end.toISOString().split('T')[0],
      //   isInRange
      // })
      
      return isInRange
    } else {
      // Para transações não parceladas, usar a lógica normal
      // Só aparecem no mês em que foram criadas
      const isInRange = itemDate >= start && itemDate <= end
      return isInRange
    }
  }
    
    return true
  })
  
  // Debug: Log do filtro
  // console.log('🔍 [Budget] Filtro ativo:', {
  //   activeTab,
  //   periodFilter,
  //   startDate,
  //   endDate,
  //   typeFilter,
  //   totalCards: transactionCards.length,
  //   filteredCards: filteredData.length,
  //   receitas: transactionCards.filter(item => item.type === 'receita').length,
  //   despesas: transactionCards.filter(item => item.type === 'despesa').length,
  //   filteredData: filteredData.map(item => ({
  //     name: item.name,
  //     type: item.type,
  //     date: item.date,
  //     isInstallment: item.isInstallment
  //   }))
  // })

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Orçamento</h3>
        <div className="text-red-600">
          <p>Erro ao carregar dados do orçamento: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Orçamento</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-3">
            <div role="tablist" aria-orientation="horizontal" className="inline-flex h-8 sm:h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
              <button 
                type="button" 
                role="tab" 
                aria-selected={activeTab === 'todas'}
                onClick={() => setActiveTab('todas')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  activeTab === 'todas' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'hover:bg-muted/50'
                }`}
              >
                Todas
              </button>
              <button 
                type="button" 
                role="tab" 
                aria-selected={activeTab === 'receitas'}
                onClick={() => setActiveTab('receitas')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  activeTab === 'receitas' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'hover:bg-muted/50'
                }`}
              >
                Receitas
              </button>
              <button 
                type="button" 
                role="tab" 
                aria-selected={activeTab === 'despesas'}
                onClick={() => setActiveTab('despesas')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  activeTab === 'despesas' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'hover:bg-muted/50'
                }`}
              >
                Despesas
              </button>
            </div>
            <button 
              onClick={() => {
                console.log('🔍 Abrindo modal de filtros')
                setIsFiltersModalOpen(true)
              }}
              className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                (periodFilter !== 'personalizado' || startDate || endDate || typeFilter !== 'todas')
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="text-sm sm:text-base">🔍</span>
              <span>Filtros</span>
              {(periodFilter !== 'personalizado' || startDate || endDate || typeFilter !== 'todas') && (
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-600 mb-1">Receita Total</h4>
          <p className="text-2xl font-bold text-gray-900">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-600 mb-1">Gasto Total</h4>
          <p className="text-2xl font-bold text-gray-900">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-600 mb-1">Disponível</h4>
          <p className="text-2xl font-bold text-green-600">R$ {available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-600 mb-1">Progresso</h4>
          <p className="text-2xl font-bold text-gray-900">{progress.toFixed(1)}%</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredData.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">Nenhuma transação encontrada para o mês atual.</p>
          </div>
        ) : (
          filteredData.map((item, index) => (
            <div key={item.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <div 
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-xl" 
                  style={{backgroundColor: `${item.color}20`, color: item.color}}
                >
                  <span className="text-2xl">{item.emoji}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{item.categoryName}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.type === 'receita' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.type === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                    {item.isInstallment && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        Parcelado
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>R$ {item.actual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    {item.isInstallment && (
                      <span>/ R$ {item.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full ${item.barColor}`} 
                  style={{width: `${Math.min(item.paymentPercentage, 100)}%`}}
                ></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  {item.isInstallment 
                    ? `${item.paidInstallments}/${item.totalInstallments} parcelas (${item.paymentPercentage.toFixed(1)}%)`
                    : `${item.paymentPercentage.toFixed(1)}%`
                  }
                </span>
              </div>
              
              {/* Informações da transação individual */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                  <div className="flex-1">
                    {item.name && (
                      <span className="font-medium">{item.name}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      R$ {item.actual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.isPaid 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.isPaid ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Filtros */}
      {isFiltersModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
              <button 
                onClick={() => setIsFiltersModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl">×</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Período</label>
                <select 
                  value={periodFilter}
                  onChange={(e) => {
                    console.log('📅 Período selecionado:', e.target.value)
                    setPeriodFilter(e.target.value)
                    applyPeriodFilter(e.target.value)
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full lg:min-w-[140px] appearance-none bg-white cursor-pointer"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6,9 12,15 18,9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
                >
                  <option value="personalizado">Personalizado</option>
                  <option value="este-mes">Este mês</option>
                  <option value="mes-passado">Mês passado</option>
                  <option value="ultimos-3-meses">Últimos 3 meses</option>
                </select>
              </div>
              
                 <div className="flex items-center justify-between">
                   <label className="text-sm font-medium text-gray-700">De</label>
                   <div className="relative">
                     <input
                       id="start-date-input"
                       type="date"
                       value={startDate}
                       onChange={(e) => setStartDate(e.target.value)}
                       className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full lg:min-w-[140px]"
                     />
                     <button
                       type="button"
                       onClick={() => {
                         const input = document.getElementById('start-date-input') as HTMLInputElement
                         input?.showPicker()
                       }}
                       className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                     >
                       📅
                     </button>
                   </div>
                 </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Até</label>
                <div className="relative">
                  <input
                    id="end-date-input"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full lg:min-w-[140px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('end-date-input') as HTMLInputElement
                      input?.showPicker()
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    📅
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Tipo</label>
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
                >
                  <option value="todas">Todas</option>
                  <option value="receitas">Receitas</option>
                  <option value="despesas">Despesas</option>
                  <option value="contas-parceladas">Parceladas</option>
                  <option value="receitas-parceladas">Rec. Parceladas</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button 
                onClick={() => {
                  setPeriodFilter('personalizado')
                  setStartDate('')
                  setEndDate('')
                  setTypeFilter('todas')
                  setActiveTab('todas') // Também resetar a aba ativa
                  console.log('♻️ Filtros limpos')
                }}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                <span>♻️</span>
                <span>Limpar filtros</span>
              </button>
              <button 
                onClick={() => {
                  // Aplicar filtros - os filtros já estão sendo aplicados em tempo real
                  // Aqui podemos adicionar lógica adicional se necessário
                  console.log('✅ Filtros aplicados:', {
                    periodFilter,
                    startDate,
                    endDate,
                    typeFilter
                  })
                  setIsFiltersModalOpen(false)
                }}
                className="flex items-center space-x-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 hover:border-blue-700 transition-colors shadow-md"
              >
                <span>✅</span>
                <span>Aplicar</span>
              </button>
            </div>
             </div>
           </div>
         )}


    </div>
  )
}

export default Budget
